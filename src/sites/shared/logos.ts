import {mkdir, readFile, writeFile, access} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {createHash} from 'node:crypto';
import {config} from '../../config.js';

/**
 * Şirket logoları yerel olarak indirilir; hiçbir kayıt uzak görsel URL'i tutmaz.
 * `data/company-logos/registry.json` şirket adını (normalize) indirilen dosyaya eşler;
 * böylece aynı şirket başka bir kaynakta logosuzsa önceden indirilen logo kullanılır.
 */
interface LogoEntry { name: string; file: string; url: string; source: string; fetchedAt: string }
type Registry = Record<string, LogoEntry>;

let cache: Registry | undefined;

export const companyKey = (name: string) => name.normalize('NFKC').toLocaleLowerCase('az').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const registryPath = () => resolve(config.companyLogoDir, 'registry.json');
const localUrl = (file: string) => `${config.companyLogoUrlBase.replace(/\/+$/, '')}/${file}`;

export async function loadRegistry(): Promise<Registry> {
    if (cache) return cache;
    let raw: Registry = {};
    try { raw = JSON.parse(await readFile(registryPath(), 'utf8')); } catch { raw = {}; }
    // URL, geçerli COMPANY_LOGO_URL_BASE'ten türetilir; taban değişince (ör. tam URL) kayıtlar güncellenir.
    for (const [key, entry] of Object.entries(raw)) {
        if (entry && typeof entry.file === 'string') entry.url = localUrl(entry.file);
    }
    cache = raw;
    return cache;
}

export async function saveRegistry(): Promise<void> {
    await mkdir(config.companyLogoDir, {recursive: true});
    await writeFile(registryPath(), JSON.stringify(cache, null, 2) + '\n');
}

const exists = (path: string) => access(path).then(() => true, () => false);

function extensionFor(url: string, contentType: string): string {
    const fromPath = extname(new URL(url).pathname).toLowerCase();
    if (/^\.(png|jpe?g|webp|gif|svg)$/.test(fromPath)) return fromPath;
    if (contentType.includes('svg')) return '.svg';
    if (contentType.includes('png')) return '.png';
    if (contentType.includes('webp')) return '.webp';
    if (contentType.includes('gif')) return '.gif';
    return '.jpg';
}

/**
 * Verilen şirket için yerel logo yolunu döndürür. Önce kayıt defterine bakar (kaynaklar arası
 * paylaşım); yoksa uzak `logoUrl`'i bir kez indirip kaydeder. Beklenmeyen durumlarda null döner.
 */
export async function resolveCompanyLogo(companyName: string, logoUrl: string | null, source: string): Promise<string | null> {
    const key = companyKey(companyName);
    if (!key) return null;
    const registry = await loadRegistry();
    const existing = registry[key];
    if (existing && await exists(resolve(config.companyLogoDir, existing.file))) return existing.url;
    // Zaten yerel bir yola işaret ediyorsa dokunma.
    if (logoUrl && logoUrl.startsWith(config.companyLogoUrlBase)) return logoUrl;
    if (!logoUrl || !/^https?:/i.test(logoUrl)) return existing?.url ?? null;
    try {
        const response = await fetch(logoUrl, {
            headers: {'User-Agent': config.scrapeUserAgent},
            redirect: 'follow',
            signal: AbortSignal.timeout(config.scrapeTimeoutMs)
        });
        if (!response.ok) return existing?.url ?? null;
        const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
        const buffer = Buffer.from(await response.arrayBuffer());
        if (!contentType.startsWith('image/') || buffer.length === 0 || buffer.length > config.companyLogoMaxBytes) {
            return existing?.url ?? null;
        }
        const hash = createHash('sha1').update(logoUrl).digest('hex').slice(0, 12);
        const file = `${hash}${extensionFor(logoUrl, contentType)}`;
        await mkdir(config.companyLogoDir, {recursive: true});
        await writeFile(resolve(config.companyLogoDir, file), buffer);
        registry[key] = {name: companyName, file, url: localUrl(file), source, fetchedAt: new Date().toISOString()};
        await saveRegistry();
        return registry[key]!.url;
    } catch {
        return existing?.url ?? null;
    }
}

/** Kayıt defterindeki bir şirketin yerel logo yolunu döndürür (indirme yapmaz). */
export async function registryLogo(companyName: string): Promise<string | null> {
    const registry = await loadRegistry();
    const entry = registry[companyKey(companyName)];
    return entry ? entry.url : null;
}
