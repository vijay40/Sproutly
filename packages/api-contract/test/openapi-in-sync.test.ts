import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { buildOpenApiDocument } from '../src/openapi.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

describe('openapi.yaml', () => {
  it('matches buildOpenApiDocument() — run `npm run generate:openapi` if this fails', () => {
    const doc = buildOpenApiDocument();
    const generated = stringify(doc, { lineWidth: 120 });
    const committed = readFileSync(path.join(dir, '../openapi.yaml'), 'utf8');
    expect(generated.trim()).toBe(committed.trim());
  });
});
