import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const routesDir = path.join(fileURLToPath(new URL('.', import.meta.url)), '../src/routes');

describe('route DB queries are family-scoped', () => {
  it('every .from( has nearby .eq(\'family_id\' or \'parent_user_id\'', () => {
    const files = readdirSync(routesDir).filter((f) => f.endsWith('.ts'));
    for (const file of files) {
      const full = path.join(routesDir, file);
      const src = readFileSync(full, 'utf8');
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (!line.includes('.from(')) continue;
        if (line.includes('// @scope-ok-no-family')) continue;
        const window = lines.slice(i, Math.min(i + 45, lines.length)).join('\n');
        const ok =
          window.includes(".eq('family_id'") ||
          window.includes('.eq("family_id"') ||
          window.includes(".eq('parent_user_id'") ||
          window.includes('.eq("parent_user_id"');
        expect(ok, `${file}:${i + 1} — add family_id/parent_user_id scope or // @scope-ok-no-family`).toBe(true);
      }
    }
  });
});
