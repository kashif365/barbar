import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import routes from './routes';
import { apiLimiter, csrfGuard, sanitizeInput } from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();
  // Render/Vercel sit behind a proxy; needed for correct client IPs in rate limiting.
  if (env.isProd) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        // No Origin header = same-origin or non-browser client (health checks, curl, tests).
        if (!origin || env.allowedOrigins.includes(origin.replace(/\/$/, ''))) return cb(null, true);
        cb(null, false);
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'X-Requested-With', 'Idempotency-Key'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());
  app.use(sanitizeInput);
  app.use('/api', apiLimiter, csrfGuard, routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
