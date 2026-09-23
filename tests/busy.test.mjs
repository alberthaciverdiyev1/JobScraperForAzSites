import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { listFields, collectVacancies } from '../dist/sites/busy.az/client.js';
import { mapVacancy } from '../dist/sites/busy.az/mapper.js';
import { companyKey, importBatch } from '../dist/sites/busy.az/importer.js';

const mapping = JSON.parse(readFileSync('src/sites/busy.az/category-adaptation.json'));
const refs = { categories: [{ id: '128', slug: 'anbardar-logistika', parent_id: '126', name: { az: 'Anbardar' } }], cities: [{ id: '1', slug: 'baki', name: { az: 'Bakı' } }], jobTypes: [], workplaces: [], experienceLevels: [] };
const source = { id: 123, slug: 'anbardar', job_title: 'Anbardar', deadline: '2099-01-01', company: { id: 456, title: 'Test MMC' }, city_rels: [{city: {title: {az: 'Bakı'}}}], content: {content: 'PRIVATE DETAIL MUST NOT COPY'}, email: 'detail@example.com', salary_fix: 9999 };

test('Yalnızca liste endpointine gider ve detay alanlarını taşımaz', async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async url => { urls.push(String(url)); return new Response(JSON.stringify({vacancies: [source]})); };
  try {
    const batch = await collectVacancies({categoryIds: [94], limitPerCategory: 1});
    assert.equal(batch.mode, 'list-only');
    assert.equal(urls.length, 1);
    assert.equal(new URL(urls[0]).searchParams.get('categories[]'), '94');
    assert.equal(batch.vacancies[0].content, undefined);
    assert.equal(batch.vacancies[0].email, undefined);
  } finally { globalThis.fetch = original; }
});

test('Liste kaydı gerçek şehir/kategoriye eşlenir, detaylar uydurulmaz', () => {
  const mapped = mapVacancy(listFields(source), refs, mapping);
  assert.equal(mapped.categoryId, '128');
  assert.equal(mapped.cityId, '1');
  assert.equal(mapped.applicationEmail, null);
  assert.equal(mapped.salaryMin, null);
  assert.equal(mapped.jobTypeId, null);
  assert.ok(!mapped.description.includes('PRIVATE DETAIL'));
  assert.ok(mapped.description.includes('https://busy.az/vacancy/123/anbardar'));
  assert.equal(mapped.companySourceId, 456);
  assert.throws(() => mapVacancy({...source, deadline:'2020-01-01'}, refs, mapping));
  assert.throws(() => mapVacancy({...source, company:null}, refs, mapping));
});

test('Çok şehirli ilan tek şehre zorlanmaz; şirket anahtarı Kiril adlarını kaybetmez', () => {
  const result = mapVacancy({...source, city_rels:[...source.city_rels,{city:{title:{az:'Gəncə'}}}]}, refs, mapping);
  assert.equal(result.cityId, null);
  assert.ok(result.description.includes('Bakı, Gəncə'));
  assert.equal(companyKey(' Test   MMC '), companyKey('TEST MMC'));
  assert.notEqual(companyKey('Компания'), companyKey('Другая'));
});


test('Kategori bazında durur; karışık ve kategoriler arası ortak ilanlar erken durdurmaz', async () => {
  const original = globalThis.fetch;
  const calls = [];
  const pages = {
    '1:1': [1, 2], '1:2': [1, 3], '1:3': [1],
    '2:1': [2, 3], '2:2': [4], '2:3': [4],
    '3:1': [],
  };
  globalThis.fetch = async url => {
    const q = new URL(url).searchParams;
    const key = `${q.get('categories[]')}:${q.get('page')}`;
    calls.push(key);
    assert.ok(Object.hasOwn(pages, key), `Beklenmeyen istek: ${key}`);
    return new Response(JSON.stringify({vacancies: pages[key].map(id => ({...source, id}))}));
  };
  try {
    const result = await collectVacancies({categoryIds: [1,2,3], knownIds: new Set([1])});
    assert.deepEqual(result.vacancies.map(v => v.id), [2,3,4]);
    assert.deepEqual(result.vacancies[0].source_category_ids, [1,2]);
    assert.deepEqual(result.scans.map(s => s.stopReason), ['all-known','repeated-page','empty']);
    assert.deepEqual(calls, ['1:1','1:2','1:3','2:1','2:2','2:3','3:1']);
    assert.equal(result.errors.length, 0);
  } finally { globalThis.fetch = original; }
});

test('Kategori hatası diğer kategoriyi engellemez ve hata raporlanır', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async url => new URL(url).searchParams.get('categories[]') === '1'
    ? new Response('', {status: 503}) : new Response(JSON.stringify({vacancies: []}));
  try {
    const result = await collectVacancies({categoryIds:[1,2]});
    assert.equal(result.errors.length, 1);
    assert.deepEqual(result.scans.map(s => s.stopReason), ['error','empty']);
  } finally { globalThis.fetch = original; }
});

