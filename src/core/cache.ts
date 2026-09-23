import { pool } from './database.js';
import { resources } from './resources.js';

export type CachedRow = Record<string, unknown> & { id: string };
type Snapshot = Record<string, CachedRow[]>;

export class CoreCache {
  private snapshot: Snapshot | undefined;
  private pending: Promise<void> | undefined;
  private updatedAt: string | null = null;

  constructor(private readonly loader: () => Promise<Snapshot>) {}

  refresh(): Promise<void> {
    if (!this.pending) {
      this.pending = Promise.resolve().then(this.loader).then((snapshot) => {
        this.snapshot = snapshot;
        this.updatedAt = new Date().toISOString();
      }).finally(() => { this.pending = undefined; });
    }
    return this.pending;
  }

  async get(name: string): Promise<CachedRow[]> {
    if (!this.snapshot) await this.refresh();
    return structuredClone(this.snapshot?.[name] ?? []);
  }

  status() {
    return {
      updatedAt: this.updatedAt,
      counts: Object.fromEntries(Object.entries(this.snapshot ?? {}).map(([name, rows]) => [name, rows.length])),
    };
  }
}

export const coreCache = new CoreCache(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const snapshot: Snapshot = {};
    for (const [name, resource] of Object.entries(resources)) {
      const result = await client.query<CachedRow>(
        `SELECT ${resource.columns} FROM public.${resource.table}${resource.condition ? ` WHERE ${resource.condition}` : ''} ORDER BY ${resource.order}`,
      );
      snapshot[name] = result.rows;
    }
    await client.query('COMMIT');
    return snapshot;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
});
