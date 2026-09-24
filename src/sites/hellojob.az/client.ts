import * as cheerio from 'cheerio';
import {fetchList} from '../shared/http.js';
import {publicationDate,isBeforeCutoff} from '../shared/policy.js';
import {parseSalary,type Adapter,type ListJob,type Filter} from '../shared/adapter.js';
let filters:Record<string,Filter[]>={};
const origin='https://www.hellojob.az';
export function parseList(html:string):{jobs:ListJob[];pages:number[]}{
 const $=cheerio.load(html),jobs:ListJob[]=[];
 $('.vacancies__item').each((i,e)=>{const card=$(e),url=card.find('a.vacancies__body').attr('href');if(!url)return;
 const date=card.find('li').filter((i,e)=>($(e).find('use').attr('href')??$(e).find('use').attr('xlink:href'))==='#svg-calendar').text().trim();
 const salary=parseSalary(card.find('.vacancies__price').text().trim());
 jobs.push({id:Number(card.find('[add-to-wishlist]').attr('add-to-wishlist')),title:card.find('.vacancies__title').text().trim(),url,
 companyName:card.find('.vacancies__company').text().trim(),companyId:0,logo:card.find('.vacancies__logo img').attr('src')??null,published:publicationDate(date),categoryNames:[],cities:[],employment:[],workplaces:[],levels:[],salaryMin:salary[0],salaryMax:salary[1],premium:card.find('.premium').length>0});
 });
 return {jobs,pages:$('.pagination a[href]').map((i,e)=>Number(new URL($(e).attr('href')!,origin).searchParams.get('page'))).get()};
}
async function page(params:Record<string,string>){const url=new URL('/vakansiyalar',origin);url.search=new URLSearchParams(params).toString();const b=await (await fetchList('hellojob.az',url,'application/json')).json();if(b.error||typeof b.content!=='string')throw new Error('Hellojob JSON liste biçimi değişti.');return parseList(b.content);}
export const adapter:Adapter={source:'hellojob.az',key:'hellojob-az',
 async categories(){const response=await fetchList('hellojob.az',new URL(origin+'/'));const $=cheerio.load(await response.text());for(const name of ['categories[]','city','work_modes[]'])filters[name]=$(`select[name="${name}"] option`).toArray().flatMap(e=>{const id=$(e).attr('value');return id?[{id,name:$(e).text().trim()}]:[];});if(!filters['categories[]']?.length)throw new Error('Kategori filtreleri yok.');return filters['categories[]'];},
 async page(category,cursor){const n=Number(cursor??1),b=await page({'categories[]':category.id,page:String(n)});b.jobs.forEach(j=>j.categoryNames=[category.name]);return {jobs:b.jobs,next:b.pages.includes(n+1)?String(n+1):undefined};},
 async enrich(jobs,log,region='all'){const byId=new Map(jobs.map(j=>[j.id,j])),errors:string[]=[];for(const field of ['city','work_modes[]'])for(const option of filters[field]??[]){if(field==='city'&&region!=='all'&&(/bak/i.test(option.name))!==(region==='baku'))continue;try{
  const seen=new Set<number>();for(let n=1;n<=1000;n++){const b=await page({[field]:option.id,page:String(n)});for(const row of b.jobs){const job=byId.get(row.id);if(!job)continue;const target=field==='city'?job.cities:option.name==='Uzaqdan'?job.workplaces:job.employment;if(!target.includes(option.name))target.push(option.name);}
   const ordinary=b.jobs.filter(j=>!j.premium);if(!b.jobs.length||b.jobs.every(j=>seen.has(j.id))||!b.pages.includes(n+1)||(ordinary.length&&ordinary.every(j=>isBeforeCutoff(j.published))))break;
   b.jobs.forEach(j=>seen.add(j.id));if(n===1000)throw new Error('Sayfa sınırı');
  }
 }catch(e){errors.push(`${field} ${option.name}: ${e}`);}log(`Hellojob ${field}: ${option.name}`);}return errors;}
};
