import type {References} from './types.js';
export const normalize = (value: string) => value.toLocaleLowerCase('az').normalize('NFKD')
  .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const slugify = (value: string) => normalize(value).replace(/ /g, '-');
export function localized(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return localized(item.az ?? item.en ?? item.ru);
  }
  return '';
}
const titleRules: [RegExp, string][] = [
  [/istehsalat.*nezaret|keyfiyyet.*nezaret|\bqc\b/, 'senaye-tikinti-ve-istehsalat'],
  [/tekrarsigorta|sigorta.*emeliyyat/, 'diger-maliyye'],
  [/biznes inkisaf/, 'satis-uzre-mutexessis'],
  [/sexsi komekci|qeydiyyatci/, 'katibe-resepisn-komekci'],
  [/satis.*meslehetci/, 'satis-meslehetcisi'],
  [/marketinq.*(mudir|direktor|rehber)/, 'marketinq-ve-pr-direktoru-cmo'],
  [/insaat muhendis|tikinti muhendis|civil engineer/, 'tikinti-muhendisliyi'],
  [/anbar.*fehle|yukvuran/, 'yukvuran-fehle'], [/anbardar|anbar operator/, 'anbardar-logistika'],
  [/kuryer|courier/, 'kuryer-logistika'], [/surucu|driver/, 'surucu-driver'],
  [/muhasib|accountant/, 'muhasib'], [/auditor/, 'auditor'],
  [/kredit/, 'kredit-mutexessisi'], [/komplayens|compliance/, 'komplayens-meneceri'],
  [/kassir|cashier/, 'kassir-operator'], [/satis.*rehber|head of sales/, 'satis-sobesinin-rehberi'],
  [/filial mudiri|magaza.*(mudiri|rehber)/, 'filial-rehberi-magaza-rehberi'],
  [/satis.*menecer|sales manager/, 'satis-meneceri'], [/satis|sales|telemarketinq|telemarketing/, 'satis-uzre-mutexessis'],
  [/cagri merkezi|call center/, 'cagri-merkezi-operatoru'],
  [/insan resurs|human resources|\bhr\b|ise qebul/, 'heyetin-idareolunmasi'],
  [/smm|social media/, 'smm-menecer-kontent-menecer'], [/\bmarketinq|marketing/, 'marketinq-meneceri-reqemsal-marketoloq'],
  [/qrafik dizayn|graphic design/, 'qrafik-dizayner-marketinq'], [/ui ux|ux ui/, 'veb-dizayn-ui-ux'],
  [/proqramci|developer|software engineer/, 'proqramlasdirma'],
  [/sistem.*(inzibat|admin)|system admin|devops/, 'sistem-idareetmesi'],
  [/kiber|cyber|data analyst|melumat analitik/, 'diger-it'],
  [/helpdesk|help desk/, 'it-mutexessisi-meslehetci'],
  [/huquqsunas|lawyer/, 'huquqsunas-legal'], [/tercume|translator/, 'tercumeci'],
  [/ofis meneceri|office manager/, 'ofis-meneceri'], [/reseps|reception|katibe/, 'katibe-resepisn-komekci'],
  [/muhafize|security guard/, 'muhafize-xidmeti'], [/xadime|temizlik/, 'xadime-service'],
  [/aspaz|chef|sirniyyatci|corekci/, 'aspaz-corekci-sirniyyatci'],
  [/ofisiant|barista|barmen|waiter/, 'ofisiant-barmen-barista'],
  [/hekim|doctor/, 'hekim'], [/tibb bacisi|nurse/, 'tibbi-personal'], [/eczaci|pharmacist/, 'tibbi-numayende-eczaci'],
  [/laborant/, 'laborant'], [/satinalma|procurement/, 'satinalma-meneceri'],
  [/tender/, 'tender-mutexessisi'], [/logistika|logistics/, 'logistika-uzre-mutexessis-menecer'],
  [/qaynaqci|welder/, 'qaynaqci'], [/elektrik|electrician/, 'elektrik-usta'],
  [/muhendis|engineer/, 'muhendis-general'], [/mexanik|mechanic/, 'mexanik'],
  [/fehle|laborer/, 'fehle-worker'],
];

export function categoryFromTitle(title: string, refs: References) {
  const normalized = normalize(title);
  const rule = titleRules.find(([pattern, slug]) => pattern.test(normalized) && refs.categories.some(c => c.slug === slug));
  const target = rule && refs.categories.find(c => c.slug === rule[1]);
  return target ? {id: target.id, reason: `Başlık kuralı: ${target.slug}`} : null;
}
export function mapCategory(title: string, fallbackId: string | undefined, refs: References) {
  const refined = categoryFromTitle(title, refs);
  if (refined) return refined;
  const target = refs.categories.find(c => c.id === fallbackId);
  return target ? {id:target.id,reason:'Kaynak kategori mevcut referansla eşleşti.'} : {id:null,reason:'Kategori eşleşmedi; boş bırakıldı.'};
}
