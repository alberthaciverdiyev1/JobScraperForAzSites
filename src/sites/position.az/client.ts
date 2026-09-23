import * as cheerio from 'cheerio';
import {fetchList} from '../shared/http.js';
import type {Adapter,ListJob,Filter} from '../shared/adapter.js';
import type {SourceRecord} from '../shared/types.js';

const origin = 'https://www.position.az';

/**
 * position.az iki liste kanalı sunar:
 * - `GET /az` : tüm aktif ilanlar HTML tablo satırları halinde (kategori id->isim haritası ve
 *   logo/premium buradan çıkarılır).
 * - `GET /az/vacancies?page=N` : JSON liste (id, category_id, duration_from, duration_to, başlık,
 *   şirket, slug). Yayın/son tarih kesin olduğu için asıl liste buradan okunur.
 * İlan detay sayfası (`/az/vacancy/<slug>`) hiçbir zaman çağrılmaz.
 */
const categoryNames = new Map<string, string>();
const cityNames = new Map<string, string>();
const workGraphicNames = new Map<string, string>();
const logos = new Map<string, string>();
const premium = new Set<string>();
const rowAttrs = new Map<string, {city: string[]; workGraphic: string[]}>();

/** Filtre select'lerinin (id -> etiket) ve satır `data-*` değerlerinin haritalarını çıkarır. */
export function parseHome(html: string) {
  const $ = cheerio.load(html);
  for (const element of $('[data-filter^=".category-"]').toArray()) {
    const id = ($(element).attr('data-filter') ?? '').replace('.category-', '');
    const name = $(element).find('span[class*="text"]').first().text().trim();
    if (id && name && !categoryNames.has(id)) categoryNames.set(id, name);
  }
  const optionMap = (selectId: string, target: Map<string, string>) => {
    $(`select#${selectId} option`).each((_i, element) => {
      const value = $(element).attr('value');
      const name = $(element).text().trim();
      if (value && name) target.set(value, name);
    });
  };
  optionMap('city', cityNames);
  optionMap('work_graphic', workGraphicNames);
  for (const row of $('tr[class*="category-"]').toArray()) {
    const $row = $(row);
    const id = /(\d+)\s*$/.exec($row.find('a[href*="/az/vacancy/"]').first().attr('href') ?? '')?.[1];
    if (!id) continue;
    const logo = $row.find('img.vacancy-logo').attr('src');
    if (logo) logos.set(id, logo);
    if ($row.find('.hightlited-premium').length) premium.add(id);
    // Satır data-* değerleri liste kanalının verdiği yer/iş qrafiki (şu an sitede sabit varsayılan).
    let cityIds: string[] = [];
    try { cityIds = (JSON.parse(($row.attr('data-city') ?? '[]').replace(/&quot;/g, '"')) as unknown[]).map(String); } catch { cityIds = []; }
    const workGraphic = workGraphicNames.get($row.attr('data-work_graphic') ?? '');
    rowAttrs.set(id, {
      city: cityIds.map(cityId => cityNames.get(cityId)).filter((name): name is string => Boolean(name)),
      workGraphic: workGraphic ? [workGraphic] : []
    });
  }
  return {categoryNames, cityNames, workGraphicNames, logos, premium, rowAttrs};
}

export function parseJob(v: SourceRecord): ListJob {
  const id = String(v.id);
  const attrs = rowAttrs.get(id);
  return {
    id: Number(v.id),
    title: String(v.large_title ?? v.short_title ?? '').trim(),
    url: `${origin}/az/vacancy/${encodeURIComponent(String(v.slug))}`,
    companyName: String(v.company_name ?? '').trim(),
    companyId: 0,
    logo: logos.get(id) ?? null,
    published: v.duration_from ?? null,
    deadline: v.duration_to ?? null,
    categoryNames: categoryNames.has(String(v.category_id)) ? [categoryNames.get(String(v.category_id))!] : [],
    cities: attrs?.city ?? [],
    // `data-work_graphic` iş qrafikidir (Tam ştat/Yarımştat/Növbəli/Frilans) → iş türü.
    employment: attrs?.workGraphic ?? [],
    workplaces: [], levels: [],
    salaryMin: null, salaryMax: null,
    premium: premium.has(id),
    active: true
  };
}

export const adapter: Adapter = {
  source: 'position.az', key: 'position-az',
  // Tüm ilanlar tek JSON listesinde olduğu için tek bir sözde kategori döneriz; kategori
  // her ilanın `category_id` alanından çıkarılır.
  async categories(): Promise<Filter[]> {
    const html = await (await fetchList('position.az', new URL('/az', origin))).text();
    parseHome(html);
    if (!categoryNames.size) throw new Error('position.az kategori haritası bulunamadı.');
    return [{id: 'all', name: 'Bütün elanlar'}];
  },
  async page(_category, cursor) {
    const page = Number(cursor ?? 1);
    const url = new URL('/az/vacancies', origin);
    url.searchParams.set('page', String(page));
    const body = await (await fetchList('position.az', url, 'application/json')).json();
    if (!Array.isArray(body?.vacancies)) throw new Error('position.az liste biçimi değişti.');
    const jobs = body.vacancies.map(parseJob);
    return {jobs, next: Number(body.currentPage) < Number(body.lastPage) ? String(Number(body.currentPage) + 1) : undefined};
  }
};
