import type { Hono } from 'hono';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const yamlPath = path.join(fileURLToPath(new URL('.', import.meta.url)), '../../../api-contract/openapi.yaml');

export function openapiRoute(app: Hono): void {
  app.get('/openapi.yaml', (c) => {
    if (process.env.NODE_ENV === 'production') {
      return c.notFound();
    }
    const yaml = readFileSync(yamlPath, 'utf8');
    return c.text(yaml, 200, { 'Content-Type': 'text/yaml; charset=utf-8' });
  });
}
