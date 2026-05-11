import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { registerChildren } from './endpoints/children.js';
import { registerCosmetics } from './endpoints/cosmetics.js';
import { registerDailySummaries } from './endpoints/daily-summaries.js';
import { registerDev } from './endpoints/dev.js';
import { registerFamilies } from './endpoints/families.js';
import { registerInsights } from './endpoints/insights.js';
import { registerTasks } from './endpoints/tasks.js';
import { registerHealth } from './endpoints/health.js';
import { registerMe } from './endpoints/me.js';

extendZodWithOpenApi(z);

const bearerAuth = {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
} as const;

export function buildOpenApiDocument(): ReturnType<OpenApiGeneratorV31['generateDocument']> {
  const registry = new OpenAPIRegistry();
  registry.registerComponent('securitySchemes', 'bearerAuth', bearerAuth);

  registerHealth(registry);
  registerMe(registry);
  registerFamilies(registry);
  registerChildren(registry);
  registerTasks(registry);
  registerCosmetics(registry);
  registerDailySummaries(registry);
  registerInsights(registry);
  registerDev(registry);

  registry.registerPath({
    method: 'get',
    path: '/openapi.yaml',
    summary: 'OpenAPI document (dev only on server)',
    responses: {
      200: {
        description: 'YAML document',
        content: { 'text/yaml': { schema: z.string() } },
      },
    },
  });

  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Sproutly REST API',
      version: '0.0.0',
      description: 'Phase A scaffold. See docs/superpowers/specs/2026-05-11-rest-api-design.md',
    },
    servers: [
      {
        url: 'http://localhost:8787',
        description:
          'Local dev default. In Insomnia, change Base URL for LAN IP or staging. (Insomnia requires a literal URL or OpenAPI server variables with defaults, not brace-only placeholders.)',
      },
    ],
  });
}
