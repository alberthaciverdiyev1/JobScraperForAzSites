import 'dotenv/config';
import {readFile, writeFile, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pool} from '../core/database.js';
import {loadReferences} from '../sites/shared/importer.js';
import {referenceFiles} from '../sites/shared/references.js';
import {mapLookups} from '../sites/shared/lookups.js';
import {normalize} from '../sites/shared/categories.js';
import type {References} from '../sites/shared/types.js';

type Section = keyof typeof referenceFiles;
const sections = Object.keys(referenceFiles) as Section[];

const args = process.argv.slice(2);
const write = args.includes('--write');
const siteIndex = args.indexOf('--site');
const onlySite = siteIndex >= 0 ? args[siteIndex + 1] : undefined;
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--write') continue;
    if (args[i] === '--site' && args[i + 1]) { i++; continue; }
    throw new Error(`Geçersiz argüman: ${args[i]} (kullanım: [--site <alan>] [--write])`);
}

function slugOrNull(rows: {id: string; slug: string}[], id: string | null | undefined): string | null {
    const row = id ? rows.find(r => r.id === id) : undefined;
    return row ? row.slug : null;
}

/**
 * Kaynaktaki bir etiketi DB referanslarına göre sezgisel olarak çözmeyi dener.
 * Kategori için otomatik öneri YAPILMAZ: başlık/kategori adı sezgisi yanlış eşleme üretebilir
 * (örn. "Daşınmaz Əmlak" -> taşımacılık). Kategoriler elle eşlenir, yalnızca geçersizlik raporlanır.
 */
function suggest(section: Section, label: string, refs: References): string | null {
    const empty = {job_title: '', city_rels: [], employment_type: '', workplace_type: '', experience_level: ''};
    switch (section) {
        case 'categories': return null;
        case 'cities': {
            const key = normalize(label);
            const matches = refs.cities.filter(city => normalize(city.name.az ?? '') === key || normalize(city.slug) === key);
            return matches.length === 1 ? matches[0]!.slug : null;
        }
        case 'jobTypes': return slugOrNull(refs.jobTypes, mapLookups({...empty, employment_type: label}, refs).jobType.id);
        case 'workplaces': return slugOrNull(refs.workplaces, mapLookups({...empty, workplace_type: label}, refs).workplace.id);
        case 'experienceLevels': return slugOrNull(refs.experienceLevels, mapLookups({...empty, experience_level: label}, refs).experience.id);
    }
}

async function readMap(path: string): Promise<Record<string, string | null>> {
    try {
        const raw = JSON.parse(await readFile(path, 'utf8'));
        return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    } catch { return {}; }
}

try {
    const refs = await loadReferences(pool);
    const sites = (await readdir(resolve('src/sites'), {withFileTypes: true}))
        .filter(entry => entry.isDirectory() && entry.name.endsWith('.az'))
        .map(entry => entry.name)
        .filter(name => !onlySite || name === onlySite);
    if (onlySite && !sites.length) throw new Error(`Kaynak bulunamadı: ${onlySite}`);

    const rowsBySection: Record<Section, {id: string; slug: string}[]> = {
        categories: refs.categories, cities: refs.cities, jobTypes: refs.jobTypes,
        workplaces: refs.workplaces, experienceLevels: refs.experienceLevels,
    };

    let invalid = 0, filled = 0, changedFiles = 0;
    for (const site of sites) {
        for (const section of sections) {
            const path = resolve('src/sites', site, referenceFiles[section]);
            const map = await readMap(path);
            const known = new Set(rowsBySection[section].map(row => row.slug));
            let dirty = false;
            for (const [label, slug] of Object.entries(map)) {
                if (slug) {
                    if (!known.has(slug)) {
                        invalid++;
                        const fix = suggest(section, label, refs);
                        console.log(`  ✗ ${site}/${referenceFiles[section]}: "${label}" -> "${slug}" yerelde yok${fix ? `; öneri: "${fix}"` : '; öneri yok -> null'}`);
                        map[label] = fix; dirty = true;
                    }
                } else {
                    const fix = suggest(section, label, refs);
                    if (fix) { filled++; console.log(`  + ${site}/${referenceFiles[section]}: "${label}" -> "${fix}"`); map[label] = fix; dirty = true; }
                }
            }
            if (dirty) {
                changedFiles++;
                if (write) await writeFile(path, JSON.stringify(map, null, 2) + '\n');
            }
        }
    }

    console.log(JSON.stringify({
        mode: write ? 'write' : 'dry-run',
        sites: sites.length,
        invalidSlugs: invalid,
        newlyFilled: filled,
        changedFiles,
    }));
    if (!write && changedFiles) console.log('Değişiklik yapılmadı; uygulamak için --write ekleyin.');
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
} finally {
    await pool.end();
}
