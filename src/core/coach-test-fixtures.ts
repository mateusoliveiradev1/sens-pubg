import type {
    AnalysisResult,
    CoachFeedback,
    Diagnosis,
    SensitivityRecommendation,
    SprayMetrics,
    SprayTrajectory,
    VideoQualityReport,
} from '../types/engine';
import { asCentimeters, asMilliseconds, asPixels, asScore, asSensitivity } from '../types/branded';

type DeepPartial<T> = T extends Date
    ? T
    : T extends readonly (infer TItem)[]
        ? readonly DeepPartial<TItem>[]
        : T extends object
            ? { readonly [TKey in keyof T]?: DeepPartial<T[TKey]> }
            : T;

export type AnalysisResultFixtureOverrides = DeepPartial<AnalysisResult>;

const baseDiagnosis: Diagnosis = {
    type: 'underpull',
    severity: 4,
    verticalControlIndex: 0.68,
    deficitPercent: 32,
    dominantPhase: 'sustained',
    confidence: 0.86,
    evidence: {
        confidence: 0.86,
        coverage: 0.9,
        angularErrorDegrees: 1.1,
        linearErrorCm: 52,
        linearErrorSeverity: 4,
    },
    description: 'Pulldown vertical insuficiente no sustain',
    cause: 'Controle vertical perde pressao depois dos tiros iniciais',
    remediation: 'Repita um bloco curto focado em pulldown sustentado',
};

const baseTrajectory: SprayTrajectory = {
    points: [
        { frame: 0, timestamp: asMilliseconds(0), x: asPixels(320), y: asPixels(240), confidence: 0.92 },
        { frame: 1, timestamp: asMilliseconds(86), x: asPixels(321), y: asPixels(246), confidence: 0.9 },
    ],
    trackingFrames: [],
    displacements: [],
    totalFrames: 32,
    durationMs: asMilliseconds(2752),
    shotAlignmentErrorMs: 18,
    weaponId: 'beryl-m762',
    trackingQuality: 0.91,
    framesTracked: 30,
    framesLost: 2,
    visibleFrames: 30,
    framesProcessed: 32,
    statusCounts: {
        tracked: 30,
        occluded: 0,
        lost: 2,
        uncertain: 0,
    },
};

const baseMetrics: SprayMetrics = {
    stabilityScore: asScore(76),
    verticalControlIndex: 0.68,
    horizontalNoiseIndex: 2.4,
    shotAlignmentErrorMs: 18,
    angularErrorDegrees: 1.1,
    linearErrorCm: 52,
    linearErrorSeverity: 4,
    targetDistanceMeters: 30,
    initialRecoilResponseMs: asMilliseconds(144),
    driftDirectionBias: { direction: 'neutral', magnitude: 0.2 },
    consistencyScore: asScore(74),
    burstVCI: 0.82,
    sustainedVCI: 0.67,
    fatigueVCI: 0.63,
    burstHNI: 2.1,
    sustainedHNI: 2.4,
    fatigueHNI: 2.7,
    shotResiduals: [],
    metricQuality: {
        stabilityScore: { coverage: 0.88, confidence: 0.84, sampleSize: 30, framesTracked: 30, framesLost: 2, framesProcessed: 32 },
        verticalControlIndex: { coverage: 0.9, confidence: 0.86, sampleSize: 30, framesTracked: 30, framesLost: 2, framesProcessed: 32 },
        horizontalNoiseIndex: { coverage: 0.88, confidence: 0.82, sampleSize: 30, framesTracked: 30, framesLost: 2, framesProcessed: 32 },
        shotAlignmentErrorMs: { coverage: 0.82, confidence: 0.78, sampleSize: 30, framesTracked: 30, framesLost: 2, framesProcessed: 32 },
        angularErrorDegrees: { coverage: 0.9, confidence: 0.86, sampleSize: 30, framesTracked: 30, framesLost: 2, framesProcessed: 32 },
        linearErrorCm: { coverage: 0.9, confidence: 0.86, sampleSize: 30, framesTracked: 30, framesLost: 2, framesProcessed: 32 },
        linearErrorSeverity: { coverage: 0.9, confidence: 0.86, sampleSize: 30, framesTracked: 30, framesLost: 2, framesProcessed: 32 },
        initialRecoilResponseMs: { coverage: 0.84, confidence: 0.8, sampleSize: 30, framesTracked: 30, framesLost: 2, framesProcessed: 32 },
        driftDirectionBias: { coverage: 0.88, confidence: 0.82, sampleSize: 30, framesTracked: 30, framesLost: 2, framesProcessed: 32 },
        consistencyScore: { coverage: 0.86, confidence: 0.8, sampleSize: 30, framesTracked: 30, framesLost: 2, framesProcessed: 32 },
        burstVCI: { coverage: 0.9, confidence: 0.86, sampleSize: 10, framesTracked: 10, framesLost: 0, framesProcessed: 10 },
        sustainedVCI: { coverage: 0.9, confidence: 0.86, sampleSize: 10, framesTracked: 10, framesLost: 0, framesProcessed: 10 },
        fatigueVCI: { coverage: 0.82, confidence: 0.76, sampleSize: 10, framesTracked: 8, framesLost: 2, framesProcessed: 10 },
        burstHNI: { coverage: 0.9, confidence: 0.84, sampleSize: 10, framesTracked: 10, framesLost: 0, framesProcessed: 10 },
        sustainedHNI: { coverage: 0.88, confidence: 0.82, sampleSize: 10, framesTracked: 10, framesLost: 0, framesProcessed: 10 },
        fatigueHNI: { coverage: 0.82, confidence: 0.76, sampleSize: 10, framesTracked: 8, framesLost: 2, framesProcessed: 10 },
        shotResiduals: { coverage: 0.9, confidence: 0.86, sampleSize: 30, framesTracked: 30, framesLost: 2, framesProcessed: 32 },
        sprayScore: { coverage: 0.88, confidence: 0.84, sampleSize: 30, framesTracked: 30, framesLost: 2, framesProcessed: 32 },
    },
    sprayScore: 72,
};

