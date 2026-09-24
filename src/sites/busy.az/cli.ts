import {readRegion,mappedInRegion} from '../shared/region.js';
import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { pool as readPool } from '../../core/database.js';
import { collectVacancies, fetchCategoryIds, listFields, enrichEmploymentTypes, enrichAdvanced } from './client.js';
import { loadReferences, prepareBatch, importBatch } from './importer.js';
import { loadSiteReferences } from '../shared/references.js';
import type { Mapping } from './mapper.js';

const args = process.argv.slice(2);
function option(name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} değeri eksik.`);
  return value;
}
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--write' || args[i] === '--refresh') continue;
  if (['--file', '--limit', '--page', '--region'].includes(args[i]!)) { i++; continue; }
  throw new Error(`Bilinmeyen argüman: ${args[i]}`);
}
const region=readRegion(args);
const write = args.includes('--write');
const limit = option('--limit') === undefined ? Infinity : Number(option('--limit'));
const page = Number(option('--page') ?? 1);
if ((limit !== Infinity && (!Number.isInteger(limit) || limit < 1 || limit > 500)) || !Number.isInteger(page) || page < 1) throw new Error('limit 1–500; page pozitif tam sayı olmalı.');
let writer: Pool | undefined;
try {
  const directory = resolve('data/busy.az');
  await mkdir(directory, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const file = option('--file');
  const refresh = args.includes('--refresh');
  const knownIds = refresh ? new Set<number>() : new Set<number>((await readPool.query<{ slug: string }>(
    "SELECT slug FROM public.scraped_vacancies WHERE slug LIKE 'busy-az-%'",
  )).rows.flatMap(({ slug }) => {
    const match = /^busy-az-(\d+)-/.exec(slug);
    return match ? [Number(match[1])] : [];
  }));
  const batch = file ? JSON.parse(await readFile(resolve(file), 'utf8')) : await collectVacancies({
    categoryIds: await fetchCategoryIds(), knownIds, limitPerCategory: limit, startPage: page,
    onProgress: message => console.log(message),
  });
  if (!Array.isArray(batch.vacancies)) throw new Error('Geçersiz ilan dosyası.');
  if (file && batch.mode !== 'list-only') throw new Error('Yalnızca mode=list-only kaynak dosyası kabul edilir.');
  batch.vacancies = batch.vacancies.map(listFields);
  const mapping: Mapping = JSON.parse(await readFile(resolve('src/sites/busy.az/category-adaptation.json'), 'utf8'));
  const refs = await loadReferences(readPool);
  const siteRefs = await loadSiteReferences('busy.az');
  if (!file) {
    await writeFile(`${directory}/${runId}-source.json`, JSON.stringify(batch, null, 2));
    const readyIds = new Set(prepareBatch(batch.vacancies, refs, mapping, siteRefs).ready.map(v => v.sourceId));
    const enrichmentErrors = await enrichEmploymentTypes(batch.vacancies.filter((v: { id: number }) => readyIds.has(v.id)), message => console.log(message));
    const advancedErrors = await enrichAdvanced(batch.vacancies.filter((v: { id: number }) => readyIds.has(v.id)), message => console.log(message), region);
    batch.errors = [...(batch.errors ?? []), ...enrichmentErrors, ...advancedErrors.map(e => `${e.sourceId}: ${e.error}`)];
  }
  if (!file) await writeFile(`${directory}/${runId}-source.json`, JSON.stringify(batch, null, 2));
  const prepared = prepareBatch(batch.vacancies, refs, mapping, siteRefs);
  prepared.ready=prepared.ready.filter(job=>{if(mappedInRegion(job,refs,region))return true;prepared.skipped.push({sourceId:job.sourceId,title:job.title,reason:'region-or-unresolved-city'});return false;});
  const previewPath = `${directory}/${runId}-preview.json`;
  await writeFile(previewPath, JSON.stringify({ ...prepared, fetchErrors: batch.errors ?? [] }, null, 2));
  console.log(JSON.stringify({ mode: write ? 'write' : 'preview', fetched: batch.vacancies.length, ready: prepared.ready.length, skipped: prepared.skipped, scans: batch.scans, errors: batch.errors, previewPath }, null, 2));
  if (write) {
    writer = new Pool({
      host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_DATABASE,
      user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, max: 1,
      connectionTimeoutMillis: 5000, statement_timeout: 30000,
      options: '-c default_transaction_read_only=off',
    });
    const result = await importBatch(writer, prepared.ready);
    const reportPath = `${directory}/${runId}-result.json`;
    await writeFile(reportPath, JSON.stringify({ ...result, scans: batch.scans, skipped: prepared.skipped, fetchErrors: batch.errors ?? [] }, null, 2));
    console.log(JSON.stringify({ inserted: result.inserted.length, duplicates: result.duplicates.length, reportPath }));
  }
  if (batch.errors?.length) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await writer?.end();
  await readPool.end();
}
