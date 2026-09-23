import {mapLookups} from './lookups.js';
import {mapCategory, normalize, slugify} from './categories.js';
import {finalizeVacancy, type MappedVacancy} from './vacancy.js';
import {isBeforeCutoff, publicationDate} from './policy.js';
import {pageStop} from './pagination.js';
import {emptySiteReferences, siteChoice, type SiteReferences} from './references.js';
import type {References} from './types.js';

export interface ListJob {
    id: number;
    title: string;
    url: string;
    companyName: string;
    companyId: number;
    logo: string | null;
    published: string | null;
    categoryNames: string[];
    cities: string[];
    employment: string[];
    workplaces: string[];
    levels: string[];
    salaryMin: number | null;
    salaryMax: number | null;
    currency?: string;
    deadline?: string | null;
    premium?: boolean;
    active?: boolean;
}

export interface Filter {
    id: string;
    name: string
}

export interface Adapter {
    source: string;
    key: string;

    categories(): Promise<Filter[]>;

    page(category: Filter, cursor?: string): Promise<{ jobs: ListJob[]; next?: string }>;

    enrich?(jobs: ListJob[], log: (s: string) => void): Promise<string[]>;
}

export type Region = 'all' | 'baku' | 'other';
export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const categoryRules: [RegExp, string][] = [
    [/satinalma|techizat zenciri/, 'satinalma-ve-techizat'], [/maliyye|muhasibat|bank|sigorta/, 'maliyye-ve-muhasibatliq'],
    [/\bmarketinq|reklam|\bpr\b/, 'marketinq-reklam-pr'], [/informasiya|proqram|\bit\b|texnologiya/, 'informasiya-texnologiyalari'],
    [/insan resurs/, 'heyetin-idareolunmasi'], [/inzibati|biznes.*idare|menecment/, 'inzibati-heyet'], [/satis|perakende|musteri|telemarketinq/, 'satis-ve-musteri-xidmeti'],
    [/dizayn|incesenet/, 'dizayn'], [/huquq/, 'huquqsunasliq'], [/tehsil|telim/, 'tehsil-ve-elm'], [/senaye|muhendis|tikinti|istehsal/, 'senaye-tikinti-ve-istehsalat'],
    [/kend teserruf/, 'kend-teserrufati'], [/tibb|sehiyye|eczaciliq/, 'tibb-ve-eczaciliq'], [/turizm|otel|restoran|iase/, 'turizm-oteller-restoranlar'],
    [/neqliyyat|logistika|dasinma/, 'neqliyyat-dasinma-ve-logistika'], [/xidmet|temizlik|tehlukesizlik/, 'xidmet-personali'],
    [/idman|gozellik|fitness/, 'idman-zallari-fitness-gozellik-salonlari'], [/media|jurnalistika/, 'jurnalistika-ve-media'], [/muxtelif|diger/, 'muxtelif'],
];

export function categoryId(names: string[], refs: References): string | undefined {
    const matches = names.flatMap(name => {
        const key = normalize(name),
            exact = refs.categories.filter(c => normalize(c.name.az ?? '') === key || normalize(c.slug) === key);
        if (exact.length === 1) return [exact[0]!.id];
        const rule = categoryRules.find(([pattern]) => pattern.test(key));
        const row = rule && refs.categories.find(c => c.slug === rule[1]);
        return row ? [row.id] : [];
    });
    return new Set(matches).size === 1 ? matches[0] : undefined;
}

