import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

/**
 * Kaynağa özel referans eşleme dosyaları (src/sites/<kaynak>/ altında, boyut başına bir dosya).
 * Her dosya düz bir eşlemedir: anahtar = kaynaktaki değer, değer = bizim yerel referans slug'ımız
 * (karşılığı yoksa null). Bu dosyalardaki geçerli eşlemeler kod içindeki sezgisel kuralların önüne
 * geçer; eksik/geçersiz anahtarlarda sezgisel kurala düşülür. Yeni referans oluşturulmaz.
 */
export interface SiteReferences {
    source?: string;
    categories: Record<string, string | null>;
    cities: Record<string, string | null>;
    jobTypes: Record<string, string | null>;
    workplaces: Record<string, string | null>;
    experienceLevels: Record<string, string | null>;
}

type Section = Exclude<keyof SiteReferences, 'source'>;

/** Boyut -> dosya adı eşlemesi. */
export const referenceFiles: Record<Section, string> = {
    categories: 'categories.json',
    cities: 'cities.json',
    jobTypes: 'job-types.json',
    workplaces: 'workplace-types.json',
    experienceLevels: 'experience-levels.json',
};

export const emptySiteReferences = (): SiteReferences => ({
    categories: {}, cities: {}, jobTypes: {}, workplaces: {}, experienceLevels: {}
});

async function readMap(path: string): Promise<Record<string, string | null>> {
    try {
        const raw = JSON.parse(await readFile(path, 'utf8'));
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
        const result: Record<string, string | null> = {};
        for (const [label, slug] of Object.entries(raw as Record<string, unknown>)) {
            result[label] = typeof slug === 'string' && slug ? slug : null;
        }
        return result;
    } catch {
        return {};
    }
}

export async function loadSiteReferences(source: string): Promise<SiteReferences> {
    const directory = resolve(process.cwd(), 'src/sites', source);
    const result = emptySiteReferences();
    result.source = source;
    for (const [section, file] of Object.entries(referenceFiles) as [Section, string][]) {
        result[section] = await readMap(resolve(directory, file));
    }
    return result;
}

interface Choice { id: string; reason: string }

/** Etiketleri dosyadaki slug'lara çevirir; yalnızca yerel referansta bulunan ve tekilleşen slug kabul edilir. */
export function resolveFromFile(
    labels: string[],
    map: Record<string, string | null>,
    refs: { id: string; slug: string }[],
    evidence: string
): Choice | null {
    const slugs = [...new Set(labels.map(label => map[label]).filter((slug): slug is string => Boolean(slug)))];
    if (!slugs.length) return null;
    if (slugs.length !== 1) return {id: '', reason: `Kaynak etiketleri farklı referanslara çözüldü; boş bırakıldı (${evidence}).`};
    const rows = refs.filter(row => row.slug === slugs[0]);
    if (rows.length !== 1) return {id: '', reason: `Eşleme slug'ı yerel referansta tekil bulunamadı: ${slugs[0]}.`};
    return {id: rows[0]!.id, reason: `${evidence} (kaynak referans dosyası)`};
}

/** Çözülemeyen durumda null döner ve çağıran sezgisel yola düşer. */
export function siteChoice(labels: string[], map: Record<string, string | null>, rows: { id: string; slug: string }[], evidence: string): Choice | null {
    const resolved = resolveFromFile(labels, map, rows, evidence);
    return resolved && resolved.id ? resolved : null;
}
