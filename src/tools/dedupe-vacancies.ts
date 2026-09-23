import 'dotenv/config';
import {Pool} from 'pg';

const args = process.argv.slice(2);
const write = args.includes('--write');
for (const arg of args) if (arg !== '--write') throw new Error(`Geçersiz argüman: ${arg} (kullanım: [--write])`);

// Mükerrer tanımı: aynı redirect_url VEYA aynı (şirket adı + başlık + şehir).
// Her grupta en küçük id (ilk kayıt) kalır, diğerleri silinir.
const byUrl = `
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY redirect_url ORDER BY id) rn
    FROM public.scraped_vacancies WHERE redirect_url IS NOT NULL
  ) t WHERE rn > 1`;
const byKey = `
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY lower(btrim(company_name)), lower(btrim(title)), coalesce(city_id, -1)
      ORDER BY id
    ) rn FROM public.scraped_vacancies
  ) t WHERE rn > 1`;

const pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, max: 1,
    connectionTimeoutMillis: 5000, statement_timeout: 120000,
    options: '-c default_transaction_read_only=off'
});

try {
    const count = async (query: string) => Number((await pool.query(`SELECT count(*)::int c FROM (${query}) x`)).rows[0].c);
    const urlDups = await count(byUrl);
    const keyDups = await count(byKey);
    let deleted = 0;
    if (write) {
        const r1 = await pool.query(`DELETE FROM public.scraped_vacancies WHERE id IN (${byUrl})`);
        const r2 = await pool.query(`DELETE FROM public.scraped_vacancies WHERE id IN (${byKey})`);
        deleted = (r1.rowCount ?? 0) + (r2.rowCount ?? 0);
    }
    const total = Number((await pool.query('SELECT count(*)::int c FROM public.scraped_vacancies')).rows[0].c);
    console.log(JSON.stringify({mode: write ? 'write' : 'dry-run', duplicateByUrl: urlDups, duplicateByKey: keyDups, deleted, remaining: total}));
    if (!write) console.log('Değişiklik yapılmadı; silmek için --write ekleyin.');
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
} finally {
    await pool.end();
}
