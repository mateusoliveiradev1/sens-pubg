import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PRODUCT_COPY_FILES = [
    'src/app/analyze/results-dashboard.tsx',
    'src/app/analyze/results-dashboard-view-model.ts',
    'src/app/analyze/analysis-guide.tsx',
    'src/app/page.tsx',
    'src/app/history/page.tsx',
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
});
