import 'dotenv/config';
import {readdir, readFile, stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Pool} from 'pg';

/** data/<site>/ altındaki en yeni result/source dosyalarından kaynak durumunu DB'ye yazar. */
const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, max: 1,
    connectionTimeoutMillis: 5000, statement_timeout: 30000,
    options: '-c default_transaction_read_only=off'
});

const dataDir = resolve('data');

async function latest(dir: string, suffix: string): Promise<string | undefined> {
    try {
        const files = (await readdir(dir)).filter(f => f.endsWith(suffix));
        if (!files.length) return undefined;
        const withTime = await Promise.all(files.map(async f => ({f, t: (await stat(resolve(dir, f))).mtimeMs})));
        withTime.sort((a, b) => b.t - a.t);
        return resolve(dir, withTime[0]!.f);
    } catch { return undefined; }
}

try {
    const sites = (await readdir(dataDir, {withFileTypes: true})).filter(d => d.isDirectory() && d.name.endsWith('.az')).map(d => d.name);
    let runFetched = 0, runInserted = 0, runDup = 0, runSkipped = 0, runErrors = 0, allErrors = 0;
    let minStart = Infinity, maxFinish = 0, region = 'all', mode: string | null = null;
    const perSource: {source: string; lastRunAt: string | null; fetched: number; ready: number; inserted: number; duplicates: number; skipped: number; errors: number; region: string | null; report: string | null}[] = [];

    for (const site of sites) {
        const dir = resolve(dataDir, site);
        const resultPath = await latest(dir, '-result.json');
        if (!resultPath) continue;
        const sourcePath = await latest(dir, '-source.json');
        const result = JSON.parse(await readFile(resultPath, 'utf8'));
        let fetched = 0;
        if (sourcePath) { try { fetched = (JSON.parse(await readFile(sourcePath, 'utf8')).vacancies ?? []).length; } catch { fetched = 0; } }
        const inserted = (result.inserted ?? []).length;
        const duplicates = (result.duplicates ?? []).length;
        const skipped = (result.skipped ?? []).length;
        const errors = (result.errors ?? []).length;
        const mtime = (await stat(resultPath)).mtimeMs;
        minStart = Math.min(minStart, mtime); maxFinish = Math.max(maxFinish, mtime);
        if (result.region) region = result.region;
        mode = inserted > 0 ? 'write' : 'preview';
        allErrors += errors;
        runFetched += fetched; runInserted += inserted; runDup += duplicates; runSkipped += skipped; runErrors += errors;
        perSource.push({source: site, lastRunAt: new Date(mtime).toISOString(), fetched, ready: inserted + duplicates, inserted, duplicates, skipped, errors, region: result.region ?? null, report: resultPath});
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const s of perSource) {
            await client.query(`
                INSERT INTO public.scraper_source_status (source, label, region, last_run_at, fetched, ready, inserted, duplicates, skipped, errors, report_path, created_at, updated_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
                ON CONFLICT (source) DO UPDATE SET label=EXCLUDED.label, region=EXCLUDED.region, last_run_at=EXCLUDED.last_run_at,
                  fetched=EXCLUDED.fetched, ready=EXCLUDED.ready, inserted=EXCLUDED.inserted, duplicates=EXCLUDED.duplicates,
                  skipped=EXCLUDED.skipped, errors=EXCLUDED.errors, report_path=EXCLUDED.report_path, updated_at=NOW()`,
                [s.source, s.source.replace('.az', ''), s.region, s.lastRunAt, s.fetched, s.ready, s.inserted, s.duplicates, s.skipped, s.errors, s.report]);
        }
        if (perSource.length) {
            const run = await client.query<{ id: string }>(`
                INSERT INTO public.scraper_runs (started_at, finished_at, region, mode, fetched, ready, inserted, duplicates, skipped, errors, created_at, updated_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW()) RETURNING id`,
                [new Date(minStart).toISOString(), new Date(maxFinish).toISOString(), region, mode, runFetched, runInserted + runDup, runInserted, runDup, runSkipped, runErrors]);
            const runId = run.rows[0]!.id;
            for (const s of perSource) {
                await client.query(`
                    INSERT INTO public.scraper_source_runs (scraper_run_id, source, run_at, fetched, ready, inserted, duplicates, skipped, errors, created_at, updated_at)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
                    [runId, s.source, s.lastRunAt, s.fetched, s.ready, s.inserted, s.duplicates, s.skipped, s.errors]);
            }
        }
        try {
            const schedule = JSON.parse(await readFile(resolve('config/scrape-schedule.json'), 'utf8'));
            await client.query(`INSERT INTO public.scraper_settings (key, value, created_at, updated_at) VALUES ('schedule',$1,NOW(),NOW())
                                ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, [JSON.stringify(schedule)]);
        } catch { /* schedule okunamadı */ }
        await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }

    console.log(JSON.stringify({sources: perSource.length, fetched: runFetched, inserted: runInserted, duplicates: runDup, skipped: runSkipped, errors: allErrors}));
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
} finally {
    await pool.end();
}
