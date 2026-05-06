import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('admin billing page contract', () => {
    it('uses admin billing actions and shared resolver state', () => {
        const source = readFileSync(join(process.cwd(), 'src/app/admin/billing/page.tsx'), 'utf8');

        expect(source).toMatch(/AdminBillingPage/);
        expect(source).toMatch(/lookupAdminBillingUser/);
        expect(source).toMatch(/getAdminBillingSnapshot/);
        expect(source).toMatch(/createManualProGrant/);
        expect(source).toMatch(/recordBillingSupportNote/);
        expect(source).toMatch(/forceStripeReconciliation/);
        expect(source).toContain('Resolver compartilhado');
    });

    it('frames the page as operational support, not a revenue dashboard', () => {
        const normalized = readFileSync(join(process.cwd(), 'src/app/admin/billing/page.tsx'), 'utf8')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        expect(normalized).toContain('suporte operacional');
        expect(normalized).toContain('admin-only');
        expect(normalized).toContain('sem mudar acesso local diretamente');
        expect(normalized).not.toMatch(/mrr|arr|revenue dashboard|receita total/);
    });
});
