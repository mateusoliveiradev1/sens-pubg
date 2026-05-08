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

const PHASE_10_PROGRAM_COPY_FILES = [
    'src/app/ciclo-pro/page.tsx',
    'src/app/ciclo-pro/ciclo-pro-view-model.ts',
    'src/app/ciclo-pro/ciclo-pro-program-map.tsx',
    'src/lib/training-program-projection.ts',
    'src/actions/training-programs.ts',
    'src/core/training-programs.ts',
    'src/core/training-program-checkpoints.ts',
    'src/core/training-program-coach-handoff.ts',
    'src/actions/dashboard.ts',
    'src/actions/dashboard-active-coach-loop.ts',
    'src/app/dashboard/page.tsx',
    'src/actions/history.ts',
    'src/app/history/page.tsx',
    'src/app/history/[id]/page.tsx',
    'src/app/analyze/results-dashboard-view-model.ts',
    'src/app/analyze/results-dashboard.tsx',
] as const;

const DISALLOWED_PHASE_10_PROGRAM_CLAIMS = [
    /\bsensibilidade perfeita\b/,
    /\bperfect sensitivity\b/,
    /\bmelhora garantida\b/,
    /\bguaranteed improvement\b/,
    /\brank garantido\b/,
    /\bguaranteed rank\b/,
    /\bnota global garantida\b/,
    /\bglobal score guaranteed\b/,
    /\bglobal player grade\b/,
    /\bgrade global\b/,
    /\bpubg oficial\b/,
    /\bofficial pubg\b/,
    /\bparceiro oficial\b/,
    /\bofficial partner\b/,
    /\bkrafton partner\b/,
    /\bparceiro krafton\b/,
    /\bcurso\b/,
    /\baula\b/,
    /\bxp\b/,
    /\bgrind\b/,
    /\blesson\b/,
    /\bcourse\b/,
    /\blibrary\b/,
    /\bbiblioteca\b/,
    /\btdm\b.*\b(prova|confirma|valida)\b.*\b(progresso|tecnica)\b/,
    /\bprogresso validado sem clip compativel\b/,
    /\bprogress validated without compatible clip\b/,
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

describe('Phase 10 Ciclo Pro copy safety', () => {
    it('scans the program route, projection, dashboard, history, result, action, and core copy surfaces', () => {
        expect(PHASE_10_PROGRAM_COPY_FILES).toEqual(expect.arrayContaining([
            'src/app/ciclo-pro/page.tsx',
            'src/lib/training-program-projection.ts',
            'src/actions/dashboard.ts',
            'src/app/history/page.tsx',
            'src/app/history/[id]/page.tsx',
            'src/app/analyze/results-dashboard-view-model.ts',
            'src/actions/training-programs.ts',
            'src/core/training-programs.ts',
            'src/core/training-program-coach-handoff.ts',
        ]));
    });

    it('blocks guarantees, affiliation claims, course framing, XP language, and TDM-as-proof claims', () => {
        for (const filePath of PHASE_10_PROGRAM_COPY_FILES) {
            const copy = normalize(readCopy(filePath));

            for (const claimPattern of DISALLOWED_PHASE_10_PROGRAM_CLAIMS) {
                expect(copy, `${filePath} should not match ${claimPattern}`).not.toMatch(claimPattern);
            }
        }
    });

    it('keeps progress-validado copy tied to compatible validation evidence', () => {
        for (const filePath of PHASE_10_PROGRAM_COPY_FILES) {
            const copy = normalize(readCopy(filePath));
            const mentionsProgressValidated = copy.includes('progresso validado') || copy.includes('progress validated');

            if (!mentionsProgressValidated) {
                continue;
            }

            expect(copy, `${filePath} should bind progress validation to compatible evidence`).toMatch(
                /validacao compativel|clip compativel|prova compativel/,
            );
        }
    });

    it('sells original Sens PUBG value through analysis, coach, history, Spray Lab, validation, and adaptive continuity', () => {
        const combinedCopy = normalize(PHASE_10_PROGRAM_COPY_FILES.map(readCopy).join('\n'));

        expect(combinedCopy).toContain('analise');
        expect(combinedCopy).toContain('coach');
        expect(combinedCopy).toContain('historico');
        expect(combinedCopy).toContain('spray lab');
        expect(combinedCopy).toContain('validacao');
        expect(combinedCopy).toContain('continuidade');
        expect(combinedCopy).toContain('adaptativo');
    });
});
