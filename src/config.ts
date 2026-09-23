import 'dotenv/config';
import {resolve} from 'node:path';

function integerEnv(name: string, fallback: number, max: number, min = 1): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} ${min} ile ${max} arasında bir tam sayı olmalı.`);
  }
  return value;
}

function proxyEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${name} http(s) proxy URL'i olmalı.`);
  return value;
}

// Bazı kaynakların WAF'ı (örn. jobu.az/hcdn) tam Chrome UA'sını 429 ile engelliyor; kısa,
// tarayıcı benzeri UA tüm kaynaklarda geçiyor. SCRAPE_USER_AGENT ile değiştirilebilir.
const defaultUserAgent = 'Mozilla/5.0 Chrome/124';

export const config = {
  port: integerEnv('PORT', 3000, 65535),
  host: process.env.HOST ?? '127.0.0.1',
  scrapeTimeoutMs: integerEnv('SCRAPE_TIMEOUT_MS', 15000, 120000),
  coreCacheRefreshMs: integerEnv('CORE_CACHE_REFRESH_MS', 300000, 2147483647),
  // Scraper ağ davranışı: istek aralığı, tekrar sayısı, 403/429 backoff tabanı, opsiyonel proxy ve UA.
  scrapeRequestIntervalMs: integerEnv('SCRAPE_REQUEST_INTERVAL_MS', 150, 60000, 0),
  scrapeMaxRetries: integerEnv('SCRAPE_MAX_RETRIES', 2, 10, 0),
  scrapeRetryBaseMs: integerEnv('SCRAPE_RETRY_BASE_MS', 15000, 600000),
  // boss.az istekleri gün boyuna yayılsın diye ayrı (uzun) istek aralığı; varsayılan 60 sn.
  bossRequestIntervalMs: integerEnv('SCRAPE_INTERVAL_BOSS_MS', 60000, 3600000, 0),
  // boss 403/429 alınca uzun bekle (blok açılana kadar gün boyu dener).
  bossRetryBaseMs: integerEnv('SCRAPE_RETRY_BASE_BOSS_MS', 300000, 3600000),
  bossMaxRetries: integerEnv('SCRAPE_MAX_RETRIES_BOSS', 8, 48, 0),
  scrapeProxyUrl: proxyEnv('SCRAPE_PROXY_URL'),
  // boss.az için ayrı proxy (IP bloğunu aşmak için). Verilmezse global proxy'e düşer.
  bossProxyUrl: proxyEnv('SCRAPE_PROXY_URL_BOSS') ?? proxyEnv('SCRAPE_PROXY_URL'),
  scrapeUserAgent: process.env.SCRAPE_USER_AGENT?.trim() || defaultUserAgent,
  // Şirket logoları yerel olarak indirilir (uzak URL ile istek yapılmaz). Dosyalar bu dizine
  // yazılır ve company_logo alanına bu taban ile başlayan yerel yol konur.
  companyLogoDir: process.env.COMPANY_LOGO_DIR?.trim() || resolve('data/company-logos'),
  companyLogoUrlBase: process.env.COMPANY_LOGO_URL_BASE?.trim() || '/storage/company-logos',
  companyLogoMaxBytes: integerEnv('COMPANY_LOGO_MAX_BYTES', 2000000, 10000000),
};
