import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PRODUCT_COPY_FILES = [
    'src/app/analyze/results-dashboard.tsx',
    'src/app/analyze/results-dashboard-view-model.ts',
    'src/app/dashboard/page.tsx',
    'src/app/dashboard/dashboard-truth-view-model.ts',
    'src/actions/dashboard-active-coach-loop.ts',
    'src/app/analyze/analysis-guide.tsx',
    'src/app/page.tsx',
    'src/app/history/page.tsx',
    'src/app/history/[id]/coach-protocol-outcome-panel.tsx',
    'src/app/profile/page.tsx',
    'src/app/setup/setup-form.tsx',
    'src/app/profile/settings/settings-form.tsx',
    'src/ui/components/faq-accordion.tsx',
    'src/i18n/pt-BR.ts',
    'src/i18n/es.ts',
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
        ];

        for (const filePath of PRODUCT_COPY_FILES) {
            const copy = normalizeCopy(readProductCopy(filePath));

            for (const bannedClaim of bannedClaims) {
                expect(copy, `${filePath} still contains "${bannedClaim}"`).not.toContain(bannedClaim);
            }
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
});
