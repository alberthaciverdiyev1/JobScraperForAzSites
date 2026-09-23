import {fetchList as requestList} from '../shared/http.js';
import {pageStop} from '../shared/pagination.js';
import {isBeforeCutoff,logoUrl} from '../shared/policy.js';
import * as cheerio from 'cheerio';
export interface Option { id: string; name: string }
export interface Listing { id: number; title: string; companyId: number; companyName: string; companyLogo: string | null; category: string; published: string; cities: string[]; regimes: string[] }
export function parseList(html: string, companies = new Map<string,string>()) {
  const $ = cheerio.load(html);
  const options = (name: string): Option[] => $(`select[name="${name}"] option`).toArray().flatMap(e => {
    const id = $(e).attr('value'); return id ? [{id, name: $(e).text().trim()}] : [];
  });
  for (const item of options('company')) companies.set(item.id, item.name);
  const vacancies: Listing[] = [];
  // Premium cards are unrelated to the selected filter, and repeat on every page.
  $('.all-vacancies .vac-card').each((_i,e) => {
    const card = $(e), link = card.find('a.vac-name'), company = card.find('a.comp-link');
    const id = Number(/\/vacancy\/(\d+)/.exec(link.attr('href') ?? '')?.[1]);
    const companyId = Number(/\/company\/(\d+)/.exec(company.attr('href') ?? '')?.[1]);
    if (!id) return;
    const logo = card.find('img.company-logo, .company-logo img').first().attr('src');
    const companyLogo = logoUrl(logo,'https://1is.az');
    vacancies.push({id, title: link.text().trim(), companyId, companyName: companies.get(String(companyId)) ?? company.text().trim(), companyLogo,
      category: card.find('.vac-inner1-a').text().trim(), published: card.find('.vac-time').text().trim(), cities: [], regimes: []});
  });
  if (!$('.all-vacancies').length && !$('form.main-filter').length) throw new Error('1is.az liste yapısı bulunamadı.');
  return {vacancies, next: Boolean($('a[rel="next"]').length), categories: options('category'), cities: options('city'), regimes: options('find_worker')};
}
export async function getList(params?: Record<string,string>) {
  const url = new URL(params ? '/vsearch' : '/allvacancy', 'https://1is.az');
  if (params) for (const [key,value] of Object.entries({...params,expired:'on',sort_by:'1'})) url.searchParams.set(key,value);
  return await (await requestList('1is.az',url)).text();
}

export async function collect(knownIds: Set<number>, log = console.log, fetchList = getList, limitPerCategory = Infinity) {
  if(limitPerCategory!==Infinity&&(!Number.isInteger(limitPerCategory)||limitPerCategory<1)) throw new Error('limit pozitif tam sayı olmalı.');
  const companies = new Map<string,string>();
  const filters = parseList(await fetchList(),companies);
  if (!filters.categories.length) throw new Error('Kategori filtreleri bulunamadı.');
  const skipped: {sourceId:number;reason:string}[] = [];
  const vacancies = new Map<number,Listing>(), errors: string[] = [], scans: object[] = [];
  async function scan(field:string, option:Option, enrichment:boolean) {
    const seen = new Set<number>();let added = 0;
    for(let page=1;page<=1000;page++) {
      const result = parseList(await fetchList({[field]:option.id,page:String(page)}),companies);
      const rows = result.vacancies;
      const reason=pageStop(rows.map(row=>row.id),enrichment?new Set():knownIds,seen);
      const repeated=reason==='repeated-page', known=reason==='all-known';
      for(const row of rows) {
        if(!enrichment && isBeforeCutoff(row.published)) skipped.push({sourceId:row.id,reason:'published-before-2026-09-15'});
        if(!enrichment && !isBeforeCutoff(row.published) && !knownIds.has(row.id) && !vacancies.has(row.id)) { vacancies.set(row.id,row); added++; }
        const target = vacancies.get(row.id);
        if(target && enrichment) {
          const values = field==='city' ? target.cities : target.regimes;
          if(!values.includes(option.name)) values.push(option.name);
        }
        seen.add(row.id);
      }
      const limitHit = !enrichment && limitPerCategory!==Infinity && added>=limitPerCategory;
      if(!rows.length || repeated || known || limitHit || !result.next) {
        scans.push({field,filter:option.name,pages:page,stop:known?'all-known':repeated?'repeated-page':limitHit?'limit':!rows.length?'empty':'last-page'});
        log(`${field} ${option.name}: ${page} sayfa`); return;
      }
      if(page===1000) throw new Error('Sayfa güvenlik sınırı aşıldı.');
    }
  }
  for(const category of filters.categories) {
    try { await scan('category',category,false); } catch(e) { errors.push(`category ${category.name}: ${e}`); }
  }
  if(vacancies.size) for(const [field,options] of [['city',filters.cities],['find_worker',filters.regimes]] as const) {
    for(const option of options) try { await scan(field,option,true); } catch(e) { errors.push(`${field} ${option.name}: ${e}`); }
  }
  return {mode:'list-only',source:'1is.az',vacancies:[...vacancies.values()],filters,scans,errors,skipped};
}
