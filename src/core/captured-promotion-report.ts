import type { BenchmarkCoverageSummary } from './benchmark-coverage';
import type { CapturedBenchmarkPromotionReport } from './captured-golden-promotion';

export interface CapturedPromotionReportInput {
    readonly generatedAt: string;
    readonly selectedClipIds: readonly string[];
    readonly intendedMaturity: 'reviewed' | 'golden';
    readonly reason: string;
    readonly reviewer?: string;
    readonly benchmarkPassed: boolean;
    readonly promotion: CapturedBenchmarkPromotionReport;
    readonly coverageBefore?: BenchmarkCoverageSummary;
    readonly coverageAfter?: BenchmarkCoverageSummary;
}

export interface CapturedPromotionMarkdownReport {
    readonly passed: boolean;
    readonly markdown: string;
    readonly nextGaps: readonly string[];
}

function statusLabel(passed: boolean): 'PASS' | 'FAIL' {
    return passed ? 'PASS' : 'FAIL';
}

function yesNo(value: boolean): 'yes' | 'no' {
    return value ? 'yes' : 'no';
}

function formatAllowedPurposes(purposes: readonly string[]): string {
    return purposes.length > 0 ? purposes.join(', ') : 'missing';
}

function consentBlockers(input: CapturedPromotionReportInput): boolean {
    const consentReasons = new Set([
        'missing-consent',
        'consent-not-verified',
        'trainability-not-authorized',
        'redistribution-scope-mismatch',
        'withdrawn-clip',
        'review-state-too-early',
        'permissioned-purpose-missing',
    ]);

    return input.promotion.blockedClips.some((blocker) => consentReasons.has(blocker.reason));
}

function withdrawalLabel(summary: CapturedBenchmarkPromotionReport['consent'][number] | undefined): string {
    if (!summary) {
        return 'missing';
    }

    if (!summary.withdrawn) {
        return 'no';
    }

    return [
        'withdrawn',
        summary.quarantineRequired ? 'quarantine' : 'quarantine-missing',
        summary.requiresRebaseline ? 'rebaseline' : 'rebaseline-missing',
    ].join(' / ');
}

function selectedIds(input: CapturedPromotionReportInput): readonly string[] {
    if (input.selectedClipIds.length > 0) {
        return input.selectedClipIds;
    }

    return input.promotion.dataset?.clips.map((clip) => clip.clipId) ?? [];
}

function coverageDeltaRows(input: CapturedPromotionReportInput): readonly string[] {
    if (!input.coverageBefore || !input.coverageAfter) {
        return ['| Coverage impact | not calculated | not calculated | 0 |'];
    }

    return [
        ['Total clips', input.coverageBefore.totalClips, input.coverageAfter.totalClips],
        ['Golden clips', input.coverageBefore.goldenClips, input.coverageAfter.goldenClips],
        ['Specialist-reviewed golden clips', input.coverageBefore.specialistReviewedGoldenClips, input.coverageAfter.specialistReviewedGoldenClips],
        ['Current patch captured clips', input.coverageBefore.currentPatchCapturedClips, input.coverageAfter.currentPatchCapturedClips],
    ].map(([label, before, after]) => {
        const beforeNumber = Number(before);
        const afterNumber = Number(after);
        return `| ${label} | ${beforeNumber} | ${afterNumber} | ${afterNumber - beforeNumber} |`;
    });
}

function metadataRows(input: CapturedPromotionReportInput): readonly string[] {
    const clips = input.promotion.dataset?.clips ?? [];
    const consentByClipId = new Map(input.promotion.consent.map((summary) => [summary.clipId, summary]));

    return clips.map((clip) => {
        const consent = consentByClipId.get(clip.clipId);

        return `| ${clip.clipId} | ${clip.capture.patchVersion} | ${clip.capture.weaponId} | ${clip.capture.optic.opticId}:${clip.capture.optic.stateId} | ${clip.capture.distanceMeters} | ${clip.quality.reviewStatus} | ${clip.quality.reviewProvenance?.source ?? 'unspecified'} | ${consent?.consentStatus ?? 'missing'} | ${formatAllowedPurposes(consent?.allowedPurposes ?? [])} | ${yesNo(consent?.trainabilityAuthorized ?? false)} | ${consent?.derivativeScope ?? 'missing'} | ${withdrawalLabel(consent)} |`;
    });
}

