import test from 'node:test';
import assert from 'node:assert/strict';
import {mapLookups} from '../dist/sites/shared/lookups.js';
import {mapVacancy as busy} from '../dist/sites/busy.az/mapper.js';
import {mapVacancy as oneis} from '../dist/sites/1is.az/mapper.js';
import {fetchList} from '../dist/sites/shared/http.js';
import {importBatch} from '../dist/sites/shared/importer.js';
import {finalizeVacancy} from '../dist/sites/shared/vacancy.js';
const refs={categories:[{id:'40',slug:'proqramlasdirma',parent_id:'39',name:{az:'Proqramlaşdırma'}},{id:'39',slug:'informasiya-texnologiyalari',parent_id:null,name:{az:'IT'}}],cities:[{id:'701',slug:'baki',name:{az:'Bakı'}}],jobTypes:[{id:'702',slug:'tam-zamanli',name:{az:'Tam Ştat'}},{id:'703',slug:'yari-zamanli',name:{az:'Yarım Ştat'}}],workplaces:[{id:'704',slug:'uzaktan',name:{az:'Məsafədən'}}],experienceLevels:[{id:'705',slug:'baslangic',name:{az:'Başlanğıc'}}]};
const rawBusy={id:1,job_title:'Junior Developer',published:'2026-09-20',company:{id:2,title:'Test MMC'},city_rels:[{city:{id:1,title:'Bakı'}}],employment_type:'full time',is_remote:true};
const rawOne={id:1,title:'Junior Developer',published:'20-09-2026',companyId:2,companyName:'Test MMC',companyLogo:null,category:'İnformasiya texnologiyaları və proqramlaşdırma',cities:['Bakı'],regimes:['Tam iş vaxtı','Uzaqdan']};
test('both site adapters produce identical local reference IDs',()=>{
 const a=busy(rawBusy,refs,{categories:[]}),b=oneis(rawOne,refs);
 for(const field of ['categoryId','cityId','jobTypeId','workplaceTypeId','experienceLevelId','publishedDate'])assert.equal(a[field],b[field],field);
 assert.equal(b.cityId,'701');assert.equal(b.jobTypeId,'702');assert.equal(b.workplaceTypeId,'704');
});
test('both adapters reject saved-file records before cutoff',()=>{
 assert.throws(()=>busy({...rawBusy,published:'2026-07-31'},refs,{categories:[]}),/Eylül/);
 assert.throws(()=>oneis({...rawOne,published:'31-07-2026'},refs),/Eylül/);
});
test('structured list evidence precedes filters and title; unknown explicit regime is not guessed',()=>{
 const result=mapLookups({job_title:'Part time developer',employment_type:'full time',employment_filter_labels:['part time']},refs);
 assert.equal(result.jobType.id,'702');
 assert.equal(mapLookups({job_title:'Full time developer',employment_filter_labels:['Qısaldılmış iş vaxtı']},refs).jobType.id,null);
 assert.equal(mapLookups({job_title:'Developer',employment_filter_labels:['full time','part time']},refs).jobType.id,null);
 assert.equal(mapLookups({job_title:'Developer',required_experience:5,is_remote:false},refs).experience.id,null);
 assert.equal(mapLookups({job_title:'Developer',is_remote:false},refs).workplace.id,null);
});
test('shared validation reports missing dates, invalid refs and conflicting salaries',()=>{
 const job=oneis(rawOne,refs);
 const result=finalizeVacancy({...job,cityId:'999',salaryMin:2000,salaryMax:1000},refs,undefined);
 assert.equal(result.cityId,null);assert.equal(result.salaryMin,null);assert.equal(result.publishedDate,null);
 assert.ok(result.warnings.some(w=>w.includes('Yayın tarihi')));
 assert.throws(()=>finalizeVacancy(job,refs,'2099-01-01'),/yayınlanmamış/);
});
test('shared HTTP gate refuses detail endpoints before any network request',async()=>{
 await assert.rejects(fetchList('1is.az',new URL('https://1is.az/vacancy/1')),/liste/);
 await assert.rejects(fetchList('busy.az',new URL('https://busy.az/api/bff/api/vacancy/1')),/liste/);
});
test('writer rejects mismatched source and rolls back old records without insertion',async()=>{
 const sql=[];const pool={connect:async()=>({query:async(q)=>{sql.push(q);return {rows:[]};},release(){}})};
 const job=oneis(rawOne,refs);
 await assert.rejects(importBatch(pool,[job],'busy-az'),/uyuşmuyor/);assert.equal(sql.length,0);
 await assert.rejects(importBatch(pool,[{...job,publishedDate:'2026-07-31'}],'1is-az'),/tarih/);
 assert.ok(sql.includes('ROLLBACK'));assert.ok(!sql.some(q=>q.includes('INSERT')));
});
