import type { BenchmarkClip, BenchmarkDataset } from '@/types/benchmark';
import { parseBenchmarkDataset } from '@/types/benchmark';
import type { CapturedClipIntakeClip, CapturedClipIntakeManifest } from '@/types/captured-clip-intake';
import type { CapturedBenchmarkReviewDecisionSet } from '@/types/captured-benchmark-review-decisions';
import {
    summarizeCapturedClipLabel,
    type CapturedClipLabel,
    type CapturedClipLabelSet,
} from '@/types/captured-clip-labels';

export type CapturedBenchmarkPromotionBlockerReason = 'missing-labels' | 'missing-intake';

export interface CapturedBenchmarkPromotionBlocker {
    readonly clipId: string;
    readonly reason: CapturedBenchmarkPromotionBlockerReason;
    readonly missingFieldPaths: readonly string[];
}

export interface CapturedBenchmarkPromotionInput {
    readonly datasetId: string;
    readonly createdAt: string;
    readonly intakeManifest: CapturedClipIntakeManifest;
    readonly labelSet: CapturedClipLabelSet;
    readonly reviewDecisionSet?: CapturedBenchmarkReviewDecisionSet;
}

export interface CapturedBenchmarkPromotionReport {
    readonly totalClipCount: number;
    readonly promotedClipCount: number;
    readonly goldenClipCount: number;
    readonly blockedClips: readonly CapturedBenchmarkPromotionBlocker[];
    readonly dataset?: BenchmarkDataset;
}

const required = <T>(value: T | null | undefined, path: string): T => {
    if (value === null || value === undefined) {
        throw new Error(`Campo obrigatorio ausente para promocao de golden: ${path}`);
    }

    return value;
};

const toVisibilityTier = (intakeClip: CapturedClipIntakeClip): 'clean' | 'degraded' | 'rejected' => {
    if (intakeClip.quality.qualityTier === 'candidate-clean') return 'clean';
    if (intakeClip.quality.qualityTier === 'candidate-degraded') return 'degraded';
    return 'rejected';
};

const toBenchmarkClip = (
    intakeClip: CapturedClipIntakeClip,
    label: CapturedClipLabel,
    reviewStatus: BenchmarkClip['quality']['reviewStatus'],
): BenchmarkClip => {
    const expectedDiagnoses = required(label.labels.expectedDiagnoses, 'labels.expectedDiagnoses');
    const expectedTrackingTier = required(label.labels.expectedTrackingTier, 'labels.expectedTrackingTier');

    return {
        clipId: label.clipId,
        media: {
            videoPath: intakeClip.media.videoPath,
            frameLabelsPath: required(label.frameLabelsPath, 'frameLabelsPath'),
            previewImagePath: intakeClip.media.centerPreviewPath,
            sha256: intakeClip.media.sha256,
        },
        sprayWindow: {
            startSeconds: required(label.sprayWindow.startSeconds, 'sprayWindow.startSeconds'),
            endSeconds: required(label.sprayWindow.endSeconds, 'sprayWindow.endSeconds'),
        },
        capture: {
            patchVersion: required(label.capture.patchVersion, 'capture.patchVersion'),
            weaponId: required(label.capture.weaponId, 'capture.weaponId'),
            distanceMeters: required(label.capture.distanceMeters, 'capture.distanceMeters'),
            stance: required(label.capture.stance, 'capture.stance'),
            optic: {
                opticId: required(label.capture.optic.opticId, 'capture.optic.opticId'),
                stateId: required(label.capture.optic.stateId, 'capture.optic.stateId'),
            },
            attachments: {
                muzzle: required(label.capture.attachments.muzzle, 'capture.attachments.muzzle'),
                grip: required(label.capture.attachments.grip, 'capture.attachments.grip'),
                stock: required(label.capture.attachments.stock, 'capture.attachments.stock'),
            },
        },
        labels: {
            expectedDiagnoses,
            ...(label.labels.expectedCoachMode !== null && label.labels.expectedCoachMode !== undefined
                ? { expectedCoachMode: label.labels.expectedCoachMode }
                : {}),
            expectedTrackingTier,
        },
        quality: {
            sourceType: 'captured',
            reviewStatus,
            occlusionLevel: intakeClip.quality.occlusionLevel,
            compressionLevel: intakeClip.quality.compressionLevel,
            visibilityTier: toVisibilityTier(intakeClip),
            notes: intakeClip.quality.rationale,
        },
    };
};

const resolveReviewStatus = (
    clipId: string,
    reviewDecisionSet?: CapturedBenchmarkReviewDecisionSet,
): BenchmarkClip['quality']['reviewStatus'] => {
    const decision = reviewDecisionSet?.decisions.find((item) => item.clipId === clipId);

    if (!decision || decision.approvalStatus !== 'approved') {
        return 'reviewed';
    }

    return decision.approvedReviewStatus ?? 'reviewed';
};

export const buildCapturedBenchmarkPromotion = (
    input: CapturedBenchmarkPromotionInput,
): CapturedBenchmarkPromotionReport => {
    const intakeByClipId = new Map(input.intakeManifest.clips.map((clip) => [clip.clipId, clip]));
    const blockedClips: CapturedBenchmarkPromotionBlocker[] = [];
    const benchmarkClips: BenchmarkClip[] = [];

    for (const label of input.labelSet.clips) {
        const intakeClip = intakeByClipId.get(label.clipId);
        if (!intakeClip) {
            blockedClips.push({
                clipId: label.clipId,
                reason: 'missing-intake',
                missingFieldPaths: ['intake.clipId'],
            });
            continue;
        }

        const summary = summarizeCapturedClipLabel(label);
        if (!summary.readyForGoldenLabels) {
            blockedClips.push({
                clipId: label.clipId,
                reason: 'missing-labels',
                missingFieldPaths: summary.missingFieldPaths,
            });
            continue;
        }

        benchmarkClips.push(toBenchmarkClip(
            intakeClip,
            label,
            resolveReviewStatus(label.clipId, input.reviewDecisionSet),
        ));
    }

    if (blockedClips.length > 0 || benchmarkClips.length === 0) {
        return {
            totalClipCount: input.labelSet.clips.length,
            promotedClipCount: 0,
            goldenClipCount: 0,
            blockedClips,
        };
    }

    return {
        totalClipCount: input.labelSet.clips.length,
        promotedClipCount: benchmarkClips.length,
        goldenClipCount: benchmarkClips.filter((clip) => clip.quality.reviewStatus === 'golden').length,
        blockedClips,
        dataset: parseBenchmarkDataset({
            schemaVersion: 1,
            datasetId: input.datasetId,
            createdAt: input.createdAt,
            clips: benchmarkClips,
        }),
    };
};
