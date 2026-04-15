import { describe, expect, it, vi } from 'vitest';
import type { CoachFeedback } from '@/types/engine';
import { adaptCoachWithOptionalLlm, type CoachLlmClient } from './coach-llm-adapter';

const deterministicFeedback: CoachFeedback = {
    diagnosis: {
        type: 'underpull',
        severity: 3,
        verticalControlIndex: 0.72,
        deficitPercent: 28,
        description: 'Pulldown baixo',
        cause: 'Controle vertical insuficiente',
        remediation: 'Ajuste o pulldown',
    },
    mode: 'standard',
    problem: 'Pulldown baixo',
    evidence: {
        diagnosisType: 'underpull',
        severity: 3,
        confidence: 0.9,
        coverage: 0.95,
        angularErrorDegrees: 0.8,
        linearErrorCm: 31,
        linearErrorSeverity: 3,
        patchVersion: '41.1',
        attachmentCatalogVersion: '41.1',
    },
    confidence: 0.9,
    likelyCause: 'Controle vertical insuficiente',
    adjustment: 'Ajuste o pulldown',
    drill: 'Drill deterministico',
    verifyNextClip: 'Verifique no proximo clip',
    whatIsWrong: 'Pulldown baixo',
    whyItHappens: 'Controle vertical insuficiente',
    whatToAdjust: 'Ajuste o pulldown',
    howToTest: 'Drill deterministico',
    adaptationTimeDays: 3,
};

describe('adaptCoachWithOptionalLlm', () => {
    it('returns deterministic feedback when no LLM client is available', async () => {
        await expect(adaptCoachWithOptionalLlm([deterministicFeedback])).resolves.toEqual([
            deterministicFeedback,
        ]);
    });

    it('sends only structured coach data and confidence to the LLM client', async () => {
        const generate = vi.fn<CoachLlmClient['generate']>().mockResolvedValue([
            {
                problem: 'Pulldown baixo, explicado melhor',
                likelyCause: 'Controle vertical insuficiente',
                adjustment: 'Ajuste o pulldown com cautela',
                drill: 'Drill deterministico',
                verifyNextClip: 'Verifique no proximo clip',
            },
        ]);

        await adaptCoachWithOptionalLlm([deterministicFeedback], { generate });

        expect(generate).toHaveBeenCalledTimes(1);
        const payload = generate.mock.calls[0]![0];
        expect(payload[0]).toMatchObject({
            mode: 'standard',
            confidence: 0.9,
            evidence: deterministicFeedback.evidence,
        });
        expect(payload[0]).not.toHaveProperty('diagnosis');
        expect(payload[0]).not.toHaveProperty('whatToAdjust');
    });

    it('falls back when LLM output invents fields outside the schema', async () => {
        const client: CoachLlmClient = {
            generate: async () => [
                {
                    problem: 'Pulldown baixo, explicado melhor',
                    likelyCause: 'Controle vertical insuficiente',
                    adjustment: 'Ajuste o pulldown com cautela',
                    drill: 'Drill deterministico',
                    verifyNextClip: 'Verifique no proximo clip',
                    inventedMetric: 999,
                },
            ],
        };

        await expect(adaptCoachWithOptionalLlm([deterministicFeedback], client)).resolves.toEqual([
            deterministicFeedback,
        ]);
    });

    it('applies valid text-only output while preserving deterministic evidence', async () => {
        const client: CoachLlmClient = {
            generate: async () => [
                {
                    problem: 'Pulldown baixo, explicado melhor',
                    likelyCause: 'Controle vertical insuficiente sustentado',
                    adjustment: 'Ajuste o pulldown com cautela',
                    drill: 'Drill deterministico refinado',
                    verifyNextClip: 'Verifique no proximo clip com o mesmo loadout',
                },
            ],
        };

        const [adapted] = await adaptCoachWithOptionalLlm([deterministicFeedback], client);

        expect(adapted).toMatchObject({
            diagnosis: deterministicFeedback.diagnosis,
            mode: 'standard',
            evidence: deterministicFeedback.evidence,
            confidence: 0.9,
            adjustment: 'Ajuste o pulldown com cautela',
            whatToAdjust: 'Ajuste o pulldown com cautela',
            howToTest: 'Drill deterministico refinado',
        });
    });
});
