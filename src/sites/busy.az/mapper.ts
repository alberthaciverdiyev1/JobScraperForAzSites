import {finalizeVacancy,type MappedVacancy} from '../shared/vacancy.js';
import {isBeforeCutoff,logoUrl} from '../shared/policy.js';
import type { SourceRecord } from './client.js';
import { mapLookups } from './lookups.js';
import { emptySiteReferences, siteChoice, type SiteReferences } from '../shared/references.js';

import type {References, Mapping} from '../shared/types.js';
export type {Category, Lookup, References, Mapping} from '../shared/types.js';
import {normalize,localized,slugify,categoryFromTitle} from '../shared/categories.js';
export {normalize,localized,slugify} from '../shared/categories.js';
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
export function selectCategory(v: SourceRecord, refs: References, mapping: Mapping) {
  if (/администратор/i.test(localized(v.job_title))) {
    const target = refs.categories.find(c => c.slug === 'administrator-inzibati');
    if (target) return { id: target.id, reason: 'Liste başlığı: administrator' };
  }
  const title = normalize(localized(v.job_title));
  const sourceIds: number[] = v.source_category_ids ?? [];
  const sourceId = sourceIds.find(id => mapping.categories.some(c => c.children.some(s => s.busyId === id)))
    ?? sourceIds[0] ?? Number(v.category_id);
  const parent = mapping.categories.find(c => c.busyId === sourceId || c.children.some(s => s.busyId === sourceId));
  const child = parent?.children.find(c => c.busyId === sourceId);
  if (/keyfiyyet.*nezaret|\bqc\b/.test(title)) {
    const target = refs.categories.find(c => c.slug === 'senaye-tikinti-ve-istehsalat');
    if (target) return { id: target.id, reason: 'QC: mevcut sanayi ana kategorisi' };
  }
  if (/filial mudiri/.test(title) && [95, 129, 23].includes(sourceId)) {
    const target = refs.categories.find(c => c.slug === 'restoran-meneceri');
    if (target) return { id: target.id, reason: 'İaşə işletmesinde filial yönetimi' };
  }
  const refined = categoryFromTitle(localized(v.job_title), refs);
  if (refined) return refined;
  const id = child?.subcategoryId ?? child?.categoryId ?? parent?.defaultCategoryId;
  if (!id || !refs.categories.some(c => c.id === id)) {
    return {id:null,reason:'Kategori eşleşmedi; boş bırakıldı.'};
  }
  return { id, reason: `Rapor eşleştirmesi: Busy.az ${sourceId}` };
}

export function mapVacancy(v: SourceRecord, refs: References, mapping: Mapping, today = new Date().toISOString().slice(0, 10), siteRefs: SiteReferences = emptySiteReferences()) {
  if (!Number.isSafeInteger(v.id) || v.id <= 0) throw new Error('Geçersiz kaynak ID.');
  if(isBeforeCutoff(v.published ?? v.created_at)) throw new Error('Yayın tarihi 15 Eylül 2026 öncesi.');
  const title = localized(v.job_title);
  const companyName = localized(v.company?.title);
  if (!title || title.length > 255 || !companyName || companyName.length > 255 || !Number.isSafeInteger(v.company?.id)) throw new Error('İlan/şirket kimliği eksik veya geçersiz.');
  const deadline = typeof v.deadline === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.deadline) ? v.deadline.slice(0, 10) : null;
  if (deadline && deadline < today) throw new Error('İlanın süresi dolmuş.');
  if (typeof v.published === 'string' && v.published.slice(0,10) > today) throw new Error('İlan henüz yayınlanmamış.');
  const sourceSlug = localized(v.slug);
  const sourceUrl = sourceSlug ? `https://busy.az/vacancy/${v.id}/${encodeURIComponent(sourceSlug)}`
    : `https://busy.az/vacancies?vacancy_id=${v.id}`;
  const category = selectCategory(v, refs, mapping);
  const lookup = mapLookups(v, refs);
  const cityNames = lookup.cityNames;
  // Kaynağa özel references.json eşlemeleri sezgisel sonucun önüne geçer.
  const employmentLabels = (v.source_employment_type_ids ?? []).map((id: number) => id === 1 ? 'full time' : id === 2 ? 'part time' : 'unknown');
  const city = siteChoice(cityNames, siteRefs.cities, refs.cities, 'Liste şehir adı') ?? lookup.city;
  const jobType = siteChoice(employmentLabels, siteRefs.jobTypes, refs.jobTypes, 'Liste çalışma türü') ?? lookup.jobType;
  const workplace = siteChoice([], siteRefs.workplaces, refs.workplaces, 'Liste çalışma yeri türü') ?? lookup.workplace;
  const experienceLabel = localized(v.experience_level);
  const experience = siteChoice(experienceLabel ? [experienceLabel] : [], siteRefs.experienceLevels, refs.experienceLevels, 'Liste kıdem düzeyi') ?? lookup.experience;
  // NOT NULL açıklama alanı liste bilgilerinden oluşan bir özetle doldurulur.
  // Kaynak ilanın detay açıklaması, e-posta, maaş veya diğer detayları okunmaz.
  const description = `<p>${escapeHtml(title)} — ${escapeHtml(companyName)}</p>`
    + (cityNames.length ? `<p>İş yeri: ${escapeHtml(cityNames.join(', '))}</p>` : '')
    + `<p>Bu elan Busy.az vakansiya siyahısından götürülüb. Ətraflı məlumat və müraciət üçün <a href="${escapeHtml(sourceUrl)}">orijinal elana baxın</a>.</p>`;
  return finalizeVacancy({
    sourceId: v.id as number, sourceUrl, companySourceId: v.company.id as number, companyName, companyLogo: v.company.logo_visible === 0 ? null : logoUrl(v.company.logo, 'https://busy.az'),
    title, slug: `busy-az-${v.id}-${slugify(title).slice(0,190)}`,
    categoryId: category.id, categoryReason: category.reason, cityId: city.id,
    salaryMin: null, salaryMax: null, currency: 'AZN', description,
    shortDescription: `${title} — ${companyName}`.slice(0,300), requirements: null,
    skills: [] as string[], deadline, applicationEmail: null, jobTypeId: jobType.id, workplaceTypeId: workplace.id,
    experienceLevelId: experience.id,
    lookupReasons: { city: city.reason, jobType: jobType.reason, workplace: workplace.reason, experience: experience.reason },
    warnings: [...(!city.id && cityNames.length ? ['Şehir tek bir yerel kayıtla eşleşmedi; liste şehirleri özette korundu.'] : []),
      'Yalnızca liste verisi: başvuru orijinal ilan bağlantısı üzerinden yapılır.'],
  }, refs, v.published ?? v.created_at, today);
}
export type {MappedVacancy} from '../shared/vacancy.js';