function consentRows(input: CapturedPromotionReportInput): readonly string[] {
    return input.promotion.consent.map((summary) => (
        `| ${summary.clipId} | ${summary.consentStatus} | ${formatAllowedPurposes(summary.allowedPurposes)} | ${yesNo(summary.trainabilityAuthorized)} | ${summary.derivativeScope} | ${yesNo(summary.redistributionAllowed)} | ${withdrawalLabel(summary)} |`
    ));
}

function blockerRows(input: CapturedPromotionReportInput): readonly string[] {
    return input.promotion.blockedClips.map((blocker) => (
        `| ${blocker.clipId} | ${blocker.reason} | ${blocker.missingFieldPaths.join(', ')} |`
    ));
}

function nextGaps(input: CapturedPromotionReportInput): readonly string[] {
    const gaps = input.coverageAfter?.sddGaps ?? input.coverageBefore?.sddGaps ?? [];

    if (input.promotion.blockedClips.length > 0) {
        return [
            ...input.promotion.blockedClips.map((blocker) => `${blocker.clipId}: ${blocker.reason} (${blocker.missingFieldPaths.join(', ')})`),
            ...gaps,
        ];
    }

    return gaps;
}

export function buildCapturedPromotionMarkdownReport(
    input: CapturedPromotionReportInput
): CapturedPromotionMarkdownReport {
    const passed = input.promotion.blockedClips.length === 0
        && input.promotion.dataset !== undefined
        && input.benchmarkPassed;
    const gaps = nextGaps(input);
    const markdown = [
        '# Captured Clip Promotion Report',
        '',
        `Generated: ${input.generatedAt}`,
        `Selected clips: ${selectedIds(input).join(', ') || '(none)'}`,
        `Intended maturity: ${input.intendedMaturity}`,
        `Reason: ${input.reason || '(missing)'}`,
        `Reviewer: ${input.reviewer ?? '(unspecified)'}`,
        `Benchmark/replay status: ${statusLabel(input.benchmarkPassed)}`,
        `Promotion status: ${statusLabel(passed)}`,
        '',
        '## Checks',
        '',
        '| Check | Status |',
        '|---|---|',
        `| Metadata and label completeness | ${statusLabel(input.promotion.blockedClips.length === 0)} |`,
        `| Consent and corpus permission | ${statusLabel(!consentBlockers(input))} |`,
        `| Benchmark or replay validation | ${statusLabel(input.benchmarkPassed)} |`,
        `| Dataset write eligibility | ${statusLabel(input.promotion.dataset !== undefined)} |`,
        '',
        '## Metadata And Provenance',
        '',
        '| Clip | Patch | Weapon | Optic | Distance | Maturity | Provenance | Consent status | Allowed purposes | Trainability | Derivative scope | Withdrawal |',
        '|---|---|---|---|---:|---|---|---|---|---|---|---|',
        ...(metadataRows(input).length > 0 ? metadataRows(input) : ['| (none) | - | - | - | 0 | - | - | missing | missing | no | missing | missing |']),
        '',
        '## Consent And Permission',
        '',
        '| Clip | Consent status | Allowed purposes | Trainability | Derivative scope | Redistribution | Withdrawal |',
        '|---|---|---|---|---|---|---|',
        ...(consentRows(input).length > 0 ? consentRows(input) : ['| (none) | missing | missing | no | missing | no | missing |']),
        '',
        '## Coverage Impact',
        '',
        '| Metric | Before | After | Delta |',
        '|---|---:|---:|---:|',
        ...coverageDeltaRows(input),
        '',
        '## Blockers',
        '',
        ...(input.promotion.blockedClips.length > 0
            ? [
                '| Clip | Reason | Fields |',
                '|---|---|---|',
                ...blockerRows(input),
            ]
            : ['- None']),
        '',
        '## Next Gaps',
        '',
        ...(gaps.length > 0 ? gaps.map((gap) => `- ${gap}`) : ['- None']),
        '',
        'Public streamer/pro videos are qualitative reference only unless formal permission/trainability is verified.',
        '',
        'Internal maintainer/dev/reviewer workflow only. These labels are not public user-generated content.',
        '',
    ].join('\n');

    return {
        passed,
        markdown,
        nextGaps: gaps,
    };
}
