import {fetchList} from '../shared/http.js';
import {isBeforeCutoff} from '../shared/policy.js';
import {parseSalary,type Adapter,type ListJob,type Filter} from '../shared/adapter.js';
import type {SourceRecord} from '../shared/types.js';
const origin='https://unsu.jobsearch.az';
async function get(url:string){const response=await fetchList('jobsearch.az',new URL(url,origin),'application/json');return await response.json();}
const listUrl=(params:Record<string,string>)=>'/api-az/vacancies-az?'+new URLSearchParams({hl:'az',ads:'55,56',...params});
export function parseJob(v:SourceRecord,category?:string):ListJob{
 const salary=parseSalary(v.salary);
 return {id:v.id,title:v.title,url:`https://jobsearch.az/vacancies/${encodeURIComponent(v.slug)}`,companyName:v.company?.title??'',companyId:v.company?.id??0,logo:v.company?.logo_mini||v.company?.logo||null,published:v.created_at??null,
 categoryNames:category?[category]:[],cities:[],employment:[],workplaces:[],levels:[],salaryMin:salary[0],salaryMax:salary[1],premium:v.is_vip===true};
}
export const adapter:Adapter={source:'jobsearch.az',key:'jobsearch-az',
 async categories(){const items:Filter[]=[];let url:string|undefined='/api-az/categories-az?hl=az';const seen=new Set<string>();while(url){if(seen.has(url))throw new Error('Kategori sayfalaması tekrarladı.');seen.add(url);const b=await get(url);if(!Array.isArray(b.items))throw new Error('Kategori listesi geçersiz.');for(const v of b.items){items.push({id:String(v.id),name:v.title});for(const child of v.children??[])items.push({id:String(child.id),name:child.title});}url=b.next||undefined;}return items;},
 async page(category,cursor){const b=await get(cursor??listUrl({categories:category.id}));if(!Array.isArray(b.items))throw new Error('İlan listesi geçersiz.');return {jobs:b.items.map((v:SourceRecord)=>parseJob(v,category.name)),next:b.next||undefined};},
 async enrich(jobs,log){const filters=await get('/api-az/filters?hl=az');const byId=new Map(jobs.map(j=>[j.id,j]));const errors:string[]=[];
  for(const field of ['location','job_type'] as const){if(!Array.isArray(filters[field])){errors.push(`Filtre eksik: ${field}`);continue;}
   for(const option of filters[field]){try{let next:string|undefined=listUrl({[field]:String(option.value)});const seen=new Set<number>();let pages=0;
    while(next){if(++pages>1000)throw new Error('Sayfa sınırı');const b=await get(next);if(!Array.isArray(b.items))throw new Error('Liste biçimi geçersiz.');
     for(const row of b.items){const job=byId.get(row.id);if(!job)continue;
      if(field==='location'){if(!job.cities.includes(option.title))job.cities.push(option.title);}
      else {const name=option.title==='Tam'?'full time':option.title;const target=/Məsafədən|Hibrid/.test(name)?job.workplaces:job.employment;if(!target.includes(name))target.push(name);}
     }
     const ordinary=b.items.filter((v:SourceRecord)=>!v.is_vip);
     if(!b.items.length||b.items.every((v:SourceRecord)=>seen.has(v.id))||(ordinary.length&&ordinary.every((v:SourceRecord)=>isBeforeCutoff(v.created_at))))break;
     b.items.forEach((v:SourceRecord)=>seen.add(v.id));next=b.next||undefined;
    }
   }catch(e){errors.push(`${field} ${option.title}: ${e}`);}log(`Jobsearch ${field}: ${option.title}`);}
  }return errors;
 }
};
