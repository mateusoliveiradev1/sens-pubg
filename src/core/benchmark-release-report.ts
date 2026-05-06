import type { BenchmarkCoverageSummary } from './benchmark-coverage';
import type { AnalysisCalibrationReport } from './analysis-calibration-report';
import type { BenchmarkClipResult, BenchmarkRegressionResult, BenchmarkReport } from '../../scripts/run-benchmark';

export type BenchmarkReleaseStatus = 'passed' | 'partial' | 'blocked';

export interface BenchmarkReleaseReportInput {
    readonly generatedAt: string;
    readonly syntheticReport: BenchmarkReport;
    readonly capturedReport: BenchmarkReport;
    readonly coverageSummary: BenchmarkCoverageSummary;
    readonly calibrationReport: AnalysisCalibrationReport;
}

export interface BenchmarkReleaseReport {
    readonly passed: boolean;
    readonly status: BenchmarkReleaseStatus;
    readonly generatedAt: string;
    readonly datedReportPath: string;
    readonly latestReportPath: string;
    readonly consoleLines: readonly string[];
    readonly markdown: string;
    readonly regressions: readonly string[];
    readonly coverageGaps: readonly string[];
    readonly calibrationGaps: readonly string[];
}

function statusLabel(passed: boolean): 'PASS' | 'FAIL' {
    return passed ? 'PASS' : 'FAIL';
}

function releaseStatusLabel(status: BenchmarkReleaseStatus): 'PASS' | 'PARTIAL' | 'BLOCKED' {
    switch (status) {
        case 'passed':
            return 'PASS';
        case 'partial':
            return 'PARTIAL';
        case 'blocked':
            return 'BLOCKED';
    }
}

function hasRegression(report: BenchmarkReport): boolean {
    return report.regression?.isRegression === true;
}

function regressionLines(label: string, regression: BenchmarkRegressionResult | undefined): readonly string[] {
    if (!regression?.isRegression) {
        return [];
    }

    return Object.entries(regression.deltas)
        .filter(([, value]) => typeof value === 'number' && value !== 0)
        .map(([key, value]) => `${label}.${key}: ${value}`);
}

function summarizeGroup(clips: readonly BenchmarkClipResult[]): {
    readonly total: number;
    readonly failed: number;
    readonly truthFailed: number;
} {
    return {
        total: clips.length,
        failed: clips.filter((clip) => !clip.passed).length,
        truthFailed: clips.filter((clip) => !clip.truth.passed).length,
    };
}

function groupRows(
    syntheticReport: BenchmarkReport,
    capturedReport: BenchmarkReport,
): readonly string[] {
    const synthetic = summarizeGroup(syntheticReport.clips);
    const captured = summarizeGroup(capturedReport.clips);
    const reviewed = summarizeGroup(capturedReport.clips.filter((clip) => clip.reviewStatus === 'reviewed'));
    const golden = summarizeGroup(capturedReport.clips.filter((clip) => clip.reviewStatus === 'golden'));

    return [
        `| Synthetic | ${synthetic.total} | ${synthetic.failed} | ${synthetic.truthFailed} |`,
        `| Captured | ${captured.total} | ${captured.failed} | ${captured.truthFailed} |`,
        `| Reviewed | ${reviewed.total} | ${reviewed.failed} | ${reviewed.truthFailed} |`,
        `| Golden | ${golden.total} | ${golden.failed} | ${golden.truthFailed} |`,
    ];
}

function failedClipRows(label: string, report: BenchmarkReport): readonly string[] {
    return report.clips
        .filter((clip) => !clip.passed || clip.truth.mismatches.length > 0)
        .map((clip) => {
            const failures = [
                !clip.tracking.passed ? 'tracking' : undefined,
                !clip.diagnostics.passed ? 'diagnostics' : undefined,
                !clip.coach.passed ? 'coach' : undefined,
                !clip.truth.passed ? 'truth' : undefined,
            ].filter(Boolean).join(', ');
            const truthDetails = clip.truth.mismatches.length > 0
                ? clip.truth.mismatches.join('<br>')
                : clip.truth.error ?? '';

            return `| ${label} | ${clip.clipId} | ${clip.reviewStatus} | ${failures || 'none'} | ${truthDetails || '-'} |`;
        });
}

function buildRegressionWarnings(input: BenchmarkReleaseReportInput): readonly string[] {
    const warnings = [
        ...regressionLines('synthetic', input.syntheticReport.regression),
        ...regressionLines('captured', input.capturedReport.regression),
    ];
    const reviewedClips = input.capturedReport.clips.filter((clip) => clip.reviewStatus === 'reviewed');
    const failedGoldenClips = input.capturedReport.clips.filter((clip) => clip.reviewStatus === 'golden' && !clip.passed);

    if (hasRegression(input.capturedReport) && reviewedClips.length > 0 && failedGoldenClips.length === 0) {
        warnings.push('captured.reviewed: reviewed clips regressed while golden clips were unaffected');
    }

    return warnings;
}

