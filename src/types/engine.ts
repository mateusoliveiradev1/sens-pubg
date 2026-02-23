/**
 * Engine Types — Discriminated unions para resultados dos engines.
 * Cada resultado de diagnóstico, métrica e recomendação é tipado com tag.
 */

import type { Score, Milliseconds, DPI, Sensitivity, Centimeters, Pixels } from './branded';

// ═══════════════════════════════════════════
// Tracking & Trajectory
// ═══════════════════════════════════════════

export interface TrackingPoint {
    readonly frame: number;
    readonly timestamp: Milliseconds;
    readonly x: Pixels;
    readonly y: Pixels;
    readonly confidence: number;
}

export interface DisplacementVector {
    readonly dx: number;
    readonly dy: number;
    readonly timestamp: Milliseconds;
    readonly shotIndex: number;
}

export interface SprayTrajectory {
    readonly points: readonly TrackingPoint[];
    readonly displacements: readonly DisplacementVector[];
    readonly totalFrames: number;
    readonly durationMs: Milliseconds;
    readonly weaponId: string;
}

// ═══════════════════════════════════════════
// Spray Metrics
// ═══════════════════════════════════════════

export interface SprayMetrics {
    readonly stabilityScore: Score;
    readonly verticalControlIndex: number;
    readonly horizontalNoiseIndex: number;
    readonly initialRecoilResponseMs: Milliseconds;
    readonly driftDirectionBias: DriftBias;
    readonly consistencyScore: Score;
    // Phase-based metrics
    readonly burstVCI: number;      // Shots 1-10
    readonly sustainedVCI: number;  // Shots 11-20
    readonly fatigueVCI: number;    // Shots 21+
    readonly burstHNI: number;
    readonly sustainedHNI: number;
    readonly fatigueHNI: number;
}

export interface DriftBias {
    readonly direction: 'left' | 'right' | 'neutral';
    readonly magnitude: number;
}

// ═══════════════════════════════════════════
// Diagnostics (Discriminated Unions)
// ═══════════════════════════════════════════

export type DiagnosisType =
    | 'overpull'
    | 'underpull'
    | 'late_compensation'
    | 'excessive_jitter'
    | 'horizontal_drift'
    | 'inconsistency';

export type Severity = 1 | 2 | 3 | 4 | 5;

export interface DiagnosisBase {
    readonly severity: Severity;
    readonly description: string;
    readonly cause: string;
    readonly remediation: string;
}

export interface OverpullDiagnosis extends DiagnosisBase {
    readonly type: 'overpull';
    readonly verticalControlIndex: number;
    readonly excessPercent: number;
}

export interface UnderpullDiagnosis extends DiagnosisBase {
    readonly type: 'underpull';
    readonly verticalControlIndex: number;
    readonly deficitPercent: number;
}

export interface LateCompensationDiagnosis extends DiagnosisBase {
    readonly type: 'late_compensation';
    readonly responseTimeMs: Milliseconds;
    readonly idealResponseMs: Milliseconds;
}

export interface ExcessiveJitterDiagnosis extends DiagnosisBase {
    readonly type: 'excessive_jitter';
    readonly horizontalNoise: number;
    readonly threshold: number;
}

export interface HorizontalDriftDiagnosis extends DiagnosisBase {
    readonly type: 'horizontal_drift';
    readonly bias: DriftBias;
}

export interface InconsistencyDiagnosis extends DiagnosisBase {
    readonly type: 'inconsistency';
    readonly consistencyScore: Score;
}

export type Diagnosis =
    | OverpullDiagnosis
    | UnderpullDiagnosis
    | LateCompensationDiagnosis
    | ExcessiveJitterDiagnosis
    | HorizontalDriftDiagnosis
    | InconsistencyDiagnosis;

// ═══════════════════════════════════════════
// Sensitivity Profiles
// ═══════════════════════════════════════════

export type ProfileType = 'low' | 'balanced' | 'high';

export interface ScopeSensitivity {
    readonly scopeName: string;
    readonly current: Sensitivity;
    readonly recommended: Sensitivity;
    readonly changePercent: number;
}

export interface SensitivityProfile {
    readonly type: ProfileType;
    readonly label: string;
    readonly description: string;
    readonly general: Sensitivity;
    readonly ads: Sensitivity;
    readonly scopes: readonly ScopeSensitivity[];
    readonly cmPer360: Centimeters;
}

export interface SensitivityRecommendation {
    readonly profiles: readonly [
        SensitivityProfile, // LOW
        SensitivityProfile, // BALANCED
        SensitivityProfile, // HIGH
    ];
    readonly recommended: ProfileType;
    readonly reasoning: string;
    readonly suggestedVSM?: number; // Recomendaçao do Vertical Sensitivity Multiplier (1.0-2.0)
}

// ═══════════════════════════════════════════
// Coach Feedback
// ═══════════════════════════════════════════

export interface CoachFeedback {
    readonly diagnosis: Diagnosis;
    readonly whatIsWrong: string;
    readonly whyItHappens: string;
    readonly whatToAdjust: string;
    readonly howToTest: string;
    readonly adaptationTimeDays: number;
}

export interface AnalysisResult {
    readonly id: string;
    readonly timestamp: Date;
    readonly trajectory: SprayTrajectory;
    readonly metrics: SprayMetrics;
    readonly diagnoses: readonly Diagnosis[];
    readonly sensitivity: SensitivityRecommendation;
    readonly coaching: readonly CoachFeedback[];
    readonly subSessions?: readonly AnalysisResult[];
}

// ═══════════════════════════════════════════
// Player Hardware Profile
// ═══════════════════════════════════════════

export type GripStyle = 'palm' | 'claw' | 'fingertip' | 'hybrid';
export type PlayStyle = 'arm' | 'wrist' | 'hybrid';
export type MousepadType = 'speed' | 'control' | 'hybrid';
export type MousepadMaterial = 'cloth' | 'hard' | 'glass';
export type MonitorPanel = 'ips' | 'tn' | 'va';

export interface PlayerHardwareProfile {
    readonly mouse: {
        readonly model: string;
        readonly sensor: string;
        readonly dpi: DPI;
        readonly pollingRate: number;
        readonly weightGrams: number;
        readonly liftOffDistance: number;
    };
    readonly mousepad: {
        readonly model: string;
        readonly widthCm: Centimeters;
        readonly heightCm: Centimeters;
        readonly type: MousepadType;
        readonly material: MousepadMaterial;
    };
    readonly gripStyle: GripStyle;
    readonly playStyle: PlayStyle;
    readonly monitor: {
        readonly resolution: string;
        readonly refreshRate: number;
        readonly panelType: MonitorPanel;
    };
    readonly pubgSettings: {
        readonly generalSens: Sensitivity;
        readonly adsSens: Sensitivity;
        readonly scopeSens: Record<string, Sensitivity>;
        readonly fov: number;
        readonly verticalMultiplier: number;
        readonly mouseAcceleration: boolean;
    };
    readonly physical: {
        readonly armLength: 'short' | 'medium' | 'long';
        readonly deskSpaceCm: Centimeters;
    };
}

// ═══════════════════════════════════════════
// Analysis Session (stored in DB)
// ═══════════════════════════════════════════

export interface AnalysisSession {
    readonly id: string;
    readonly userId: string;
    readonly weaponId: string;
    readonly scopeId: string;
    readonly distance: number;
    readonly metrics: SprayMetrics;
    readonly diagnoses: readonly DiagnosisType[];
    readonly sensitivityApplied: ProfileType | null;
    readonly createdAt: Date;
}
