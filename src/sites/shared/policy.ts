export const MIN_PUBLISHED_DATE = '2026-09-15';

export function publicationDate(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
    const named = /^(\d{1,2})\s+([\p{L}]+)\s+(\d{4})$/u.exec(value.trim().toLocaleLowerCase('az'));
    if (named && months.includes(named[2]!)) value = `${named[3]}-${String(months.indexOf(named[2]!) + 1).padStart(2, '0')}-${named[1]!.padStart(2, '0')}`;
    value = (value as string).replace(/^(\d{2})\.(\d{2})\.(\d{4})$/, '$1-$2-$3');
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(value as string);
    const local = /^(\d{2})-(\d{2})-(\d{4})$/.exec((value as string).trim());
    const date = iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : local ? `${local[3]}-${local[2]}-${local[1]}` : null;
    if (!date) return null;
    const parsed = new Date(date + 'T00:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

export function isBeforeCutoff(value: unknown) {
    const date = publicationDate(value);
    return date !== null && date < MIN_PUBLISHED_DATE;
}

export function logoUrl(value: unknown, base: string): string | null {
    if (typeof value !== 'string' || !value.trim() || /placeholder|building\.|default[.-]/i.test(value)) return null;
    try {
        const url = new URL(value, base);
        return /^https?:$/.test(url.protocol) && url.href.length <= 255 ? url.href : null;
    } catch {
        return null;
    }
}
