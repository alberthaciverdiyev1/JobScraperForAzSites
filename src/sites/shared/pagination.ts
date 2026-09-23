/** Pass only ordinary/filter-relevant rows, excluding pinned promotional cards. */
export function pageStop(ids:number[], known:ReadonlySet<number>, seen:ReadonlySet<number>) {
  if(!ids.length)return 'empty';
  if(ids.every(id=>known.has(id)))return 'all-known';
  if(ids.every(id=>seen.has(id)))return 'repeated-page';
  return null;
}
