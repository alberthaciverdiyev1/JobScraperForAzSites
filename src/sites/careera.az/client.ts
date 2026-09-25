import * as cheerio from 'cheerio';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fetchList} from '../shared/http.js';
import type {Adapter,ListJob,Filter} from '../shared/adapter.js';

const origin = 'https://www.careera.az';

/**
 * Şehir filtresi bir select değil, serbest metin arama (`?location=`). Bu yüzden aranacak
 * yer adları elle yazılır (src/sites/careera.az/locations.json). Her ad için liste ID üyeliği
 * taranır; eşleşen ilanlara o ad şehir olarak yazılır (cities.json ile yerel slug'a çevrilir).
 */
function locationQueries(): string[] {
  try {
    const list = JSON.parse(readFileSync(resolve(process.cwd(), 'src/sites/careera.az/locations.json'), 'utf8'));
    return Array.isArray(list) ? list.filter((name: unknown): name is string => typeof name === 'string' && name.length > 0) : [];
  } catch {
    return [];
  }
}

export interface ParsedList { jobs: ListJob[]; total: number; perPage: number }

/**
 * Yalnızca liste sayfasındaki kartlar okunur. Kart alanları: data-job-id, data-job-slug,
 * başlık, şirket adı, şirket logosu ve premium rozeti. Liste kartında yayın tarihi,
 * şehir veya iş türü bulunmaz; detay endpoint'i (`/jobs/ajax/...`) çağrılmaz.
 */
export function parseList(html: string): ParsedList {
  const $ = cheerio.load(html);
  const info = $('.jobs-results-info').text();
  const total = Number((/-\s*d[əe]n\s*([\d.,]+)/i.exec(info)?.[1] ?? '').replace(/[.,]/g, '')) || 0;
  const jobs: ListJob[] = [];
  $('.card-job[data-job-id]').each((_i, element) => {
    const card = $(element);
    const id = Number(card.attr('data-job-id'));
    const slug = card.attr('data-job-slug');
    if (!Number.isSafeInteger(id) || id <= 0) return;
    // Kart görseli bazen şirket logosu değildir: iş görseli (/storage/jobs/...) veya site
    // placeholder'ı (logo-2.svg) olabilir. Yalnızca gerçek şirket logosunu (/storage/companies/...)
    // logo olarak kabul et; aksi halde null bırak.
    const image = card.find('.card-job-top--image img').attr('src') ?? null;
    jobs.push({
      id,
      title: card.find('.card-job-top--info-title a').first().text().trim(),
      url: `${origin}/job/${encodeURIComponent(slug ?? String(id))}`,
      companyName: card.find('.card-job-top--company').first().text().trim(),
      companyId: 0,
      logo: image && /\/storage\/companies\//i.test(image) ? image : null,
      published: null,
      categoryNames: [], cities: [], employment: [], workplaces: [], levels: [],
      salaryMin: null, salaryMax: null,
      premium: card.find('.badge-premium').length > 0,
    });
  });
  return {jobs, total, perPage: jobs.length || 12};
}

async function pageHtml(params: Record<string,string>): Promise<string> {
  const url = new URL('/', origin);
  url.search = new URLSearchParams({sort: 'newest', ...params}).toString();
  return await (await fetchList('careera.az', url)).text();
}

/** Filtre sidebar'ındaki "İş növü" (job_type) seçenekleri → kaynak etiketi. */
const jobTypeOptions: [string, string][] = [
  ['tecrube-proqramlari', 'Təcrübə proqramları'],
  ['konulluluk', 'Könüllülük'],
  ['tehsil', 'Təhsil'],
  ['layiheler', 'Layihələr'],
  ['telim-ve-seminarlar', 'Təlim və Seminarlar'],
];

/** Filtre parametresiyle ilan ID üyeliğini toplayıp eşleşenlere etiket yazar. */
async function tagByFilter(
  params: Record<string,string>,
  byId: Map<number,ListJob>,
  apply: (job: ListJob, label: string) => void,
  label: string
): Promise<void> {
  for (let page = 1; page <= 1000; page++) {
    const parsed = parseList(await pageHtml({...params, page: String(page)}));
    for (const job of parsed.jobs) {
      const target = byId.get(job.id);
      if (target) apply(target, label);
    }
    if (!parsed.jobs.length || page * parsed.perPage >= parsed.total) break;
    if (page === 1000) throw new Error('Sayfa sınırı aşıldı.');
  }
}

export const adapter: Adapter = {
  source: 'careera.az', key: 'careera-az',
  async categories(): Promise<Filter[]> {
    const $ = cheerio.load(await pageHtml({}));
    const options = new Map<string, Filter>();
    // Sayfada masaüstü/mobil iki select bulunur; aynı value tekrarlanır. Value'ya göre tekilleştir.
    for (const element of $('select[name="category"] option').toArray()) {
      const id = $(element).attr('value');
      const name = $(element).text().trim();
      if (id && name && !options.has(id)) options.set(id, {id, name});
    }
    if (!options.size) throw new Error('CareerA kategori filtreleri bulunamadı.');
    return [...options.values()];
  },
  async page(category, cursor) {
    const page = Number(cursor ?? 1);
    const parsed = parseList(await pageHtml({category: category.id, page: String(page)}));
    parsed.jobs.forEach(job => { job.categoryNames = [category.name]; });
    return {jobs: parsed.jobs, next: page * parsed.perPage < parsed.total ? String(page + 1) : undefined};
  },
  // Liste kartında çalışma yeri/iş türü olmadığı için filtre sidebar'ındaki
  // remote checkbox ve job_type seçenekleri ID üyeliğiyle taranır. Detay endpoint'i çağrılmaz.
  async enrich(jobs, log) {
    const errors: string[] = [], byId = new Map(jobs.map(job => [job.id, job]));
    // Şehir: her yer adı için `?location=<ad>` aranır; bir ilan birden çok adla dönebileceğinden
    // en özel (en az sonuçlu) konum seçilir.
    const locations = locationQueries();
    const best = new Map<number, {name: string; total: number}>();
    for (const name of locations) {
      try {
        for (let page = 1; page <= 1000; page++) {
          const parsed = parseList(await pageHtml({location: name, page: String(page)}));
          const total = parsed.total;
          for (const job of parsed.jobs) {
            if (!byId.has(job.id)) continue;
            const current = best.get(job.id);
            if (!current || total < current.total) best.set(job.id, {name, total});
          }
          if (!parsed.jobs.length || page * parsed.perPage >= parsed.total) break;
          if (page === 1000) throw new Error('Sayfa sınırı aşıldı.');
        }
      } catch (e) {
        errors.push(`location ${name}: ${e}`);
      }
    }
    for (const [id, {name}] of best) byId.get(id)!.cities = [name];
    log(`careera şehir: ${locations.length} yer adı tarandı`);
    try {
      await tagByFilter({remote: '1'}, byId, (job, label) => {
        if (!job.workplaces.includes(label)) job.workplaces.push(label);
      }, 'Distant');
      log('careera çalışma yeri: Distant');
    } catch (e) {
      errors.push(`remote: ${e}`);
    }
    for (const [value, label] of jobTypeOptions) {
      try {
        await tagByFilter({job_type: value}, byId, (job) => {
          if (!job.employment.includes(label)) job.employment.push(label);
        }, label);
        log(`careera iş türü: ${label}`);
      } catch (e) {
        errors.push(`job_type ${label}: ${e}`);
      }
    }
    return errors;
  },
};
