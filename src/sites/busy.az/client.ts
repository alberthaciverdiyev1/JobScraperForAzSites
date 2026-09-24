import {fetchList} from '../shared/http.js';
import {pageStop} from '../shared/pagination.js';
import {isBeforeCutoff} from '../shared/policy.js';
export type SourceRecord = Record<string, any>;
export interface ScanOptions {
  categoryIds: number[];
  knownIds?: Set<number>;
  limitPerCategory?: number;
  startPage?: number;
  onProgress?: (message: string) => void;
}

async function getList(path: string): Promise<SourceRecord> {
  const response=await fetchList('busy.az',new URL(`https://busy.az/api/bff/api/${path}`),'application/json');
  return await response.json() as SourceRecord;
}

export async function fetchCategoryIds(): Promise<number[]> {
  const result = await getList('filter/categories');
  const categories = result.data?.data ?? result.data ?? result;
  if (!Array.isArray(categories) || !categories.length) throw new Error('Busy.az kategori biçimi değişti.');
  const ids = categories.flatMap(c => [c.id, ...(c.subs ?? []).map((s: SourceRecord) => s.id)]);
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error('Geçersiz kategori ID.');
  return [...new Set<number>(ids)];
}

// Detay endpoint'i kullanılmaz. Her kategori kendi sayfalama sınırına sahiptir.
export async function collectVacancies(options: ScanOptions) {
  const { categoryIds, knownIds = new Set<number>(), limitPerCategory = Infinity, startPage = 1 } = options;
  const collected = new Map<number, SourceRecord>();
  const scans: { categoryId: number; pages: number; added: number; stopReason: string }[] = [];
  const skipped: {sourceId:number;reason:string}[] = [];
  const errors: { categoryId: number; page: number; error: string }[] = [];
  for (const categoryId of [...new Set(categoryIds)]) {
    const seenInCategory = new Set<number>();
    let pages = 0;
    let added = 0;
    let stopReason = 'limit';
    for (let page = startPage; ; page++) {
      try {
        const query = new URLSearchParams({ page: String(page), per_page: '20' });
        query.append('categories[]', String(categoryId));
        const result = await getList(`vacancies?${query}`);
        pages++;
        if (!Array.isArray(result.vacancies)) throw new Error('Busy.az liste biçimi değişti.');
        const items: SourceRecord[] = result.vacancies;
        if (!items.length) { stopReason = 'empty'; break; }
        for (const item of items) {
          if (!Number.isSafeInteger(item.id) || item.id <= 0) throw new Error('Geçersiz ilan kimliği.');
        }
        // Başka kategoride bu çalışmada görülmesi durdurma nedeni değildir.
        // Böylece ortak/premium ilanlar sonraki sayfadaki yeni ilanları gizlemez.
        const reason=pageStop(items.map(item=>item.id),knownIds,seenInCategory);
        if(reason){stopReason=reason;break;}
        const today = new Date().toISOString().slice(0, 10);
        const expired = (item: SourceRecord) => typeof item.deadline === 'string'
          && /^\d{4}-\d{2}-\d{2}/.test(item.deadline) && item.deadline.slice(0, 10) < today;
        if (items.every(expired)) { stopReason = 'all-expired'; break; }
        for (const item of items) {
          seenInCategory.add(item.id);
          if (expired(item) || isBeforeCutoff(item.published ?? item.created_at)) {
            skipped.push({sourceId:item.id,reason:expired(item)?'expired':'published-before-2026-09-15'});continue;
          }
          if (knownIds.has(item.id)) continue;
          const existing = collected.get(item.id);
          if (existing) {
            if (!existing.source_category_ids.includes(categoryId)) existing.source_category_ids.push(categoryId);
            continue;
          }
          collected.set(item.id, { ...listFields(item), source_category_ids: [categoryId] });
          added++;
        }
        // Limit sayfa sınırında uygulanır; aynı sayfanın sonundaki ilanlar kaybolmaz.
        if (seenInCategory.size >= limitPerCategory) { stopReason = 'limit'; break; }
      } catch (error) {
        errors.push({ categoryId, page, error: error instanceof Error ? error.message : String(error) });
        stopReason = 'error';
        break;
      }
    }
    scans.push({ categoryId, pages, added, stopReason });
    options.onProgress?.(`Kategori ${categoryId}: ${pages} sayfa, ${added} yeni ilan; ${stopReason}`);
  }
  return { source: 'busy.az/vacancies', mode: 'list-only', fetchedAt: new Date().toISOString(), vacancies: [...collected.values()], scans, errors, skipped };
}

