import {fetchList} from '../shared/http.js';
import type {Adapter, ListJob, Filter} from '../shared/adapter.js';
import type {SourceRecord} from '../shared/types.js';

const origin = 'https://jobnet.az';
const api = 'https://api.jobnet.az';

export function parseJob(v: SourceRecord): ListJob {
  const categoryName = v.category?.name ?? v.categoryName ?? '';
  const cityName = v.city?.name ?? '';
  return {
    id: Number(v.id),
    title: String(v.job_title ?? '').trim(),
    url: `${origin}/vacancies/${encodeURIComponent(String(v.slug))}`,
    companyName: String(v.employer?.name ?? '').trim(),
    companyId: Number(v.employer?.id) || 0,
    logo: v.employer?.logo ? `${api}${v.employer.logo}` : null,
    // `created_at` yayın tarihidir.
    published: v.created_at ?? null,
    deadline: null,
    categoryNames: categoryName ? [String(categoryName)] : [],
    cities: cityName ? [String(cityName)] : [],
    employment: [], workplaces: [], levels: [],
    salaryMin: typeof v.salary_min === 'number' ? v.salary_min : null,
    salaryMax: typeof v.salary_max === 'number' ? v.salary_max : null,
    premium: v.isPremium === true,
    // API herkese açık listede `status_label: pending` döndürse de bu ilanlar yayında;
    // `isActive` alanı güvenilir olmadığı için ilan aktif kabul edilir.
    active: true
  };
}

export const adapter: Adapter = {
  source: 'jobnet.az', key: 'jobnet-az',
  async categories(): Promise<Filter[]> {
    return [{id: 'all', name: 'Bütün vakansiyalar'}];
  },
  async page(_category, cursor) {
    const page = Number(cursor ?? 1);
    const url = new URL('/api/v1/vacancies', api);
    url.searchParams.set('page', String(page));
    const body = await (await fetchList('jobnet.az', url, 'application/json')).json();
    const paginator = body?.data?.[0]?.data;
    if (!Array.isArray(paginator?.data)) throw new Error('jobnet.az liste biçimi değişti.');
    const jobs = paginator.data.map(parseJob);
    return {jobs, next: Number(paginator.current_page) < Number(paginator.last_page) ? String(Number(paginator.current_page) + 1) : undefined};
  },
  // Liste kaydı iş türü/kıdem vermez; `/api/v1/vacancy-filters` seçenekleri ve
  // `working_type`/`work_experience` filtreleri ID üyeliğiyle taranır. Detay endpoint'i çağrılmaz.
  async enrich(jobs, log) {
    const errors: string[] = [], byId = new Map(jobs.map(job => [job.id, job]));
    const filters = (await (await fetchList('jobnet.az', new URL('/api/v1/vacancy-filters', api), 'application/json')).json()).data as SourceRecord;
    const apply = async (param: string, id: number, name: string, target: 'employment' | 'levels') => {
      for (let page = 1; page <= 1000; page++) {
        const url = new URL('/api/v1/vacancies', api);
        url.searchParams.set(param, String(id));
        url.searchParams.set('page', String(page));
        const body = await (await fetchList('jobnet.az', url, 'application/json')).json();
        const paginator = body?.data?.[0]?.data;
        if (!Array.isArray(paginator?.data)) throw new Error('jobnet.az filtre yanıtı geçersiz.');
        for (const v of paginator.data) { const job = byId.get(Number(v.id)); if (job) target === 'levels' ? (job.levels = [name]) : (job.employment = [name]); }
        if (Number(paginator.current_page) >= Number(paginator.last_page)) break;
        if (page === 1000) throw new Error('Sayfa sınırı aşıldı.');
      }
    };
    for (const type of filters.working_types ?? []) {
      try { await apply('working_type', type.id, String(type.name_vacancy ?? type.name), 'employment'); }
      catch (e) { errors.push(`working_type ${type.name}: ${e}`); }
      log(`jobnet iş türü: ${type.name}`);
    }
    for (const exp of filters.work_experience ?? []) {
      try { await apply('work_experience', exp.id, String(exp.name), 'levels'); }
      catch (e) { errors.push(`work_experience ${exp.name}: ${e}`); }
      log(`jobnet kıdem: ${exp.name}`);
    }
    return errors;
  }
};
