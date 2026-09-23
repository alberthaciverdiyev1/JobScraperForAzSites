import 'dotenv/config';
import {spawn} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Pool} from 'pg';
import {readRegion} from '../sites/shared/region.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2),region=readRegion(args),write=args.includes('--write');
for(let i=0;i<args.length;i++){if(args[i]==='--write')continue;if(args[i]==='--region'){i++;continue;}throw new Error(`Geçersiz argüman: ${args[i]}`);}
const pool=new Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),database:process.env.DB_DATABASE,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,max:1,connectionTimeoutMillis:5000});
let client;let child:ReturnType<typeof spawn>|undefined;
const stop=()=>child?.kill('SIGTERM');process.on('SIGTERM',stop);process.on('SIGINT',stop);
try{
 client=await pool.connect();
 const locked=(await client.query("SELECT pg_try_advisory_lock(hashtext('job-scraper:scheduled-all')) AS locked")).rows[0]?.locked;
 if(!locked){console.log('Bir tarama zaten çalışıyor; bu çalıştırma atlandı.');}
 else {
  for(const source of ['busy.az','1is.az','work.az','jobsearch.az','hellojob.az','smartjob.az','careera.az','position.az','jobu.az','jobnet.az','azvak.az','easyjob.az']){
   console.log(`Başlıyor: ${source} (${region})`);
   const code=await new Promise<number|null>((resolve,reject)=>{child=spawn(process.execPath,[`dist/sites/${source}/cli.js`,'--region',region,...(write?['--write']:[])],{cwd:root,stdio:'inherit',env:process.env});child.on('error',reject);child.on('exit',resolve);});
   if(code!==0)process.exitCode=1;
  }
  await client.query("SELECT pg_advisory_unlock(hashtext('job-scraper:scheduled-all'))");
 }
}catch(e){console.error(e);process.exitCode=1;}finally{client?.release();await pool.end();}
