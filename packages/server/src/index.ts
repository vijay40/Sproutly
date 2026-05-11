import './load-dotenv.js';
import { serve } from '@hono/node-server';
import { env } from './env.js';
import { createApp } from './app.js';
import { logger } from './logger.js';

const app = createApp();

serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, (info) => {
  logger.info({
    message: 'sproutly server listening',
    host: '0.0.0.0',
    port: info.port,
    nodeEnv: process.env.NODE_ENV ?? 'development',
  });
});
