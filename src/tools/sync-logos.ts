import 'dotenv/config';
import {Pool} from 'pg';
import {config} from '../config.js';
import {resolveCompanyLogo, companyKey, loadRegistry} from '../sites/shared/logos.js';

const args = process.argv.slice(2);
const write = args.includes('--write');
for (const arg of args) if (arg !== '--write') throw new Error(`Geçersiz argüman: ${arg} (kullanım: [--write])`);

// company_logo yerel yola çevrileceği için yazma yetkili bağlantı kullanılır.
const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, max: 1,
    connectionTimeoutMillis: 5000, statement_timeout: 60000,
    options: '-c default_transaction_read_only=off'
});

try {
    const companies = (await pool.query(
        'SELECT company_name, max(company_logo) AS logo FROM public.scraped_vacancies WHERE company_name IS NOT NULL GROUP BY company_name ORDER BY company_name'
    )).rows as {company_name: string; logo: string | null}[];

    await loadRegistry();
    let downloaded = 0, reused = 0, unresolved = 0, updatedRows = 0;
    for (const {company_name, logo} of companies) {
        const remote = logo && /^https?:/i.test(logo) ? logo : null;
        const before = companyKey(company_name);
        void before;
        const resolved = await resolveCompanyLogo(company_name, remote, 'backfill');
        if (resolved) {
            if (remote) downloaded++; else reused++;
            if (write) {
                const result = await pool.query(
                    "UPDATE public.scraped_vacancies SET company_logo=$1 WHERE company_name=$2 AND company_logo IS DISTINCT FROM $1",
                    [resolved, company_name]);
                updatedRows += result.rowCount ?? 0;
            }
        } else unresolved++;
    }
    console.log(JSON.stringify({
        mode: write ? 'write' : 'dry-run', companies: companies.length,
        downloaded, reusedFromRegistry: reused, unresolved, updatedRows, dir: config.companyLogoDir
    }));
    if (!write) console.log('Değişiklik yapılmadı; uygulamak için --write ekleyin.');
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
} finally {
    await pool.end();
}
