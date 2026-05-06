import { describe, expect, it } from 'vitest';
import {
    buildAnalysisCalibrationReport,
    type AnalysisCalibrationRecord,
} from './analysis-calibration-report';

const baseRecord: AnalysisCalibrationRecord = {
    clipId: 'captured-clip1',
    reviewStatus: 'reviewed',
    permissioned: true,
    commercialEligible: true,
    expectedDecisionLevel: 'usable_analysis',
    actualDecisionLevel: 'usable_analysis',
    predictedConfidence: 0.72,
    reviewerCorrect: true,
    expectedBlockerReasons: [],
    actualBlockerReasons: [],
    sensitivityTier: 'test_profiles',
    coachTier: 'test_protocol',
};

function reportFor(record: Partial<AnalysisCalibrationRecord>) {
    return buildAnalysisCalibrationReport({
        records: [
            {
                ...baseRecord,
                ...record,
            },
        ],
    });
}

describe('buildAnalysisCalibrationReport', () => {
    it('passes reviewed permissioned commercial clips when calibration and handoffs are honest', () => {
        const report = buildAnalysisCalibrationReport({
            records: [
                baseRecord,
                {
                    ...baseRecord,
                    clipId: 'captured-clip2',
                    expectedDecisionLevel: 'inconclusive_recapture',
                    actualDecisionLevel: 'inconclusive_recapture',
                    predictedConfidence: 0.38,
                    reviewerCorrect: false,
                    expectedBlockerReasons: ['low_confidence'],
                    actualBlockerReasons: ['low_confidence'],
                    sensitivityTier: 'capture_again',
                    coachTier: 'capture_again',
                },
            ],
        });

        expect(report.passed).toBe(true);
        expect(report.status).toBe('passed');
        expect(report.gaps).toEqual([]);
        expect(report.markdown).toContain('## Calibration');
        expect(report.markdown).toContain('Overconfidence');
        expect(report.markdown).toContain('Blocker accuracy');
        expect(report.markdown).toContain('Sensitivity safety');
        expect(report.markdown).toContain('Coach handoff safety');
    });

    it('is partial when no reviewed permissioned commercial clips exist yet', () => {
        const report = reportFor({
            permissioned: true,
            commercialEligible: false,
        });

        expect(report.passed).toBe(false);
        expect(report.status).toBe('partial');
        expect(report.gaps).toContain('No reviewed permissioned commercial benchmark clips are available for full commercial calibration.');
        expect(report.consoleLines.join('\n')).toContain('analysis calibration: PARTIAL');
    });

    it('blocks overconfidence above the release threshold', () => {
        const report = buildAnalysisCalibrationReport({
            records: [
                {
                    ...baseRecord,
                    clipId: 'overconfident-1',
                    predictedConfidence: 0.91,
                    reviewerCorrect: false,
                },
                {
                    ...baseRecord,
                    clipId: 'overconfident-2',
                    predictedConfidence: 0.86,
                    reviewerCorrect: false,
                },
                {
                    ...baseRecord,
                    clipId: 'correct-1',
                    predictedConfidence: 0.8,
                    reviewerCorrect: true,
                },
            ],
        });

        expect(report.status).toBe('blocked');
        expect(report.summary.overconfidence.rate).toBeGreaterThan(0.15);
        expect(report.gaps.some((gap) => gap.startsWith('Overconfidence rate'))).toBe(true);
    });

    it('blocks blocker false negatives above the release threshold', () => {
        const report = reportFor({
            expectedDecisionLevel: 'inconclusive_recapture',
            actualDecisionLevel: 'usable_analysis',
            expectedBlockerReasons: ['low_clip_quality', 'low_confidence'],
            actualBlockerReasons: ['low_confidence'],
            sensitivityTier: 'test_profiles',
            coachTier: 'test_protocol',
        });

        expect(report.status).toBe('blocked');
        expect(report.summary.blockerAccuracy.falseNegativeRate).toBe(1);
        expect(report.gaps.some((gap) => gap.startsWith('Blocker false-negative rate'))).toBe(true);
    });

    it('blocks sensitivity handoffs that are too strong for the decision level', () => {
        const report = reportFor({
            expectedDecisionLevel: 'usable_analysis',
            actualDecisionLevel: 'usable_analysis',
            sensitivityTier: 'apply_ready',
        });

        expect(report.status).toBe('blocked');
        expect(report.summary.sensitivitySafety.clips).toEqual(['captured-clip1']);
        expect(report.gaps.some((gap) => gap.includes('sensitivity unsafe handoff'))).toBe(true);
    });

    it('blocks coach handoffs that apply protocols before strong analysis', () => {
        const report = reportFor({
            expectedDecisionLevel: 'usable_analysis',
            actualDecisionLevel: 'usable_analysis',
            coachTier: 'apply_protocol',
        });

        expect(report.status).toBe('blocked');
        expect(report.summary.coachHandoffSafety.clips).toEqual(['captured-clip1']);
        expect(report.gaps.some((gap) => gap.includes('coach unsafe handoff'))).toBe(true);
    });
});
