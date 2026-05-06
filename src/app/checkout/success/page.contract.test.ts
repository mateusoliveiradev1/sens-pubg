import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('checkout success page contract', () => {
    it('rechecks server entitlement and never grants Pro from the success URL', () => {
        const source = readFileSync(join(process.cwd(), 'src/app/checkout/success/page.tsx'), 'utf8');

        expect(source).toMatch(/resolveServerProductAccess/);
        expect(source).toContain('A URL de sucesso nao concede Pro');
        expect(source).toMatch(/session_id/);
        expect(source).not.toMatch(/localStorage|setItem|grantPro|pro_active.*session_id/);
    });
});
