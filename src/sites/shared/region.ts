import {normalize} from './categories.js';
import type {References} from './types.js';

export type Region = 'all' | 'baku' | 'other';

export function readRegion(args: string[]): Region {
    const index = args.indexOf('--region'), value = index < 0 ? 'all' : args[index + 1];
    if (value !== 'all' && value !== 'baku' && value !== 'other') throw new Error('region: all, baku veya other olmalı.');
    return value;
}

export function mappedInRegion(job: { cityId: string | null }, refs: References, region: Region) {
    if (region === 'all') return true;
    const city = refs.cities.find(c => c.id === job.cityId);
    if (!city) return false;
    const baku = normalize(city.name.az ?? city.slug) === 'baki';
    return region === 'baku' ? baku : !baku;
}
