import type {
    AnalysisDecision,
    AnalysisResult,
    CoachBlockPlan,
    CoachFeedback,
    CoachPlan,
    Diagnosis,
    PrecisionEvidenceLevel,
    PrecisionPillarDeltaStatus,
    PrecisionPillarKey,
    PrecisionTrendLabel,
    PrecisionTrendSummary,
    SensitivityRecommendation,
    SprayMastery,
    SprayMetrics,
} from '@/types/engine';
import { formatDiagnosisTruthLabel } from '@/core/measurement-truth';
import { formatPrecisionTrendLabel } from '@/core/precision-loop';
import type {
    AnalysisSaveAccessState,
    AnalysisSaveQuotaNotice,
    PremiumFeatureLock,
    PremiumProjectionSummary,
} from '@/types/monetization';

export type ResultMetricTone = 'success' | 'warning' | 'error' | 'info';

export interface ResultMetricCardModel {
    readonly label: string;
    readonly value: string;
    readonly unit: string;
    readonly tone: ResultMetricTone;
    readonly reference: string;
    readonly summary: string;
    readonly meterPercent: number;
}

export interface DiagnosisSplit {
    readonly sortedDiagnoses: readonly Diagnosis[];
    readonly majorDiagnoses: readonly Diagnosis[];
    readonly minorDiagnoses: readonly Diagnosis[];
}

export interface CoachFeedbackGroup {
    readonly key: Diagnosis['type'];
    readonly items: readonly CoachFeedback[];
    readonly maxSeverity: number;
    readonly priorityTone: ResultMetricTone;
    readonly priorityLabel: string;
}

export interface MasteryPillarCardModel {
    readonly key: keyof SprayMastery['pillars'];
    readonly label: string;
    readonly value: number;
    readonly tone: ResultMetricTone;
    readonly summary: string;
}

export interface ResultVerdictNextBlockModel {
    readonly title: string;
    readonly durationLabel: string;
    readonly steps: readonly string[];
    readonly validationLabel: string | null;
    readonly validationTarget: string | null;
    readonly validationSuccess: string | null;
}

export interface ResultVerdictModel {
    readonly actionLabel: string;
    readonly mechanicalLevelLabel: string;
    readonly actionableScore: number;
    readonly mechanicalScore: number;
    readonly primaryExplanation: string;
    readonly diagnosisLabel: string | null;
    readonly blockedReasons: readonly string[];
    readonly nextBlock: ResultVerdictNextBlockModel | null;
    readonly scoreTone: ResultMetricTone;
}

export interface EvidenceBadgeModel {
    readonly key: string;
    readonly label: string;
    readonly value: string;
    readonly tone: ResultMetricTone;
    readonly detail: string;
}

export interface PrecisionTrendDeltaModel {
    readonly key: 'actionable' | 'mechanical';
    readonly label: string;
    readonly value: string;
    readonly tone: ResultMetricTone;
    readonly detail: string;
}

export interface PrecisionTrendPillarChipModel {
    readonly key: PrecisionPillarKey;
    readonly label: string;
    readonly value: string;
    readonly tone: ResultMetricTone;
    readonly detail: string;
}

export interface PrecisionTrendBlockModel {
    readonly label: string;
    readonly tone: ResultMetricTone;
    readonly body: string;
    readonly compatibleCountLabel: string;
    readonly evidenceSummary: string;
    readonly deltaItems: readonly PrecisionTrendDeltaModel[];
    readonly pillarChips: readonly PrecisionTrendPillarChipModel[];
    readonly blockerReasons: readonly string[];
    readonly conservativeReason: string | null;
    readonly nextValidationHint: string;
    readonly ctaLabel: 'Gravar validacao compativel';
}

export interface AnalysisQuotaNoticeModel {
    readonly label: string;
    readonly body: string;
    readonly usageLabel: string;
    readonly tone: ResultMetricTone;
    readonly ctaLabel: 'Ver Pro' | 'Abrir billing' | null;
    readonly href: '/pricing' | '/billing' | null;
}

export interface PremiumLockCardModel {
    readonly featureKey: PremiumFeatureLock['featureKey'];
    readonly title: string;
    readonly body: string;
    readonly reasonLabel: string;
    readonly href: '/pricing' | '/billing' | null;
    readonly ctaLabel: 'Ver Pro' | 'Abrir billing' | null;
}

export interface CaptureGuidanceModel {
    readonly title: string;
    readonly checklist: readonly string[];
    readonly weakCaptureBody: string | null;
}

export type AdaptiveCoachLoopState =
    | 'unsaved'
    | 'pending'
    | 'validation_needed'
    | 'conflict'
    | 'ready';

export interface AdaptiveCoachLoopFocusModel {
    readonly title: string;
    readonly area: string;
    readonly whyNow: string;
    readonly confidenceLabel: string;
    readonly coverageLabel: string;
}

export interface AdaptiveCoachLoopNextBlockModel {
    readonly title: string;
    readonly durationLabel: string;
    readonly steps: readonly string[];
    readonly validationTarget: string | null;
}

export interface AdaptiveCoachLoopCtaModel {
    readonly label: 'Gravar analise para registrar resultado' | 'Registrar resultado do bloco' | 'Gravar validacao compativel';
    readonly href: string | null;
    readonly tone: ResultMetricTone;
}

export interface AdaptiveCoachLoopModel {
    readonly state: AdaptiveCoachLoopState;
    readonly statusLabel: string;
    readonly statusBody: string;
    readonly warningCopy: string | null;
    readonly tierLabel: string;
    readonly primaryFocus: AdaptiveCoachLoopFocusModel;
    readonly secondaryFocuses: readonly AdaptiveCoachLoopFocusModel[];
    readonly nextBlock: AdaptiveCoachLoopNextBlockModel;
    readonly badges: readonly EvidenceBadgeModel[];
    readonly cta: AdaptiveCoachLoopCtaModel;
}

