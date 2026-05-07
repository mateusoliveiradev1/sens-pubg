import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PRODUCT_COPY_FILES = [
    'src/app/analyze/upload-dropzone.tsx',
    'src/app/analyze/spray-trail-panel.tsx',
    'src/app/analyze/results-dashboard.tsx',
    'src/app/analyze/results-dashboard-view-model.ts',
    'src/app/dashboard/page.tsx',
    'src/app/dashboard/dashboard-truth-view-model.ts',
    'src/app/pricing/page.tsx',
    'src/app/billing/page.tsx',
    'src/app/checkout/success/page.tsx',
    'src/app/checkout/cancel/page.tsx',
    'src/lib/premium-projection.ts',
    'src/actions/dashboard-active-coach-loop.ts',
    'src/app/analyze/analysis-guide.tsx',
    'src/app/page.tsx',
    'src/app/layout.tsx',
    'src/app/pros/page.tsx',
    'src/app/history/page.tsx',
    'src/app/history/[id]/coach-protocol-outcome-panel.tsx',
    'src/app/profile/page.tsx',
    'src/app/setup/setup-form.tsx',
    'src/app/profile/settings/settings-form.tsx',
    'src/ui/components/faq-accordion.tsx',
    'src/i18n/pt-BR.ts',
    'src/i18n/es.ts',
] as const;

const COMMERCIAL_READINESS_DOC = 'docs/commercial-accuracy-readiness.md';

const COMMERCIAL_DISALLOWED_CLAIMS = [
    'perfect sensitivity',
    'sensibilidade perfeita',
    'guaranteed recoil',
    'recoil garantido',
    'guaranteed improvement',
    'melhora garantida',
    'guaranteed rank',
    'rank garantido',
    'official PUBG',
    'oficial PUBG',
    'KRAFTON partner',
    'parceiro KRAFTON',
    'definitive sensitivity',
    'sensibilidade definitiva',
] as const;

const COMMERCIAL_ALLOWED_CLAIMS = [
    'validated on permissioned clips',
    'calibrated confidence',
    'honest blockers for weak clips',
    'safer coach and sensitivity decisions',
] as const;

const readProductCopy = (filePath: string): string => {
    return readFileSync(join(process.cwd(), filePath), 'utf8');
};

const normalizeCopy = (copy: string): string => {
    return copy
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
};

const extractMarkdownSection = (copy: string, heading: string): string => {
    const start = copy.indexOf(heading);
    if (start === -1) {
        return '';
    }

    const nextHeading = copy.indexOf('\n## ', start + heading.length);
    return nextHeading === -1 ? copy.slice(start) : copy.slice(start, nextHeading);
};

