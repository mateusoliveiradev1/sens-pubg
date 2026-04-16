import type { CapturedBenchmarkPlan } from './captured-benchmark-plan';
import type { CapturedClipIntakeManifest } from '@/types/captured-clip-intake';
import type { CapturedClipLabelSet } from '@/types/captured-clip-labels';
import type { CapturedBenchmarkReviewDecisionSet } from '@/types/captured-benchmark-review-decisions';

type CapturedBenchmarkReviewDecision = CapturedBenchmarkReviewDecisionSet['decisions'][number];

export interface BuildCapturedReviewDecisionTemplateOptions {
    readonly decisionSetId: string;
    readonly createdAt: string;
    readonly intakeManifest: CapturedClipIntakeManifest;
    readonly labelSet: CapturedClipLabelSet;
    readonly plan: CapturedBenchmarkPlan;
    readonly existingDecisionSet?: CapturedBenchmarkReviewDecisionSet;
}

const SPECIALIST_REVIEW_NOTES =
    'Aprovacao pendente deve registrar approvedBy/approvedAt e approvedReviewProvenance=`specialist-reviewed` quando a revisao especialista concluir.';
const PROMOTION_NOTES =
    'Preencher approvedBy/approvedAt, approvedReviewStatus e approvedReviewProvenance somente depois da revisao humana final do clip.';

type CapturedBenchmarkReviewDecisionKind = 'promotion' | 'specialist-review';

const getDecisionKind = (
    decision: Pick<CapturedBenchmarkReviewDecision, 'approvalStatus' | 'rationale' | 'notes' | 'approvedReviewProvenance'>,
): CapturedBenchmarkReviewDecisionKind => {
    if (decision.approvedReviewProvenance === 'specialist-reviewed') {
        return 'specialist-review';
    }

    if (decision.approvalStatus === 'approved' && decision.approvedReviewProvenance) {
        return 'promotion';
    }

    if (decision.rationale.startsWith('Validacao especialista proposta automaticamente:')) {
        return 'specialist-review';
    }

    if (decision.notes?.includes('approvedReviewProvenance=`specialist-reviewed`')) {
        return 'specialist-review';
    }

    return 'promotion';
};

const getDecisionKey = (
    decision: Pick<CapturedBenchmarkReviewDecision, 'clipId' | 'approvalStatus' | 'rationale' | 'notes' | 'approvedReviewProvenance'>,
): string => `${decision.clipId}:${getDecisionKind(decision)}`;

const buildPendingDecisionSet = (
    options: BuildCapturedReviewDecisionTemplateOptions,
): CapturedBenchmarkReviewDecision[] => {
    const decisions: CapturedBenchmarkReviewDecision[] = [];

    for (const promotion of options.plan.promotionActions) {
        decisions.push({
            clipId: promotion.clipId,
            proposedReviewStatus: promotion.targetReviewStatus,
            approvalStatus: 'pending' as const,
            approvedReviewStatus: null,
            approvedReviewProvenance: null,
            approvedBy: null,
            approvedAt: null,
            rationale: `Promocao proposta automaticamente: ${promotion.reason}.`,
            notes: PROMOTION_NOTES,
        });
    }

    for (const reviewAction of options.plan.specialistReviewActions) {
        decisions.push({
            clipId: reviewAction.clipId,
            proposedReviewStatus: reviewAction.targetReviewStatus,
            approvalStatus: 'pending' as const,
            approvedReviewStatus: null,
            approvedReviewProvenance: null,
            approvedBy: null,
            approvedAt: null,
            rationale: `Validacao especialista proposta automaticamente: ${reviewAction.reason}.`,
            notes: SPECIALIST_REVIEW_NOTES,
        });
    }

    return decisions;
};

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
    const pendingDecisions = buildPendingDecisionSet(options);
    const pendingDecisionsByKey = new Map(
        pendingDecisions.map((decision) => [getDecisionKey(decision), decision]),
    );
    const existingDecisions = (options.existingDecisionSet?.decisions ?? [])
        .filter((decision) => validClipIds.has(decision.clipId));
    const existingDecisionsByKey = new Map(
        existingDecisions.map((decision) => [getDecisionKey(decision), decision]),
    );
    const decisionKeys: string[] = [];

    for (const decision of existingDecisions) {
        const decisionKey = getDecisionKey(decision);
        if (decision.approvalStatus === 'approved' && !decisionKeys.includes(decisionKey)) {
            decisionKeys.push(decisionKey);
        }
    }

    for (const decision of pendingDecisions) {
        const decisionKey = getDecisionKey(decision);
        if (!decisionKeys.includes(decisionKey)) {
            decisionKeys.push(decisionKey);
        }
    }

    return {
        schemaVersion: 1,
        decisionSetId: options.decisionSetId,
        intakeManifestId: options.intakeManifest.manifestId,
        labelSetId: options.labelSet.labelSetId,
        createdAt: options.createdAt,
        decisions: decisionKeys.map((decisionKey) => {
            const pendingDecision = pendingDecisionsByKey.get(decisionKey);
            const existingDecision = existingDecisionsByKey.get(decisionKey);

            if (pendingDecision && existingDecision) {
                if (existingDecision.approvalStatus === 'approved') {
                    return existingDecision;
                }

                return {
                    ...pendingDecision,
                    ...(existingDecision.notes ? { notes: existingDecision.notes } : {}),
                };
            }

            if (pendingDecision) {
                return pendingDecision;
            }

            if (existingDecision && existingDecision.approvalStatus === 'approved') {
                return existingDecision;
            }

            throw new Error(`Nao foi possivel reconciliar a decisao de review para ${decisionKey}`);
        }),
    };
}