const baseVideoQualityReport: VideoQualityReport = {
    overallScore: asScore(82),
    sharpness: asScore(80),
    compressionBurden: asScore(18),
    reticleContrast: asScore(78),
    roiStability: asScore(84),
    fpsStability: asScore(88),
    usableForAnalysis: true,
    blockingReasons: [],
    diagnostic: {
        tier: 'analysis_ready',
        summary: 'Clip utilizavel para leitura de spray.',
        recommendations: [],
        preprocessing: {
            normalizationApplied: true,
            sampledFrames: 32,
            selectedFrames: 30,
        },
    },
};

const baseSensitivityRecommendation: SensitivityRecommendation = {
    profiles: [
        {
            type: 'low',
            label: 'Low',
            description: 'Perfil conservador para controle vertical.',
            general: asSensitivity(45),
            ads: asSensitivity(43),
            scopes: [],
            cmPer360: asCentimeters(48),
        },
        {
            type: 'balanced',
            label: 'Balanced',
            description: 'Perfil intermediario para validar o bloco.',
            general: asSensitivity(50),
            ads: asSensitivity(48),
            scopes: [],
            cmPer360: asCentimeters(41),
        },
        {
            type: 'high',
            label: 'High',
            description: 'Perfil mais rapido para corrigir overpull.',
            general: asSensitivity(55),
            ads: asSensitivity(53),
            scopes: [],
            cmPer360: asCentimeters(35),
        },
    ],
    recommended: 'balanced',
    tier: 'test_profiles',
    evidenceTier: 'moderate',
    confidenceScore: 0.78,
    reasoning: 'Fixture base com evidencia moderada para teste de protocolo.',
};

const baseCoaching: readonly CoachFeedback[] = [
    {
        diagnosis: baseDiagnosis,
        mode: 'standard',
        problem: baseDiagnosis.description,
        evidence: {
            diagnosisType: 'underpull',
            severity: 4,
            dominantPhase: 'sustained',
            confidence: 0.86,
            coverage: 0.9,
            angularErrorDegrees: 1.1,
            linearErrorCm: 52,
            linearErrorSeverity: 4,
            patchVersion: '41.1',
            targetDistanceMeters: 30,
            distanceMode: 'exact',
            weaponName: 'Beryl M762',
            weaponCategory: 'ar',
            stance: 'standing',
        },
        confidence: 0.86,
        likelyCause: baseDiagnosis.cause,
        adjustment: baseDiagnosis.remediation,
        drill: 'Faça 3 sprays curtos mantendo o mesmo ponto de mira.',
        verifyNextClip: 'Compare o sustain com cobertura minima de 0.8.',
        whatIsWrong: baseDiagnosis.description,
        whyItHappens: baseDiagnosis.cause,
        whatToAdjust: baseDiagnosis.remediation,
        howToTest: 'Repetir bloco com a mesma arma, optic e distancia.',
        adaptationTimeDays: 3,
    },
];

