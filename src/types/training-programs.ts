import type {
    AnalysisDecisionLevel,
    CoachDecisionSnapshot,
    CoachProtocolOutcome,
    CompleteTrainingProtocol,
    PrecisionCheckpoint,
    PrecisionTrendSummary,
    SprayLabBenchmarkSnapshot,
    SprayLabFidelityReasonCode,
    SprayLabFidelityTier,
    SprayLabSessionSnapshot,
    SprayLabValidationLink,
    SprayLabValidationStatus,
    TrainingProtocolContextSnapshot,
} from './engine';
import type { SprayLabCoachHandoff } from '../core/spray-lab-coach-handoff';

export type TrainingProgramVersion = 'ciclo-pro-v1';

export type TrainingProgramKind = 'ciclo_pro' | 'ciclo_reparo';

export type TrainingProgramState =
    | 'preparando'
    | 'ativo'
    | 'reparando'
    | 'consolidando'
    | 'validacao_pendente'
    | 'progresso_validado'
    | 'sem_mudanca_clara'
    | 'regressao_validada'
    | 'inconclusivo'
    | 'linha_reiniciada'
    | 'concluido'
    | 'pausado'
    | 'contexto_desatualizado';

export type TrainingProgramMissionCategory =
    | 'execution'
    | 'validation'
    | 'repair'
    | 'preparation'
    | 'transfer';

export type TrainingProgramMissionSlot =
    | 'main_1'
    | 'main_2'
    | 'main_3'
    | 'main_4'
    | 'main_5'
    | 'flex_1'
    | 'flex_2';

export type TrainingProgramReasonCode =
    | 'fidelity_dropped'
    | 'validation_inconclusive'
    | 'variable_changed'
    | 'outcome_conflict'
    | 'fatigue_reduced_dose'
    | 'discomfort_stop'
    | 'stale_context'
    | 'compatible_proof_missing'
    | 'blocker_repaired'
    | 'missed_day_reentry'
    | 'line_restart'
    | 'missing_saved_analysis'
    | 'missing_context'
    | 'missing_protocol'
    | 'weak_base_evidence'
    | 'low_coverage'
    | 'low_confidence'
    | 'confusion_simplified'
    | 'repeated_failure_consolidation';

export type TrainingProgramMissionStatus =
    | 'locked'
    | 'available'
    | 'active'
    | 'completed'
    | 'blocked'
    | 'skipped_reentered';

export type TrainingProgramCheckpointLayer =
    | 'weekly_operational'
    | 'technical_validated'
    | 'monthly_program';

export type TrainingProgramCheckpointOutcome =
    | 'executed'
    | 'stabilized'
    | 'repair_needed'
    | 'validation_pending'
    | 'progress_validated'
    | 'regression_validated'
    | 'no_clear_change'
    | 'incompatible_context'
    | 'insufficient_evidence'
    | 'line_restarted'
    | 'cycle_completed';

export type TrainingProgramRecoveryAction =
    | 'reparar'
    | 'consolidar'
    | 'reiniciar_linha'
    | 'pausar_bloco'
    | 'reencaixar';

export type TrainingProgramEventType =
    | 'mission_started'
    | 'mission_completed'
    | 'lab_evidence_attached'
    | 'validation_attached'
    | 'checkpoint_recorded'
    | 'fatigue_reported'
    | 'discomfort_reported'
    | 'confusion_reported'
    | 'variable_changed'
    | 'missed_day_reentered'
    | 'context_marked_stale'
    | 'line_restarted'
    | 'cycle_completed';

export interface TrainingProgramCta {
    readonly label: string;
    readonly href: '/spray-lab' | '/analyze?mode=validation' | string;
    readonly target: 'spray_lab' | 'analyze_validation' | 'history' | 'ciclo_pro';
}

export interface TrainingProgramMissionAnatomy {
    readonly agora: string;
    readonly porQueImporta: string;
    readonly oQueInvalida: string;
    readonly evidenciaGerada: string;
    readonly proximoCta: TrainingProgramCta;
}

export interface TrainingProgramMission {
    readonly id: string;
    readonly weekNumber: 1 | 2 | 3 | 4;
    readonly slot: TrainingProgramMissionSlot;
    readonly category: TrainingProgramMissionCategory;
    readonly status: TrainingProgramMissionStatus;
    readonly title: string;
    readonly anatomy: TrainingProgramMissionAnatomy;
    readonly stateAfterCompletion: TrainingProgramState;
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
    readonly protocolId?: string;
    readonly labSessionId?: string;
    readonly validationLinkId?: string;
    readonly evidenceRefs: readonly TrainingProgramEvidenceReference[];
}

