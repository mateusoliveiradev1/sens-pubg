import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('billing page contract', () => {
    it('opens the Stripe Billing Portal only through the server action', () => {
        const source = readFileSync(join(process.cwd(), 'src/app/billing/page.tsx'), 'utf8');

        expect(source).toMatch(/openBillingPortal/);
        expect(source).toMatch(/redirect\(result\.portalUrl\)/);
        expect(source).not.toMatch(/stripe\.billingPortal|localStorage|customerId.*input/);
    });

    it('shows access, quota, support, and non-deletion billing copy', () => {
        const normalized = readFileSync(join(process.cwd(), 'src/app/billing/page.tsx'), 'utf8')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        expect(normalized).toContain('quota');
        expect(normalized).toContain('historico salvo fica preservado');
        expect(normalized).toContain('brasil');
        expect(normalized).not.toMatch(/rank garantido|sensibilidade perfeita|melhora garantida/);
    });
});
