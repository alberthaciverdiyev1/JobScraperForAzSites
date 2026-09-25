import 'dotenv/config';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Pool} from 'pg';
import {readRegion} from '../sites/shared/region.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2),region=readRegion(args),write=args.includes('--write');
for(let i=0;i<args.length;i++){if(args[i]==='--write')continue;if(args[i]==='--region'){i++;continue;}throw new Error(`Geçersiz argüman: ${args[i]}`);}

// Her kaynaktan sonra Telegram-a bildiriş (Jobing botu). Token/chat_id mühitdən,
// yoxdursa Jobing tətbiqinin .env-indən oxunur.
const JOBING_ENV=process.env.JOBING_ENV ?? '/var/www/new-jobing/.env';
const envFrom=(key:string):string|undefined=>{
  if(process.env[key])return process.env[key];
  try{const m=readFileSync(JOBING_ENV,'utf8').match(new RegExp('^'+key+'=(.*)$','m'));const v=m?.[1];return v?v.trim().replace(/^["']|["']$/g,''):undefined;}catch{return undefined;}
};
const TG_TOKEN=envFrom('TELEGRAM_BOT_TOKEN'),TG_CHAT=envFrom('TELEGRAM_CHAT_ID');
const regionLabel=region==='baku'?'bakı':region==='other'?'digər şəhərlər':'bütün';
async function notify(text:string):Promise<void>{
  if(!TG_TOKEN||!TG_CHAT)return;
  try{await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:TG_CHAT,text,parse_mode:'HTML'}),signal:AbortSignal.timeout(15000)});}catch{/* bildiriş uğursuz olsa tarama davam edir */}
}
function lastNum(buf:string,key:string):number|undefined{
  const re=new RegExp('"'+key+'":\\s*(\\d+)','g');let m:RegExpExecArray|null,val:number|undefined;
  while((m=re.exec(buf)))val=Number(m[1]);
  return val;
}

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
   let buf='';
   const code=await new Promise<number|null>((res,rej)=>{
     child=spawn(process.execPath,[`dist/sites/${source}/cli.js`,'--region',region,...(write?['--write']:[])],{cwd:root,env:process.env});
     child.stdout?.on('data',d=>{process.stdout.write(d);buf+=d.toString();});
     child.stderr?.on('data',d=>{process.stderr.write(d);buf+=d.toString();});
     child.on('error',rej);child.on('exit',res);
   });
   if(code!==0)process.exitCode=1;
   // Bu kaynaktan sonra bildiriş: neçə elan çəkildi.
   const fetched=lastNum(buf,'fetched'),inserted=lastNum(buf,'inserted'),dup=lastNum(buf,'duplicates');
   if(code===0&&fetched!==undefined){
     await notify(`📥 <b>${source}</b> (${regionLabel}): <b>${fetched}</b> elan çəkildi, ${inserted??0} yeni${dup?`, ${dup} mükerrer`:''}`);
   }else{
     const err=(buf.match(/Error:[^\n"]{0,140}/)??[`exit ${code}`])[0];
     await notify(`⚠️ <b>${source}</b> (${regionLabel}): xəta — <code>${err}</code>`);
   }
  }
  await client.query("SELECT pg_advisory_unlock(hashtext('job-scraper:scheduled-all'))");
 }
}catch(e){console.error(e);process.exitCode=1;}finally{client?.release();await pool.end();}
