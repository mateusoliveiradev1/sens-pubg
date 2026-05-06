import type {
    AnalysisBlockerReasonCode,
    AnalysisDecisionLevel,
    CoachDecisionTier,
    SensitivityRecommendationTier,
} from '@/types/engine';

export type AnalysisCalibrationStatus = 'passed' | 'partial' | 'blocked';
export type AnalysisCalibrationReviewStatus = 'draft' | 'reviewed' | 'golden';

export interface AnalysisCalibrationRecord {
    readonly clipId: string;
    readonly reviewStatus: AnalysisCalibrationReviewStatus;
    readonly permissioned: boolean;
    readonly commercialEligible: boolean;
    readonly expectedDecisionLevel: AnalysisDecisionLevel;
    readonly actualDecisionLevel?: AnalysisDecisionLevel;
    readonly predictedConfidence?: number;
    readonly reviewerCorrect?: boolean;
    readonly expectedBlockerReasons?: readonly AnalysisBlockerReasonCode[];
    readonly actualBlockerReasons?: readonly AnalysisBlockerReasonCode[];
    readonly sensitivityTier?: SensitivityRecommendationTier;
    readonly coachTier?: CoachDecisionTier;
}

export interface AnalysisCalibrationBaseline {
    readonly overconfidenceRate?: number;
    readonly blockerFalseNegativeRate?: number;
    readonly sensitivityUnsafeHandoffCount?: number;
    readonly coachUnsafeHandoffCount?: number;
}

export interface AnalysisCalibrationThresholds {
    readonly maxOverconfidenceRate: number;
    readonly maxBlockerFalseNegativeRate: number;
    readonly maxSensitivityUnsafeHandoffCount: number;
    readonly maxCoachUnsafeHandoffCount: number;
}

export interface AnalysisCalibrationReportInput {
    readonly records: readonly AnalysisCalibrationRecord[];
    readonly baseline?: AnalysisCalibrationBaseline;
    readonly thresholds?: Partial<AnalysisCalibrationThresholds>;
}

export interface AnalysisCalibrationRateSummary {
    readonly count: number;
    readonly total: number;
    readonly rate: number;
}

export interface AnalysisCalibrationCountSummary {
    readonly count: number;
    readonly clips: readonly string[];
}

export interface AnalysisCalibrationReportSummary {
    readonly totalRecords: number;
    readonly reviewedRecords: number;
    readonly reviewedPermissionedRecords: number;
    readonly reviewedCommercialEligibleRecords: number;
    readonly overconfidence: AnalysisCalibrationRateSummary;
    readonly underconfidence: AnalysisCalibrationRateSummary;
    readonly inconclusiveCorrectness: AnalysisCalibrationRateSummary;
    readonly blockerAccuracy: {
        readonly expectedBlockerRecords: number;
        readonly falseNegativeCount: number;
        readonly falseNegativeRate: number;
        readonly falsePositiveCount: number;
    };
    readonly sensitivitySafety: AnalysisCalibrationCountSummary;
    readonly coachHandoffSafety: AnalysisCalibrationCountSummary;
    readonly regressions: readonly string[];
}

export interface AnalysisCalibrationReport {
    readonly passed: boolean;
    readonly status: AnalysisCalibrationStatus;
    readonly consoleLines: readonly string[];
    readonly markdown: string;
    readonly summary: AnalysisCalibrationReportSummary;
    readonly gaps: readonly string[];
}

const DEFAULT_THRESHOLDS: AnalysisCalibrationThresholds = {
    maxOverconfidenceRate: 0.15,
    maxBlockerFalseNegativeRate: 0.1,
    maxSensitivityUnsafeHandoffCount: 0,
    maxCoachUnsafeHandoffCount: 0,
};

const LOW_DECISION_LEVELS = new Set<AnalysisDecisionLevel>([
    'blocked_invalid_clip',
    'inconclusive_recapture',
    'partial_safe_read',
]);

const OVERCONFIDENCE_THRESHOLD = 0.75;
const UNDERCONFIDENCE_THRESHOLD = 0.45;

function toFixedNumber(value: number, digits = 4): number {
    return Number(value.toFixed(digits));
}

