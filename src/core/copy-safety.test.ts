import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SPRAY_LAB_COPY_FILES = [
    'src/app/spray-lab/page.tsx',
    'src/app/spray-lab/spray-lab-runner.tsx',
    'src/app/spray-lab/spray-lab-view-model.ts',
    'src/actions/spray-lab.ts',
    'src/actions/dashboard-active-coach-loop.ts',
    'src/app/dashboard/page.tsx',
    'src/app/history/page.tsx',
    'src/app/history/[id]/page.tsx',
    'src/app/history/[id]/coach-protocol-outcome-panel.tsx',
    'src/app/analyze/results-dashboard-view-model.ts',
    'src/app/analyze/results-dashboard.tsx',
    'src/lib/spray-lab-projection.ts',
    'src/lib/premium-projection.ts',
    'src/app/pricing/page.tsx',
] as const;

const DISALLOWED_SPRAY_LAB_CLAIMS = [
    'sensibilidade perfeita',
    'perfect sensitivity',
    'melhora garantida',
    'guaranteed improvement',
    'rank garantido',
    'guaranteed rank',
    'nota global garantida',
    'global score guaranteed',
    'pubg oficial',
    'official pubg',
    'krafton partner',
    'parceiro krafton',
    'melhora comprovada sem validacao',
    'validado sem clip compativel',
    'tdm conta como validacao tecnica',
    'api pubg exclusiva',
] as const;

function readCopy(filePath: string): string {
    return readFileSync(join(process.cwd(), filePath), 'utf8');
}

function normalize(copy: string): string {
    return copy
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

describe('Phase 9 Spray Lab copy safety', () => {
    it('blocks perfect sensitivity, guaranteed improvement/rank, global-score, and affiliation claims', () => {
        for (const filePath of SPRAY_LAB_COPY_FILES) {
            const copy = normalize(readCopy(filePath));

            for (const claim of DISALLOWED_SPRAY_LAB_CLAIMS) {
                expect(copy, `${filePath} should not contain "${claim}"`).not.toContain(normalize(claim));
            }
        }
    });

    it('keeps compatible validation and practical transfer separated in user-facing copy', () => {
        const combinedCopy = normalize([
            readCopy('src/actions/dashboard-active-coach-loop.ts'),
            readCopy('src/app/history/[id]/coach-protocol-outcome-panel.tsx'),
            readCopy('src/core/spray-lab-coach-handoff.ts'),
        ].join('\n'));

        expect(combinedCopy).toContain('clip compativel valida tecnica');
        expect(combinedCopy).toContain('partida/tdm valida transferencia pratica');
        expect(combinedCopy).toContain('transferencia pratica nao substitui validacao compativel');
        expect(combinedCopy).toContain('nao confirma melhora tecnica');
    });

    it('sells original Sens PUBG value instead of exclusive PUBG API-derived data', () => {
        const pricingCopy = normalize(readCopy('src/app/pricing/page.tsx'));
        const projectionCopy = normalize(readCopy('src/lib/spray-lab-projection.ts'));

        expect(pricingCopy).toContain('clips de spray');
        expect(pricingCopy).toContain('historico');
        expect(pricingCopy).toContain('coach');
        expect(pricingCopy).toContain('protocolo');
        expect(projectionCopy).toContain('sessao guiada basica');
        expect(projectionCopy).toContain('auditoria');
        expect(projectionCopy).toContain('benchmark por contexto');
        expect(`${pricingCopy}\n${projectionCopy}`).not.toContain('acesso exclusivo a api pubg');
    });
});
