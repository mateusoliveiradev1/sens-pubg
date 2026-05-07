import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readPricing = () => readFileSync(join(process.cwd(), 'src/app/pricing/page.tsx'), 'utf8');

describe('pricing page contract', () => {
    it('shows server-owned founder pricing and Free/Pro quota limits', () => {
        const source = readPricing();

        expect(source).toContain('PRODUCT_PRICE_CATALOG.pro_founder_brl_monthly');
        expect(source).toContain('PRODUCT_PRICE_CATALOG.pro_public_brl_monthly');
        expect(source).toContain('Free: 3 analises uteis salvas por mes');
        expect(source).toContain('Pro: 100 analises uteis salvas por ciclo Stripe');
        expect(source).toContain('Free util. Pro continuo.');
        expect(source).toContain('Entrar no Pro Founder');
    });

    it('routes checkout through the server action instead of a client price id', () => {
        const source = readPricing();

        expect(source).toMatch(/startProCheckout\(\{ intent: 'founder_brl_monthly' \}\)/);
        expect(source).toContain('Cliente nao envia price id, valor, moeda, tier ou periodo');
        expect(source).not.toMatch(/stripePriceId|amountCents.*input|localStorage/);
    });

    it('keeps copy independent and non-guaranteeing', () => {
        const normalized = readPricing().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        expect(normalized).toContain('independente');
        expect(normalized).toContain('nao promete');
        expect(normalized).not.toMatch(/sensibilidade perfeita|rank garantido|melhora garantida|oficial pubg|endossado por/);
        expect(normalized).toContain('nao e afiliado');
    });
});