function isReviewed(record: Pick<AnalysisCalibrationRecord, 'reviewStatus'>): boolean {
    return record.reviewStatus === 'reviewed' || record.reviewStatus === 'golden';
}

function isCommercialCalibrationRecord(record: AnalysisCalibrationRecord): boolean {
    return isReviewed(record) && record.permissioned && record.commercialEligible;
}

function rateSummary(count: number, total: number): AnalysisCalibrationRateSummary {
    return {
        count,
        total,
        rate: total > 0 ? toFixedNumber(count / total) : 0,
    };
}

function hasAllExpectedBlockers(record: AnalysisCalibrationRecord): boolean {
    const expected = record.expectedBlockerReasons ?? [];
    const actual = new Set(record.actualBlockerReasons ?? []);

    return expected.every((reason) => actual.has(reason));
}

function isSensitivityUnsafe(record: AnalysisCalibrationRecord): boolean {
    if (!record.sensitivityTier || !record.actualDecisionLevel) {
        return false;
    }

    if (record.actualDecisionLevel === 'strong_analysis') {
        return false;
    }

    if (record.actualDecisionLevel === 'usable_analysis') {
        return record.sensitivityTier === 'apply_ready';
    }

    return record.sensitivityTier !== 'capture_again';
}

function isCoachHandoffUnsafe(record: AnalysisCalibrationRecord): boolean {
    if (!record.coachTier || !record.actualDecisionLevel) {
        return false;
    }

    return record.actualDecisionLevel !== 'strong_analysis' && record.coachTier === 'apply_protocol';
}

function decisionMatchesExpected(record: AnalysisCalibrationRecord): boolean {
    return record.actualDecisionLevel === record.expectedDecisionLevel;
}

function buildRegressions(
    summary: Pick<AnalysisCalibrationReportSummary, 'overconfidence' | 'blockerAccuracy' | 'sensitivitySafety' | 'coachHandoffSafety'>,
    baseline: AnalysisCalibrationBaseline | undefined
): readonly string[] {
    if (!baseline) {
        return [];
    }

    const regressions: string[] = [];

    if (
        baseline.overconfidenceRate !== undefined &&
        summary.overconfidence.rate > baseline.overconfidenceRate
    ) {
        regressions.push(`overconfidence rate ${summary.overconfidence.rate} exceeded baseline ${baseline.overconfidenceRate}`);
    }

    if (
        baseline.blockerFalseNegativeRate !== undefined &&
        summary.blockerAccuracy.falseNegativeRate > baseline.blockerFalseNegativeRate
    ) {
        regressions.push(`blocker false-negative rate ${summary.blockerAccuracy.falseNegativeRate} exceeded baseline ${baseline.blockerFalseNegativeRate}`);
    }

    if (
        baseline.sensitivityUnsafeHandoffCount !== undefined &&
        summary.sensitivitySafety.count > baseline.sensitivityUnsafeHandoffCount
    ) {
        regressions.push(`sensitivity unsafe handoffs ${summary.sensitivitySafety.count} exceeded baseline ${baseline.sensitivityUnsafeHandoffCount}`);
    }

    if (
        baseline.coachUnsafeHandoffCount !== undefined &&
        summary.coachHandoffSafety.count > baseline.coachUnsafeHandoffCount
    ) {
        regressions.push(`coach unsafe handoffs ${summary.coachHandoffSafety.count} exceeded baseline ${baseline.coachUnsafeHandoffCount}`);
    }

    return regressions;
}

function statusLabel(status: AnalysisCalibrationStatus): 'PASS' | 'PARTIAL' | 'BLOCKED' {
    switch (status) {
        case 'passed':
            return 'PASS';
        case 'partial':
            return 'PARTIAL';
        case 'blocked':
            return 'BLOCKED';
    }
}

