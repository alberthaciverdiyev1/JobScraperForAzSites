import {fetchList} from '../shared/http.js';
import type {Adapter, ListJob, Filter} from '../shared/adapter.js';
import type {SourceRecord} from '../shared/types.js';

const origin = 'https://azvak.az';
const api = 'https://rest.azvak.com.az';

/**
 * azvak.az (Nuxt) verisi `https://rest.azvak.com.az/api` üzerinden gelir:
 * - `/api/departments`: kategoriler (id, name, slug, count).
 * - `/api/vacancies?department=<id>&page=<n>`: ilan listesi (15/sayfa).
 * Kayıtta şehir/iş türü/kıdem/maaş/deadline yoktur; yalnızca kategori (`position` alt kategorisi) ve yayın tarihi.
 * İlan detay sayfası (`/vakansiyalar/<slug>/<id>`) hiçbir zaman çağrılmaz.
 */
export function parseJob(v: SourceRecord, departmentName: string): ListJob {
  const position = Array.isArray(v.position) && v.position[0] ? v.position[0] : null;
  return {
    id: Number(v.id),
    title: String(v.title ?? '').trim(),
    url: `${origin}/vakansiyalar/${position ? encodeURIComponent(String(position.slug)) : 'vakansiya'}/${v.id}`,
    companyName: String(v.company?.name ?? '').trim(),
    companyId: Number(v.company?.id) || 0,
    logo: v.company?.logo ?? null,
    // `created` gg.aa.yyyy biçiminde yayın tarihidir.
    published: v.created ?? null,
    deadline: null,
    categoryNames: [departmentName],
    cities: [], employment: [], workplaces: [], levels: [],
    salaryMin: null, salaryMax: null,
    premium: v.premium === true,
    active: true
  };
}

export const adapter: Adapter = {
  source: 'azvak.az', key: 'azvak-az',
  async categories(): Promise<Filter[]> {
    const body = await (await fetchList('azvak.az', new URL('/api/departments', api), 'application/json')).json();
    if (!Array.isArray(body?.data)) throw new Error('azvak.az kategori listesi geçersiz.');
    return body.data.map((d: SourceRecord) => ({id: String(d.id), name: String(d.name)}));
  },
  async page(department, cursor) {
    const page = Number(cursor ?? 1);
    const url = new URL('/api/vacancies', api);
    url.searchParams.set('department', department.id);
    url.searchParams.set('page', String(page));
    const body = await (await fetchList('azvak.az', url, 'application/json')).json();
    if (!Array.isArray(body?.data)) throw new Error('azvak.az liste biçimi değişti.');
    const jobs = body.data.map((v: SourceRecord) => parseJob(v, department.name));
    const from = Number(body.meta?.current_page ?? page), last = Number(body.meta?.last_page ?? 1);
    return {jobs, next: from < last ? String(from + 1) : undefined};
  },
  // Liste kaydı şehir vermez; `/api/locations` listesi ve `?location=<id>` filtresi
  // ID üyeliğiyle taranarak şehir tamamlanır. Detay endpoint'i çağrılmaz.
  async enrich(jobs, log) {
    const errors: string[] = [], byId = new Map(jobs.map(job => [job.id, job]));
    const locations = (await (await fetchList('azvak.az', new URL('/api/locations', api), 'application/json')).json()).data;
    if (!Array.isArray(locations)) return ['azvak.az konum listesi geçersiz.'];
    // Aynı ilan birden çok konum sorgusunda dönebilir (ör. hem il hem ilçe). En özel konumu
    // (en az sonuçlu sorgu) seçerek çelişkiyi önle.
    const best = new Map<number, {name: string; total: number}>();
    for (const location of locations) {
      try {
        for (let page = 1; page <= 1000; page++) {
          const url = new URL('/api/vacancies', api);
          url.searchParams.set('location', String(location.id));
          url.searchParams.set('page', String(page));
          const body = await (await fetchList('azvak.az', url, 'application/json')).json();
          if (!Array.isArray(body?.data)) throw new Error('azvak.az şehir filtresi yanıtı geçersiz.');
          const total = Number(body.meta?.total ?? 0);
          for (const v of body.data) {
            const id = Number(v.id);
            if (!byId.has(id)) continue;
            const current = best.get(id);
            if (!current || total < current.total) best.set(id, {name: String(location.name), total});
          }
          const from = Number(body.meta?.current_page ?? page), last = Number(body.meta?.last_page ?? 1);
          if (from >= last) break;
          if (page === 1000) throw new Error('Sayfa sınırı aşıldı.');
        }
      } catch (e) {
        errors.push(`location ${location.name}: ${e}`);
      }
    }
    for (const [id, {name}] of best) byId.get(id)!.cities = [name];
    log(`azvak şehir: ${locations.length} konum tarandı`);
    return errors;
  }
};
