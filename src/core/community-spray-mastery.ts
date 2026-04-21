import type { CommunityProgressionEventType } from '@/types/community';

import {
    formatCommunityCount,
    formatCommunityDiagnosisLabel,
    formatCommunityPatchLabel,
    formatCommunityWeaponLabel,
} from './community-public-formatting';

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 21;

type CommunitySprayMasteryStage = 'seed' | 'repeatable' | 'consistent' | 'refining';
type ActiveCommunitySprayMasteryStage = Exclude<CommunitySprayMasteryStage, 'seed'>;
type CoachFocusArea =
    | 'capture_quality'
    | 'vertical_control'
    | 'horizontal_control'
    | 'timing'
    | 'consistency'
    | 'sensitivity'
    | 'loadout'
    | 'validation';

export interface CommunitySprayMasterySourceAnalysis {
    readonly id: string;
    readonly weaponId: string;
    readonly patchVersion: string;
    readonly sprayScore?: number | null;
    readonly stabilityScore?: number | null;
    readonly diagnoses?: readonly string[] | null;
    readonly fullResult?: Record<string, unknown> | null;
    readonly createdAt: Date;
}

export interface CommunitySprayMasterySourceEvent {
    readonly actorUserId: string;
    readonly beneficiaryUserId: string | null;
    readonly eventType: CommunityProgressionEventType;
    readonly effectiveXp: number;
}

export interface CommunitySprayMasteryJourneyFact {
    readonly label: string;
    readonly value: string;
}

export interface CommunitySprayMasteryJourneyAction {
    readonly eventType: CommunityProgressionEventType;
    readonly title: string;
    readonly description: string;
}

export interface CommunitySprayMasteryJourneySupport {
    readonly title: string;
    readonly description: string;
}

export interface CommunitySprayMasteryJourneySummary {
    readonly state: 'zero_state' | 'active';
    readonly stageLabel: string;
    readonly title: string;
    readonly summary: string;
    readonly facts: readonly CommunitySprayMasteryJourneyFact[];
    readonly nextMilestone: {
        readonly title: string;
        readonly description: string;
    };
    readonly nextAction: CommunitySprayMasteryJourneyAction;
    readonly socialReinforcement: CommunitySprayMasteryJourneySupport | null;
}

export interface BuildCommunitySprayMasteryJourneyInput {
    readonly userId: string;
    readonly analyses: readonly CommunitySprayMasterySourceAnalysis[];
    readonly events?: readonly CommunitySprayMasterySourceEvent[];
    readonly now?: Date;
}

interface FocusWeaponSnapshot {
    readonly weaponId: string;
    readonly weaponLabel: string;
    readonly patchLabel: string | null;
    readonly analyses: readonly CommunitySprayMasterySourceAnalysis[];
    readonly recentAnalyses: readonly CommunitySprayMasterySourceAnalysis[];
    readonly recentAverageScore: number | null;
    readonly dominantDiagnosisLabel: string | null;
    readonly dominantFocusLabel: string | null;
}

interface SocialSummary {
    readonly publishCount: number;
    readonly commentCount: number;
    readonly copyCount: number;
    readonly saveCount: number;
}

export function buildCommunitySprayMasteryJourney(
    input: BuildCommunitySprayMasteryJourneyInput,
): CommunitySprayMasteryJourneySummary {
    const now = cloneDate(input.now ?? new Date());
    const analyses = input.analyses
        .filter((analysis) => analysis.createdAt.getTime() <= now.getTime())
        .slice()
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    const socialSummary = summarizeSocialSignals(input.userId, input.events ?? []);
    const focus = selectFocusWeaponSnapshot(analyses, now);

    if (!focus || focus.analyses.length < 2) {
        return buildSeedJourney({
            latestAnalysis: analyses[0] ?? null,
            focus,
        });
    }

    const stage = resolveStage(focus);
    const socialReinforcement = buildSocialReinforcement(socialSummary);
    const gapLabel = focus.dominantDiagnosisLabel ?? focus.dominantFocusLabel;

    return {
        state: 'active',
        stageLabel: stageLabelFor(stage),
        title: focus.weaponLabel,
        summary: buildActiveSummary({ focus, stage }),
        facts: [
            {
                label: 'Blocos no foco',
                value: String(focus.analyses.length),
            },
            {
                label: 'Score recente',
                value: focus.recentAverageScore !== null
                    ? `${focus.recentAverageScore}/100`
                    : 'Sem score firme',
            },
            {
                label: gapLabel ? 'Gap dominante' : 'Patch atual',
                value: gapLabel ?? focus.patchLabel ?? 'Mesmo recorte',
            },
        ],
        nextMilestone: buildActiveMilestone({ focus, stage }),
        nextAction: buildActiveAction({
            focus,
            stage,
            socialSummary,
        }),
        socialReinforcement,
    };
}

