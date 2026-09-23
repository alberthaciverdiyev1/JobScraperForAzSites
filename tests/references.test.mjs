import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import 'dotenv/config';
import pg from 'pg';

const files = {categories:'categories.json',cities:'cities.json',jobTypes:'job-types.json',workplaces:'workplace-types.json',experienceLevels:'experience-levels.json'};
const tables = {categories:'categories',cities:'cities',jobTypes:'job_types',workplaces:'workplace_types',experienceLevels:'experience_levels'};

const pool = new pg.Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),database:process.env.DB_DATABASE,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,max:1,connectionTimeoutMillis:5000});

test('her referans eşleme dosyasındaki slug yerel referansta tekil olarak var', async () => {
  const slugs = {};
  for (const [section, table] of Object.entries(tables)) {
    slugs[section] = new Set((await pool.query(`SELECT slug FROM public.${table}`)).rows.map(r => r.slug));
  }
  const problems = [];
  for (const site of readdirSync('src/sites').filter(d => d.endsWith('.az'))) {
    for (const [section, file] of Object.entries(files)) {
      const path = resolve('src/sites', site, file);
      if (!existsSync(path)) continue;
      for (const [label, slug] of Object.entries(JSON.parse(readFileSync(path, 'utf8')))) {
        if (!slug) continue;
        if (!slugs[section].has(slug)) problems.push(`${site}/${file}: "${label}" -> "${slug}" yerel ${tables[section]} içinde yok`);
      }
    }
  }
  assert.equal(problems.length, 0, `Geçersiz referans eşlemeleri:\n${problems.join('\n')}`);
});

test.after(async () => { await pool.end(); });
