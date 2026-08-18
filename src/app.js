import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import apiRouter from './routes/index.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { env } from './config/env.js';

/**
 * Express application factory (keeps `server.js` focused on HTTP + Socket.IO lifecycle).
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  /**
   * Behind Nginx/ALB, Express sees the proxy's IP on every request. Without this,
   * `express-rate-limit` buckets all users together and one client tripping the
   * auth limiter locks out everyone. `TRUST_PROXY` is the number of proxies in
   * front of the app (1 for a single Nginx; 2 if Nginx sits behind an ALB).
   */
  if (env.trustProxy > 0) {
    app.set('trust proxy', env.trustProxy);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin === '*' ? true : env.corsOrigin,
      credentials: true
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '256kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', apiRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(errorMiddleware);

  return app;
}
