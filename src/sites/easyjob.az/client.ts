import * as cheerio from 'cheerio';
import {fetchList} from '../shared/http.js';
import type {Adapter, ListJob, Filter} from '../shared/adapter.js';
import type {SourceRecord} from '../shared/types.js';

const origin = 'https://easyjob.az';

/** Kart tarihi "gg.aa" (yıl yok) ya da göreli metindir; yayın tarihine çevirir. */
export function cardDate(text: string, today = new Date()): string | null {
  const value = text.trim().toLocaleLowerCase('az');
  const iso = today.toISOString().slice(0, 10);
  if (/bu g[üu]n|bu gun/.test(value)) return iso;
  if (/d[üu]n[əe]n/.test(value)) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10);
  }
  const m = /^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/.exec(value);
  if (!m) return text.trim() || null;
  const dd = m[1]!.padStart(2, '0'), mm = m[2]!.padStart(2, '0');
  const year = m[3] ? Number(m[3]) : today.getUTCFullYear();
  let date = `${year}-${mm}-${dd}`;
  if (!m[3] && date > iso) date = `${year - 1}-${mm}-${dd}`;
  return date;
}

export function parseList(html: string): {jobs: ListJob[]; categories: Filter[]} {
  const $ = cheerio.load(html);
  const categories: Filter[] = [];
  $('select[name="category_id"] option').each((_i, element) => {
    const id = $(element).attr('value');
    const name = $(element).text().trim();
    if (id && name) categories.push({id, name});
  });
  const jobs: ListJob[] = [];
  $('a.job-card-link').each((_i, element) => {
    const card = $(element);
    const href = card.attr('href') ?? '';
    const id = Number(/\/[a-z0-9-]+?-(\d+)\/*$/.exec(href)?.[1]);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    const meta = card.find('.job-meta-item').map((_j, item) => $(item).text().trim()).get();
    jobs.push({
      id,
      title: card.find('.job-title').first().text().trim(),
      url: href.startsWith('http') ? href : `${origin}${href}`,
      companyName: card.find('.job-company').first().text().trim(),
      companyId: 0,
      logo: card.find('.company-logo-wrapper img').attr('src') ?? null,
      published: meta[0] ? cardDate(meta[0]) : null,
      deadline: null,
      categoryNames: [], cities: [], employment: [], workplaces: [], levels: [],
      salaryMin: null, salaryMax: null,
      premium: card.find('.job-badge-premium').length > 0,
      active: true
    });
  });
  return {jobs, categories};
}

async function pageHtml(params: Record<string, string>): Promise<string> {
  const url = new URL('/', origin);
  url.search = new URLSearchParams(params).toString();
  return await (await fetchList('easyjob.az', url)).text();
}

export const adapter: Adapter = {
  source: 'easyjob.az', key: 'easyjob-az',
  async categories(): Promise<Filter[]> {
    const {categories} = parseList(await pageHtml({}));
    if (!categories.length) throw new Error('easyjob.az kategori filtreleri bulunamadı.');
    return categories;
  },
  async page(category, cursor) {
    // Tüm ilanlar tek sayfada; sayfalama yoktur.
    const page = parseList(await pageHtml({category_id: category.id}));
    page.jobs.forEach(job => { job.categoryNames = [category.name]; });
    return {jobs: page.jobs, next: undefined};
  }
};
