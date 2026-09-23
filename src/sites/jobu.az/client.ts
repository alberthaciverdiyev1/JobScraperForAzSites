import * as cheerio from 'cheerio';
import {fetchList} from '../shared/http.js';
import {parseSalary, type Adapter, type ListJob, type Filter} from '../shared/adapter.js';
import type {SourceRecord} from '../shared/types.js';

const origin = 'https://jobu.az';
const apiPath = '/wp-json/wp/v2/job_listing';

/** HTML/entity kodlu başlığı düz metne çevirir. */
const decode = (value: string) => cheerio.load(`<x>${value}</x>`).text().trim();

export function parseJob(item: SourceRecord): ListJob {
  const metas: SourceRecord = item.metas ?? {};
  const types = Object.values(metas._job_type ?? {}) as string[];
  const categories = Object.values(metas._job_category ?? {}) as string[];
  const locations = Object.values(metas._job_location ?? {}) as string[];
  const level = String(metas._job_career_level || metas._job_experience || '').trim();
  const salary = parseSalary(metas._job_salary);
  const classes: string[] = Array.isArray(item.class_list) ? item.class_list : [];
  return {
    id: Number(item.id),
    title: decode(String(item.title?.rendered ?? '')),
    url: String(item.link),
    companyName: String(metas._job_employer_name ?? '').trim(),
    companyId: 0,
    logo: metas._job_logo || metas._job_featured_image || null,
    // `date` WordPress WP REST yayın tarihidir.
    published: item.date ?? null,
    deadline: metas._job_application_deadline_date || null,
    categoryNames: categories,
    cities: locations,
    employment: types,
    // Hibrid/Remote gibi türler references workplace-types.json ile çalışma yerine çevrilir.
    workplaces: types,
    levels: level ? [level] : [],
    salaryMin: salary[0], salaryMax: salary[1],
    premium: classes.some(c => /featured|premium/i.test(c)) || metas._job_featured === '1',
    active: true
  };
}

export const adapter: Adapter = {
  source: 'jobu.az', key: 'jobu-az',
  // Tüm ilanlar tek WP REST listesinde; kategori/şehir/tür her kaydın `metas` alanında gelir.
  async categories(): Promise<Filter[]> {
    return [{id: 'all', name: 'Bütün elanlar'}];
  },
  async page(_category, cursor) {
    const page = Number(cursor ?? 1);
    const url = new URL(apiPath, origin);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('_fields', 'id,date,link,title,metas,class_list');
    const response = await fetchList('jobu.az', url, 'application/json');
    const items = await response.json();
    if (!Array.isArray(items)) throw new Error('jobu.az liste biçimi değişti.');
    const totalPages = Number(response.headers.get('x-wp-totalpages') ?? '1');
    return {jobs: items.map(parseJob), next: page < totalPages ? String(page + 1) : undefined};
  }
};
