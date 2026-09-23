import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { app } from '../dist/app.js';
import { pool } from '../dist/core/database.js';
import { CoreCache, coreCache } from '../dist/core/cache.js';

test('Cache eşzamanlı yüklemeyi birleştirir ve hata durumunda eski veriyi korur', async () => {
  let calls = 0;
  let fail = false;
  const cache = new CoreCache(async () => {
    calls++;
    if (fail) throw new Error('Veritabanına erişilemiyor');
    return { cities: [{ id: '1', name: { az: `City ${calls}` } }] };
  });
  await Promise.all([cache.get('cities'), cache.get('cities'), cache.refresh()]);
  assert.equal(calls, 1);
  const rows = await cache.get('cities');
  rows[0].name.az = 'Değiştirildi';
  assert.equal((await cache.get('cities'))[0].name.az, 'City 1');
  fail = true;
  await assert.rejects(cache.refresh());
  assert.equal((await cache.get('cities'))[0].name.az, 'City 1');
  fail = false;
  await cache.refresh();
  assert.equal((await cache.get('cities'))[0].name.az, 'City 3');
});

test('Core GET API: gerçek PostgreSQL üzerinde salt okunur entegrasyon', async () => {
  const server = app.listen(0, '127.0.0.1');
  const originalConnect = pool.connect;
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/core`;
    const get = (path) => fetch(`${base}${path}`);
    assert.equal((await pool.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only, 'on');
    await coreCache.refresh();
    console.log('Cache kayıt sayıları:', coreCache.status().counts);
    // Sonraki tüm endpoint'ler DB bağlantısı olmadan cache'den çalışmalı.
    pool.connect = () => { throw new Error('API cache yerine DB kullanıyor'); };
    const index = await (await get('/')).json();
    assert.equal(index.resources.length, 8);
    for (const { name } of index.resources) {
      const response = await get(`/${name}?limit=2`);
      assert.equal(response.status, 200, name);
      const body = await response.json();
      assert.ok(body.data.length <= 2);
      assert.ok(body.meta.total >= body.data.length);
      if (body.data.length) {
        const detail = await get(`/${name}/${body.data[0].id}`);
        assert.equal(detail.status, 200);
        assert.deepEqual((await detail.json()).data, body.data[0]);
      }
      if (name === 'categories') assert.ok(body.data.every((row) => row.parent_id === null));
      if (name === 'subcategories') {
        assert.ok(body.data.every((row) => row.parent_id !== null));
        if (body.data.length) {
          const parent = body.data[0].parent_id;
          const filtered = await (await get(`/subcategories?parent_id=${parent}`)).json();
          assert.ok(filtered.data.every((row) => row.parent_id === parent));
        }
      }
    }
    const active = await (await get('/cities?active=true')).json();
    assert.ok(active.data.every((row) => row.is_active === true));
    for (const path of ['/cities?limit=501', '/cities?page=0', '/cities?active=yes', '/skills?category_id=1%20OR%201=1', '/cities?limit=2&limit=3', '/cities/9223372036854775808', '/companies?password=1']) {
      assert.equal((await get(path)).status, 400, path);
    }
    for (const path of ['/users', '/sessions', '/constructor', '/cities/9223372036854775807']) {
      assert.equal((await get(path)).status, 404, path);
    }
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']) {
      const response = await fetch(`${base}/cities`, { method });
      assert.equal(response.status, 405, method);
      assert.equal(response.headers.get('allow'), 'GET');
    }
  } finally {
    pool.connect = originalConnect;
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
});
