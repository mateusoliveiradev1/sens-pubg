import { describe, expect, it } from 'vitest';

import {
    permissionMatrixForDecisionLevel,
    resolveAnalysisDecision,
} from './analysis-decision';
import type { AnalysisDecisionLevel } from '@/types/engine';

describe('analysis decision ladder', () => {
    it('defines exact downstream permissions for every Phase 6 decision level', () => {
        const expected: Record<AnalysisDecisionLevel, ReturnType<typeof permissionMatrixForDecisionLevel>> = {
            blocked_invalid_clip: {
                canDisplayDiagnosis: false,
                canDisplaySensitivity: false,
                canDisplayCoach: false,
                canSaveAuditResult: true,
                countsAsUsefulAnalysis: false,
                canEnterPrecisionTrend: false,
                canEnterCorpus: false,
                allowedClaimLevel: 'none',
            },
            inconclusive_recapture: {
                canDisplayDiagnosis: false,
                canDisplaySensitivity: false,
                canDisplayCoach: false,
                canSaveAuditResult: true,
                countsAsUsefulAnalysis: false,
                canEnterPrecisionTrend: false,
                canEnterCorpus: false,
                allowedClaimLevel: 'capture_guidance',
            },
            partial_safe_read: {
                canDisplayDiagnosis: true,
                canDisplaySensitivity: false,
                canDisplayCoach: false,
                canSaveAuditResult: true,
                countsAsUsefulAnalysis: false,
                canEnterPrecisionTrend: false,
                canEnterCorpus: false,
                allowedClaimLevel: 'limited_read',
            },
            usable_analysis: {
                canDisplayDiagnosis: true,
                canDisplaySensitivity: true,
                canDisplayCoach: true,
                canSaveAuditResult: true,
                countsAsUsefulAnalysis: true,
                canEnterPrecisionTrend: true,
                canEnterCorpus: false,
                allowedClaimLevel: 'analysis',
            },
            strong_analysis: {
                canDisplayDiagnosis: true,
                canDisplaySensitivity: true,
                canDisplayCoach: true,
                canSaveAuditResult: true,
                countsAsUsefulAnalysis: true,
                canEnterPrecisionTrend: true,
                canEnterCorpus: true,
                allowedClaimLevel: 'commercial_supported',
            },
        };

        for (const [level, permissions] of Object.entries(expected) as Array<[AnalysisDecisionLevel, typeof expected[AnalysisDecisionLevel]]>) {
            expect(permissionMatrixForDecisionLevel(level)).toEqual(permissions);
        }
    });

    it('maps invalid and partial decisions to legacy action states for old history readers', () => {
        expect(resolveAnalysisDecision({
            blockerReasons: ['hard_cut'],
            confidence: 0.2,
            coverage: 0.1,
        })).toMatchObject({
            version: 'spray-truth-v2',
            level: 'blocked_invalid_clip',
            legacyActionState: 'capture_again',
        });

        expect(resolveAnalysisDecision({
            blockerReasons: ['low_confidence'],
            confidence: 0.55,
            coverage: 0.7,
        })).toMatchObject({
            level: 'partial_safe_read',
            legacyActionState: 'inconclusive',
        });
    });

    it('keeps only usable and strong analyses billable, trendable, or corpus eligible', () => {
        const usable = resolveAnalysisDecision({ confidence: 0.74, coverage: 0.72 });
        const strong = resolveAnalysisDecision({ confidence: 0.9, coverage: 0.86, commercialEvidence: true });

        expect(usable.level).toBe('usable_analysis');
        expect(usable.permissionMatrix).toMatchObject({
            countsAsUsefulAnalysis: true,
            canEnterPrecisionTrend: true,
            canEnterCorpus: false,
            allowedClaimLevel: 'analysis',
        });

        expect(strong.level).toBe('strong_analysis');
        expect(strong.permissionMatrix).toMatchObject({
            countsAsUsefulAnalysis: true,
            canEnterPrecisionTrend: true,
            canEnterCorpus: true,
            allowedClaimLevel: 'commercial_supported',
        });
    });
});