export function buildBenchmarkReleaseReport(input: BenchmarkReleaseReportInput): BenchmarkReleaseReport {
    const syntheticRegression = hasRegression(input.syntheticReport);
    const capturedRegression = hasRegression(input.capturedReport);
    const coveragePassed = input.coverageSummary.sddGate.passed;
    const regressions = buildRegressionWarnings(input);
    const coverageGaps = input.coverageSummary.sddGaps;
    const calibrationGaps = input.calibrationReport.gaps;
    const hardBlocked = !input.syntheticReport.passed
        || !input.capturedReport.passed
        || syntheticRegression
        || capturedRegression
        || !coveragePassed
        || input.calibrationReport.status === 'blocked';
    const status: BenchmarkReleaseStatus = hardBlocked
        ? 'blocked'
        : input.calibrationReport.status === 'partial'
            ? 'partial'
            : 'passed';
    const passed = status === 'passed'
        && input.syntheticReport.passed
        && input.capturedReport.passed
        && !syntheticRegression
        && !capturedRegression
        && coveragePassed
        && input.calibrationReport.passed;
    const dateKey = input.generatedAt.slice(0, 10);
    const datedReportPath = `docs/benchmark-reports/${dateKey}.md`;
    const latestReportPath = 'docs/benchmark-reports/latest.md';
    const consoleLines = [
        `benchmark:release ${releaseStatusLabel(status)}`,
        `synthetic: ${statusLabel(input.syntheticReport.passed && !syntheticRegression)} (${input.syntheticReport.summary.failedClips} failed, score ${input.syntheticReport.summary.score})`,
        `captured: ${statusLabel(input.capturedReport.passed && !capturedRegression)} (${input.capturedReport.summary.failedClips} failed, score ${input.capturedReport.summary.score})`,
        `sdd coverage: ${statusLabel(coveragePassed)} (${input.coverageSummary.sddGate.checks.filter((check) => check.passed).length}/${input.coverageSummary.sddGate.checks.length})`,
        `calibration: ${releaseStatusLabel(input.calibrationReport.status)} (${input.calibrationReport.summary.reviewedCommercialEligibleRecords} commercial eligible clips)`,
        ...(regressions.length > 0 ? regressions.map((line) => `regression: ${line}`) : []),
        ...(coverageGaps.length > 0 ? coverageGaps.map((gap) => `coverage gap: ${gap}`) : []),
        ...(calibrationGaps.length > 0 ? calibrationGaps.map((gap) => `calibration gap: ${gap}`) : []),
    ];
    const failedRows = [
        ...failedClipRows('synthetic', input.syntheticReport),
        ...failedClipRows('captured', input.capturedReport),
    ];
    const markdown = [
        '# Benchmark Release Report',
        '',
        `Generated: ${input.generatedAt}`,
        '',
        `Status: **${releaseStatusLabel(status)}**`,
        ...(status === 'partial'
            ? [
                '',
                'commercial readiness is not complete because calibration lacks reviewed permissioned commercial benchmark clips.',
            ]
            : []),
        '',
        '## Gate Summary',
        '',
        '| Gate | Status | Detail |',
        '|---|---|---|',
        `| Synthetic benchmark | ${statusLabel(input.syntheticReport.passed && !syntheticRegression)} | ${input.syntheticReport.summary.failedClips} failed, score ${input.syntheticReport.summary.score} |`,
        `| Captured benchmark | ${statusLabel(input.capturedReport.passed && !capturedRegression)} | ${input.capturedReport.summary.failedClips} failed, score ${input.capturedReport.summary.score} |`,
        `| SDD coverage | ${statusLabel(coveragePassed)} | ${input.coverageSummary.sddGate.checks.filter((check) => check.passed).length}/${input.coverageSummary.sddGate.checks.length} checks passed |`,
        `| Calibration | ${releaseStatusLabel(input.calibrationReport.status)} | ${input.calibrationReport.summary.reviewedCommercialEligibleRecords} reviewed permissioned commercial benchmark clips |`,
        '',
        '## Evidence Buckets',
        '',
        '| Bucket | Clips | Failed | Truth failed |',
        '|---|---:|---:|---:|',
        ...groupRows(input.syntheticReport, input.capturedReport),
        '',
        '## Regressions',
        '',
        ...(regressions.length > 0 ? regressions.map((line) => `- ${line}`) : ['- None']),
        '',
        '## Coverage Gaps',
        '',
        ...(coverageGaps.length > 0 ? coverageGaps.map((gap) => `- ${gap}`) : ['- None']),
        '',
        input.calibrationReport.markdown,
        '',
        '## Failed Clips And Truth Mismatches',
        '',
        ...(failedRows.length > 0
            ? [
                '| Dataset | Clip | Review status | Failed areas | Detail |',
                '|---|---|---|---|---|',
                ...failedRows,
            ]
            : ['- None']),
        '',
    ].join('\n');

    return {
        passed,
        status,
        generatedAt: input.generatedAt,
        datedReportPath,
        latestReportPath,
        consoleLines,
        markdown,
        regressions,
        coverageGaps,
        calibrationGaps,
    };
}
