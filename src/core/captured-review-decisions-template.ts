import type { CapturedBenchmarkPlan } from './captured-benchmark-plan';
import type { CapturedClipIntakeManifest } from '@/types/captured-clip-intake';
import type { CapturedClipLabelSet } from '@/types/captured-clip-labels';
import type { CapturedBenchmarkReviewDecisionSet } from '@/types/captured-benchmark-review-decisions';

export interface BuildCapturedReviewDecisionTemplateOptions {
    readonly decisionSetId: string;
    readonly createdAt: string;
    readonly intakeManifest: CapturedClipIntakeManifest;
    readonly labelSet: CapturedClipLabelSet;
    readonly plan: CapturedBenchmarkPlan;
    readonly existingDecisionSet?: CapturedBenchmarkReviewDecisionSet;
}

const buildPendingDecisionSet = (
    options: BuildCapturedReviewDecisionTemplateOptions,
): Map<string, CapturedBenchmarkReviewDecisionSet['decisions'][number]> =>
    new Map(options.plan.promotionActions.map((promotion) => [
        promotion.clipId,
        {
            clipId: promotion.clipId,
            proposedReviewStatus: promotion.targetReviewStatus,
            approvalStatus: 'pending' as const,
            approvedReviewStatus: null,
            approvedBy: null,
            approvedAt: null,
            rationale: `Promocao proposta automaticamente: ${promotion.reason}.`,
            notes: 'Preencher approvedBy/aprovedAt e approvedReviewStatus somente depois da revisao humana final do clip.',
        },
    ]));

export function buildCapturedReviewDecisionTemplate(
    options: BuildCapturedReviewDecisionTemplateOptions,
): CapturedBenchmarkReviewDecisionSet {
    const validClipIds = new Set(options.labelSet.clips.map((clip) => clip.clipId));
    if (validClipIds.size === 0) {
        for (const promotion of options.plan.promotionActions) {
            validClipIds.add(promotion.clipId);
        }

        for (const decision of options.existingDecisionSet?.decisions ?? []) {
            validClipIds.add(decision.clipId);
        }
    }
    const pendingDecisionsByClipId = buildPendingDecisionSet(options);
    const existingDecisionsByClipId = new Map(
        (options.existingDecisionSet?.decisions ?? [])
            .filter((decision) => validClipIds.has(decision.clipId))
            .map((decision) => [decision.clipId, decision]),
    );
    const clipIds = [
        ...pendingDecisionsByClipId.keys(),
        ...(options.existingDecisionSet?.decisions ?? [])
            .filter((decision) => decision.approvalStatus === 'approved' && validClipIds.has(decision.clipId))
            .map((decision) => decision.clipId)
            .filter((clipId) => !pendingDecisionsByClipId.has(clipId)),
    ];

    return {
        schemaVersion: 1,
        decisionSetId: options.decisionSetId,
        intakeManifestId: options.intakeManifest.manifestId,
        labelSetId: options.labelSet.labelSetId,
        createdAt: options.createdAt,
        decisions: clipIds.map((clipId) => {
            const pendingDecision = pendingDecisionsByClipId.get(clipId);
            const existingDecision = existingDecisionsByClipId.get(clipId);

            if (pendingDecision && existingDecision) {
                return {
                    ...pendingDecision,
                    approvalStatus: existingDecision.approvalStatus,
                    approvedReviewStatus: existingDecision.approvedReviewStatus ?? null,
                    approvedBy: existingDecision.approvedBy ?? null,
                    approvedAt: existingDecision.approvedAt ?? null,
                    ...(existingDecision.notes ? { notes: existingDecision.notes } : {}),
                };
            }

            if (pendingDecision) {
                return pendingDecision;
            }

            if (existingDecision && existingDecision.approvalStatus === 'approved') {
                return existingDecision;
            }

            throw new Error(`Nao foi possivel reconciliar a decisao de review para ${clipId}`);
        }),
    };
}
