import { stringify } from 'yaml';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildOpenApiDocument } from '../src/openapi.js';

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outPath = path.join(root, 'openapi.yaml');

const doc = buildOpenApiDocument();
const yaml = stringify(doc, { lineWidth: 120 });
writeFileSync(outPath, yaml, 'utf8');

const paths = Object.keys(doc.paths ?? {});
console.log(`Wrote ${outPath} (${paths.length} paths)`);
