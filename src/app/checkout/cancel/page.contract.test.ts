import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('checkout cancel page contract', () => {
    it('keeps cancellation non-hostile and preserves history language', () => {
        const source = readFileSync(join(process.cwd(), 'src/app/checkout/cancel/page.tsx'), 'utf8');
        const normalized = source.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        expect(normalized).toContain('nada foi alterado no seu historico');
        expect(normalized).toContain('nao sao apagados');
        expect(normalized).not.toMatch(/perder tudo|punicao|vergonha|culpa/);
    });
});