function buildSeedJourney(input: {
    readonly latestAnalysis: CommunitySprayMasterySourceAnalysis | null;
    readonly focus: FocusWeaponSnapshot | null;
}): CommunitySprayMasteryJourneySummary {
    const latestWeaponLabel = input.focus?.weaponLabel
        ?? (input.latestAnalysis ? formatCommunityWeaponLabel(input.latestAnalysis.weaponId) : null);
    const latestPatchLabel = input.focus?.patchLabel
        ?? (input.latestAnalysis ? formatCommunityPatchLabel(input.latestAnalysis.patchVersion) : null);
    const focusCount = input.focus?.analyses.length ?? (input.latestAnalysis ? 1 : 0);

    return {
        state: 'zero_state',
        stageLabel: 'Sem leitura firme',
        title: latestWeaponLabel
            ? `Repita ${latestWeaponLabel} antes de trocar o foco`
            : 'Abra seu primeiro bloco',
        summary: latestWeaponLabel
            ? `A ultima leitura passou por ${latestWeaponLabel}${latestPatchLabel ? ` no ${latestPatchLabel}` : ''}. Ainda falta repetir o mesmo recorte para explicar seu estagio com seguranca.`
            : 'Ainda nao ha evidencia suficiente para dizer onde seu spray esta evoluindo. Comece com o mesmo recorte antes de abrir sinais sociais.',
        facts: [
            {
                label: 'Recorte aberto',
                value: latestWeaponLabel ?? 'Ainda sem arma fixa',
            },
            {
                label: 'Blocos no foco',
                value: String(focusCount),
            },
            {
                label: 'Proxima meta',
                value: '2 blocos da mesma arma',
            },
        ],
        nextMilestone: {
            title: 'Abrir um foco explicavel',
            description: latestWeaponLabel
                ? `Use ${latestWeaponLabel}${latestPatchLabel ? ` no ${latestPatchLabel}` : ''} por mais um bloco para sair do recorte inicial.`
                : 'Grave dois blocos da mesma arma no mesmo patch para criar uma base real de comparacao.',
        },
        nextAction: {
            eventType: 'streak_participation',
            title: latestWeaponLabel ? `Voltar para ${latestWeaponLabel}` : 'Abrir analise',
            description: latestWeaponLabel
                ? `Rode mais um bloco da mesma arma para transformar esse recorte em progresso tecnico explicavel.`
                : 'Abra uma analise e segure o mesmo recorte por dois blocos antes de publicar ou correr atras de engajamento.',
        },
        socialReinforcement: null,
    };
}

