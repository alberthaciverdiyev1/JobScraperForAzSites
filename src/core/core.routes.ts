import { Router } from 'express';
import { coreCache } from './cache.js';
import { getResource, resources } from './resources.js';

export const coreRouter = Router();

// Express'in GET için otomatik HEAD yanıtı dahil, yalnızca GET kabul edilir.
coreRouter.use((req, res, next) => {
  if (req.method !== 'GET') {
    res.set('Allow', 'GET').status(405).json({ error: 'Yalnızca GET desteklenir.' });
    return;
  }
  next();
});

coreRouter.get('/', (_req, res) => {
  res.json({ resources: Object.keys(resources).map((name) => ({
    name, list: `/api/core/${name}`, detail: `/api/core/${name}/:id`,
  })) });
});

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{0,18}$/.test(value)
    && BigInt(value) <= 9223372036854775807n;
}

coreRouter.get('/:resource', async (req, res) => {
  const resource = getResource(req.params.resource);
  if (!resource) { res.status(404).json({ error: 'Kaynak bulunamadı.' }); return; }
  const allowed = ['page', 'limit', ...(resource.active ? ['active'] : []), ...(resource.filter ? [resource.filter] : [])];
  if (Object.keys(req.query).some((key) => !allowed.includes(key))) {
    res.status(400).json({ error: 'Desteklenmeyen filtre.', allowed }); return;
  }
  const page = req.query.page ?? '1';
  const limit = req.query.limit ?? '100';
  if (!validId(page) || !validId(limit) || Number(limit) > 500 || Number(page) > 1000000) {
    res.status(400).json({ error: 'page 1–1000000, limit 1–500 arasında olmalı.' }); return;
  }
  if (req.query.active !== undefined) {
    if (req.query.active !== 'true' && req.query.active !== 'false') {
      res.status(400).json({ error: 'active true veya false olmalı.' }); return;
    }
  }
  if (resource.filter && req.query[resource.filter] !== undefined) {
    const value = req.query[resource.filter];
    if (!validId(value)) { res.status(400).json({ error: `${resource.filter} geçerli bir ID olmalı.` }); return; }
  }
  let rows = await coreCache.get(req.params.resource);
  if (req.query.active !== undefined) rows = rows.filter((row) => row.is_active === (req.query.active === 'true'));
  if (resource.filter && req.query[resource.filter] !== undefined) {
    const filter = resource.filter;
    rows = rows.filter((row) => row[filter] === req.query[filter]);
  }
  const total = rows.length;
  const offset = (Number(page) - 1) * Number(limit);
  res.json({ data: rows.slice(offset, offset + Number(limit)), meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } });
});

coreRouter.get('/:resource/:id', async (req, res) => {
  const resource = getResource(req.params.resource);
  if (!resource) { res.status(404).json({ error: 'Kaynak bulunamadı.' }); return; }
  if (!validId(req.params.id)) { res.status(400).json({ error: 'Geçersiz ID.' }); return; }
  const rows = await coreCache.get(req.params.resource);
  const row = rows.find((item) => item.id === req.params.id);
  if (!row) { res.status(404).json({ error: 'Kayıt bulunamadı.' }); return; }
  res.json({ data: row });
});
