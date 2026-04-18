import type {
    CoachFeedback,
    Diagnosis,
    SensitivityRecommendation,
    SprayMetrics,
} from '@/types/engine';

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

interface BuildResultMetricCardsInput {
    readonly metrics: SprayMetrics;
    readonly sensitivity: Pick<SensitivityRecommendation, 'suggestedVSM'>;
    readonly diagnoses?: readonly Diagnosis[];
    readonly linearErrorLabel: string;
    readonly linearErrorUnit: string;
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
    if (value < 0.85) return 'Underpull';
    if (value > 1.15) return 'Overpull';
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