export function buildAnalysisCalibrationReport(input: AnalysisCalibrationReportInput): AnalysisCalibrationReport {
    const thresholds = {
        ...DEFAULT_THRESHOLDS,
        ...(input.thresholds ?? {}),
    };
    const commercialRecords = input.records.filter(isCommercialCalibrationRecord);
    const reviewedRecords = input.records.filter(isReviewed);
    const reviewedPermissionedRecords = reviewedRecords.filter((record) => record.permissioned);
    const correctnessRecords = commercialRecords.filter((record) => (
        typeof record.reviewerCorrect === 'boolean' &&
        typeof record.predictedConfidence === 'number'
    ));
    const overconfidenceCount = correctnessRecords.filter((record) => (
        record.predictedConfidence! >= OVERCONFIDENCE_THRESHOLD && record.reviewerCorrect === false
    )).length;
    const underconfidenceCount = correctnessRecords.filter((record) => (
        record.predictedConfidence! <= UNDERCONFIDENCE_THRESHOLD && record.reviewerCorrect === true
    )).length;
    const inconclusiveRecords = commercialRecords.filter((record) => LOW_DECISION_LEVELS.has(record.expectedDecisionLevel));
    const inconclusiveCorrectCount = inconclusiveRecords.filter(decisionMatchesExpected).length;
    const expectedBlockerRecords = commercialRecords.filter((record) => (record.expectedBlockerReasons?.length ?? 0) > 0);
    const blockerFalseNegativeRecords = expectedBlockerRecords.filter((record) => !hasAllExpectedBlockers(record));
    const blockerFalsePositiveRecords = commercialRecords.filter((record) => (
        (record.expectedBlockerReasons?.length ?? 0) === 0 &&
        (record.actualBlockerReasons?.length ?? 0) > 0
    ));
    const sensitivityUnsafeRecords = commercialRecords.filter(isSensitivityUnsafe);
    const coachUnsafeRecords = commercialRecords.filter(isCoachHandoffUnsafe);
    const overconfidence = rateSummary(overconfidenceCount, correctnessRecords.length);
    const underconfidence = rateSummary(underconfidenceCount, correctnessRecords.length);
    const blockerFalseNegativeRate = expectedBlockerRecords.length > 0
        ? toFixedNumber(blockerFalseNegativeRecords.length / expectedBlockerRecords.length)
        : 0;
    const summaryWithoutRegression = {
        totalRecords: input.records.length,
        reviewedRecords: reviewedRecords.length,
        reviewedPermissionedRecords: reviewedPermissionedRecords.length,
        reviewedCommercialEligibleRecords: commercialRecords.length,
        overconfidence,
        underconfidence,
        inconclusiveCorrectness: rateSummary(inconclusiveCorrectCount, inconclusiveRecords.length),
        blockerAccuracy: {
            expectedBlockerRecords: expectedBlockerRecords.length,
            falseNegativeCount: blockerFalseNegativeRecords.length,
            falseNegativeRate: blockerFalseNegativeRate,
            falsePositiveCount: blockerFalsePositiveRecords.length,
        },
        sensitivitySafety: {
            count: sensitivityUnsafeRecords.length,
            clips: sensitivityUnsafeRecords.map((record) => record.clipId),
        },
        coachHandoffSafety: {
            count: coachUnsafeRecords.length,
            clips: coachUnsafeRecords.map((record) => record.clipId),
        },
    };
    const regressions = buildRegressions(summaryWithoutRegression, input.baseline);
    const summary: AnalysisCalibrationReportSummary = {
        ...summaryWithoutRegression,
        regressions,
    };
    const gaps: string[] = [];

    if (commercialRecords.length === 0) {
        gaps.push('No reviewed permissioned commercial benchmark clips are available for full commercial calibration.');
    }

    if (overconfidence.rate > thresholds.maxOverconfidenceRate) {
        gaps.push(`Overconfidence rate ${overconfidence.rate} exceeds ${thresholds.maxOverconfidenceRate}.`);
    }

    if (summary.blockerAccuracy.falseNegativeRate > thresholds.maxBlockerFalseNegativeRate) {
        gaps.push(`Blocker false-negative rate ${summary.blockerAccuracy.falseNegativeRate} exceeds ${thresholds.maxBlockerFalseNegativeRate}.`);
    }

    if (summary.sensitivitySafety.count > thresholds.maxSensitivityUnsafeHandoffCount) {
        gaps.push(`${summary.sensitivitySafety.count} sensitivity unsafe handoff(s) exceeded the allowed ${thresholds.maxSensitivityUnsafeHandoffCount}.`);
    }

    if (summary.coachHandoffSafety.count > thresholds.maxCoachUnsafeHandoffCount) {
        gaps.push(`${summary.coachHandoffSafety.count} coach unsafe handoff(s) exceeded the allowed ${thresholds.maxCoachUnsafeHandoffCount}.`);
    }

    for (const regression of regressions) {
        gaps.push(`Calibration regression: ${regression}.`);
    }

    const hasBlockingGap = gaps.some((gap) => !gap.startsWith('No reviewed permissioned commercial benchmark clips'));
    const status: AnalysisCalibrationStatus = hasBlockingGap
        ? 'blocked'
        : commercialRecords.length === 0
            ? 'partial'
            : 'passed';
    const consoleLines = [
        `analysis calibration: ${statusLabel(status)}`,
        `calibration corpus: ${summary.reviewedCommercialEligibleRecords} commercial eligible / ${summary.reviewedPermissionedRecords} reviewed permissioned`,
        `overconfidence: ${summary.overconfidence.count}/${summary.overconfidence.total} (${summary.overconfidence.rate})`,
        `blocker false negatives: ${summary.blockerAccuracy.falseNegativeCount}/${summary.blockerAccuracy.expectedBlockerRecords} (${summary.blockerAccuracy.falseNegativeRate})`,
        `sensitivity unsafe handoffs: ${summary.sensitivitySafety.count}`,
        `coach unsafe handoffs: ${summary.coachHandoffSafety.count}`,
        ...(gaps.length > 0 ? gaps.map((gap) => `calibration gap: ${gap}`) : []),
    ];
    const markdown = [
        '## Calibration',
        '',
        `Status: **${statusLabel(status)}**`,
        '',
        '### Reviewed/golden corpus coverage',
        '',
        `- Total records: ${summary.totalRecords}`,
        `- Reviewed/golden records: ${summary.reviewedRecords}`,
        `- Reviewed permissioned records: ${summary.reviewedPermissionedRecords}`,
        `- Reviewed permissioned commercial benchmark records: ${summary.reviewedCommercialEligibleRecords}`,
        '',
        '### Overconfidence',
        '',
        `- Rate: ${summary.overconfidence.rate} (${summary.overconfidence.count}/${summary.overconfidence.total})`,
        `- Threshold: <= ${thresholds.maxOverconfidenceRate}`,
        '',
        '### Underconfidence',
        '',
        `- Rate: ${summary.underconfidence.rate} (${summary.underconfidence.count}/${summary.underconfidence.total})`,
        '',
        '### Inconclusive correctness',
        '',
        `- Correct low-evidence decisions: ${summary.inconclusiveCorrectness.count}/${summary.inconclusiveCorrectness.total} (${summary.inconclusiveCorrectness.rate})`,
        '',
        '### Blocker accuracy',
        '',
        `- False-negative rate: ${summary.blockerAccuracy.falseNegativeRate} (${summary.blockerAccuracy.falseNegativeCount}/${summary.blockerAccuracy.expectedBlockerRecords})`,
        `- False-positive count: ${summary.blockerAccuracy.falsePositiveCount}`,
        `- Threshold: <= ${thresholds.maxBlockerFalseNegativeRate}`,
        '',
        '### Sensitivity safety',
        '',
        `- Unsafe handoffs: ${summary.sensitivitySafety.count}`,
        `- Clips: ${summary.sensitivitySafety.clips.join(', ') || 'none'}`,
        '',
        '### Coach handoff safety',
        '',
        `- Unsafe handoffs: ${summary.coachHandoffSafety.count}`,
        `- Clips: ${summary.coachHandoffSafety.clips.join(', ') || 'none'}`,
        '',
        '### Baseline regression',
        '',
        ...(summary.regressions.length > 0 ? summary.regressions.map((regression) => `- ${regression}`) : ['- None']),
        '',
        '### Calibration gaps',
        '',
        ...(gaps.length > 0 ? gaps.map((gap) => `- ${gap}`) : ['- None']),
        '',
    ].join('\n');

    return {
        passed: status === 'passed',
        status,
        consoleLines,
        markdown,
        summary,
        gaps,
    };
}