test('Importer sadece scraped_vacancies tablosuna yazar ve kaynağı tekrar eklemez', async () => {
  const queries = [];
  let saved = false;
  const client = {
    async query(sql) {
      queries.push(sql);
      if (/^SELECT id FROM/.test(sql)) return {rows: saved ? [{id:'1'}] : []};
      if (/INSERT INTO/.test(sql)) { saved = true; return {rows:[{id:'1'}]}; }
      return {rows:[]};
    },
    release() {},
  };
  const pool = {async connect() {return client;}};
  const job = mapVacancy(listFields(source), refs, mapping);
  assert.equal((await importBatch(pool, [job])).inserted.length, 1);
  assert.equal((await importBatch(pool, [job])).duplicates.length, 1);
  assert.equal(queries.filter(q => /INSERT INTO/.test(q)).length, 1);
  assert.ok(queries.some(q => /INSERT INTO public.scraped_vacancies/.test(q)));
  assert.ok(queries.every(q => !/public\.(vacancies|companies)\b/.test(q)));
});


test('Referans IDleri kaynak IDlerinden değil yerel sluglardan seçilir', async () => {
  const { mapLookups } = await import('../dist/sites/busy.az/lookups.js');
  const lookupRefs = {
    cities: [{id:'76',slug:'zaqatala',name:{az:'Zaqatala',ru:'Закатала'}}],
    jobTypes: [{id:'201',slug:'tam-zamanli',name:{az:'Tam Ştat'}},{id:'202',slug:'yari-zamanli',name:{az:'Yarım Ştat'}},{id:'204',slug:'staj',name:{az:'Təcrübəçi'}}],
    workplaces: [{id:'301',slug:'uzaktan',name:{az:'Məsafədən'}},{id:'302',slug:'hibrit',name:{az:'Hibrid'}},{id:'303',slug:'ofiste',name:{az:'Ofis daxili'}}],
    experienceLevels: [{id:'405',slug:'baslangic',name:{az:'Başlanğıc səviyyə'}},{id:'406',slug:'orta',name:{az:'Orta səviyyə'}},{id:'407',slug:'yuksek',name:{az:'Yüksək səviyyə'}},{id:'408',slug:'rehber',name:{az:'Rəhbər'}}],
  };
  const result = mapLookups({job_title:'Middle Developer (Remote)', employment_type:{id:999,title:{az:'Tam ştat (full time)'}},city_rels:[{city:{id:999,title:{az:'Zaqatala'}}}]}, lookupRefs);
  assert.equal(result.city.id,'76'); assert.equal(result.jobType.id,'201');
  assert.equal(result.workplace.id,'301'); assert.equal(result.experience.id,'406');
  const missing = mapLookups({job_title:'Proqramçı',is_remote:false,is_hybrid:false,required_experience:5},lookupRefs);
  assert.equal(missing.jobType.id,null); assert.equal(missing.workplace.id,null); assert.equal(missing.experience.id,null);
  assert.equal(mapLookups({job_title:'Junior/Senior developer'},lookupRefs).experience.id,null);
  assert.equal(mapLookups({job_title:'Developer',is_remote:true,is_hybrid:true},lookupRefs).workplace.id,null);
  assert.equal(mapLookups({job_title:'Təcrübəçi proqramçı (part-time)'},lookupRefs).jobType.id,null);
  assert.equal(mapLookups({job_title:'Filial müdiri'},lookupRefs).experience.id,'408');
  assert.equal(mapLookups({job_title:'Developer',city_rels:[{city:{title:'Закатала'}}]},lookupRefs).city.id,'76');
  assert.equal(mapLookups({job_title:'Developer',city_rels:[{city:{title:'Zaqatala'}},{city:{title:'Unknown'}}]},lookupRefs).city.id,null);
});

test('Çalışma türü doğrulaması yalnızca filtreli listeye gider; iki tipe eşleşmede atama yapmaz', async () => {
  const {enrichEmploymentTypes} = await import('../dist/sites/busy.az/client.js');
  const {mapLookups} = await import('../dist/sites/busy.az/lookups.js');
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async url=>{
    const parsed=new URL(url); calls.push(parsed);
    assert.equal(parsed.pathname,'/api/bff/api/vacancies');
    assert.equal(parsed.searchParams.get('vacancy_id'),'123');
    return new Response(JSON.stringify({vacancies:parsed.searchParams.get('employment_type[]')==='1'?[source]:[]}));
  };
  try {
    const vacancies=[listFields(source)];
    assert.deepEqual(await enrichEmploymentTypes(vacancies),[]);
    assert.deepEqual(vacancies[0].source_employment_type_ids,[1]);
    const r={cities:[],jobTypes:[{id:'100',slug:'tam-zamanli',name:{az:'Tam Ştat'}},{id:'200',slug:'yari-zamanli',name:{az:'Yarım Ştat'}}],workplaces:[],experienceLevels:[]};
    assert.equal(mapLookups(vacancies[0],r).jobType.id,'100');
    assert.equal(mapLookups({...vacancies[0],source_employment_type_ids:[1,2]},r).jobType.id,null);
    assert.equal(calls.length,2);
    globalThis.fetch=async()=>new Response('',{status:503});
    assert.equal((await enrichEmploymentTypes(vacancies)).length,1);
    assert.equal(vacancies[0].source_employment_type_ids,undefined);
  }finally{globalThis.fetch=original;}
});

test('Boş kaynak slug liste bağlantısıyla korunur', () => {
  const mapped = mapVacancy(listFields({...source, slug:null}), refs, mapping);
  assert.equal(mapped.sourceUrl,'https://busy.az/vacancies?vacancy_id=123');
});
