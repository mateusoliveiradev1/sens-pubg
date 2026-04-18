import type {
    ProfileType,
    RecommendationEvidenceTier,
    SensitivityHistoryConvergence,
    SensitivityRecommendation,
    SensitivityRecommendationTier,
} from '@/types/engine';

export interface HistoricalSensitivitySignal {
    readonly sessionId: string;
    readonly createdAt: Date;
    readonly recommendedProfile: ProfileType;
    readonly tier: SensitivityRecommendationTier;
    readonly evidenceTier: RecommendationEvidenceTier;
    readonly confidenceScore: number;
}

const PROFILE_LABELS: Record<ProfileType, string> = {
    low: 'controle',
    balanced: 'balanceado',
    high: 'velocidade',
};

const EVIDENCE_WEIGHTS: Record<RecommendationEvidenceTier, number> = {
    weak: 0.35,
    moderate: 0.72,
    strong: 1,
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function formatProfileLabel(profile: ProfileType): string {
    return PROFILE_LABELS[profile] ?? profile;
}

function isEligibleHistorySignal(signal: HistoricalSensitivitySignal): boolean {
    return signal.tier !== 'capture_again'
        && signal.evidenceTier !== 'weak'
        && signal.confidenceScore >= 0.58;
}

function getSignalWeight(signal: HistoricalSensitivitySignal, index: number): number {
    const baseWeight = EVIDENCE_WEIGHTS[signal.evidenceTier];
    const tierWeight = signal.tier === 'apply_ready' ? 1.08 : 1;
    const recencyWeight = Math.max(0.72, 1 - (index * 0.08));
    const confidenceWeight = clamp(signal.confidenceScore, 0.5, 1);

    return baseWeight * tierWeight * recencyWeight * confidenceWeight;
}

function buildHistoryConvergenceSummary(
    convergence: Omit<SensitivityHistoryConvergence, 'summary'>,
): string {
    if (convergence.consideredSessions < 2) {
        return `Historico local encontrado, mas ainda curto para travar a sens com seguranca (${convergence.matchingSessions} sessao${convergence.matchingSessions === 1 ? '' : 'es'} parecida${convergence.matchingSessions === 1 ? '' : 's'}).`;
    }

    const supportPercent = Math.round(convergence.supportRatio * 100);
    const profileLabel = formatProfileLabel(convergence.consensusProfile);

    if (convergence.agreement === 'aligned') {
        return `Historico local alinhado: ${supportPercent}% das ${convergence.consideredSessions} sessoes compativeis reforcam o perfil ${profileLabel}.`;
    }

    if (convergence.agreement === 'conflicting') {
        return `Historico local em conflito: ${supportPercent}% das ${convergence.consideredSessions} sessoes compativeis apontam para ${profileLabel}, entao a leitura atual fica mais conservadora.`;
    }

    return `Historico local ainda misto: ${supportPercent}% das ${convergence.consideredSessions} sessoes compativeis puxam para ${profileLabel}.`;
}

export function applySensitivityHistoryConvergence(
    recommendation: SensitivityRecommendation,
    historySignals: readonly HistoricalSensitivitySignal[],
): SensitivityRecommendation {
    if (historySignals.length === 0) {
        return recommendation;
    }

    const sortedSignals = [...historySignals].sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
    const eligibleSignals = sortedSignals.filter(isEligibleHistorySignal);

    const fallbackConsensusProfile = eligibleSignals[0]?.recommendedProfile
        ?? sortedSignals[0]?.recommendedProfile
        ?? recommendation.recommended;
    const emptyConvergence: Omit<SensitivityHistoryConvergence, 'summary'> = {
        matchingSessions: sortedSignals.length,
        consideredSessions: eligibleSignals.length,
        consensusProfile: fallbackConsensusProfile,
        supportRatio: eligibleSignals.length > 0 ? 1 : 0,
        agreement: eligibleSignals.length > 0 && fallbackConsensusProfile === recommendation.recommended
            ? 'aligned'
            : 'mixed',
    };

    if (eligibleSignals.length < 2) {
        return {
            ...recommendation,
            historyConvergence: {
                ...emptyConvergence,
                summary: buildHistoryConvergenceSummary(emptyConvergence),
            },
            reasoning: `${recommendation.reasoning} | historyAgreement=${emptyConvergence.agreement} historySupport=${emptyConvergence.supportRatio.toFixed(3)} historySessions=${emptyConvergence.consideredSessions}`,
        };
    }

    const profileWeights: Record<ProfileType, number> = {
        low: 0,
        balanced: 0,
        high: 0,
    };

    eligibleSignals.forEach((signal, index) => {
        profileWeights[signal.recommendedProfile] += getSignalWeight(signal, index);
    });

    const orderedProfiles = (Object.entries(profileWeights) as [ProfileType, number][])
        .sort((left, right) => right[1] - left[1]);
    const consensusProfile = orderedProfiles[0]?.[0] ?? recommendation.recommended;
    const consensusWeight = orderedProfiles[0]?.[1] ?? 0;
    const totalWeight = orderedProfiles.reduce((sum, [, weight]) => sum + weight, 0);
    const supportRatio = totalWeight > 0 ? consensusWeight / totalWeight : 0;
    const currentAligned = consensusProfile === recommendation.recommended;
    const agreement = supportRatio >= 0.72
        ? currentAligned
            ? 'aligned'
            : 'conflicting'
        : 'mixed';

    const convergenceBase: Omit<SensitivityHistoryConvergence, 'summary'> = {
        matchingSessions: sortedSignals.length,
        consideredSessions: eligibleSignals.length,
        consensusProfile,
        supportRatio: Number(supportRatio.toFixed(3)),
        agreement,
    };

    if (recommendation.tier === 'capture_again') {
        return {
            ...recommendation,
            historyConvergence: {
                ...convergenceBase,
                summary: buildHistoryConvergenceSummary(convergenceBase),
            },
            reasoning: `${recommendation.reasoning} | historyAgreement=${agreement} historySupport=${supportRatio.toFixed(3)} historySessions=${eligibleSignals.length}`,
        };
    }

    let confidenceScore = recommendation.confidenceScore;
    let evidenceTier = recommendation.evidenceTier;
    let tier = recommendation.tier;

    if (agreement === 'aligned' && supportRatio >= 0.66) {
        const boost = Math.min(
            0.16,
            0.03 + ((supportRatio - 0.66) * 0.35) + (Math.min(eligibleSignals.length, 5) - 2) * 0.015,
        );
        confidenceScore = clamp(confidenceScore + boost, 0.35, 0.97);

        if (confidenceScore >= 0.8 && eligibleSignals.length >= 3) {
            evidenceTier = 'strong';
        } else if (confidenceScore >= 0.66 && evidenceTier === 'weak') {
            evidenceTier = 'moderate';
        }

        if (eligibleSignals.length >= 3 && supportRatio >= 0.72 && confidenceScore >= 0.78) {
            tier = 'apply_ready';
        }
    } else if (agreement === 'conflicting') {
        const penalty = Math.min(0.18, 0.06 + ((supportRatio - 0.72) * 0.4));
        confidenceScore = clamp(confidenceScore - penalty, 0.35, 0.97);

        if (evidenceTier === 'strong') {
            evidenceTier = confidenceScore >= 0.72 ? 'moderate' : 'weak';
        } else if (confidenceScore < 0.58) {
            evidenceTier = 'weak';
        }

        if (tier === 'apply_ready') {
            tier = 'test_profiles';
        }
    }

    return {
        ...recommendation,
        tier,
        evidenceTier,
        confidenceScore: Number(confidenceScore.toFixed(3)),
        historyConvergence: {
            ...convergenceBase,
            summary: buildHistoryConvergenceSummary(convergenceBase),
        },
        reasoning: `${recommendation.reasoning} | historyAgreement=${agreement} historySupport=${supportRatio.toFixed(3)} historySessions=${eligibleSignals.length}`,
    };
}
