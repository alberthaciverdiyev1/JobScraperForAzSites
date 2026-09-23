export interface Category {
    id: string;
    slug: string;
    parent_id: string | null;
    name: Record<string, string>
}

export interface Lookup {
    id: string;
    slug: string;
    name: Record<string, string>
}

export interface Mapping {
    categories: {
        busyId: number; defaultCategoryId: string; children: {
            busyId: number; categoryId: string; subcategoryId: string | null;
        }[]
    }[];
}

export interface References {
    categories: Category[];
    cities: Lookup[];
    jobTypes: Lookup[];
    workplaces: Lookup[];
    experienceLevels: Lookup[];
}

export type SourceRecord = Record<string, any>;
