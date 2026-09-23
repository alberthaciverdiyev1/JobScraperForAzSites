import type {SourceRecord, Lookup} from './types.js';

const key = (text: string) => text.toLocaleLowerCase('az').normalize('NFKD')
    .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function label(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (!value || typeof value !== 'object') return '';
    const object = value as Record<string, unknown>;
    return label(object.title ?? object.name ?? object.az ?? object.en ?? object.ru);
}

interface Choice {
    id: string | null;
    reason: string
}

function resolve(slugs: string[], refs: Lookup[], evidence: string): Choice {
    const unique = [...new Set(slugs)];
    if (unique.length !== 1) return {
        id: null,
        reason: unique.length ? 'Çelişen bilgiler; boş bırakıldı.' : 'Listede açık bilgi yok.'
    };
    const matches = refs.filter(row => row.slug === unique[0]);
    return matches.length === 1 ? {id: matches[0]!.id, reason: evidence} : {
        id: null,
        reason: 'Mevcut referans kaydı tekil olarak bulunamadı.'
    };
}

function fromText(text: string, refs: Lookup[], rules: [RegExp, string][], evidence: string): Choice {
    const normalized = key(text);
    const exact = refs.filter(row => [row.slug, ...Object.values(row.name)].some(name => key(name) === normalized && normalized !== ''));
    if (exact.length === 1) return {id: exact[0]!.id, reason: evidence};
    return resolve(rules.filter(([pattern]) => pattern.test(normalized)).map(([, slug]) => slug), refs, evidence);
}

const jobRules: [RegExp, string][] = [
    [/\b(full time|tam stat|tam is vaxti|tam is gunu|tam stat|полный день)\b/, 'tam-zamanli'],
    [/\b(part time|yarim stat|natamam is vaxti|yarim is gunu|неполный день)\b/, 'yari-zamanli'],
    [/\b(intern|internship|tecrube|tecrubeci|stajyer|стажер|стажировка)\b/, 'staj'],
    [/\b(freelance|freelancer|frilans|serbest|фриланс)\b/, 'serbest'],
    [/\b(contract|muqavile esasinda|muqavileli is)\b/, 'sozlesmeli'],
];
const workplaceRules: [RegExp, string][] = [
    [/\b(remote|distant|uzaqdan|mesafeden)\b|удаленно|удаленная/, 'uzaktan'],
    [/\b(hybrid|hibrid|hibrit)\b|гибрид/, 'hibrit'],
    [/\b(on site|onsite|ofis|ofis daxili)\b|в офисе/, 'ofiste'],
];
const experienceRules: [RegExp, string][] = [
    [/\b(junior|entry level|baslangic|kicik mutexessis|tecrubeci|intern)\b/, 'baslangic'],
    [/\b(middle|mid level|orta seviyye)\b/, 'orta'],
    [/\b(senior|yuksek seviyye|bas mutexessis|aparici mutexessis)\b/, 'yuksek'],
    [/\b(head of|director|direktor|rehber|mudir|mudiri)\b/, 'rehber'],
];

export function mapLookups(v: SourceRecord, refs: {
    cities: Lookup[];
    jobTypes: Lookup[];
    workplaces: Lookup[];
    experienceLevels: Lookup[]
}) {
    const title = label(v.job_title);
    const cityNames = [...new Set<string>((Array.isArray(v.city_rels) ? v.city_rels : [])
        .map((relation: SourceRecord) => label(relation.city)).filter(Boolean))];
    const mappedCities = cityNames.map(name => refs.cities.filter(city => [city.slug, ...Object.values(city.name)].some(candidate => key(candidate) === key(name))));
    const ids = [...new Set(mappedCities.flatMap(matches => matches.map(row => row.id)))];
    const city: Choice = cityNames.length && mappedCities.every(matches => matches.length === 1) && ids.length === 1
        ? {id: ids[0]!, reason: 'Liste şehir adı mevcut referansla eşleşti.'}
        : {
            id: null,
            reason: cityNames.length ? 'Birden fazla veya eşleşmeyen şehir; boş bırakıldı.' : 'Listede şehir bilgisi yok.'
        };
    const employment = label(v.employment_type);
    const filterLabels: string[] = Array.isArray(v.employment_filter_labels) ? v.employment_filter_labels : [];
    const filterChoices = filterLabels.map(text => fromText(text, refs.jobTypes, jobRules, 'Filtreli listede ilan kimliği doğrulandı.'));
    const jobType = employment
        ? fromText(employment, refs.jobTypes, jobRules, 'Liste çalışma türü.')
        : filterChoices.length
            ? filterChoices.every(c => c.id !== null && c.id === filterChoices[0]!.id)
                ? filterChoices[0]!
                : {id: null, reason: 'Filtre çalışma türleri çelişiyor veya eşleşmiyor; boş bırakıldı.'}
            : fromText(title, refs.jobTypes, jobRules, 'Başlıktaki açık çalışma türü.');
    const workplaceLabel = label(v.workplace_type);
    const workplace = workplaceLabel
        ? fromText(workplaceLabel, refs.workplaces, workplaceRules, 'Liste çalışma yeri türü.')
        : v.is_remote === true && v.is_hybrid === true
            ? {id: null, reason: 'Çelişen remote/hybrid bilgisi.'}
            : v.is_remote === true ? resolve(['uzaktan'], refs.workplaces, 'Listede is_remote=true.')
                : v.is_hybrid === true ? resolve(['hibrit'], refs.workplaces, 'Listede is_hybrid=true.')
                    : fromText(title, refs.workplaces, workplaceRules, 'Başlıktaki açık çalışma yeri türü.');
    const level = label(v.experience_level);
    // Yıl sayısı kıdem düzeyi değildir; sayısal kaynak ID ve deneyim yılı yerel ID'ye çevrilmez.
    const experience = fromText(level || title, refs.experienceLevels, experienceRules, level ? 'Liste kıdem düzeyi.' : 'Başlıktaki açık kıdem düzeyi.');
    return {city, cityNames, jobType, workplace, experience};
}
