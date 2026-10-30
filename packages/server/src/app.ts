import { Hono } from 'hono';
import { registerErrorHandler } from './middleware/errors.js';
import { registerRequestLog } from './middleware/request-log.js';
import { childrenRoute } from './routes/children.js';
import { dailySummariesRoute } from './routes/daily-summaries.js';
import { healthRoute } from './routes/health.js';
import { insightsRoute } from './routes/insights.js';
import { taskCompletionsRoute } from './routes/task-completions.js';
import { dayRollRoute } from './routes/day-roll.js';
import { meRoute } from './routes/me.js';
import { devRoute } from './routes/dev.js';
import { familiesRoute } from './routes/families.js';
import { tasksRoute } from './routes/tasks.js';
import { openapiRoute } from './routes/openapi.js';

export function createApp(): Hono {
  const app = new Hono();
  registerErrorHandler(app);
  registerRequestLog(app);
  healthRoute(app);
  meRoute(app);
  familiesRoute(app);
  childrenRoute(app);
  tasksRoute(app);
  dailySummariesRoute(app);
  insightsRoute(app);
  taskCompletionsRoute(app);
  dayRollRoute(app);
  devRoute(app);
  openapiRoute(app);
  return app;
}