export function mapListJob(v: ListJob, refs: References, key: string, siteRefs: SiteReferences = emptySiteReferences()): MappedVacancy {
    if (!Number.isSafeInteger(v.id) || v.id <= 0 || !v.title.trim() || v.title.length > 255 || !v.companyName.trim() || v.companyName.length > 255) throw new Error('İlan/şirket adı veya kaynak kimliği geçersiz.');
    if (v.active === false) throw new Error('İlan aktif değil.');
    // Kaynağa özel references.json eşlemeleri sezgisel kuralların önüne geçer.
    // Kaynak dosyasındaki kategori eşlemesi önceliklidir. Birden çok kategori adı
    // farklı slug'lara çözülürse (ör. ["Fotoqraf","Videoqraf"]) ilk eşleşen kullanılır.
    const mappedCategoryRows = [...new Set(v.categoryNames.map(name => siteRefs.categories[name]).filter((slug): slug is string => Boolean(slug)))]
        .map(slug => refs.categories.find(c => c.slug === slug)).filter((row): row is (typeof refs.categories)[number] => Boolean(row));
    const category = (mappedCategoryRows.length
        ? {id: mappedCategoryRows[0]!.id, reason: mappedCategoryRows.length > 1 ? 'Çoklu kategori; ilk eşleşen (kaynak referans dosyası)' : 'Kaynak kategori adı (kaynak referans dosyası)'}
        : null) ?? mapCategory(v.title, categoryId(v.categoryNames, refs), refs);
    const lookup = mapLookups({
        job_title: v.title, city_rels: v.cities.map(city => ({city})), employment_filter_labels: v.employment,
        workplace_type: v.workplaces.join(' / '), experience_level: v.levels.join(' / ')
    }, refs);
    const city = siteChoice(v.cities, siteRefs.cities, refs.cities, 'Liste şehir adı') ?? lookup.city;
    const jobType = siteChoice(v.employment, siteRefs.jobTypes, refs.jobTypes, 'Liste çalışma türü') ?? lookup.jobType;
    const workplace = siteChoice(v.workplaces, siteRefs.workplaces, refs.workplaces, 'Liste çalışma yeri türü') ?? lookup.workplace;
    const experience = siteChoice(v.levels, siteRefs.experienceLevels, refs.experienceLevels, 'Liste kıdem düzeyi') ?? lookup.experience;
    return finalizeVacancy({
        sourceId: v.id,
        sourceUrl: v.url,
        companySourceId: v.companyId,
        companyName: v.companyName,
        companyLogo: v.logo,
        title: v.title,
        slug: `${key}-${v.id}-${slugify(v.title).slice(0, 190)}`,
        categoryId: category.id,
        categoryReason: category.reason,
        cityId: city.id,
        jobTypeId: jobType.id,
        workplaceTypeId: workplace.id,
        experienceLevelId: experience.id,
        salaryMin: v.salaryMin,
        salaryMax: v.salaryMax,
        currency: v.currency ?? 'AZN',
        deadline: v.deadline ?? null,
        requirements: null,
        skills: [],
        applicationEmail: null,
        description: `<p>${escapeHtml(v.title)} — ${escapeHtml(v.companyName)}</p>` + (v.cities.length ? `<p>İş yeri: ${escapeHtml(v.cities.join(', '))}</p>` : '') + `<p>İlan siyahısından. <a href="${escapeHtml(v.url)}">Orijinal elan və müraciət</a>.</p>`,
        shortDescription: `${v.title} — ${v.companyName}`.slice(0, 300),
        lookupReasons: {
            city: city.reason,
            jobType: jobType.reason,
            workplace: workplace.reason,
            experience: experience.reason
        },
        warnings: ['Yalnızca liste verisi.']
    }, refs, v.published);
}

export function inRegion(v: ListJob, region: Region) {
    return region === 'all' || (v.cities.length > 0 && (region === 'baku' ? v.cities.some(c => normalize(c) === 'baki') : v.cities.some(c => normalize(c) !== 'baki')));
}

export async function collectAdapter(adapter: Adapter, known: Set<number>, log = console.log, limitPerCategory = Infinity) {
    if (limitPerCategory !== Infinity && (!Number.isInteger(limitPerCategory) || limitPerCategory < 1)) throw new Error('limit pozitif tam sayı olmalı.');
    const jobs = new Map<number, ListJob>(), skipped: object[] = [], scans: object[] = [], errors: string[] = [];
    for (const category of await adapter.categories()) {
        const seen = new Set<number>();
        let cursor: string | undefined, addedInCategory = 0, limitHit = false;
        try {
            for (let page = 1; page <= 1000; page++) {
                const result = await adapter.page(category, cursor), ordinary = result.jobs.filter(j => !j.premium);
                const stop = pageStop((ordinary.length ? ordinary : result.jobs).map(j => j.id), known, seen);
                for (const job of result.jobs) {
                    if (isBeforeCutoff(job.published) || job.active === false) {
                        skipped.push({id: job.id, reason: job.active === false ? 'inactive' : 'before-cutoff'});
                        continue;
                    }
                    if (known.has(job.id)) continue;
                    const previous = jobs.get(job.id);
                    if (previous) previous.categoryNames = [...new Set([...previous.categoryNames, ...job.categoryNames])]; else {
                        jobs.set(job.id, job);
                        addedInCategory++;
                    }
                }
                // The list is newest-first apart from premium rows. Stop only a wholly old ordinary page.
                const old = ordinary.length > 0 && ordinary.every(j => isBeforeCutoff(j.published));
                if (limitPerCategory !== Infinity && addedInCategory >= limitPerCategory) limitHit = true;
                if (stop || old || limitHit || !result.next) {
                    scans.push({
                        category: category.name,
                        pages: page,
                        stop: stop ?? (old ? 'before-cutoff' : limitHit ? 'limit' : 'last-page')
                    });
                    log(`${category.name}: ${page} sayfa`);
                    break;
                }
                for (const j of result.jobs) seen.add(j.id);
                cursor = result.next;
                if (page === 1000) throw new Error('Sayfa güvenlik sınırı aşıldı.');
            }
        } catch (e) {
            errors.push(`${category.name}: ${e}`);
        }
    }
    if (jobs.size && adapter.enrich) errors.push(...await adapter.enrich([...jobs.values()], log));
    return {source: adapter.source, mode: 'list-only', vacancies: [...jobs.values()], scans, skipped, errors};
}

export function parseSalary(text: unknown): [number | null, number | null] {
    if (typeof text === 'number') return [text, text];
    if (typeof text !== 'string') return [null, null];
    const clean = text.replace(/\s*(AZN|₼|manat)\s*/gi, '').trim();
    const m = /^(\d+(?:\.\d+)?)(?:\s*[-–—]\s*(\d+(?:\.\d+)?))?$/.exec(clean);
    return m ? [Number(m[1]), Number(m[2] ?? m[1])] : [null, null];
}
