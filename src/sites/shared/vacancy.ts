import type {References} from './types.js';
import {isBeforeCutoff, publicationDate, logoUrl} from './policy.js';

export interface MappedVacancy {
    sourceId: number;
    sourceUrl: string;
    companySourceId: number;
    companyName: string;
    companyLogo: string | null;
    title: string;
    slug: string;
    categoryId: string | null;
    categoryReason: string;
    cityId: string | null;
    jobTypeId: string | null;
    workplaceTypeId: string | null;
    experienceLevelId: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string;
    description: string;
    shortDescription: string;
    requirements: string | null;
    skills: string[];
    deadline: string | null;
    applicationEmail: string | null;
    publishedDate?: string | null;
    lookupReasons: { city: string; jobType: string; workplace: string; experience: string };
    warnings: string[];
}

/** All adapters pass through this gate, including imports from saved list files. */
export function finalizeVacancy(job: MappedVacancy, refs: References, published: unknown, today = new Date().toISOString().slice(0, 10)): MappedVacancy {
    const date = publicationDate(published), deadline = publicationDate(job.deadline);
    if (isBeforeCutoff(date)) throw new Error('Yayın tarihi 15 Eylül 2026 öncesi.');
    if (date && date > today) throw new Error('İlan henüz yayınlanmamış.');
    if (deadline && deadline < today) throw new Error('İlanın süresi dolmuş.');
    const url = new URL(job.sourceUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Geçersiz kaynak bağlantısı.');
    const warnings = [...job.warnings];
    if (!date) warnings.push('Yayın tarihi eksik veya geçersiz; tarih uydurulmadı.');
    if (job.deadline && !deadline) warnings.push('Son başvuru tarihi geçersiz; boş bırakıldı.');
    const referenceFields = [
        ['categoryId', refs.categories], ['cityId', refs.cities], ['jobTypeId', refs.jobTypes],
        ['workplaceTypeId', refs.workplaces], ['experienceLevelId', refs.experienceLevels],
    ] as const;
    const result = {...job, publishedDate: date, deadline, companyLogo: logoUrl(job.companyLogo, url.origin), warnings};
    for (const [field, rows] of referenceFields) {
        if (result[field] !== null && !rows.some(row => row.id === result[field])) result[field] = null;
        if (result[field] === null) warnings.push(`${field}: açık ve tekil eşleşme yok; boş bırakıldı.`);
    }
    const amount = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
    result.salaryMin = amount(job.salaryMin);
    result.salaryMax = amount(job.salaryMax);
    if (result.salaryMin !== null && result.salaryMax !== null && result.salaryMin > result.salaryMax) {
        result.salaryMin = null;
        result.salaryMax = null;
        warnings.push('Maaş aralığı çelişkili; boş bırakıldı.');
    }
    return result;
}
