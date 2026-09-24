import {fetchList} from '../shared/http.js';
import {isBeforeCutoff} from '../shared/policy.js';
import type {Adapter, ListJob, Filter} from '../shared/adapter.js';
import type {SourceRecord} from '../shared/types.js';

const origin = 'https://api.work.az';

async function values(type: string): Promise<Filter[]> {
    const r = await fetchList('work.az', new URL(`/v1/list-of-values?type=${type}&allItems=true`, origin), 'application/json');
    const b = await r.json();
    if (!Array.isArray(b.data?.content)) throw new Error('Work filtre biçimi değişti.');
    return b.data.content.map((v: SourceRecord) => ({id: String(v.id), name: v.name}));
}

export function parseJob(v: SourceRecord): ListJob {
    const labels = (type: string) => (v.filters ?? []).filter((f: SourceRecord) => f.filterType === type).map((f: SourceRecord) => f.filter?.name).filter(Boolean);
    const employment = labels('EMPLOYMENT_TYPE');
    return {
        id: v.id,
        title: v.title,
        url: `https://www.work.az/vakansiyalar/${encodeURIComponent(v.slug)}`,
        companyName: v.user?.fullName ?? '',
        companyId: v.user?.id ?? 0,
        logo: v.user?.profileImageUrl ? new URL(v.user.profileImageUrl, 'https://work-az-bucket.s3.eu-central-1.amazonaws.com/').href : null,
        published: v.postDate ?? null,
        categoryNames: v.category?.name ? [v.category.name] : [],
        cities: labels('CITY'),
        employment: employment.filter((s: string) => !['Distant', 'Hibrid'].includes(s)),
        workplaces: employment.filter((s: string) => ['Distant', 'Hibrid'].includes(s)),
        levels: labels('RANK_OF_DUTY'),
        salaryMin: v.salaryByAgreement ? null : v.salaryMin ?? null,
        salaryMax: v.salaryByAgreement ? null : v.salaryMax ?? null,
        premium: v.isPremium === true,
        active: v.status === 'ACTIVE'
    };
}

async function search(params: Record<string, unknown>) {
    const r = await fetchList('work.az', new URL('/v1/vacancies', origin), 'application/json', {
        type: 'VACANCY',
        count: 100, ...params
    });
    const b = await r.json();
    if (!Array.isArray(b.data?.content)) throw new Error('Work liste biçimi değişti.');
    return b.data;
}

export const adapter: Adapter = {
    source: 'work.az', key: 'work-az', categories: () => values('CATEGORY'),
    async page(category, cursor) {
        const page = Number(cursor ?? 1), b = await search({categoryIds: [Number(category.id)], page});
        return {
            jobs: b.content.filter((v: SourceRecord) => String(v.category?.id) === category.id).map(parseJob),
            next: b.hasNext ? String(page + 1) : undefined
        };
    },
    async enrich(jobs, log, region = 'all') {
        const errors: string[] = [];
        const byId = new Map(jobs.map(j => [j.id, j]));
        // Kıdem: kartta RANK_OF_DUTY yoksa `rankOfDutyIds` liste filtresi üyeliğiyle tamamlanır
        // (unvan bazlı; deneyim yılı değil).
        for (const rank of await values('RANK_OF_DUTY')) {
            try {
                const seen = new Set<number>();
                for (let page = 1; page <= 1000; page++) {
                    const b = await search({rankOfDutyIds: [Number(rank.id)], page});
                    const rows = b.content as SourceRecord[];
                    for (const row of rows) {
                        const job = byId.get(row.id);
                        if (job) job.levels = [rank.name];
                    }
                    const ordinary = rows.filter(v => !v.isPremium);
                    if (!rows.length || rows.every(v => seen.has(v.id)) || !b.hasNext || (ordinary.length && ordinary.every(v => isBeforeCutoff(v.postDate)))) break;
                    rows.forEach(v => seen.add(v.id));
                    if (page === 1000) throw new Error('Sayfa sınırı');
                }
            } catch (e) {
                errors.push(`Kıdem ${rank.name}: ${e}`);
            }
            log(`Work kıdem: ${rank.name}`);
        }
        for (const city of await values('CITY')) {
            if (region !== 'all' && /bak/i.test(city.name) !== (region === 'baku')) continue;
            try {
                const seen = new Set<number>();
                for (let page = 1; page <= 1000; page++) {
                    const b = await search({locations: [Number(city.id)], page});
                    const rows = b.content as SourceRecord[];
                    for (const row of rows) {
                        const job = byId.get(row.id);
                        if (job && !job.cities.includes(city.name)) job.cities.push(city.name);
                    }
                    const ordinary = rows.filter(v => !v.isPremium);
                    if (!rows.length || rows.every(v => seen.has(v.id)) || !b.hasNext || (ordinary.length && ordinary.every(v => isBeforeCutoff(v.postDate)))) break;
                    rows.forEach(v => seen.add(v.id));
                    if (page === 1000) throw new Error('Sayfa sınırı');
                }
            } catch (e) {
                errors.push(`${city.name}: ${e}`);
            }
            log(`Work şehir: ${city.name}`);
        }
        return errors;
    }
};
