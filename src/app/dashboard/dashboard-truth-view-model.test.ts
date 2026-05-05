import { describe, expect, it } from 'vitest';
import type { DashboardStats } from '@/actions/dashboard';
import { buildDashboardTruthViewModel } from './dashboard-truth-view-model';

function createStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
    return {
        totalSessions: 4,
        avgStabilityScore: 62,
        bestStabilityScore: 78,
        avgSprayScore: 64,
        bestSprayScore: 82,
        lastSessionDelta: 4,
        weeklyTrend: [
            { date: '2026-05-01', avgScore: 60, peakScore: 72 },
            { date: '2026-05-05', avgScore: 64, peakScore: 82 },
        ],
        weaponStats: [
            { weaponId: 'beryl', weaponName: 'Beryl M762', weaponCategory: 'AR', avgScore: 58, count: 2 },
            { weaponId: 'aug', weaponName: 'AUG', weaponCategory: 'AR', avgScore: 76, count: 2 },
        ],
        latestMastery: {
            actionState: 'testable',
            actionLabel: 'Testavel',
            actionableScore: 72,
            mechanicalScore: 78,
            mechanicalLevelLabel: 'Avancado',
            pillars: {
                control: 76,
                consistency: 64,
                confidence: 82,
                clipQuality: 80,
            },
            evidence: {
                coverage: 0.82,
                confidence: 0.84,
                visibleFrames: 82,
                lostFrames: 18,
                framesProcessed: 100,
                sampleSize: 24,
                qualityScore: 80,
                usableForAnalysis: true,
            },
            reasons: ['Leitura testavel.'],
            blockedRecommendations: [],
            weaponId: 'beryl',
            patchVersion: '36.1',
            createdAt: '2026-05-05T07:00:00.000Z',
        },
        latestCoachNextBlock: {
            tier: 'test_protocol',
            title: 'Bloco curto de teste de controle vertical',
            durationMinutes: 12,
            steps: [
                'Faca 3 sprays comparaveis.',
                'Mantenha variaveis fixas.',
                'Valide no proximo clip.',
            ],
            validationTarget: 'reduzir erro vertical sustentado',
            validationSuccessCondition: 'Sucesso quando o controle melhorar com cobertura suficiente.',
        },
        trendEvidence: {
            evidenceState: 'strong',
            coverage: 0.82,
            confidence: 0.84,
            sampleSize: 48,
            sessionCount: 2,
            delta: 4,
            canClaimProgress: true,
        },
        principalPrecisionTrend: null,
        ...overrides,
    };
}

