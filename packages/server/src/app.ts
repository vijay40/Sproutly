import { Hono } from 'hono';
import { registerErrorHandler } from './middleware/errors.js';
import { registerRequestLog } from './middleware/request-log.js';
import { healthRoute } from './routes/health.js';
import { meRoute } from './routes/me.js';
import { devRoute } from './routes/dev.js';
import { openapiRoute } from './routes/openapi.js';

export function createApp(): Hono {
  const app = new Hono();
  registerErrorHandler(app);
  registerRequestLog(app);
  healthRoute(app);
  meRoute(app);
  devRoute(app);
  openapiRoute(app);
  return app;
}