interface BuildResultMetricCardsInput {
    readonly metrics: SprayMetrics;
    readonly sensitivity: Pick<SensitivityRecommendation, 'suggestedVSM'>;
    readonly diagnoses?: readonly Diagnosis[];
    readonly linearErrorLabel: string;
    readonly linearErrorUnit: string;
}

interface TrackingEvidenceOverview {
    readonly confidence: number;
    readonly coverage: number;
    readonly visibleFrames: number;
    readonly framesLost: number;
    readonly framesProcessed: number;
}

interface BuildResultVerdictModelInput {
    readonly mastery?: SprayMastery | undefined;
    readonly coachPlan?: CoachPlan | undefined;
    readonly trackingOverview: TrackingEvidenceOverview;
    readonly sensitivity: Pick<SensitivityRecommendation, 'tier' | 'evidenceTier' | 'confidenceScore'>;
    readonly diagnoses?: readonly Diagnosis[] | undefined;
    readonly analysisDecision?: AnalysisDecision | undefined;
}

interface BuildEvidenceBadgesInput {
    readonly mastery?: SprayMastery | undefined;
    readonly trackingOverview: TrackingEvidenceOverview;
}

function clampPercent(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(value)));
}

function toneFromSeverity(severity: number): ResultMetricTone {
    if (severity >= 4) return 'error';
    if (severity >= 3) return 'warning';
    return 'success';
}

function toneFromPercent(value: number): ResultMetricTone {
    if (value >= 80) return 'success';
    if (value >= 60) return 'warning';
    return 'error';
}

function toneFromActionLabel(actionLabel: string): ResultMetricTone {
    if (actionLabel === 'Pronto') return 'success';
    if (actionLabel === 'Testavel') return 'warning';
    if (actionLabel === 'Capturar de novo') return 'error';
    return 'info';
}

function formatCoachDecisionTierLabel(tier: CoachPlan['tier']): string {
    switch (tier) {
        case 'capture_again':
            return 'Capturar novamente';
        case 'test_protocol':
            return 'Testar protocolo';
        case 'stabilize_block':
            return 'Estabilizar bloco';
        case 'apply_protocol':
            return 'Aplicar protocolo';
    }
}

