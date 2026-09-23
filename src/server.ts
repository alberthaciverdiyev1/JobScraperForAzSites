import { app } from './app.js';
import { config } from './config.js';
import { pool } from './core/database.js';
import { coreCache } from './core/cache.js';

try {
  await coreCache.refresh();
  console.log('Core cache yüklendi:', coreCache.status());
} catch (error) {
  console.error('Core cache yüklenemedi:', error);
  await pool.end();
  process.exit(1);
}

const cacheTimer = setInterval(() => {
  coreCache.refresh().catch((error: unknown) => {
    console.error('Core cache yenilenemedi; mevcut veriler korunuyor:', error);
  });
}, config.coreCacheRefreshMs);
cacheTimer.unref();

const server = app.listen(config.port, config.host, () => {
  console.log(`API: http://${config.host}:${config.port}`);
});
server.on('error', (error) => {
  console.error('Sunucu başlatılamadı:', error);
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    clearInterval(cacheTimer);
    server.close(() => {
      pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
