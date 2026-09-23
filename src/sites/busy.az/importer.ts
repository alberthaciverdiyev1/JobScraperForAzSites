import {mapVacancy,type References,type Mapping,type MappedVacancy} from './mapper.js';
import type {SourceRecord} from './client.js';
import {emptySiteReferences,type SiteReferences} from '../shared/references.js';
export {loadReferences,importBatch,companyKey} from '../shared/importer.js';

export function prepareBatch(vacancies: SourceRecord[], refs: References, mapping: Mapping, siteRefs: SiteReferences = emptySiteReferences()) {
  const ready: MappedVacancy[] = [];
  const skipped: { sourceId: unknown; title: unknown; reason: string }[] = [];
  const ids = new Set<number>();
  for (const v of vacancies) {
    if (ids.has(v.id)) continue;
    ids.add(v.id);
    try { ready.push(mapVacancy(v, refs, mapping, undefined, siteRefs)); }
    catch (error) { skipped.push({ sourceId: v.id, title: v.job_title, reason: error instanceof Error ? error.message : String(error) }); }
  }
  return { ready, skipped };
}

