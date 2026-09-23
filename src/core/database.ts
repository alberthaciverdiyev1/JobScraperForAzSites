import 'dotenv/config';
import { Pool } from 'pg';

if (process.env.DB_CONNECTION !== 'pgsql') {
  throw new Error('DB_CONNECTION pgsql olmalı.');
}
const port = Number(process.env.DB_PORT ?? 5432);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT geçersiz.');
}
for (const key of ['DB_HOST', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD']) {
  if (!process.env[key]) throw new Error(`${key} tanımlanmalı.`);
}

export const pool = new Pool({
  host: process.env.DB_HOST,
  port,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 10000,
  options: '-c default_transaction_read_only=on',
});
pool.on('error', (error) => console.error('PostgreSQL havuz hatası:', error.message));
