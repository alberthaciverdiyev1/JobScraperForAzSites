import {mapLookups as mapSharedLookups} from '../shared/lookups.js';
import type {SourceRecord,References} from '../shared/types.js';
export function mapLookups(v: SourceRecord, refs: References | Pick<References,'cities'|'jobTypes'|'workplaces'|'experienceLevels'>) {
  const labels = (v.source_employment_type_ids ?? []).map((id: number) => id === 1 ? 'full time' : id === 2 ? 'part time' : 'unknown');
  return mapSharedLookups({...v,employment_filter_labels:labels},refs);
}