describe('product copy claim contract', () => {
    it('does not promise impossible precision or guaranteed outcomes', () => {
        const bannedClaims = [
            'rastrear cada pixel',
            'sensibilidade perfeita',
            'diagnostico preciso',
            'diagnostico en segundos',
            'diagnostico em segundos',
            'velocidade instantanea',
            'todas as armas automaticas principais',
            'domine o recoil',
            'reconstrucao precisa',
            'reconstruccion precisa',
            'analises precisas',
            'mas preciso el diagnostico',
            'mais preciso o diagnostico',
            '60 fps (obrigatorio)',
            'melhora garantida',
            'resultado garantido',
            'rank garantido',
            'subir de rank',
            'sensibilidade perfeita',
            'veredito final',
            'provou melhora sem validacao',
            'ajuste definitivo garantido',
            'unlimited',
            'ilimitad',
            'sem limite',
            'api pubg exclusiva',
            'acesso exclusivo a api pubg',
            'pubg oficial',
            'oficial da pubg',
            'krafton oficial',
            'afiliado oficial',
            ...COMMERCIAL_DISALLOWED_CLAIMS.map(normalizeCopy),
        ];

        for (const filePath of PRODUCT_COPY_FILES) {
            const copy = normalizeCopy(readProductCopy(filePath));

            for (const bannedClaim of bannedClaims) {
                expect(copy, `${filePath} still contains "${bannedClaim}"`).not.toContain(bannedClaim);
            }
        }
    });

    it('documents Phase 6 commercial accuracy claims without approving overclaims', () => {
        const readinessDoc = readProductCopy(COMMERCIAL_READINESS_DOC);
        const normalizedDoc = normalizeCopy(readinessDoc);
        const allowedSection = normalizeCopy(extractMarkdownSection(readinessDoc, '## Allowed Claims After Gate Pass'));
        const disallowedSection = normalizeCopy(extractMarkdownSection(readinessDoc, '## Disallowed Claims'));

        expect(normalizedDoc).toContain('commercial accuracy readiness');
        expect(normalizedDoc).toContain('no false done');

        for (const allowedClaim of COMMERCIAL_ALLOWED_CLAIMS) {
            expect(allowedSection).toContain(normalizeCopy(allowedClaim));
        }

        for (const disallowedClaim of COMMERCIAL_DISALLOWED_CLAIMS) {
            const normalizedClaim = normalizeCopy(disallowedClaim);

            expect(disallowedSection).toContain(normalizedClaim);
            expect(allowedSection).not.toContain(normalizedClaim);
        }
    });

    it('documents patch-aware analysis, confidence, coverage, and system limits in user-facing help', () => {
        const faqCopy = normalizeCopy(readProductCopy('src/ui/components/faq-accordion.tsx'));
        const guideCopy = normalizeCopy(readProductCopy('src/app/analyze/analysis-guide.tsx'));
        const landingCopy = normalizeCopy(readProductCopy('src/app/page.tsx'));

        expect(faqCopy).toContain('patch-aware');
        expect(faqCopy).toContain('confianca');
        expect(faqCopy).toContain('limite');

        expect(guideCopy).toContain('confianca');
        expect(guideCopy).toContain('cobertura');
        expect(guideCopy).toContain('recomendad');

        expect(landingCopy).toContain('patch');
        expect(landingCopy).toContain('confianca');
        expect(landingCopy).toContain('cobertura');
    });

    it('keeps precision trend copy validation-first and blocker-aware', () => {
        const trendCopy = normalizeCopy(readProductCopy('src/app/analyze/results-dashboard-view-model.ts'));

        expect(trendCopy).toContain('gravar validacao compativel');
        expect(trendCopy).toContain('controle de precisao bloqueou a comparacao');
        expect(trendCopy).toContain('dois clips mostram direcao, nao consolidacao');
        expect(trendCopy).not.toContain('baseline criado como progresso');
        expect(trendCopy).not.toContain('sinal inicial validado');
        expect(trendCopy).not.toContain('falha do produto');
    });

    it('keeps adaptive coach loop copy honest about outcomes and conflicts', () => {
        const analysisCopy = normalizeCopy(readProductCopy('src/app/analyze/results-dashboard-view-model.ts'));
        const dashboardLoopCopy = normalizeCopy(readProductCopy('src/actions/dashboard-active-coach-loop.ts'));
        const outcomePanelCopy = normalizeCopy(readProductCopy('src/app/history/[id]/coach-protocol-outcome-panel.tsx'));

        expect(analysisCopy).toContain('validacao compativel');
        expect(analysisCopy).toContain('conflito');
        expect(dashboardLoopCopy).toContain('resultado em conflito');
        expect(dashboardLoopCopy).toContain('grav');
        expect(outcomePanelCopy).toContain('resultado');
        expect(outcomePanelCopy).toContain('validacao');
        expect(`${analysisCopy}\n${dashboardLoopCopy}\n${outcomePanelCopy}`).not.toContain('melhora comprovada');
    });

    it('covers monetization surfaces with honest pricing, lock, and payment copy', () => {
        const pricingCopy = normalizeCopy(readProductCopy('src/app/pricing/page.tsx'));
        const billingCopy = normalizeCopy(readProductCopy('src/app/billing/page.tsx'));
        const successCopy = normalizeCopy(readProductCopy('src/app/checkout/success/page.tsx'));
        const cancelCopy = normalizeCopy(readProductCopy('src/app/checkout/cancel/page.tsx'));
        const lockCopy = normalizeCopy(`${readProductCopy('src/app/analyze/results-dashboard-view-model.ts')}\n${readProductCopy('src/lib/premium-projection.ts')}`);

        expect(pricingCopy).toContain('free: 3 analises uteis salvas por mes');
        expect(pricingCopy).toContain('pro: 100 analises uteis salvas por mes de assinatura');
        expect(pricingCopy).toContain('nao e afiliado');
        expect(pricingCopy).toContain('nao sao vendidos como acesso exclusivo');
        expect(pricingCopy).toContain('confirmacao da stripe (webhook) precisa chegar');

        expect(billingCopy).toContain('historico salvo fica preservado');
        expect(billingCopy).toContain('brasil precisa de revisao humana');
        expect(successCopy).toContain('url de sucesso nao concede pro');
        expect(successCopy).toContain('webhook');
        expect(cancelCopy).toContain('nao sao apagados');

        expect(lockCopy).toContain('plano completo');
        expect(lockCopy).toContain('limite');
        expect(lockCopy).toContain('pagamento');
    });

    it('separates paid Pro from Sens dos Pros professional references', () => {
        const landingCopy = normalizeCopy(readProductCopy('src/app/page.tsx'));
        const faqCopy = normalizeCopy(readProductCopy('src/ui/components/faq-accordion.tsx'));
        const prosCopy = normalizeCopy(readProductCopy('src/app/pros/page.tsx'));

        expect(`${landingCopy}\n${faqCopy}\n${prosCopy}`).toContain('sens dos pros');
        expect(faqCopy).toContain('pro e a assinatura paga');
        expect(faqCopy).toContain('referencia publica');
        expect(prosCopy).toContain('planos e assinatura cuidam do pro pago');
        expect(prosCopy).not.toContain('assinatura pro founder');
    });
});
