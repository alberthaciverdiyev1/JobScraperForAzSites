import {readRegion,mappedInRegion} from '../shared/region.js';
import 'dotenv/config';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Pool} from 'pg';
import {pool} from '../../core/database.js';
import {loadReferences,importBatch} from '../shared/importer.js';
import {loadSiteReferences} from '../shared/references.js';
import {collect} from './client.js';
import {mapVacancy} from './mapper.js';
const args=process.argv.slice(2);
let writer:Pool|undefined;
try {
  for(let i=0;i<args.length;i++) {if(args[i]==='--write') continue; if(['--file','--region','--limit'].includes(args[i]!)&&args[i+1]){i++;continue;} throw new Error(`Geçersiz argüman: ${args[i]}`);}
  const region=readRegion(args);
  const limitIndex=args.indexOf('--limit'),limit=limitIndex<0?Infinity:Number(args[limitIndex+1]);
  if(limit!==Infinity&&(!Number.isInteger(limit)||limit<1||limit>500)) throw new Error('limit 1–500 arası tam sayı olmalı.');
  const directory=resolve('data/1is.az'); await mkdir(directory,{recursive:true});
  const prefix=`${directory}/${new Date().toISOString().replace(/[:.]/g,'-')}`;
  const refs=await loadReferences(pool),siteRefs=await loadSiteReferences('1is.az');
  const known=new Set<number>((await pool.query("SELECT slug FROM public.scraped_vacancies WHERE slug LIKE '1is-az-%'")).rows.map(r=>Number(/^1is-az-(\d+)-/.exec(r.slug)?.[1])));
  const file=args.indexOf('--file');
  const batch=file>=0?JSON.parse(await readFile(resolve(args[file+1]!),'utf8')):await collect(known, console.log, undefined, limit, region);
  if(batch.mode!=='list-only'||batch.source!=='1is.az'||!Array.isArray(batch.vacancies)) throw new Error('Geçersiz kaynak dosyası.');
  await writeFile(`${prefix}-source.json`,JSON.stringify(batch,null,2));
  const ready:ReturnType<typeof mapVacancy>[]=[],skipped:object[]=[];
  for(const v of batch.vacancies) try {const job=mapVacancy(v,refs,siteRefs);if(mappedInRegion(job,refs,region))ready.push(job);else skipped.push({id:v.id,reason:'region-or-unresolved-city'});} catch(e){skipped.push({id:v.id,error:String(e)});}
  await writeFile(`${prefix}-preview.json`,JSON.stringify({ready,skipped,categorySlugs:siteRefs.categories,errors:batch.errors},null,2));
  console.log(JSON.stringify({fetched:batch.vacancies.length,ready:ready.length,skipped,errors:batch.errors}));
  if(args.includes('--write')) {
    writer=new Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),database:process.env.DB_DATABASE,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,max:1,connectionTimeoutMillis:5000,statement_timeout:30000});
    const result=await importBatch(writer,ready,'1is-az');
    await writeFile(`${prefix}-result.json`,JSON.stringify({...result,skipped,errors:batch.errors},null,2));
    console.log(JSON.stringify({inserted:result.inserted.length,duplicates:result.duplicates.length,report:`${prefix}-result.json`}));
  }
  if(batch.errors?.length||skipped.length)process.exitCode=1;
} catch(e){console.error(e);process.exitCode=1;} finally{await writer?.end();await pool.end();}
