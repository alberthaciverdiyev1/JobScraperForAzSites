import 'dotenv/config';
import {Pool} from 'pg';
import {config} from '../config.js';
import {resolveCompanyLogo, loadRegistry, saveRegistry, companyKey} from '../sites/shared/logos.js';

const args = process.argv.slice(2);
const write = args.includes('--write');
for (const arg of args) if (arg !== '--write') throw new Error(`Geçersiz argüman: ${arg} (kullanım: [--write])`);

// Bir dosya bu kadar çok farklı şirkete atanmışsa o bir site varsayılanıdır (placeholder).
const DEFAULT_LOGO_MIN_COMPANIES = 3;

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

    const registry = await loadRegistry();
    const results: {name: string; remote: string | null; resolved: string | null; file: string | null}[] = [];
    for (const {company_name, logo} of companies) {
        const remote = logo && /^https?:/i.test(logo) ? logo : null;
        const resolved = await resolveCompanyLogo(company_name, remote, 'backfill');
        results.push({name: company_name, remote, resolved, file: resolved ? resolved.split('/').pop()! : null});
    }
    // Aynı dosyayı kaç farklı şirket kullanıyor?
    const usage: Record<string, number> = {};
    for (const r of results) if (r.file) usage[r.file] = (usage[r.file] ?? 0) + 1;
    const defaults = new Set(Object.entries(usage).filter(([, count]) => count >= DEFAULT_LOGO_MIN_COMPANIES).map(([file]) => file));

    let downloaded = 0, reused = 0, rejected = 0, updatedRows = 0;
    for (const r of results) {
        const isDefault = r.file !== null && defaults.has(r.file);
        const finalUrl = isDefault ? null : r.resolved;
        if (isDefault) rejected++;
        else if (r.remote) downloaded++;
        else if (r.resolved) reused++;
        if (isDefault) delete registry[companyKey(r.name)];
        if (write) {
            const changed = await pool.query(
                'UPDATE public.scraped_vacancies SET company_logo=$1 WHERE company_name=$2 AND company_logo IS DISTINCT FROM $1',
                [finalUrl, r.name]);
            updatedRows += changed.rowCount ?? 0;
        }
    }
    if (write) await saveRegistry();
    console.log(JSON.stringify({
        mode: write ? 'write' : 'dry-run', companies: companies.length,
        downloaded, reusedFromRegistry: reused, rejectedAsDefault: rejected,
        defaultFiles: defaults.size, updatedRows, dir: config.companyLogoDir
    }));
    if (!write) console.log('Değişiklik yapılmadı; uygulamak için --write ekleyin.');
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
} finally {
    await pool.end();
}