function selectFocusWeaponSnapshot(
    analyses: readonly CommunitySprayMasterySourceAnalysis[],
    now: Date,
): FocusWeaponSnapshot | null {
    if (analyses.length === 0) {
        return null;
    }

    const recentThreshold = now.getTime() - RECENT_WINDOW_DAYS * DAY_MS;
    const groupedByWeapon = new Map<string, CommunitySprayMasterySourceAnalysis[]>();

    for (const analysis of analyses) {
        const normalizedWeaponId = analysis.weaponId.trim();

        if (!normalizedWeaponId) {
            continue;
        }

        groupedByWeapon.set(normalizedWeaponId, [
            ...(groupedByWeapon.get(normalizedWeaponId) ?? []),
            analysis,
        ]);
    }

    const selectedGroup = [...groupedByWeapon.entries()]
        .map(([weaponId, weaponAnalyses]) => ({
            weaponId,
            analyses: weaponAnalyses.slice().sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()),
            recentCount: weaponAnalyses.filter((analysis) => analysis.createdAt.getTime() >= recentThreshold).length,
        }))
        .sort((left, right) => {
            if (right.recentCount !== left.recentCount) {
                return right.recentCount - left.recentCount;
            }

            if (right.analyses.length !== left.analyses.length) {
                return right.analyses.length - left.analyses.length;
            }

            return (right.analyses[0]?.createdAt.getTime() ?? 0)
                - (left.analyses[0]?.createdAt.getTime() ?? 0);
        })[0];

    if (!selectedGroup) {
        return null;
    }

    const recentAnalyses = selectedGroup.analyses.filter((analysis) =>
        analysis.createdAt.getTime() >= recentThreshold,
    );
    const analysesForScore = recentAnalyses.length > 0 ? recentAnalyses : selectedGroup.analyses;
    const patchLabel = selectedGroup.analyses[0]?.patchVersion
        ? formatCommunityPatchLabel(selectedGroup.analyses[0].patchVersion)
        : null;

    return {
        weaponId: selectedGroup.weaponId,
        weaponLabel: formatCommunityWeaponLabel(selectedGroup.weaponId),
        patchLabel,
        analyses: selectedGroup.analyses,
        recentAnalyses,
        recentAverageScore: calculateAverageScore(analysesForScore),
        dominantDiagnosisLabel: resolveDominantDiagnosisLabel(selectedGroup.analyses),
        dominantFocusLabel: resolveDominantFocusLabel(selectedGroup.analyses),
    };
}

function resolveStage(focus: FocusWeaponSnapshot): ActiveCommunitySprayMasteryStage {
    const averageScore = focus.recentAverageScore ?? 0;

    if (focus.analyses.length >= 6 && averageScore >= 80) {
        return 'refining';
    }

    if (focus.analyses.length >= 4 && averageScore >= 68) {
        return 'consistent';
    }

    return 'repeatable';
}

function buildActiveSummary(input: {
    readonly focus: FocusWeaponSnapshot;
    readonly stage: ActiveCommunitySprayMasteryStage;
}): string {
    const focusCountLabel = formatCommunityCount(
        input.focus.analyses.length,
        'analise',
        'analises',
    );
    const patchSuffix = input.focus.patchLabel ? ` no ${input.focus.patchLabel}` : '';
    const gapLabel = input.focus.dominantDiagnosisLabel ?? input.focus.dominantFocusLabel;

    switch (input.stage) {
        case 'repeatable':
            return `${focusCountLabel} ja apontam ${input.focus.weaponLabel}${patchSuffix} como seu foco principal. O proximo passo e repetir o mesmo ajuste antes de trocar de arma ou correr atras de resposta social.`;

        case 'consistent':
            return `${focusCountLabel} ja sustentam uma leitura clara de progresso em ${input.focus.weaponLabel}${patchSuffix}. ${gapLabel ? `O ponto que mais volta agora e ${gapLabel}.` : 'O foco atual ja esta estavel o bastante para comparar blocos com calma.'}`;

        case 'refining':
            return `${focusCountLabel} deixam ${input.focus.weaponLabel}${patchSuffix} num momento de refino real. ${gapLabel ? `O detalhe que ainda merece revisao e ${gapLabel}.` : 'A base atual ja permite trabalhar detalhe fino sem perder continuidade.'}`;

    }
}

function buildActiveMilestone(input: {
    readonly focus: FocusWeaponSnapshot;
    readonly stage: ActiveCommunitySprayMasteryStage;
}): {
    readonly title: string;
    readonly description: string;
} {
    const gapLabel = input.focus.dominantDiagnosisLabel ?? input.focus.dominantFocusLabel;

    switch (input.stage) {
        case 'repeatable':
            return {
                title: 'Fechar mais 2 blocos no mesmo recorte',
                description: `Mantenha ${input.focus.weaponLabel}${input.focus.patchLabel ? ` no ${input.focus.patchLabel}` : ''} por mais duas leituras para sair do recorte inicial com seguranca.`,
            };

        case 'consistent':
            return {
                title: 'Segurar o ajuste antes de ampliar o social',
                description: gapLabel
                    ? `Use as proximas revisoes para ver se ${gapLabel.toLowerCase()} continua aparecendo ou finalmente perde peso.`
                    : `Confirme mais duas revisoes de ${input.focus.weaponLabel} antes de mudar o foco tecnico.`,
            };

        case 'refining':
            return {
                title: 'Levar o foco para um detalhe claro',
                description: gapLabel
                    ? `A proxima boa sessao deve mostrar se ${gapLabel.toLowerCase()} virou detalhe fino em vez de limite recorrente.`
                    : `A proxima sessao precisa confirmar que o mesmo recorte continua claro antes de expandir a leitura.`,
            };

    }
}

