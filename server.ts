import 'dotenv/config';
import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './server/app.ts';
import { runPriceBotSync, startPriceBot } from './server/pricing/bot.ts';

const PORT = Number(process.env.PORT ?? 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = createApiApp();
  const httpServer = createHttpServer(app);

  if (!IS_PROD) {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        port: PORT,
        allowedHosts: true,
        hmr: disableHmr ? false : { server: httpServer },
        watch: disableHmr ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`RMG TECH server running at http://0.0.0.0:${PORT}`);
    startPriceBot();
    if (!process.env.SQL_HOST?.trim()) {
      void runPriceBotSync().catch((error) => {
        console.error(
          '[PriceBot] Başlangıç senkronizasyonu veritabanı hatası:',
          error instanceof Error ? error.message : error
        );
      });
    }
  });
}

startServer();
