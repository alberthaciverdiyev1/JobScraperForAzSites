import {ProxyAgent, type Dispatcher} from 'undici';
import {config} from '../../config.js';

/** Only observed list/filter endpoints may be registered. No detail URLs. */
export const listSources = {
    'busy.az': {origin: 'https://busy.az', paths: ['/api/bff/api/vacancies', '/api/bff/api/filter/categories', '/api/bff/api/filter/experiences', '/api/bff/api/filter/cities']},
    'smartjob.az': {origin: 'https://smartjob.az', paths: ['/vakansiyalar', '/api/jobs']},
    'hellojob.az': {origin: 'https://www.hellojob.az', paths: ['/', '/vakansiyalar']},
    'boss.az': {origin: 'https://boss.az', paths: ['/graphql']},
    'work.az': {origin: 'https://api.work.az', paths: ['/v1/vacancies', '/v1/list-of-values']},
    'jobsearch.az': {
        origin: 'https://unsu.jobsearch.az',
        paths: ['/api-az/vacancies-az', '/api-az/filters', '/api-az/categories-az']
    },
    '1is.az': {origin: 'https://1is.az', paths: ['/allvacancy', '/vsearch']},
    'careera.az': {origin: 'https://www.careera.az', paths: ['/']},
    'position.az': {origin: 'https://www.position.az', paths: ['/az', '/az/vacancies']},
    'jobu.az': {origin: 'https://jobu.az', paths: ['/wp-json/wp/v2/job_listing']},
    'jobnet.az': {origin: 'https://api.jobnet.az', paths: ['/api/v1/vacancies', '/api/v1/vacancy-filters']},
    'azvak.az': {origin: 'https://rest.azvak.com.az', paths: ['/api/vacancies', '/api/departments', '/api/locations']},
    'easyjob.az': {origin: 'https://easyjob.az', paths: ['/']},
} as const;

let lastRequest = 0;
const proxyDispatchers = new Map<string, Dispatcher>();
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Kaynak için proxy URL'i: boss'a özel varsa o, yoksa global. */
function proxyFor(source: string): string | undefined {
    return source === 'boss.az' ? config.bossProxyUrl : config.scrapeProxyUrl;
}

/** Ayarlıysa liste istekleri proxy üzerinden gider (boss için ayrı proxy olabilir). */
function getDispatcher(source: string): Dispatcher | undefined {
    const url = proxyFor(source);
    if (!url) return undefined;
    let dispatcher = proxyDispatchers.get(url);
    if (!dispatcher) { dispatcher = new ProxyAgent(url); proxyDispatchers.set(url, dispatcher); }
    return dispatcher;
}

/** Kaynak için deneme sayısı ve backoff tabanı (boss için daha uzun/nazik). */
function retryConfig(source: string): {maxRetries: number; baseMs: number} {
    return source === 'boss.az'
        ? {maxRetries: config.bossMaxRetries, baseMs: config.bossRetryBaseMs}
        : {maxRetries: config.scrapeMaxRetries, baseMs: config.scrapeRetryBaseMs};
}

/** 403/429 (Cloudflare hız sınırı) için üstel backoff; diğer tekrarlar için kısa sabit artış. */
function retryDelay(attempt: number, rateLimited: boolean, baseMs: number): number {
    return rateLimited ? Math.min(baseMs * 2 ** attempt, 3600000) : 1000 * (attempt + 1);
}

export async function fetchList(source: keyof typeof listSources, url: URL, accept = 'text/html', body?: Record<string, unknown>) {
    const sourceConfig = listSources[source];
    if (url.origin !== sourceConfig.origin || !(sourceConfig.paths as readonly string[]).includes(url.pathname)) throw new Error('Yalnızca kayıtlı liste/filtre endpointleri okunabilir.');
    if (body && !((source === 'work.az' && url.pathname === '/v1/vacancies') || (source === 'boss.az' && url.pathname === '/graphql' && typeof body.query === 'string' && /^query Scraper/.test(body.query) && !/\b(mutation|subscription|vacancy\s*\()/i.test(body.query)))) throw new Error('POST yalnızca doğrulanmış Work liste araması için izinli.');
    const baseOptions: RequestInit & {dispatcher?: Dispatcher} = {
        method: body ? 'POST' : 'GET',
        body: body ? JSON.stringify(body) : undefined,
        headers: {
            ...(body ? {'Content-Type': 'application/json'} : {}),
            ...((source === 'jobsearch.az' || (source === 'hellojob.az' && accept === 'application/json')) ? {'X-Requested-With': 'XMLHttpRequest'} : {}),
            ...(source === 'boss.az' ? {'Apollo-Require-Preflight': 'true'} : {}),
            Accept: accept,
            'accept-language': 'az',
            // Sıkıştırılmış gövdeyi (br/gzip) ham JSON sanıp bozmamak için açıkça kimlik kodlaması iste.
            'accept-encoding': 'identity',
            'User-Agent': config.scrapeUserAgent
        },
        redirect: 'error'
    };
    const dispatcher = getDispatcher(source);
    if (dispatcher) baseOptions.dispatcher = dispatcher;
    for (let attempt = 0; ; attempt++) {
        const interval = source === 'boss.az' ? config.bossRequestIntervalMs : config.scrapeRequestIntervalMs;
        const {maxRetries, baseMs} = retryConfig(source);
        const delay = Math.max(0, interval - (Date.now() - lastRequest));
        if (delay) await sleep(delay);
        lastRequest = Date.now();
        let response: Response;
        try {
            // Her deneme için taze timeout sinyali (AbortSignal tek kullanımlıktır).
            response = await fetch(url.href, {...baseOptions, signal: AbortSignal.timeout(config.scrapeTimeoutMs)});
        } catch (error) {
            if (attempt >= maxRetries) throw error;
            await sleep(retryDelay(attempt, false, baseMs));
            continue;
        }
        if (response.ok) return response;
        const rateLimited = response.status === 403 || response.status === 429;
        const serverError = response.status >= 500;
        if ((rateLimited || serverError) && attempt < maxRetries) {
            await sleep(retryDelay(attempt, rateLimited, baseMs));
            continue;
        }
        throw new Error(`${source} liste HTTP ${response.status}`);
    }
}
