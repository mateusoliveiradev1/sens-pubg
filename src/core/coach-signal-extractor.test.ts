import { describe, expect, it } from 'vitest';

import {
    analysisResultBase,
    analysisResultWithWeakCapture,
} from './coach-test-fixtures';
import { extractCoachSignals } from './coach-signal-extractor';
import { resolveAnalysisDecision } from './analysis-decision';

describe('extractCoachSignals', () => {
    it('extracts capture, diagnosis, sensitivity, and context signals from an analysis result', () => {
        const signals = extractCoachSignals({ analysisResult: analysisResultBase });

        expect(signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                source: 'video_quality',
                area: 'capture_quality',
                key: 'video_quality.analysis_ready',
            }),
            expect.objectContaining({
                source: 'diagnosis',
                area: 'vertical_control',
                key: 'diagnosis.underpull',
                confidence: 0.86,
                coverage: 0.9,
            }),
            expect.objectContaining({
                source: 'sensitivity',
                area: 'sensitivity',
                key: 'sensitivity.test_profiles',
                confidence: 0.78,
                summary: expect.stringContaining('moderada'),
            }),
            expect.objectContaining({
                source: 'context',
                area: 'validation',
                key: 'context.patch',
                summary: expect.stringContaining('41.1'),
            }),
            expect.objectContaining({
                source: 'context',
                area: 'validation',
                key: 'context.optic',
                summary: expect.stringContaining('Red Dot Sight'),
            }),
            expect.objectContaining({
                source: 'context',
                area: 'validation',
                key: 'context.distance',
                summary: expect.stringContaining('30m'),
            }),
        ]));
    });

    it('emits strong capture and sensitivity blocker signals when the clip is not usable', () => {
        const signals = extractCoachSignals({ analysisResult: analysisResultWithWeakCapture });

        expect(signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                source: 'video_quality',
                area: 'capture_quality',
                key: 'video_quality.unusable',
                confidence: 1,
                coverage: 1,
                weight: 1,
                summary: expect.stringContaining('baixa nitidez'),
            }),
            expect.objectContaining({
                source: 'sensitivity',
                area: 'sensitivity',
                key: 'sensitivity.capture_again',
                confidence: 0.34,
                weight: 1,
                summary: expect.stringContaining('bloqueia mudancas agressivas'),
            }),
        ]));
    });

    it('emits an analysis decision signal for downstream coach gating', () => {
        const analysisDecision = resolveAnalysisDecision({
            blockerReasons: ['low_confidence'],
            confidence: 0.55,
            coverage: 0.7,
        });
        const signals = extractCoachSignals({
            analysisResult: {
                ...analysisResultBase,
                analysisDecision,
            },
        });

        expect(signals).toEqual(expect.arrayContaining([
            expect.objectContaining({
                source: 'context',
                key: 'analysis_decision.partial_safe_read',
                confidence: 0.55,
                coverage: 0.55,
            }),
        ]));
    });

    it('does not invent optic or distance context when the analysis result does not include them', () => {
        const resultWithoutContext = {
            ...analysisResultBase,
            analysisContext: undefined,
        };

        const signals = extractCoachSignals({ analysisResult: resultWithoutContext });
        const contextKeys = signals
            .filter((signal) => signal.source === 'context')
            .map((signal) => signal.key);

        expect(contextKeys).toEqual(['context.patch']);
    });
});