export function listFields(item: SourceRecord): SourceRecord {
  return {
    id: item.id, job_title: item.job_title, slug: item.slug,
    created_at: item.created_at, published: item.published, deadline: item.deadline,
    company: item.company ? { id: item.company.id, title: item.company.title, slug: item.company.slug, logo: item.company.logo, logo_visible: item.company.logo_visible } : null,
    city_rels: item.city_rels,
    source_employment_type_ids: Array.isArray(item.source_employment_type_ids)
      ? item.source_employment_type_ids.filter((id: unknown) => id === 1 || id === 2) : undefined,
    employment_type: item.employment_type,
    workplace_type: item.workplace_type,
    experience_level: item.experience_level,
    is_remote: typeof item.is_remote === 'boolean' ? item.is_remote : undefined,
    is_hybrid: typeof item.is_hybrid === 'boolean' ? item.is_hybrid : undefined,
    source_category_ids: Array.isArray(item.source_category_ids)
      ? item.source_category_ids.filter((id: unknown) => Number.isSafeInteger(id) && Number(id) > 0) : [],
  };
}

// Gelişmiş arama filtreleri: deneyim (yıl bandı) ve şehir, liste filtresi üyeliğiyle tamamlanır.
// Liste yeni->eski sıralı olduğundan eşik-öncesi sayfada durulur (sınırlı istek).
export async function enrichAdvanced(vacancies: SourceRecord[], onProgress?: (message: string) => void, region: 'all'|'baku'|'other' = 'all') {
  const errors: { sourceId: number | string; error: string }[] = [];
  const byId = new Map(vacancies.map(v => [v.id, v]));
  const pageAll = async (query: (page: number) => string, apply: (v: SourceRecord, label: string) => void, label: string) => {
    for (let page = 1; page <= 1000; page++) {
      const result = await getList(query(page));
      const rows: SourceRecord[] = Array.isArray(result.vacancies) ? result.vacancies : [];
      for (const row of rows) { const target = byId.get(row.id); if (target) apply(target, label); }
      const ordinary = rows.filter(row => !row.is_prime);
      const beforeCutoff = ordinary.length > 0 && ordinary.every(row => isBeforeCutoff(row.published));
      if (!rows.length || page * 100 >= Number(result.count ?? 0) || beforeCutoff) break;
      if (page === 1000) throw new Error('Sayfa sınırı aşıldı.');
    }
  };
  const experiences = (await getList('filter/experiences')).data as SourceRecord[];
  for (const experience of experiences) {
    const label = String(experience.title?.az ?? experience.title?.en ?? experience.title);
    try { await pageAll(page => `vacancies?per_page=100&page=${page}&experiences[]=${experience.id}`, (v, name) => { v.experience_level = name; }, label); }
    catch (error) { errors.push({ sourceId: label, error: String(error) }); }
    onProgress?.(`Deneyim doğrulama: ${label}`);
  }
  const cities = (await getList('filter/cities')).data as SourceRecord[];
  for (const city of cities) {
    const name = String(city.title?.az ?? city.title?.en);
    if (region !== 'all' && /bak/i.test(name) !== (region === 'baku')) continue;
    try {
      await pageAll(page => `vacancies?per_page=100&page=${page}&cities[]=${city.id}`, (v) => {
        if (!Array.isArray(v.city_rels)) v.city_rels = [];
        if (!v.city_rels.some((r: SourceRecord) => r.city?.title?.az === name)) v.city_rels.push({ city: { title: { az: name, en: city.title?.en } } });
      }, name);
    } catch (error) { errors.push({ sourceId: name, error: String(error) }); }
    onProgress?.(`Şehir doğrulama: ${name}`);
  }
  return errors;
}

// İlan ID + çalışma türü filtresi: yalnızca liste endpoint'inden üyelik doğrulanır.
export async function enrichEmploymentTypes(vacancies: SourceRecord[], onProgress?: (message: string) => void) {
  const errors: { sourceId: number; error: string }[] = [];
  for (const [index, vacancy] of vacancies.entries()) {
    const matches: number[] = [];
    delete vacancy.source_employment_type_ids;
    try {
      for (const typeId of [1, 2]) {
        const query = new URLSearchParams({ page: '1', per_page: '20', vacancy_id: String(vacancy.id) });
        query.append('employment_type[]', String(typeId));
        const result = await getList(`vacancies?${query}`);
        if (!Array.isArray(result.vacancies)) throw new Error('Çalışma türü filtre yanıtı geçersiz.');
        if (result.vacancies.some((item: SourceRecord) => item.id === vacancy.id)) matches.push(typeId);
      }
      vacancy.source_employment_type_ids = matches;
    } catch (error) {
      errors.push({ sourceId: vacancy.id, error: error instanceof Error ? error.message : String(error) });
    }
    onProgress?.(`Çalışma türü doğrulama: ${index + 1}/${vacancies.length}`);
  }
  return errors;
}
