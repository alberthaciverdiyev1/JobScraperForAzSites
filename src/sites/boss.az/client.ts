import {fetchList} from '../shared/http.js';
import {isBeforeCutoff} from '../shared/policy.js';
import type {Adapter, ListJob, Filter} from '../shared/adapter.js';
import type {SourceRecord} from '../shared/types.js';

const query = `query ScraperPage($filter: AdFilter, $after: String) { vacancies(filter:$filter, first:100, after:$after, sortBy:DATE) { nodes { id positionName name categoryId regionId location logo createdAt bumpedAt status salaryFrom salaryTo isFeatured } pageInfo { hasNextPage endCursor } } }`;
const categories = new Map<string, string>(), regions = new Map<string, string>();

async function request(query: string, variables: Record<string, unknown> = {}) {
    const b = await (await fetchList('boss.az', new URL('https://boss.az/graphql'), 'application/json', {
        query,
        variables
    })).json();
    if (b.errors?.length) throw new Error(b.errors.map((e: SourceRecord) => e.message).join('; '));
    if (!b.data) throw new Error('Boss liste biçimi değişti.');
    return b.data;
}

export function parseJob(v: SourceRecord): ListJob {
    return {
        id: Number(v.id),
        title: v.positionName.trim(),
        url: `https://boss.az/vacancies/${v.id}`,
        companyName: v.name ?? '',
        companyId: 0,
        logo: v.logo ?? null,
        published: v.createdAt ?? v.bumpedAt ?? null,
        categoryNames: categories.has(String(v.categoryId)) ? [categories.get(String(v.categoryId))!] : [],
        cities: regions.has(String(v.regionId)) ? [regions.get(String(v.regionId))!] : v.location ? [v.location] : [],
        employment: [],
        workplaces: [],
        levels: [],
        salaryMin: v.salaryFrom ?? null,
        salaryMax: v.salaryTo ?? null,
        premium: v.isFeatured === true,
        active: v.status === 'approved'
    };
}

export const adapter: Adapter = {
    source: 'boss.az', key: 'boss-az',
    async categories() {
        const data = await request('query ScraperFilters { categories { id name parentId children { id name parentId } } regions { id name } }');
        const result: Filter[] = [];
        for (const row of data.regions) regions.set(String(row.id), row.name);
        for (const row of data.categories) {
            for (const v of [row, ...(row.children ?? [])]) {
                categories.set(String(v.id), v.name);
                result.push({id: String(v.id), name: v.name});
            }
        }
        return [...new Map(result.map(c => [c.id, c])).values()];
    },
    async page(category, cursor) {
        const b = (await request(query, {filter: {categoryIds: [category.id]}, after: cursor ?? null})).vacancies;
        if (!Array.isArray(b?.nodes)) throw new Error('Boss ilan listesi geçersiz.');
        return {jobs: b.nodes.map(parseJob), next: b.pageInfo?.hasNextPage ? b.pageInfo.endCursor : undefined};
    },
    // Liste kartı deneyim alanı sunmaz; deneyim, `experienceIds` liste filtresi üyeliğiyle
    // (kategori ID doğrulamasındaki gibi) tamamlanır. Detay endpoint'i çağrılmaz.
    async enrich(jobs, log) {
        const errors: string[] = [], byId = new Map(jobs.map(job => [job.id, job]));
        let list: SourceRecord[];
        try {
            list = (await request('query ScraperExperiences { experiences { id name } }')).experiences;
        } catch (e) {
            return [`Boss deneyim listesi alınamadı: ${e}`];
        }
        if (!Array.isArray(list) || !list.length) return ['Boss deneyim seçenekleri boş.'];
        for (const experience of list) {
            try {
                const seen = new Set<number>();
                let after: string | undefined;
                for (let page = 1; page <= 1000; page++) {
                    const b = (await request(query, {filter: {experienceIds: [String(experience.id)]}, after: after ?? null})).vacancies;
                    const rows = b.nodes as SourceRecord[];
                    for (const row of rows) {
                        const job = byId.get(Number(row.id));
                        if (job) job.levels = [experience.name];
                    }
                    const ordinary = rows.filter(row => row.isFeatured !== true);
                    const old = ordinary.length > 0 && ordinary.every(row => isBeforeCutoff(row.createdAt ?? row.bumpedAt));
                    const repeated = rows.length > 0 && rows.every(row => seen.has(Number(row.id)));
                    if (!rows.length || old || repeated || !b.pageInfo?.hasNextPage) break;
                    rows.forEach(row => seen.add(Number(row.id)));
                    after = b.pageInfo.endCursor;
                    if (page === 1000) throw new Error('Sayfa sınırı aşıldı.');
                }
                log(`Boss deneyim: ${experience.name}`);
            } catch (e) {
                errors.push(`Boss deneyim ${experience.name}: ${e}`);
            }
        }
        return errors;
    }
};
