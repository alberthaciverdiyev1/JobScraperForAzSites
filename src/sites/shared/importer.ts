import {isBeforeCutoff, publicationDate} from './policy.js';
import {resolveCompanyLogo} from './logos.js';
import type {Pool, PoolClient} from 'pg';
import type {References} from './types.js';
import type {MappedVacancy} from './vacancy.js';

export const companyKey = (name: string) => name.normalize('NFKC').toLocaleLowerCase('az').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export async function loadReferences(pool: Pool): Promise<References> {
    const categories = (await pool.query('SELECT id, name, slug, parent_id FROM public.categories ORDER BY id')).rows;
    const cities = (await pool.query('SELECT id, name, slug FROM public.cities')).rows;
    const jobTypes = (await pool.query('SELECT id, name, slug FROM public.job_types')).rows;
    const workplaces = (await pool.query('SELECT id, name, slug FROM public.workplace_types')).rows;
    const experienceLevels = (await pool.query('SELECT id, name, slug FROM public.experience_levels')).rows;
    return {categories, cities, jobTypes, workplaces, experienceLevels};
}

async function insertVacancy(client: PoolClient, job: MappedVacancy & { companyLogo?: string | null }) {
    // Maaş aralığı yoksa pazarlık konusu kabul edilir.
    const negotiable = job.salaryMin === null && job.salaryMax === null;
    const result = await client.query<{ id: string }>(`
        INSERT INTO public.scraped_vacancies
        (company_name, redirect_url, category_id, city_id, title, slug,
         salary_min, salary_max, currency, description, requirements, skills,
         is_featured, is_active, deadline, views_count, created_at, updated_at,
         job_type_id, workplace_type_id, application_type, application_email,
         salary_negotiable, application_fields, experience_level_id, company_logo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::json, false, true, $13, 0, NOW(), NOW(), $14, $15,
                'email', $16, $17, '[]'::json, $18,
                $19) RETURNING id`, [job.companyName, job.sourceUrl, job.categoryId, job.cityId,
        job.title, job.slug, job.salaryMin, job.salaryMax, job.currency, job.description,
        job.requirements, JSON.stringify(job.skills), job.deadline,
        job.jobTypeId, job.workplaceTypeId, job.applicationEmail, negotiable, job.experienceLevelId, job.companyLogo ?? null]);
    return result.rows[0]!.id;
}

export async function importBatch(pool: Pool, jobs: (MappedVacancy & {
    companyLogo?: string | null
})[], source: string = 'busy-az') {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source)) throw new Error('Geçersiz kaynak anahtarı.');
    if (jobs.some(job => !job.slug.startsWith(`${source}-${job.sourceId}-`))) throw new Error('İlan kaynak anahtarı uyuşmuyor.');
    const client = await pool.connect();
    const inserted: { sourceId: number; id: string; companyName: string; title: string }[] = [];
    const duplicates: { sourceId: number; id: string }[] = [];
    try {
        await client.query('BEGIN');
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`job-scraper:${source}:import`]);
        for (const job of jobs) {
            const today = new Date().toISOString().slice(0, 10);
            if (isBeforeCutoff(job.publishedDate) || (job.publishedDate && job.publishedDate > today) || (publicationDate(job.deadline) && job.deadline! < today)) throw new Error('İlan tarih politikasına uymuyor.');
            // Logo yerel olarak çözülür: kayıt defterinde varsa yeniden kullanılır, yoksa indirilir.
            // Böylece hiçbir kayıt uzak görsel URL'i tutmaz.
            const companyLogo = await resolveCompanyLogo(job.companyName, job.companyLogo ?? null, source);
            // Mükerrer: aynı kaynak (redirect_url/slug) VEYA kaynaklar arası aynı ilan
            // (şirket + başlık + şehir). Böylece aynı ilan başka siteden geldiğinde yeniden
            // eklenmez; bu, harici dedupe adımı olmadan da yinelenmeyi önler.
            const existing = await client.query<{ id: string }>(
                `SELECT id FROM public.scraped_vacancies
                 WHERE redirect_url = $1 OR slug = $2 OR slug LIKE $3
                    OR (lower(btrim(company_name)) = lower(btrim($4))
                        AND lower(btrim(title)) = lower(btrim($5))
                        AND coalesce(city_id, -1) = coalesce($6::bigint, -1))
                 ORDER BY id LIMIT 1`,
                [job.sourceUrl, job.slug, `${source}-${job.sourceId}-%`, job.companyName, job.title, job.cityId]);
            if (existing.rows[0]) {
                // Eksik referansları doldur; uzak logo URL'ini yerel yolla değiştir.
                await client.query(`UPDATE public.scraped_vacancies
                                    SET category_id=COALESCE(category_id, $7),
                                        city_id=COALESCE(city_id, $2),
                                        job_type_id=COALESCE(job_type_id, $3),
                                        workplace_type_id=COALESCE(workplace_type_id, $4),
                                        experience_level_id=COALESCE(experience_level_id, $5),
                                        company_logo=COALESCE($6, company_logo),
                                        salary_negotiable=CASE WHEN salary_min IS NULL AND salary_max IS NULL THEN true ELSE salary_negotiable END,
                                        updated_at=NOW()
                                    WHERE id = $1
                                      AND ((city_id IS NULL AND $2::bigint IS NOT NULL)
                                        OR (job_type_id IS NULL AND $3::bigint IS NOT NULL)
                                        OR (workplace_type_id IS NULL AND $4::bigint IS NOT NULL)
                                        OR (experience_level_id IS NULL AND $5::bigint IS NOT NULL)
                                        OR (company_logo IS NULL AND $6::varchar IS NOT NULL)
                                        OR (company_logo LIKE 'http%' AND $6::varchar IS NOT NULL)
                                        OR (salary_min IS NULL AND salary_max IS NULL AND salary_negotiable = false)
                                        OR (category_id IS NULL AND $7::bigint IS NOT NULL))`,
                    [existing.rows[0].id, job.cityId, job.jobTypeId, job.workplaceTypeId, job.experienceLevelId, companyLogo, job.categoryId]);
                duplicates.push({sourceId: job.sourceId, id: existing.rows[0].id});
                continue;
            }
            inserted.push({
                sourceId: job.sourceId,
                id: await insertVacancy(client, {...job, companyLogo}),
                companyName: job.companyName,
                title: job.title
            });
        }
        await client.query('COMMIT');
        return {inserted, duplicates};
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