function buildActiveAction(input: {
    readonly focus: FocusWeaponSnapshot;
    readonly stage: ActiveCommunitySprayMasteryStage;
    readonly socialSummary: SocialSummary;
}): CommunitySprayMasteryJourneyAction {
    const gapLabel = input.focus.dominantDiagnosisLabel ?? input.focus.dominantFocusLabel;

    if (input.stage === 'refining' && input.socialSummary.publishCount === 0) {
        return {
            eventType: 'publish_post',
            title: 'Publicar essa leitura',
            description: `Seu foco em ${input.focus.weaponLabel} ja tem evidencia suficiente para virar um post curto e util sem depender de hype.`,
        };
    }

    return {
        eventType: 'streak_participation',
        title: `Voltar para ${input.focus.weaponLabel}`,
        description: gapLabel
            ? `Rode mais um bloco tratando ${gapLabel.toLowerCase()} para confirmar se o ajuste segura no mesmo recorte.`
            : `Rode mais um bloco da mesma arma para manter continuidade e validar o foco atual com calma.`,
    };
}

function buildSocialReinforcement(
    socialSummary: SocialSummary,
): CommunitySprayMasteryJourneySupport | null {
    if (socialSummary.copyCount > 0 || socialSummary.saveCount > 0) {
        return {
            title: 'Comunidade respondeu',
            description: buildSocialCountSentence({
                copyCount: socialSummary.copyCount,
                saveCount: socialSummary.saveCount,
            }),
        };
    }

    if (socialSummary.publishCount > 0) {
        return {
            title: 'Treino que virou leitura publica',
            description: `${formatCommunityCount(socialSummary.publishCount, 'post publico', 'posts publicos')} ja prolongam esse foco sem trocar o centro da jornada.`,
        };
    }

    if (socialSummary.commentCount > 0) {
        return {
            title: 'Contexto tecnico publicado',
            description: `${formatCommunityCount(socialSummary.commentCount, 'comentario contextual', 'comentarios contextuais')} ja reforcam o que voce esta trabalhando no spray.`,
        };
    }

    return null;
}

function buildSocialCountSentence(input: {
    readonly copyCount: number;
    readonly saveCount: number;
}): string {
    const parts: string[] = [];

    if (input.copyCount > 0) {
        parts.push(formatCommunityCount(input.copyCount, 'copia', 'copias'));
    }

    if (input.saveCount > 0) {
        parts.push(formatCommunityCount(input.saveCount, 'save', 'saves'));
    }

    return `${parts.join(' e ')} mostram que a comunidade ja esta respondendo a esse treino, mas o progresso principal continua vindo da proxima analise.`;
}

function summarizeSocialSignals(
    userId: string,
    events: readonly CommunitySprayMasterySourceEvent[],
): SocialSummary {
    return events.reduce<SocialSummary>((summary, event) => {
        if (event.effectiveXp <= 0) {
            return summary;
        }

        if (event.actorUserId === userId) {
            if (event.eventType === 'publish_post') {
                return {
                    ...summary,
                    publishCount: summary.publishCount + 1,
                };
            }

            if (event.eventType === 'comment_with_context') {
                return {
                    ...summary,
                    commentCount: summary.commentCount + 1,
                };
            }
        }

        if (event.beneficiaryUserId === userId) {
            if (event.eventType === 'receive_unique_copy') {
                return {
                    ...summary,
                    copyCount: summary.copyCount + 1,
                };
            }

            if (event.eventType === 'receive_unique_save') {
                return {
                    ...summary,
                    saveCount: summary.saveCount + 1,
                };
            }
        }

        return summary;
    }, {
        publishCount: 0,
        commentCount: 0,
        copyCount: 0,
        saveCount: 0,
    });
}

function calculateAverageScore(
    analyses: readonly CommunitySprayMasterySourceAnalysis[],
): number | null {
    const scores = analyses
        .map(resolveAnalysisScore)
        .filter((score): score is number => score !== null);

    if (scores.length === 0) {
        return null;
    }

    return Math.round(
        scores.reduce((sum, score) => sum + score, 0) / scores.length,
    );
}