describe('dashboard truth view model', () => {
    it('routes capture-again mastery to recapture before training changes', () => {
        const model = buildDashboardTruthViewModel(createStats({
            latestMastery: {
                ...createStats().latestMastery!,
                actionState: 'capture_again',
                actionLabel: 'Capturar de novo',
                actionableScore: 38,
                blockedRecommendations: ['Qualidade do clip bloqueia decisao forte.'],
            },
        }));

        expect(model.nextActionTitle).toContain('Recapturar');
        expect(model.nextActionBody).toContain('antes de alterar');
        expect(model.truthBadgeLabel).toBe('Capturar de novo');
    });

    it('routes inconclusive mastery to validation or a comparable clip', () => {
        const model = buildDashboardTruthViewModel(createStats({
            latestMastery: {
                ...createStats().latestMastery!,
                actionState: 'inconclusive',
                actionLabel: 'Incerto',
                actionableScore: 45,
            },
        }));

        expect(model.nextActionTitle).toContain('Validar');
        expect(model.nextActionBody).toContain('bloco comparavel');
    });

    it('uses the coach next block for testable mastery', () => {
        const model = buildDashboardTruthViewModel(createStats());

        expect(model.nextActionTitle).toBe('Bloco curto de teste de controle vertical');
        expect(model.nextActionBody).toContain('12 minutos');
        expect(model.nextBlock).toMatchObject({
            title: 'Bloco curto de teste de controle vertical',
            durationLabel: '12 min',
        });
    });

    it('uses validation language for ready mastery without final claims', () => {
        const model = buildDashboardTruthViewModel(createStats({
            latestMastery: {
                ...createStats().latestMastery!,
                actionState: 'ready',
                actionLabel: 'Pronto',
                actionableScore: 88,
            },
            latestCoachNextBlock: {
                ...createStats().latestCoachNextBlock!,
                tier: 'apply_protocol',
                title: 'Aplicar e validar sensibilidade',
            },
        }));
        const copy = `${model.nextActionTitle} ${model.nextActionBody}`;

        expect(model.nextActionTitle).toContain('Aplicar e validar');
        expect(copy).toContain('validacao curta');
        expect(copy).not.toMatch(/perfeito|garantido|definitivo|verdade final/i);
    });

    it('keeps positive weak trends as a signal to validate, not an improvement claim', () => {
        const model = buildDashboardTruthViewModel(createStats({
            trendEvidence: {
                evidenceState: 'weak',
                coverage: 0.48,
                confidence: 0.52,
                sampleSize: 10,
                sessionCount: 1,
                delta: 6,
                canClaimProgress: false,
            },
        }));

        expect(model.trendTitle).toBe('Sinal para validar');
        expect(model.trendBody).toContain('ainda nao sustenta chamar isso de progresso');
        expect(model.evidenceLabel).toBe('Evidencia fraca');
    });

    it('allows positive trend copy only when evidence gates pass', () => {
        const model = buildDashboardTruthViewModel(createStats({
            trendEvidence: {
                evidenceState: 'strong',
                coverage: 0.88,
                confidence: 0.9,
                sampleSize: 52,
                sessionCount: 3,
                delta: 8,
                canClaimProgress: true,
            },
        }));

        expect(model.trendTitle).toBe('Progresso validado');
        expect(model.trendBody).toContain('A media subiu +8 pts');
        expect(model.evidenceSummary).toContain('88% de cobertura');
    });

    it('lets precision oscillation override positive raw dashboard deltas', () => {
        const model = buildDashboardTruthViewModel(createStats({
            lastSessionDelta: 14,
            trendEvidence: {
                evidenceState: 'strong',
                coverage: 0.9,
                confidence: 0.9,
                sampleSize: 60,
                sessionCount: 3,
                delta: 14,
                canClaimProgress: true,
            },
            principalPrecisionTrend: {
                label: 'oscillation',
                compatibleCount: 4,
                evidenceLevel: 'strong',
                coverage: 0.9,
                confidence: 0.9,
                actionableDelta: 2,
                nextValidationHint: 'Mantenha variavel fixa.',
                blockerReasons: [],
                updatedAt: '2026-05-05T12:00:00.000Z',
            },
        }));

        expect(model.nextActionTitle).toBe('Manter variavel fixa e validar');
        expect(model.trendTitle).toBe('Oscilacao controlada');
        expect(model.trendBody).toContain('Nao trate delta bruto como progresso');
        expect(model.trendTitle).not.toBe('Progresso validado');
    });

    it('lets precision not-comparable override positive raw dashboard deltas', () => {
        const model = buildDashboardTruthViewModel(createStats({
            lastSessionDelta: 20,
            trendEvidence: {
                evidenceState: 'strong',
                coverage: 0.9,
                confidence: 0.9,
                sampleSize: 60,
                sessionCount: 3,
                delta: 20,
                canClaimProgress: true,
            },
            principalPrecisionTrend: {
                label: 'not_comparable',
                compatibleCount: 0,
                evidenceLevel: 'blocked',
                coverage: 0,
                confidence: 0,
                actionableDelta: null,
                nextValidationHint: 'Grave outro clip compativel.',
                blockerReasons: ['Distancia estimada bloqueia trend preciso.'],
                updatedAt: '2026-05-05T12:00:00.000Z',
            },
        }));

        expect(model.nextActionTitle).toBe('Alinhar contexto antes de comparar');
        expect(model.trendTitle).toBe('Nao comparavel');
        expect(model.trendBody).toContain('Distancia estimada bloqueia trend preciso.');
        expect(model.trendTitle).not.toBe('Progresso validado');
    });
});