export const analysisResultBase: AnalysisResult = {
    id: 'analysis-fixture-base',
    timestamp: new Date('2026-04-18T12:00:00.000Z'),
    patchVersion: '41.1',
    analysisContext: {
        targetDistanceMeters: 30,
        distanceMode: 'exact',
        optic: {
            scopeId: 'red-dot',
            opticId: 'red-dot',
            opticStateId: '1x',
            opticName: 'Red Dot Sight',
            opticStateName: '1x',
            availableStateIds: ['1x'],
            isDynamicOptic: false,
        },
    },
    videoQualityReport: baseVideoQualityReport,
    trajectory: baseTrajectory,
    loadout: {
        stance: 'standing',
        muzzle: 'compensator',
        grip: 'vertical',
        stock: 'none',
    },
    metrics: baseMetrics,
    diagnoses: [baseDiagnosis],
    sensitivity: baseSensitivityRecommendation,
    coaching: baseCoaching,
};

export const analysisResultWithWeakCapture = createAnalysisResultFixture({
    id: 'analysis-fixture-weak-capture',
    videoQualityReport: {
        overallScore: asScore(31),
        sharpness: asScore(24),
        compressionBurden: asScore(92),
        reticleContrast: asScore(30),
        roiStability: asScore(34),
        fpsStability: asScore(45),
        usableForAnalysis: false,
        blockingReasons: ['low_sharpness', 'high_compression_burden', 'low_reticle_contrast'],
        diagnostic: {
            tier: 'poor',
            summary: 'Clip nao sustenta leitura confiavel.',
            recommendations: ['Recapture com maior nitidez e menos compressao.'],
            preprocessing: {
                normalizationApplied: false,
                sampledFrames: 32,
                selectedFrames: 12,
            },
        },
    },
    sensitivity: {
        tier: 'capture_again',
        evidenceTier: 'weak',
        confidenceScore: 0.34,
        reasoning: 'Captura fraca bloqueia recomendacao de sensibilidade.',
    },
});

export const analysisResultWithStrongSensitivity = createAnalysisResultFixture({
    id: 'analysis-fixture-strong-sensitivity',
    sensitivity: {
        recommended: 'high',
        tier: 'apply_ready',
        evidenceTier: 'strong',
        confidenceScore: 0.93,
        reasoning: 'Evidencia repetida favorece perfil high.',
        suggestedVSM: 1.12,
        historyConvergence: {
            matchingSessions: 3,
            consideredSessions: 3,
            consensusProfile: 'high',
            supportRatio: 1,
            agreement: 'aligned',
            summary: 'Historico recente alinhado com aumento de sensibilidade.',
        },
    },
});

export function createAnalysisResultFixture(
    overrides: AnalysisResultFixtureOverrides = {},
): AnalysisResult {
    return mergeFixture<AnalysisResult>(analysisResultBase, overrides);
}

function mergeFixture<TValue>(base: TValue, overrides: DeepPartial<TValue>): TValue {
    if (overrides === undefined) {
        return base;
    }

    if (base instanceof Date || overrides instanceof Date) {
        return overrides as TValue;
    }

    if (Array.isArray(base) || Array.isArray(overrides)) {
        return overrides as TValue;
    }

    if (isPlainObject(base) && isPlainObject(overrides)) {
        const merged: Record<string, unknown> = { ...base };

        for (const [key, value] of Object.entries(overrides)) {
            merged[key] = key in merged
                ? mergeFixture(merged[key], value as never)
                : value;
        }

        return merged as TValue;
    }

    return overrides as TValue;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object'
        && value !== null
        && !Array.isArray(value)
        && !(value instanceof Date);
}
