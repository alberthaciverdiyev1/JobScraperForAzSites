import express, { type ErrorRequestHandler } from 'express';
import { coreRouter } from './core/core.routes.js';
import { config } from './config.js';

export const app = express();
app.disable('x-powered-by');
app.use('/api/core', coreRouter);

// Yerel şirket logo deposu statik sunulur (COMPANY_LOGO_DIR / COMPANY_LOGO_URL_BASE).
const logoPath = config.companyLogoUrlBase.startsWith('http')
  ? new URL(config.companyLogoUrlBase).pathname
  : config.companyLogoUrlBase;
app.use(logoPath, express.static(config.companyLogoDir, { fallthrough: true, index: false }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı.' });
});

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: 'Beklenmeyen bir hata oluştu.',
  });
};
app.use(errorHandler);