export interface TrainingProgramAdaptiveWeek {
    readonly id: string;
    readonly weekNumber: 1 | 2 | 3 | 4;
    readonly label: string;
    readonly state: TrainingProgramState;
    readonly startedAt?: string;
    readonly closedAt?: string;
    readonly missions: readonly TrainingProgramMission[];
    readonly checkpointIds: readonly string[];
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
    readonly canIncreaseDifficulty: boolean;
    readonly recoveryAction?: TrainingProgramRecoveryAction;
}

export interface TrainingProgramActiveLineReference {
    readonly lineId: string;
    readonly contextKey: string;
    readonly label: string;
    readonly active: boolean;
    readonly startedAt: string;
    readonly archivedAt?: string;
    readonly restartReasonCodes: readonly TrainingProgramReasonCode[];
    readonly precisionTrend?: PrecisionTrendSummary;
    readonly precisionCheckpoint?: PrecisionCheckpoint;
}

export interface TrainingProgramEvidenceReference {
    readonly kind:
        | 'analysis'
        | 'protocol'
        | 'spray_lab_session'
        | 'spray_lab_benchmark'
        | 'validation_link'
        | 'precision_trend'
        | 'precision_checkpoint'
        | 'coach_outcome';
    readonly id: string;
    readonly href?: string;
}

export interface TrainingProgramEvidenceSummary {
    readonly savedAnalysisId?: string;
    readonly analysisDecisionLevel?: AnalysisDecisionLevel;
    readonly protocol?: CompleteTrainingProtocol;
    readonly protocolId?: string;
    readonly context: TrainingProtocolContextSnapshot | null;
    readonly sprayLabSession?: SprayLabSessionSnapshot;
    readonly sprayLabBenchmark?: SprayLabBenchmarkSnapshot;
    readonly sprayLabHandoff?: SprayLabCoachHandoff;
    readonly fidelityTier?: SprayLabFidelityTier;
    readonly fidelityReasonCodes: readonly SprayLabFidelityReasonCode[];
    readonly validationLink?: SprayLabValidationLink;
    readonly validationStatus?: SprayLabValidationStatus;
    readonly precisionTrend?: PrecisionTrendSummary;
    readonly precisionCheckpoint?: PrecisionCheckpoint;
    readonly coachOutcome?: CoachProtocolOutcome;
    readonly coachDecision?: CoachDecisionSnapshot;
    readonly confidence: number;
    readonly coverage: number;
    readonly blockers: readonly TrainingProgramReasonCode[];
    readonly summary: string;
}

export interface TrainingProgramCheckpoint {
    readonly id: string;
    readonly layer: TrainingProgramCheckpointLayer;
    readonly weekNumber?: 1 | 2 | 3 | 4;
    readonly state: TrainingProgramState;
    readonly outcome: TrainingProgramCheckpointOutcome;
    readonly createdAt: string;
    readonly evidenceSummary: TrainingProgramEvidenceSummary;
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
    readonly canIncreaseDifficulty: boolean;
    readonly nextRecommendation: TrainingProgramRecoveryAction;
    readonly summary: string;
}

export interface TrainingProgramTransitionEvent {
    readonly id: string;
    readonly cycleId: string;
    readonly type: TrainingProgramEventType;
    readonly occurredAt: string;
    readonly fromState: TrainingProgramState;
    readonly toState: TrainingProgramState;
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
    readonly userVisibleReason: string;
    readonly evidenceRefs: readonly TrainingProgramEvidenceReference[];
    readonly missionId?: string;
    readonly checkpointId?: string;
}

export interface TrainingProgramCycleSnapshot {
    readonly version: TrainingProgramVersion;
    readonly id: string;
    readonly kind: TrainingProgramKind;
    readonly state: TrainingProgramState;
    readonly label: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly baseAnalysisId?: string;
    readonly activeLine: TrainingProgramActiveLineReference | null;
    readonly archivedLines: readonly TrainingProgramActiveLineReference[];
    readonly strictContextKey: string;
    readonly strictContextLabel: string;
    readonly evidenceSummary: TrainingProgramEvidenceSummary;
    readonly weeks: readonly TrainingProgramAdaptiveWeek[];
    readonly checkpoints: readonly TrainingProgramCheckpoint[];
    readonly transitionEvents: readonly TrainingProgramTransitionEvent[];
    readonly currentWeekNumber: 1 | 2 | 3 | 4;
    readonly currentMissionId: string | null;
    readonly reasonCodes: readonly TrainingProgramReasonCode[];
    readonly recoveryAction: TrainingProgramRecoveryAction;
    readonly nextCta: TrainingProgramCta;
}
