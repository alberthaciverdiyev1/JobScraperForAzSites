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
            if (['--file', '--region', '--limit'].includes(args[i]!) && args[i + 1]) {
                i++;
                continue;
            }
            throw new Error(`Geçersiz argüman: ${args[i]}`);
        }
        const region = readRegion(args);
        if (!['all', 'baku', 'other'].includes(region)) throw new Error('region: all/baku/other');
        const limitIndex = args.indexOf('--limit'), limit = limitIndex < 0 ? Infinity : Number(args[limitIndex + 1]);
        if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1 || limit > 500)) throw new Error('limit 1–500 arası tam sayı olmalı.');
        const refs = await loadReferences(pool), siteRefs = await loadSiteReferences(adapter.source), directory = resolve(`data/${adapter.source}`);
        await mkdir(directory, {recursive: true});
        const prefix = `${directory}/${new Date().toISOString().replace(/[:.]/g, '-')}`;
        // --refresh: bilinen kayıtları yok say, tüm listeyi yeniden topla (eksik alanları tazeler).
        const known = args.includes('--refresh') ? new Set<number>() : new Set<number>((await pool.query('SELECT slug FROM public.scraped_vacancies WHERE slug LIKE $1', [`${adapter.key}-%`])).rows.map(r => Number(r.slug.slice(adapter.key.length + 1).split('-')[0])));
        const file = args.indexOf('--file');
        const batch = file >= 0 ? JSON.parse(await readFile(resolve(args[file + 1]!), 'utf8')) : await collectAdapter(adapter, known, console.log, limit);
        if (batch.source !== adapter.source || batch.mode !== 'list-only' || !Array.isArray(batch.vacancies)) throw new Error('Geçersiz kaynak dosyası.');
        await writeFile(`${prefix}-source.json`, JSON.stringify(batch, null, 2));
        const ready = [], skipped = [...(batch.skipped ?? [])];
        for (const job of batch.vacancies as ListJob[]) try {
            if (!inRegion(job, region)) {
                skipped.push({id: job.id, reason: 'region-or-unknown-city'});
                continue;
            }
            const mapped = mapListJob(job, refs, adapter.key, siteRefs);
            if (!mappedInRegion(mapped, refs, region)) {
                skipped.push({id: job.id, reason: 'region-or-unresolved-city'});
                continue;
            }
            ready.push(mapped);
        } catch (e) {
            skipped.push({id: job.id, reason: String(e)});
        }
        await writeFile(`${prefix}-preview.json`, JSON.stringify({
            ready,
            skipped,
            errors: batch.errors,
            region
        }, null, 2));
        let result = {inserted: [] as unknown[], duplicates: [] as unknown[]};
        if (args.includes('--write')) {
            writer = new Pool({
                host: process.env.DB_HOST,
                port: Number(process.env.DB_PORT),
                database: process.env.DB_DATABASE,
                user: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                max: 1,
                statement_timeout: 30000,
                connectionTimeoutMillis: 5000
            });
            result = await importBatch(writer, ready, adapter.key);
        }
        await writeFile(`${prefix}-result.json`, JSON.stringify({
            ...result,
            scans: batch.scans,
            skipped,
            errors: batch.errors,
            region
        }, null, 2));
        console.log(JSON.stringify({
            source: adapter.source,
            fetched: batch.vacancies.length,
            ready: ready.length,
            inserted: result.inserted.length,
            duplicates: result.duplicates.length,
            skipped: skipped.length,
            errors: batch.errors,
            report: `${prefix}-result.json`
        }));
        if (batch.errors?.length) process.exitCode = 1;
    } catch (e) {
        console.error(e);
        process.exitCode = 1;
    } finally {
        await writer?.end();
        await pool.end();
    }
}
