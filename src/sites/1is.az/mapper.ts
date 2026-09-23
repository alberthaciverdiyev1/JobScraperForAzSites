import {finalizeVacancy,type MappedVacancy} from '../shared/vacancy.js';
import {isBeforeCutoff,logoUrl} from '../shared/policy.js';
import {mapLookups} from '../shared/lookups.js';
import {mapCategory,slugify} from '../shared/categories.js';
import {emptySiteReferences,siteChoice,type SiteReferences} from '../shared/references.js';
import type {References} from '../shared/types.js';
import type {Listing} from './client.js';
const escape = (v:string) => v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function mapVacancy(v:Listing,refs:References,siteRefs:SiteReferences=emptySiteReferences()): MappedVacancy & {companyLogo:string|null} {
  if(!Number.isSafeInteger(v.id)||v.id<=0||!v.title||v.title.length>255||!v.companyName||v.companyName.length>255||!v.companyId) throw new Error('İlan veya şirket kimliği geçersiz.');
  if(isBeforeCutoff(v.published)) throw new Error('Yayın tarihi 15 Eylül 2026 öncesi.');
  // Kategori eşlemesi kaynağa özel references.json dosyasından okunur; yoksa sezgisel kurala düşülür.
  const mappedSlug = siteRefs.categories[v.category] ?? undefined;
  const target = mappedSlug ? refs.categories.find(c=>c.slug===mappedSlug) : undefined;
  const category = mapCategory(v.title,target?.id,refs);
  const lookup = mapLookups({job_title:v.title,city_rels:v.cities.map(city=>({city})),
    employment_filter_labels:v.regimes.filter(label=>label!=='Uzaqdan'),is_remote:v.regimes.includes('Uzaqdan')},refs);
  const city = siteChoice(v.cities,siteRefs.cities,refs.cities,'Liste şehir adı') ?? lookup.city;
  const jobType = siteChoice(v.regimes.filter(label=>label!=='Uzaqdan'),siteRefs.jobTypes,refs.jobTypes,'Kaynak iş rejimi') ?? lookup.jobType;
  const workplace = siteChoice(v.regimes,siteRefs.workplaces,refs.workplaces,'Kaynak iş rejimi') ?? lookup.workplace;
  const experience = lookup.experience;
  const sourceUrl=`https://1is.az/vacancy/${v.id}`;
  return finalizeVacancy({sourceId:v.id,sourceUrl,companySourceId:v.companyId,companyName:v.companyName,companyLogo:logoUrl(v.companyLogo,'https://1is.az'),
    title:v.title,slug:`1is-az-${v.id}-${slugify(v.title).slice(0,190)}`,categoryId:category.id,categoryReason:category.reason.replace('Busy.az -1',`1is.az ${v.category}`),
    cityId:city.id,jobTypeId:jobType.id,workplaceTypeId:workplace.id,experienceLevelId:experience.id,
    salaryMin:null,salaryMax:null,currency:'AZN',requirements:null,skills:[],deadline:null,applicationEmail:null,
    description:`<p>${escape(v.title)} — ${escape(v.companyName)}</p>`+(v.cities.length?`<p>İş yeri: ${escape(v.cities.join(', '))}</p>`:'')+`<p>1is.az siyahısından. <a href="${sourceUrl}">Orijinal elan və müraciət</a>.</p>`,shortDescription:`${v.title} — ${v.companyName}`.slice(0,300),
    lookupReasons:{city:city.reason,jobType:jobType.reason,workplace:workplace.reason,experience:experience.reason},
    warnings:[...(/\.\.\.|…/.test(v.title)?['Başlık kaynak listede kısaltılmış; detay okunmadı.']:[]),'Yalnızca liste verisi; tarih yayın tarihidir, son başvuru tarihi bilinmiyor.']}, refs, v.published);
}
