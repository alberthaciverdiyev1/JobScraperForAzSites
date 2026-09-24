import {readRegion, mappedInRegion} from './region.js';
import 'dotenv/config';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Pool} from 'pg';
import {pool} from '../../core/database.js';
import {loadReferences, importBatch} from './importer.js';
import {collectAdapter, mapListJob, inRegion, type Adapter, type ListJob, type Region} from './adapter.js';
import {loadSiteReferences} from './references.js';

export async function run(adapter: Adapter) {
    const args = process.argv.slice(2);
    let writer: Pool | undefined;
    try {
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--write' || args[i] === '--refresh') continue;
            if (['--file', '--region', '--limit'].includes(args[i]!) && args[i + 1]) { i++; continue; }
            throw new Error(`Geçersiz argüman: ${args[i]}`);
        }
        const region = readRegion(args);
        if (!['all', 'baku', 'other'].includes(region)) throw new Error('region: all/baku/other');
        const limitIndex = args.indexOf('--limit'), limit = limitIndex < 0 ? Infinity : Number(args[limitIndex + 1]);
        if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1 || limit > 500)) throw new Error('limit 1–500 arası tam sayı olmalı.');
        const write = args.includes('--write');
        const refs = await loadReferences(pool), siteRefs = await loadSiteReferences(adapter.source), directory = resolve(`data/${adapter.source}`);
        await mkdir(directory, {recursive: true});
        const prefix = `${directory}/${new Date().toISOString().replace(/[:.]/g, '-')}`;
        // --refresh: bilinen kayıtları yok say, tüm listeyi yeniden topla.
        const known = args.includes('--refresh') ? new Set<number>() : new Set<number>((await pool.query('SELECT slug FROM public.scraped_vacancies WHERE slug LIKE $1', [`${adapter.key}-%`])).rows.map(r => Number(r.slug.slice(adapter.key.length + 1).split('-')[0])));
        if (write) {
            writer = new Pool({
                host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_DATABASE,
                user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, max: 1,
                statement_timeout: 30000, connectionTimeoutMillis: 5000
            });
        }

        const mapFor = (job: ListJob): {mapped?: ReturnType<typeof mapListJob>; skip?: string} => {
            if (!inRegion(job, region)) return {skip: 'region-or-unknown-city'};
            const mapped = mapListJob(job, refs, adapter.key, siteRefs);
            if (!mappedInRegion(mapped, refs, region)) return {skip: 'region-or-unresolved-city'};
            return {mapped};
        };

        let insertedCount = 0, duplicateCount = 0, updatedCount = 0;
        const dbErrors: string[] = [];
        // Kategori biter bitmez toplananları hemen yaz (kademeli insert).
        const flush = async (jobs: ListJob[]) => {
            const mapped = [];
            for (const job of jobs) { try { const r = mapFor(job); if (r.mapped) mapped.push(r.mapped); } catch { /* son eşlemede raporlanır */ } }
            if (write && writer && mapped.length) {
                try { const res = await importBatch(writer, mapped, adapter.key); insertedCount += res.inserted.length; duplicateCount += res.duplicates.length; }
                catch (e) { dbErrors.push(String(e)); }
            }
            for (const job of jobs) known.add(job.id);
        };

        const file = args.indexOf('--file');
        const batch = file >= 0
            ? JSON.parse(await readFile(resolve(args[file + 1]!), 'utf8'))
            : await collectAdapter(adapter, known, console.log, limit, write ? flush : undefined, region);
        if (batch.source !== adapter.source || batch.mode !== 'list-only' || !Array.isArray(batch.vacancies)) throw new Error('Geçersiz kaynak dosyası.');
        await writeFile(`${prefix}-source.json`, JSON.stringify(batch, null, 2));

        // Nihai (enrich sonrası) eşleme: önizleme + eksik referansları tamamlayan güncelleme.
        const ready = [], skipped = [...(batch.skipped ?? [])];
        for (const job of batch.vacancies as ListJob[]) try {
            const r = mapFor(job);
            if (r.mapped) ready.push(r.mapped); else skipped.push({id: job.id, reason: r.skip});
        } catch (e) {
            skipped.push({id: job.id, reason: String(e)});
        }
        await writeFile(`${prefix}-preview.json`, JSON.stringify({ready, skipped, errors: [...(batch.errors ?? []), ...dbErrors], region}, null, 2));

        if (write && writer) {
            const res = await importBatch(writer, ready, adapter.key);
            insertedCount += res.inserted.length;
            if (file >= 0) duplicateCount += res.duplicates.length; else updatedCount += res.duplicates.length;
        }
        await writeFile(`${prefix}-result.json`, JSON.stringify({
            inserted: Array.from({length: insertedCount}), duplicates: Array.from({length: duplicateCount}),
            updated: updatedCount, scans: batch.scans, skipped, errors: [...(batch.errors ?? []), ...dbErrors], region
        }, null, 2));
        console.log(JSON.stringify({
            source: adapter.source, fetched: batch.vacancies.length, ready: ready.length,
            inserted: insertedCount, duplicates: duplicateCount, updated: updatedCount,
            skipped: skipped.length, errors: [...(batch.errors ?? []), ...dbErrors], report: `${prefix}-result.json`
        }));
        if (batch.errors?.length || dbErrors.length) process.exitCode = 1;
    } catch (e) {
        console.error(e);
        process.exitCode = 1;
    } finally {
        await writer?.end();
        await pool.end();
    }
}
