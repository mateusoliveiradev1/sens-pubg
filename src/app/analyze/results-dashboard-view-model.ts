import type {
    CoachBlockPlan,
    CoachFeedback,
    CoachPlan,
    Diagnosis,
    SensitivityRecommendation,
    SprayMastery,
    SprayMetrics,
} from '@/types/engine';
import { formatDiagnosisTruthLabel } from '@/core/measurement-truth';

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
            ],
            nextBlock: buildNextBlockSummary(coachPlan?.nextBlock),
            scoreTone: 'info',
        };
    }

    const blockedReasons = mastery.blockedRecommendations.length > 0
        ? mastery.blockedRecommendations
        : buildSoftCautionReasons({
            mastery,
            trackingOverview,
            sensitivity,
        });
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
