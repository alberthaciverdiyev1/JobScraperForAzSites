import * as cheerio from 'cheerio';
import {fetchList} from '../shared/http.js';
import type {Adapter,ListJob} from '../shared/adapter.js';
import type {SourceRecord} from '../shared/types.js';
export function parseProps(html:string):SourceRecord {
 const $=cheerio.load(html);
 for(const e of $('script').toArray()){
  const s=$(e).text(),offset=s.indexOf('.rsc.push(');if(offset<0)continue;
  let payload;try{payload=JSON.parse(s.slice(offset+10,s.lastIndexOf(')')));}catch{continue;}
  if(typeof payload!=='string')continue;
  for(const line of payload.split('\n'))try{const node=JSON.parse(line.slice(line.indexOf(':')+1));const props=node?.[3];if(Array.isArray(props?.jobs)&&Array.isArray(props?.categories))return props;}catch{}
 }
 throw new Error('Smartjob liste JSON verisi bulunamadı.');
}
export function parseJob(v:SourceRecord):ListJob {
 return {id:Number(v.id),title:v.title,url:`https://smartjob.az/vakansiyalar/${encodeURIComponent(v.slug)}`,companyName:v.company??'',companyId:Number(v.companyId)||0,
 logo:v.companyLogoUrl?new URL(v.companyLogoUrl,'https://smartjob.az').href:null,published:v.publishedAt??null,
 categoryNames:Array.isArray(v.categories)?v.categories:v.category?[v.category]:[],cities:Array.isArray(v.cities)&&v.cities.length?v.cities:v.city?[v.city]:[],employment:v.employmentType&&v.employmentType!=='$undefined'?[v.employmentType]:[],workplaces:v.workMode?[v.workMode]:[],levels:v.positionLevel&&v.positionLevel!=='$undefined'?[v.positionLevel]:[],
 salaryMin:typeof v.salaryMin==='number'?v.salaryMin:null,salaryMax:typeof v.salaryMax==='number'?v.salaryMax:null,deadline:typeof v.expiresAt==='string'&&v.expiresAt!=='$undefined'?v.expiresAt:null,premium:v.featured===true};
}
export const adapter:Adapter={source:'smartjob.az',key:'smartjob-az',
 async categories(){const html=await (await fetchList('smartjob.az',new URL('https://smartjob.az/vakansiyalar'))).text();return [{id:'',name:'Bütün elanlar'},...parseProps(html).categories.map((name:string)=>({id:name,name}))];},
 async page(category,cursor){const page=Number(cursor??1),url=new URL('https://smartjob.az/api/jobs');url.search=new URLSearchParams({page:String(page),limit:'20',...(category.id?{category:category.id}:{})}).toString();const b=await (await fetchList('smartjob.az',url,'application/json')).json();if(!Array.isArray(b.jobs)||!Number.isFinite(b.total))throw new Error('Smartjob liste biçimi değişti.');return {jobs:b.jobs.map(parseJob),next:page*20<b.total?String(page+1):undefined};}
};