function resolveAnalysisScore(
    analysis: CommunitySprayMasterySourceAnalysis,
): number | null {
    const sprayScore = normalizePositiveNumber(analysis.sprayScore);

    if (sprayScore !== null) {
        return sprayScore;
    }

    return normalizePositiveNumber(analysis.stabilityScore);
}

function resolveDominantDiagnosisLabel(
    analyses: readonly CommunitySprayMasterySourceAnalysis[],
): string | null {
    const counts = new Map<string, number>();

    for (const analysis of analyses) {
        for (const diagnosisKey of analysis.diagnoses ?? []) {
            const normalizedDiagnosisKey = diagnosisKey.trim();

            if (!normalizedDiagnosisKey || normalizedDiagnosisKey === 'inconclusive') {
                continue;
            }

            counts.set(normalizedDiagnosisKey, (counts.get(normalizedDiagnosisKey) ?? 0) + 1);
        }
    }

    const dominantDiagnosis = [...counts.entries()]
        .sort((left, right) => {
            if (right[1] !== left[1]) {
                return right[1] - left[1];
            }

            return left[0].localeCompare(right[0], 'pt-BR');
        })[0]?.[0];

    return dominantDiagnosis ? formatCommunityDiagnosisLabel(dominantDiagnosis) : null;
}

function resolveDominantFocusLabel(
    analyses: readonly CommunitySprayMasterySourceAnalysis[],
): string | null {
    const counts = new Map<CoachFocusArea, number>();

    for (const analysis of analyses) {
        const area = readPrimaryFocusArea(analysis.fullResult ?? null);

        if (!area) {
            continue;
        }

        counts.set(area, (counts.get(area) ?? 0) + 1);
    }

    const dominantArea = [...counts.entries()]
        .sort((left, right) => {
            if (right[1] !== left[1]) {
                return right[1] - left[1];
            }

            return left[0].localeCompare(right[0], 'pt-BR');
        })[0]?.[0];

    return dominantArea ? formatCoachFocusLabel(dominantArea) : null;
}

function readPrimaryFocusArea(
    fullResult: Record<string, unknown> | null,
): CoachFocusArea | null {
    const coachPlan = readObject(fullResult, 'coachPlan');
    const primaryFocus = readObject(coachPlan, 'primaryFocus');
    const area = readString(primaryFocus, 'area');

    return isCoachFocusArea(area) ? area : null;
}

function formatCoachFocusLabel(area: CoachFocusArea): string {
    switch (area) {
        case 'capture_quality':
            return 'Qualidade de captura';

        case 'vertical_control':
            return 'Controle vertical';

        case 'horizontal_control':
            return 'Controle horizontal';

        case 'timing':
            return 'Timing';

        case 'consistency':
            return 'Consistencia';

        case 'sensitivity':
            return 'Sensibilidade';

        case 'loadout':
            return 'Loadout';

        case 'validation':
            return 'Validacao';
    }
}

function stageLabelFor(stage: CommunitySprayMasteryStage): string {
    switch (stage) {
        case 'seed':
            return 'Sem leitura firme';

        case 'repeatable':
            return 'Foco repetido';

        case 'consistent':
            return 'Controle consistente';

        case 'refining':
            return 'Refino ativo';
    }
}

function isCoachFocusArea(value: string | null): value is CoachFocusArea {
    return value === 'capture_quality'
        || value === 'vertical_control'
        || value === 'horizontal_control'
        || value === 'timing'
        || value === 'consistency'
        || value === 'sensitivity'
        || value === 'loadout'
        || value === 'validation';
}

function readObject(
    source: Record<string, unknown> | null,
    key: string,
): Record<string, unknown> | null {
    if (!source) {
        return null;
    }

    const value = source[key];
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function readString(
    source: Record<string, unknown> | null,
    key: string,
): string | null {
    if (!source) {
        return null;
    }

    const value = source[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizePositiveNumber(
    value: number | null | undefined,
): number | null {
    if (!Number.isFinite(value ?? null)) {
        return null;
    }

    const normalizedValue = Math.round(Number(value));
    return normalizedValue > 0 ? normalizedValue : null;
}

function cloneDate(date: Date): Date {
    return new Date(date.getTime());
}