function formatCoachFocusArea(area: CoachPlan['primaryFocus']['area']): string {
    switch (area) {
        case 'capture_quality':
            return 'Qualidade da captura';
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

function formatOutcomeEvidenceState(
    state: NonNullable<AnalysisResult['coachDecisionSnapshot']>['outcomeEvidenceState'] | undefined
): string {
    switch (state) {
        case 'weak_self_report':
            return 'Relato fraco';
        case 'neutral':
            return 'Fechamento neutro';
        case 'invalid':
            return 'Captura invalida';
        case 'conflict':
            return 'Conflito ativo';
        case 'confirmed_by_compatible_clip':
            return 'Validado por clip';
        case 'none':
        case undefined:
            return 'Sem resultado ainda';
    }
}

function formatQuotaUsage(quota: AnalysisSaveQuotaNotice['quota']): string {
    return `${quota.used}/${quota.limit} saves`;
}

export function buildAnalysisQuotaNoticeModel(input: {
    readonly saveAccess?: AnalysisSaveAccessState | null;
    readonly quota?: AnalysisSaveQuotaNotice | null;
}): AnalysisQuotaNoticeModel | null {
    const quotaNotice = input.quota ?? null;

    if (quotaNotice) {
        const ctaLabel = quotaNotice.ctaHref === '/pricing'
            ? 'Ver Pro'
            : quotaNotice.ctaHref === '/billing'
                ? 'Abrir billing'
                : null;

        switch (quotaNotice.status) {
            case 'limit_reached':
                return {
                    label: 'Limite de saves atingido',
                    body: quotaNotice.message,
                    usageLabel: formatQuotaUsage(quotaNotice.quota),
                    tone: 'error',
                    ctaLabel,
                    href: quotaNotice.ctaHref,
                };
            case 'non_billable':
                return {
                    label: 'Salvo sem consumir quota',
                    body: `${quotaNotice.message} Grave outro clip com captura mais limpa para gerar uma leitura util.`,
                    usageLabel: formatQuotaUsage(quotaNotice.quota),
                    tone: 'info',
                    ctaLabel: null,
                    href: null,
                };
            case 'technical_failure':
                return {
                    label: 'Save nao consumiu quota',
                    body: quotaNotice.message,
                    usageLabel: formatQuotaUsage(quotaNotice.quota),
                    tone: 'warning',
                    ctaLabel: null,
                    href: null,
                };
            case 'warning':
                return {
                    label: 'Quota perto do limite',
                    body: quotaNotice.message,
                    usageLabel: formatQuotaUsage(quotaNotice.quota),
                    tone: 'warning',
                    ctaLabel,
                    href: quotaNotice.ctaHref,
                };
            case 'saved':
            case 'available':
                return null;
        }
    }

    const saveAccess = input.saveAccess ?? null;
    if (!saveAccess) {
        return null;
    }

    const ctaLabel = saveAccess.ctaHref === '/pricing'
        ? 'Ver Pro'
        : saveAccess.ctaHref === '/billing'
            ? 'Abrir billing'
            : null;

    if (!saveAccess.canSave) {
        return {
            label: saveAccess.blocker === 'limit_blocked'
                ? 'Salvar vai bater no limite'
                : 'Save indisponivel',
            body: saveAccess.message,
            usageLabel: formatQuotaUsage(saveAccess.quota),
            tone: 'error',
            ctaLabel,
            href: saveAccess.ctaHref,
        };
    }

    if (saveAccess.quota.state === 'warning') {
        return {
            label: 'Quota perto do limite',
            body: saveAccess.message,
            usageLabel: formatQuotaUsage(saveAccess.quota),
            tone: 'warning',
            ctaLabel,
            href: saveAccess.ctaHref,
        };
    }

    return null;
}

function formatPremiumLockReason(reason: PremiumFeatureLock['reason']): string {
    switch (reason) {
        case 'pro_feature':
            return 'Pro';
        case 'limit_reached':
            return 'Limite atingido';
        case 'payment_issue':
            return 'Pagamento pendente';
        case 'weak_evidence':
            return 'Evidencia fraca';
        case 'not_enough_history':
            return 'Historico curto';
    }
}

export function buildPremiumLockCards(
    projection: PremiumProjectionSummary | undefined,
): readonly PremiumLockCardModel[] {
    if (!projection) {
        return [];
    }

    return projection.locks
        .filter((lock) => (
            lock.featureKey === 'coach.full_plan'
            || lock.featureKey === 'history.full'
            || lock.featureKey === 'metrics.advanced'
            || lock.featureKey === 'coach.validation_loop'
            || lock.featureKey === 'trends.compatible_full'
        ))
        .slice(0, 5)
        .map((lock) => ({
            featureKey: lock.featureKey,
            title: lock.title,
            body: lock.body,
            reasonLabel: formatPremiumLockReason(lock.reason),
            href: lock.ctaHref,
            ctaLabel: lock.ctaHref === '/pricing'
                ? 'Ver Pro'
                : lock.ctaHref === '/billing'
                    ? 'Abrir billing'
                    : null,
        }));
}

export function buildCaptureGuidanceModel(result: AnalysisResult): CaptureGuidanceModel {
    const usable = result.videoQualityReport?.usableForAnalysis ?? result.mastery?.evidence.usableForAnalysis ?? true;
    const weakCaptureBody = usable
        ? null
        : 'Este clip ainda entra como evidencia auditavel, mas pode nao consumir quota util. Grave outro com a captura mais limpa antes de aplicar mudanca forte.';

    return {
        title: 'Guia de captura para uma leitura honesta',
        checklist: [
            'arma, mira, distancia, postura e attachments declarados antes do upload',
            'spray continuo, sem corte e sem flick no meio da janela',
            'crosshair visivel durante a maior parte do spray',
            'duracao minima suficiente para o recoil estabilizar',
            'mesmo contexto no proximo clip quando for validar trend compativel',
        ],
        weakCaptureBody,
    };
}

function resolveAdaptiveCoachLoopState(result: AnalysisResult): AdaptiveCoachLoopState {
    const outcomeSnapshot = result.coachOutcomeSnapshot;
    const decisionSnapshot = result.coachDecisionSnapshot;

    if ((outcomeSnapshot?.conflicts.length ?? 0) > 0 || decisionSnapshot?.outcomeEvidenceState === 'conflict') {
        return 'conflict';
    }

    if (outcomeSnapshot?.pending || outcomeSnapshot?.latest?.status === 'started' || outcomeSnapshot?.latest?.status === 'completed') {
        return 'pending';
    }

    if (outcomeSnapshot?.latest) {
        return 'validation_needed';
    }

    if (!result.historySessionId) {
        return 'unsaved';
    }

    return 'ready';
}

function buildAdaptiveCoachLoopCta(result: AnalysisResult, state: AdaptiveCoachLoopState): AdaptiveCoachLoopCtaModel {
    const historyHref = result.historySessionId ? `/history/${result.historySessionId}` : null;

    if (state === 'unsaved') {
        return {
            label: 'Gravar analise para registrar resultado',
            href: null,
            tone: 'warning',
        };
    }

    if (state === 'pending' || state === 'ready') {
        return {
            label: 'Registrar resultado do bloco',
            href: historyHref,
            tone: 'warning',
        };
    }

    return {
        label: 'Gravar validacao compativel',
        href: '/analyze',
        tone: state === 'conflict' ? 'error' : 'info',
    };
}

function buildAdaptiveCoachLoopStatus(
    result: AnalysisResult,
    state: AdaptiveCoachLoopState,
): Pick<AdaptiveCoachLoopModel, 'statusLabel' | 'statusBody' | 'warningCopy'> {
    const latestStatus = result.coachOutcomeSnapshot?.latest?.status;

    if (state === 'conflict') {
        return {
            statusLabel: 'Resultado em conflito',
            statusBody: 'O coach bloqueou acao agressiva ate existir uma validacao curta e comparavel.',
            warningCopy: result.coachOutcomeSnapshot?.conflicts[0]?.nextValidationCopy
                ?? 'Resultado em conflito. O relato foi positivo, mas a validacao compativel piorou; faca uma validacao curta antes de avancar.',
        };
    }

    if (state === 'pending') {
        return {
            statusLabel: latestStatus === 'started' ? 'Bloco em andamento' : 'Resultado pendente',
            statusBody: latestStatus === 'completed'
                ? 'Voce completou o bloco, mas ainda falta dizer o efeito. Feche o resultado antes do coach ficar mais agressivo.'
                : 'Feche o resultado do bloco para o coach usar esse feedback sem fingir certeza.',
            warningCopy: null,
        };
    }

    if (state === 'validation_needed') {
        return {
            statusLabel: 'Validacao compativel aberta',
            statusBody: 'Resultado registrado. Agora grave um clip comparavel para confirmar se o sinal aparece na leitura controlada.',
            warningCopy: null,
        };
    }

    if (state === 'unsaved') {
        return {
            statusLabel: 'Analise ainda sem memoria',
            statusBody: 'Salve a sessao para registrar resultado do bloco e alimentar a memoria do coach.',
            warningCopy: null,
        };
    }

    return {
        statusLabel: 'Loop pronto para feedback',
        statusBody: 'Execute o bloco curto, registre o resultado e depois valide com outro clip comparavel.',
        warningCopy: null,
    };
}

function buildAdaptiveCoachFocusModel(focus: CoachPlan['primaryFocus']): AdaptiveCoachLoopFocusModel {
    return {
        title: focus.title,
        area: formatCoachFocusArea(focus.area),
        whyNow: focus.whyNow,
        confidenceLabel: formatPercent(focus.confidence),
        coverageLabel: formatPercent(focus.coverage),
    };
}

export function buildAdaptiveCoachLoopModel(result: AnalysisResult): AdaptiveCoachLoopModel | null {
    const coachPlan = result.coachPlan;

    if (!coachPlan) {
        return null;
    }

    const state = resolveAdaptiveCoachLoopState(result);
    const status = buildAdaptiveCoachLoopStatus(result, state);
    const decisionSnapshot = result.coachDecisionSnapshot;
    const outcomeMemory = decisionSnapshot?.outcomeMemory;
    const conflictCount = (result.coachOutcomeSnapshot?.conflicts.length ?? 0) + (decisionSnapshot?.conflicts.length ?? 0);

    const badges: EvidenceBadgeModel[] = [
        {
            key: 'tier',
            label: 'Tier',
            value: formatCoachDecisionTierLabel(coachPlan.tier),
            tone: coachPlan.tier === 'apply_protocol' ? 'success' : coachPlan.tier === 'capture_again' ? 'error' : 'warning',
            detail: 'Nivel de acao permitido pelo contrato atual.',
        },
        {
            key: 'confidence',
            label: 'Confianca',
            value: formatPercent(coachPlan.primaryFocus.confidence),
            tone: toneFromPercent(coachPlan.primaryFocus.confidence * 100),
            detail: 'Confianca da evidencia do foco principal.',
        },
        {
            key: 'coverage',
            label: 'Cobertura',
            value: formatPercent(coachPlan.primaryFocus.coverage),
            tone: toneFromPercent(coachPlan.primaryFocus.coverage * 100),
            detail: 'Cobertura usada para sustentar o proximo bloco.',
        },
        {
            key: 'outcome',
            label: 'Resultado',
            value: formatOutcomeEvidenceState(decisionSnapshot?.outcomeEvidenceState),
            tone: decisionSnapshot?.outcomeEvidenceState === 'conflict'
                ? 'error'
                : decisionSnapshot?.outcomeEvidenceState === 'confirmed_by_compatible_clip'
                    ? 'success'
                    : 'warning',
            detail: outcomeMemory?.summary ?? 'Sem memoria de resultado suficiente ainda.',
        },
    ];

    if (conflictCount > 0) {
        badges.push({
            key: 'conflict',
            label: 'Conflito',
            value: `${conflictCount}`,
            tone: 'error',
            detail: 'Conflito bloqueia CTA agressiva e exige validacao compativel.',
        });
    }

    return {
        state,
        ...status,
        tierLabel: formatCoachDecisionTierLabel(coachPlan.tier),
        primaryFocus: buildAdaptiveCoachFocusModel(coachPlan.primaryFocus),
        secondaryFocuses: coachPlan.secondaryFocuses.slice(0, 2).map(buildAdaptiveCoachFocusModel),
        nextBlock: {
            title: coachPlan.nextBlock.title,
            durationLabel: `${coachPlan.nextBlock.durationMinutes} min`,
            steps: coachPlan.nextBlock.steps.slice(0, 3),
            validationTarget: coachPlan.nextBlock.checks[0]?.target ?? null,
        },
        badges,
        cta: buildAdaptiveCoachLoopCta(result, state),
    };
}

function isVerticalDiagnosis(diagnosis: Diagnosis): boolean {
    return diagnosis.type === 'overpull' || diagnosis.type === 'underpull';
}

function getVerticalTone(metrics: SprayMetrics, diagnoses: readonly Diagnosis[]): ResultMetricTone {
    const verticalDiagnosis = diagnoses.find(isVerticalDiagnosis);
    if (verticalDiagnosis) {
        return toneFromSeverity(verticalDiagnosis.severity);
    }

    const deviation = Math.abs(metrics.verticalControlIndex - 1);
    if (deviation >= 0.3) return 'error';
    if (deviation >= 0.15) return 'warning';
    return 'success';
}

function getVerticalSummary(value: number): string {
    if (value < 0.85) return 'Spray subindo';
    if (value > 1.15) return 'Spray descendo demais';
    return 'Na faixa';
}

function getJitterDiagnosis(diagnoses: readonly Diagnosis[]): Extract<Diagnosis, { readonly type: 'excessive_jitter' }> | null {
    const diagnosis = diagnoses.find((item) => item.type === 'excessive_jitter');
    return diagnosis?.type === 'excessive_jitter' ? diagnosis : null;
}

function getHorizontalTone(metrics: SprayMetrics, diagnoses: readonly Diagnosis[]): ResultMetricTone {
    const jitterDiagnosis = getJitterDiagnosis(diagnoses);
    if (jitterDiagnosis) {
        return toneFromSeverity(jitterDiagnosis.severity);
    }

    if (metrics.horizontalNoiseIndex > 3) return 'error';
    if (metrics.horizontalNoiseIndex > 1.5) return 'warning';
    return 'success';
}

function getLinearTone(metrics: SprayMetrics): ResultMetricTone {
    if (metrics.linearErrorSeverity > 100) return 'error';
    if (metrics.linearErrorSeverity > 75) return 'warning';
    return 'success';
}

function getResponseTone(metrics: SprayMetrics): ResultMetricTone {
    const responseMs = Number(metrics.initialRecoilResponseMs);
    if (responseMs > 240) return 'error';
    if (responseMs > 180) return 'warning';
    return 'success';
}

function getSuggestedVsmTone(suggestedVSM: number | undefined): ResultMetricTone {
    if (typeof suggestedVSM !== 'number' || suggestedVSM === 1) {
        return 'info';
    }

    return Math.abs(suggestedVSM - 1) >= 0.12 ? 'warning' : 'info';
}

export function buildResultMetricCards(input: BuildResultMetricCardsInput): readonly ResultMetricCardModel[] {
    const { metrics, sensitivity, linearErrorLabel, linearErrorUnit } = input;
    const diagnoses = input.diagnoses ?? [];
    const jitterDiagnosis = getJitterDiagnosis(diagnoses);
    const jitterLimit = jitterDiagnosis?.threshold ?? 3;
    const suggestedVSM = sensitivity.suggestedVSM;

    return [
        {
            label: 'Controle Vertical',
            value: metrics.verticalControlIndex.toFixed(2),
            unit: 'x ideal',
            tone: getVerticalTone(metrics, diagnoses),
            reference: 'Ideal 0.85-1.15',
            summary: getVerticalSummary(metrics.verticalControlIndex),
            meterPercent: clampPercent(Math.abs(metrics.verticalControlIndex - 1) * 200),
        },
        {
            label: 'Ruido Horizontal',
            value: metrics.horizontalNoiseIndex.toFixed(1),
            unit: 'deg',
            tone: getHorizontalTone(metrics, diagnoses),
            reference: `Limite ${jitterLimit.toFixed(2)} deg`,
            summary: metrics.horizontalNoiseIndex > jitterLimit ? 'Acima do limite' : 'Na faixa',
            meterPercent: clampPercent((metrics.horizontalNoiseIndex / Math.max(jitterLimit, 0.01)) * 100),
        },
        {
            label: linearErrorLabel,
            value: (metrics.linearErrorCm ?? 0).toFixed(1),
            unit: linearErrorUnit,
            tone: getLinearTone(metrics),
            reference: '100% = largura alvo',
            summary: metrics.linearErrorSeverity > 100 ? 'Erro critico' : 'Erro controlado',
            meterPercent: clampPercent(metrics.linearErrorSeverity),
        },
        {
            label: 'Tempo de Resposta',
            value: Number(metrics.initialRecoilResponseMs).toFixed(0),
            unit: 'ms',
            tone: getResponseTone(metrics),
            reference: 'Ideal <= 180ms',
            summary: Number(metrics.initialRecoilResponseMs) > 180 ? 'Reacao lenta' : 'Entrada rapida',
            meterPercent: clampPercent((Number(metrics.initialRecoilResponseMs) / 240) * 100),
        },
        {
            label: 'VSM Sugerido',
            value: suggestedVSM?.toFixed(2) ?? '1.00',
            unit: '',
            tone: getSuggestedVsmTone(suggestedVSM),
            reference: 'Baseline 1.00',
            summary: suggestedVSM && suggestedVSM !== 1 ? 'Testar ajuste' : 'Sem mudanca',
            meterPercent: clampPercent(Math.abs((suggestedVSM ?? 1) - 1) * 200),
        },
    ];
}

export function buildPrecisionTrendBlockModel(
    trend: PrecisionTrendSummary | undefined
): PrecisionTrendBlockModel | null {
    if (!trend) {
        return null;
    }

    return {
        label: formatPrecisionTrendLabel(trend.label),
        tone: toneFromPrecisionTrendLabel(trend.label),
        body: buildPrecisionTrendBody(trend),
        compatibleCountLabel: formatCompatibleClipCount(trend.compatibleCount),
        evidenceSummary: `${formatPrecisionEvidenceLevel(trend.evidenceLevel)}: ${formatPercent(trend.coverage)} de cobertura e ${formatPercent(trend.confidence)} de confianca.`,
        deltaItems: buildPrecisionTrendDeltas(trend),
        pillarChips: buildPrecisionPillarChips(trend),
        blockerReasons: buildPrecisionBlockerReasons(trend),
        conservativeReason: buildPrecisionConservativeReason(trend.label),
        nextValidationHint: trend.nextValidationHint,
        ctaLabel: 'Gravar validacao compativel',
    };
}

function buildPrecisionTrendBody(trend: PrecisionTrendSummary): string {
    switch (trend.label) {
        case 'baseline':
            return 'Baseline criado para este contexto. A leitura ainda precisa de outro clip compativel antes de comparar evolucao.';
        case 'initial_signal':
            return 'Sinal inicial registrado. Mantenha arma, mira, distancia, postura, loadout e sensibilidade fixos para validar no proximo clip.';
        case 'in_validation':
            return 'A linha ja tem clips compativeis, mas a evidencia ainda pede validacao antes de consolidar mudanca.';
        case 'validated_progress':
            return 'Progresso validado pela linha compativel. Consolide este bloco antes de testar outra variavel.';
        case 'validated_regression':
            return 'Regressao validada pela linha compativel. Volte para o baseline confiavel e grave nova validacao controlada.';
        case 'oscillation':
            return 'A linha oscilou dentro da margem de decisao. Nao mude outra variavel ate o proximo clip compativel.';
        case 'not_comparable':
            return 'Controle de precisao bloqueou a comparacao. O clip entra como evidencia auditavel, mas nao mistura no trend.';
        case 'consolidated':
            return 'Linha consolidada. Mantenha o contexto ao registrar a proxima validacao ou escolha a proxima variavel com evidencia.';
    }
}

function formatCompatibleClipCount(count: number): string {
    return `${count} clip${count === 1 ? '' : 's'} ${count === 1 ? 'compativel' : 'compativeis'}`;
}

function buildPrecisionConservativeReason(label: PrecisionTrendLabel): string | null {
    switch (label) {
        case 'baseline':
            return 'Ainda existe so um baseline, entao o coach deve pedir validacao compativel.';
        case 'initial_signal':
            return 'Dois clips mostram direcao, nao consolidacao.';
        case 'in_validation':
            return 'A janela ainda nao atingiu evidencia forte para uma mudanca agressiva.';
        case 'validated_regression':
            return 'Regressao validada pede retorno ao baseline confiavel.';
        case 'oscillation':
            return 'Oscilacao bloqueia leitura agressiva mesmo se algum delta bruto parecer positivo.';
        case 'not_comparable':
            return 'Sem compatibilidade estrita, o coach deve corrigir contexto ou captura antes de decidir.';
        case 'validated_progress':
        case 'consolidated':
            return null;
    }
}

function buildPrecisionTrendDeltas(trend: PrecisionTrendSummary): readonly PrecisionTrendDeltaModel[] {
    const items: PrecisionTrendDeltaModel[] = [];

    if (trend.actionableDelta) {
        items.push({
            key: 'actionable',
            label: 'Score acionavel',
            value: formatSignedPoints(trend.actionableDelta.delta),
            tone: toneFromSignedDelta(trend.actionableDelta.delta),
            detail: `Baseline ${Math.round(trend.actionableDelta.baseline)} -> atual ${Math.round(trend.actionableDelta.current)}.`,
        });
    }

    if (trend.mechanicalDelta) {
        items.push({
            key: 'mechanical',
            label: 'Score mecanico',
            value: formatSignedPoints(trend.mechanicalDelta.delta),
            tone: toneFromSignedDelta(trend.mechanicalDelta.delta),
            detail: `Janela recente ${Math.round(trend.mechanicalDelta.recentWindowAverage)}; delta ${formatSignedPoints(trend.mechanicalDelta.recentWindowDelta)}.`,
        });
    }

    return items;
}

function buildPrecisionPillarChips(trend: PrecisionTrendSummary): readonly PrecisionTrendPillarChipModel[] {
    return trend.pillarDeltas.map((delta) => ({
        key: delta.pillar,
        label: formatPrecisionPillarLabel(delta.pillar),
        value: formatSignedPoints(delta.delta),
        tone: toneFromPillarStatus(delta.status),
        detail: `Atual ${Math.round(delta.current)}; janela ${Math.round(delta.recentWindowAverage)}.`,
    }));
}

function buildPrecisionBlockerReasons(trend: PrecisionTrendSummary): readonly string[] {
    const messages = [
        ...trend.blockerSummaries.map((summary) => summary.message),
        ...trend.blockedClips.flatMap((clip) => clip.blockers.map((blocker) => blocker.message)),
    ];
    const unique = Array.from(new Set(messages.filter((message) => message.trim().length > 0)));

    if (unique.length > 0) {
        return unique;
    }

    return trend.label === 'not_comparable'
        ? ['Metadados ou qualidade impediram comparacao precisa deste clip.']
        : [];
}

function toneFromPrecisionTrendLabel(label: PrecisionTrendLabel): ResultMetricTone {
    switch (label) {
        case 'validated_progress':
        case 'consolidated':
            return 'success';
        case 'validated_regression':
        case 'not_comparable':
            return 'error';
        case 'baseline':
        case 'initial_signal':
        case 'in_validation':
        case 'oscillation':
            return 'warning';
    }
}

function toneFromSignedDelta(delta: number): ResultMetricTone {
    if (delta > 3) return 'success';
    if (delta < -3) return 'error';
    return 'warning';
}

function toneFromPillarStatus(status: PrecisionPillarDeltaStatus): ResultMetricTone {
    if (status === 'improved') return 'success';
    if (status === 'declined') return 'error';
    return 'warning';
}

function formatPrecisionEvidenceLevel(level: PrecisionEvidenceLevel): string {
    switch (level) {
        case 'blocked':
            return 'Bloqueada';
        case 'baseline':
            return 'Baseline';
        case 'initial':
            return 'Inicial';
        case 'weak':
            return 'Em validacao';
        case 'sufficient':
            return 'Suficiente';
        case 'strong':
            return 'Forte';
    }
}

function formatPrecisionPillarLabel(pillar: PrecisionPillarKey): string {
    switch (pillar) {
        case 'control':
            return 'Controle';
        case 'consistency':
            return 'Consistencia';
        case 'confidence':
            return 'Confianca';
        case 'clipQuality':
            return 'Qualidade';
    }
}

function formatSignedPoints(value: number): string {
    const rounded = Math.round(value);
    return `${rounded > 0 ? '+' : ''}${rounded} pts`;
}

export function buildMasteryPillarCards(mastery: SprayMastery): readonly MasteryPillarCardModel[] {
    const pillars = mastery.pillars;

    return [
        {
            key: 'control',
            label: 'Controle',
            value: pillars.control,
            tone: toneFromPercent(pillars.control),
            summary: 'Leitura mecanica do spray separado da qualidade do clip.',
        },
        {
            key: 'consistency',
            label: 'Consistencia',
            value: pillars.consistency,
            tone: toneFromPercent(pillars.consistency),
            summary: 'Quanto o padrao se mantem repetivel dentro da sessao.',
        },
        {
            key: 'confidence',
            label: 'Confianca',
            value: pillars.confidence,
            tone: toneFromPercent(pillars.confidence),
            summary: 'Forca da evidencia combinando confianca e cobertura do tracking.',
        },
        {
            key: 'clipQuality',
            label: 'Qualidade do clip',
            value: pillars.clipQuality,
            tone: toneFromPercent(pillars.clipQuality),
            summary: 'Nitidez, compressao, contraste e estabilidade que sustentam a leitura.',
        },
    ];
}

export function buildResultVerdictModel(input: BuildResultVerdictModelInput): ResultVerdictModel {
    const { mastery, coachPlan, trackingOverview, sensitivity } = input;
    const dominantDiagnosis = input.diagnoses?.[0];
    const diagnosisLabel = dominantDiagnosis ? formatDiagnosisTruthLabel(dominantDiagnosis.type) : null;
    const analysisDecisionReasons = buildAnalysisDecisionBlockedReasons(input.analysisDecision);

    if (!mastery) {
        return {
            actionLabel: 'Incerto',
            mechanicalLevelLabel: 'Nao calculado',
            actionableScore: 0,
            mechanicalScore: 0,
            primaryExplanation: 'Esta analise ainda nao tem o contrato de mastery salvo. Revise com a leitura tecnica abaixo antes de aplicar qualquer ajuste.',
            diagnosisLabel,
            blockedReasons: [
                'Mastery ausente no resultado armazenado.',
                `Evidencia atual: ${formatPercent(trackingOverview.coverage)} de cobertura e ${formatPercent(trackingOverview.confidence)} de confianca.`,
                ...analysisDecisionReasons,
            ],
            nextBlock: buildNextBlockSummary(coachPlan?.nextBlock),
            scoreTone: 'info',
        };
    }

    const masteryBlockedReasons = mastery.blockedRecommendations.length > 0
        ? mastery.blockedRecommendations
        : buildSoftCautionReasons({
            mastery,
            trackingOverview,
            sensitivity,
        });
    const blockedReasons = Array.from(new Set([
        ...masteryBlockedReasons,
        ...analysisDecisionReasons,
    ]));
    const primaryExplanation = buildVerdictExplanation({
        mastery,
        diagnosisLabel,
        coachPlan,
        sensitivity,
    });

    return {
        actionLabel: mastery.actionLabel,
        mechanicalLevelLabel: mastery.mechanicalLevelLabel,
        actionableScore: mastery.actionableScore,
        mechanicalScore: mastery.mechanicalScore,
        primaryExplanation,
        diagnosisLabel,
        blockedReasons,
        nextBlock: buildNextBlockSummary(coachPlan?.nextBlock),
        scoreTone: toneFromActionLabel(mastery.actionLabel),
    };
}

function buildAnalysisDecisionBlockedReasons(
    decision: AnalysisDecision | undefined,
): readonly string[] {
    if (!decision) {
        return [];
    }

    const reasons = decision.blockerReasons.map((reason) => `Decision ladder blocker: ${reason}.`);

    if (!decision.permissionMatrix.countsAsUsefulAnalysis) {
        return [
            `Decision ladder ${decision.level}: ${decision.recommendedNextStep}`,
            ...reasons,
        ];
    }

    if (decision.level === 'usable_analysis') {
        return ['Decision ladder usable_analysis libera teste, mas ainda nao aplicacao direta.'];
    }

    return reasons;
}

export function buildEvidenceBadges(input: BuildEvidenceBadgesInput): readonly EvidenceBadgeModel[] {
    const evidence = input.mastery?.evidence;
    const confidence = evidence?.confidence ?? input.trackingOverview.confidence;
    const coverage = evidence?.coverage ?? input.trackingOverview.coverage;
    const visibleFrames = evidence?.visibleFrames ?? input.trackingOverview.visibleFrames;
    const lostFrames = evidence?.lostFrames ?? input.trackingOverview.framesLost;
    const framesProcessed = Math.max(
        evidence?.framesProcessed ?? input.trackingOverview.framesProcessed,
        0
    );
    const clipQuality = evidence?.qualityScore ?? null;
    const usableForAnalysis = evidence?.usableForAnalysis ?? true;
    const actionLabel = input.mastery?.actionLabel ?? 'Incerto';

    return [
        {
            key: 'confidence',
            label: 'Confianca',
            value: formatPercent(confidence),
            tone: toneFromPercent(confidence * 100),
            detail: 'Confianca media do tracking usado na leitura.',
        },
        {
            key: 'coverage',
            label: 'Cobertura',
            value: formatPercent(coverage),
            tone: toneFromPercent(coverage * 100),
            detail: 'Parte do spray com mira visivel o bastante para medir.',
        },
        {
            key: 'visibleFrames',
            label: 'Frames visiveis',
            value: `${visibleFrames}/${framesProcessed}`,
            tone: toneFromPercent(coverage * 100),
            detail: 'Frames aproveitados na janela de spray.',
        },
        {
            key: 'lostFrames',
            label: 'Frames perdidos',
            value: `${lostFrames}`,
            tone: lostFrames === 0 ? 'success' : lostFrames / Math.max(framesProcessed, 1) > 0.25 ? 'warning' : 'info',
            detail: 'Perdas de tracking que reduzem certeza da leitura.',
        },
        {
            key: 'captureState',
            label: 'Estado da leitura',
            value: actionLabel,
            tone: toneFromActionLabel(actionLabel),
            detail: usableForAnalysis ? 'Captura usavel para analise.' : 'Captura limitada; recaptura pode ser necessaria.',
        },
        {
            key: 'clipQuality',
            label: 'Qualidade do clip',
            value: clipQuality === null ? 'Sem laudo' : `${Math.round(clipQuality)}/100`,
            tone: clipQuality === null ? 'info' : toneFromPercent(clipQuality),
            detail: usableForAnalysis ? 'Clip sustenta leitura com limites declarados.' : 'Qualidade do clip limita recomendacoes fortes.',
        },
    ];
}

export function splitDiagnosesBySeverity(diagnoses: readonly Diagnosis[]): DiagnosisSplit {
    const sortedDiagnoses = [...diagnoses].sort((left, right) => right.severity - left.severity);

    return {
        sortedDiagnoses,
        majorDiagnoses: sortedDiagnoses.filter((diagnosis) => diagnosis.severity >= 3),
        minorDiagnoses: sortedDiagnoses.filter((diagnosis) => diagnosis.severity < 3),
    };
}

export function groupCoachFeedbackByDiagnosis(coaching: readonly CoachFeedback[]): readonly CoachFeedbackGroup[] {
    const groups = coaching.reduce<CoachFeedbackGroup[]>((accumulator, item) => {
        const existingIndex = accumulator.findIndex((group) => group.key === item.diagnosis.type);

        if (existingIndex >= 0) {
            const existing = accumulator[existingIndex]!;
            const items = [...existing.items, item];
            const maxSeverity = Math.max(...items.map((entry) => entry.diagnosis.severity));

            accumulator[existingIndex] = {
                ...existing,
                items,
                maxSeverity,
                priorityTone: toneFromSeverity(maxSeverity),
                priorityLabel: priorityLabelFromSeverity(maxSeverity),
            };
            return accumulator;
        }

        accumulator.push({
            key: item.diagnosis.type,
            items: [item],
            maxSeverity: item.diagnosis.severity,
            priorityTone: toneFromSeverity(item.diagnosis.severity),
            priorityLabel: priorityLabelFromSeverity(item.diagnosis.severity),
        });
        return accumulator;
    }, []);

    return groups.sort((left, right) => right.maxSeverity - left.maxSeverity);
}

function priorityLabelFromSeverity(severity: number): string {
    if (severity >= 4) return 'CRITICO';
    if (severity >= 3) return 'IMPORTANTE';
    return 'MENOR';
}

function buildNextBlockSummary(block: CoachBlockPlan | undefined): ResultVerdictNextBlockModel | null {
    if (!block) {
        return null;
    }

    const validation = block.checks[0] ?? null;

    return {
        title: block.title,
        durationLabel: `${block.durationMinutes} min`,
        steps: block.steps.slice(0, 3),
        validationLabel: validation?.label ?? null,
        validationTarget: validation?.target ?? null,
        validationSuccess: validation?.successCondition ?? null,
    };
}

function buildSoftCautionReasons(input: {
    readonly mastery: SprayMastery;
    readonly trackingOverview: TrackingEvidenceOverview;
    readonly sensitivity: Pick<SensitivityRecommendation, 'tier' | 'evidenceTier' | 'confidenceScore'>;
}): readonly string[] {
    const cautions: string[] = [];

    if (input.mastery.actionLabel === 'Testavel') {
        cautions.push('A leitura sustenta teste controlado, nao uma mudanca permanente sem novo clip.');
    }

    if (input.mastery.actionLabel === 'Pronto') {
        cautions.push('O protocolo pode ser aplicado, mas ainda precisa de validacao curta no proximo bloco.');
    }

    if (input.sensitivity.evidenceTier !== 'strong') {
        cautions.push(`Evidencia de sensibilidade ${input.sensitivity.evidenceTier}; use como protocolo de validacao.`);
    }

    if (input.trackingOverview.coverage < 0.8 || input.trackingOverview.confidence < 0.8) {
        cautions.push(`Tracking base: ${formatPercent(input.trackingOverview.coverage)} de cobertura e ${formatPercent(input.trackingOverview.confidence)} de confianca.`);
    }

    return cautions;
}

function buildVerdictExplanation(input: {
    readonly mastery: SprayMastery;
    readonly diagnosisLabel: string | null;
    readonly coachPlan?: CoachPlan | undefined;
    readonly sensitivity: Pick<SensitivityRecommendation, 'tier' | 'evidenceTier' | 'confidenceScore'>;
}): string {
    const diagnosisText = input.diagnosisLabel
        ? ` Sinal principal: ${input.diagnosisLabel}.`
        : ' Sem sinal dominante acima do restante.';

    if (input.mastery.actionLabel === 'Capturar de novo') {
        return `A captura bloqueia recomendacao forte agora.${diagnosisText} Grave outro spray comparavel antes de mudar sensibilidade ou equipamento.`;
    }

    if (input.mastery.actionLabel === 'Incerto') {
        return `Existe leitura parcial, mas a evidencia ainda nao sustenta protocolo forte.${diagnosisText} O proximo passo e validar com bloco controlado.`;
    }

    if (input.mastery.actionLabel === 'Pronto') {
        return `A evidencia atual sustenta aplicar o protocolo com validacao curta.${diagnosisText} Trate como ajuste em observacao, comparando o proximo bloco.`;
    }

    const nextFocus = input.coachPlan?.primaryFocus.title;
    const focusText = nextFocus ? ` Foco do coach: ${nextFocus}.` : '';

    return `A leitura ja e testavel, mas ainda pede comparacao no proximo clip.${diagnosisText}${focusText}`;
}

function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}
