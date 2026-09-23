interface Resource {
  table: string;
  columns: string;
  order: string;
  condition?: string;
  active?: boolean;
  filter?: 'parent_id' | 'category_id' | 'city_id';
}

const lookupColumns = 'id, name, slug, "order", is_active';
// Tablo ve kolon adları yalnızca bu sabit listeden gelir.
export const resources: Record<string, Resource> = {
  categories: {
    table: 'categories', columns: 'id, name, slug, icon, parent_id',
    order: 'id', condition: 'parent_id IS NULL',
  },
  subcategories: {
    table: 'categories', columns: 'id, name, slug, icon, parent_id',
    order: 'parent_id, id', condition: 'parent_id IS NOT NULL', filter: 'parent_id',
  },
  cities: { table: 'cities', columns: lookupColumns, order: '"order", id', active: true },
  'job-types': { table: 'job_types', columns: lookupColumns, order: '"order", id', active: true },
  'workplace-types': { table: 'workplace_types', columns: `${lookupColumns}, icon`, order: '"order", id', active: true },
  'experience-levels': { table: 'experience_levels', columns: lookupColumns, order: '"order", id', active: true },
  skills: { table: 'skills', columns: `${lookupColumns}, category_id`, order: '"order", id', active: true, filter: 'category_id' },
  companies: { table: 'companies', columns: 'id, name, slug, logo, website, is_verified, city_id', order: 'id', filter: 'city_id' },
};

export function getResource(name: string): Resource | undefined {
  return Object.hasOwn(resources, name) ? resources[name] : undefined;
}
