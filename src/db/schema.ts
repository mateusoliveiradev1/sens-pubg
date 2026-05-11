/**
 * Database Schema — Drizzle ORM schema para Neon PostgreSQL.
 * Todas as tabelas do sistema com tipos inferidos automaticamente.
 */

import {
    pgTable,
    text,
    timestamp,
    integer,
    boolean,
    real,
    jsonb,
    uuid,
    index,
    primaryKey,
    uniqueIndex,
    type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccount } from '@auth/core/adapters';
import type { CommunityPostAnalysisSnapshot } from '@/core/community-post-snapshot';
import type {
    CoachFocusArea,
    CoachOutcomeConflict,
    CoachOutcomeEvidenceStrength,
    CoachProtocolOutcomeCoachSnapshot,
    CoachProtocolOutcomeReasonCode,
    CoachProtocolOutcomeStatus,
    CompleteTrainingProtocol,
    PrecisionCheckpointState,
    PrecisionTrendSummary,
    PrecisionVariableInTest,
    SprayLabAct,
    SprayLabBenchmarkSnapshot,
    SprayLabEvidenceLevel,
    SprayLabFidelityTier,
    SprayLabSessionEvent,
    SprayLabSessionEventType,
    SprayLabSessionSnapshot,
    SprayLabSessionStatus,
    SprayLabStepState,
    SprayLabValidationLink,
    SprayLabValidationStatus,
} from '@/types/engine';
import type {
    TrainingProgramAdaptiveWeek,
    TrainingProgramCheckpoint,
    TrainingProgramCheckpointLayer,
    TrainingProgramCheckpointOutcome,
    TrainingProgramCycleSnapshot,
    TrainingProgramEvidenceReference,
    TrainingProgramEvidenceSummary,
    TrainingProgramEventType,
    TrainingProgramKind,
    TrainingProgramMission,
    TrainingProgramMissionCategory,
    TrainingProgramMissionSlot,
    TrainingProgramMissionStatus,
    TrainingProgramReasonCode,
    TrainingProgramRecoveryAction,
    TrainingProgramState,
    TrainingProgramTransitionEvent,
} from '@/types/training-programs';
import type {
    CommunityEntitlementKey,
    CommunityMissionCadence,
    CommunityMissionStatus,
    CommunityMissionType,
    CommunityPostStatus,
    CommunityPostType,
    CommunityPostVisibility,
    CommunityProgressionAggregateScope,
    CommunityProgressionEntityType,
    CommunityProgressionEventType,
    CommunityProgressionStreakState,
    CommunityRewardDisplayState,
    CommunityRewardKind,
    CommunityRewardOwnerType,
    CommunityRewardStatus,
    CommunitySeasonStatus,
    CommunitySquadMembershipStatus,
    CommunitySquadInviteStatus,
    CommunitySquadRole,
    CommunitySquadStatus,
    CommunitySquadVisibility,
} from '@/types/community';
import type {
    BillingStatus,
    MonetizationEventType,
    MonetizationFlagKey,
    ProductAccessState,
    ProductEntitlementKey,
    ProductEntitlementStatus,
    ProductEntitlementGatingMode,
    ProductFeatureTier,
    ProductPriceKey,
    ProductQuotaState,
    ProductTier,
    QuotaReasonCode,
} from '@/types/monetization';
import type {
    SocialProCollectionMode,
    SocialProLibraryItemKind,
    SocialProPrivateLinkStatus,
    SocialProPublicReport,
    SocialProReportModerationReason,
    SocialProReportStatus,
    SocialProReportVisibility,
} from '@/types/social-pro';
import type {
    TeamCoachAuditEventType,
    TeamCoachConsentScope,
    TeamCoachConsentStatus,
    TeamCoachHonestyFields,
    TeamCoachInviteStatus,
    TeamCoachMembershipStatus,
    TeamCoachNextActionKind,
    TeamCoachPacketStatus,
    TeamCoachPacketVisibility,
    TeamCoachPrivateLinkStatus,
    TeamCoachReviewStatus,
    TeamCoachSeatState,
    TeamCoachShareStatus,
    TeamCoachWorkspaceRole,
    TeamCoachWorkspaceStatus,
} from '@/types/team-coach';

export type WeaponProfileAttachmentSlot = 'muzzle' | 'grip' | 'stock';

export interface WeaponProfileLegacyGripMultiplier {
    readonly vertical: number;
    readonly horizontal: number;
}

export interface WeaponProfileLegacyMultipliers {
    readonly muzzle_brake?: number;
    readonly compensator?: number;
    readonly heavy_stock?: number;
    readonly vertical_grip?: WeaponProfileLegacyGripMultiplier;
    readonly half_grip?: WeaponProfileLegacyGripMultiplier;
    readonly tilted_grip?: WeaponProfileLegacyGripMultiplier;
    readonly [key: string]: unknown;
}

export interface WeaponProfileAttachmentEffects {
    readonly verticalRecoil?: number;
    readonly horizontalRecoil?: number;
    readonly cameraShake?: number;
    readonly recoilRecovery?: number;
    readonly recoilRecoveryAfterShot?: number;
    readonly adsSpeed?: number;
    readonly hipFireAccuracy?: number;
    readonly initialShotRecoil?: number;
    readonly muzzleRise?: number;
    readonly breathingSway?: number;
    readonly firingSway?: number;
}

export interface WeaponProfileAttachmentModifier {
    readonly slot: WeaponProfileAttachmentSlot;
    readonly multipliers: WeaponProfileAttachmentEffects;
}

export interface WeaponProfileCanonical {
    readonly schemaVersion: 1;
    readonly sourcePatchVersion: string;
    readonly baseStats: {
        readonly verticalRecoil: number;
        readonly horizontalRecoil: number;
        readonly fireRateMs: number;
    };
    readonly supportedSlots: readonly WeaponProfileAttachmentSlot[];
    readonly attachmentProfiles: Record<string, WeaponProfileAttachmentModifier>;
}

export type WeaponPatchLifecycleStatus = 'active' | 'deprecated' | 'removed';
export type CommunityProfileVisibility = 'public' | 'hidden';
export type CommunityCreatorProgramStatus = 'none' | 'waitlist' | 'approved' | 'suspended';
export type CommunityProfileLink = {
    readonly label: string;
    readonly url: string;
};
export type CommunityPostCopySensPreset = CommunityPostAnalysisSnapshot['sensSnapshot'];
export type CommunityPostCopyTarget = 'clipboard' | 'profile_draft' | 'preset';
export type CommunityCommentStatus = 'visible' | 'author_deleted' | 'moderator_hidden';
export type CommunityReportEntityType =
    | 'post'
    | 'comment'
    | 'profile'
    | 'social_pro_report'
    | 'social_pro_report_link';
export type CommunityReportStatus = 'open' | 'reviewed' | 'dismissed' | 'actioned';
export type CommunityFeatureEntitlementStatus = 'inactive' | 'active';
export type CommunityUserEntitlementSource =
    | 'manual'
    | 'subscription_future'
    | 'creator_program_future';
export interface CommunityMissionEligibleAction {
    readonly eventType: CommunityProgressionEventType;
    readonly title: string;
    readonly description?: string;
    readonly entityType?: CommunityProgressionEntityType;
}
export interface CommunityMissionConfig {
    readonly targetCount: number;
    readonly eligibleEventTypes: readonly CommunityProgressionEventType[];
    readonly metadata?: Record<string, unknown>;
}
export interface CommunitySquadGoalState {
    readonly goalKey: string;
    readonly title: string;
    readonly description?: string;
    readonly targetCount: number;
    readonly currentCount: number;
    readonly eligibleEventTypes: readonly CommunityProgressionEventType[];
    readonly windowStartedAt?: string;
    readonly windowEndsAt?: string;
}
export interface CommunityRewardPublicPayload {
    readonly label?: string;
    readonly shortLabel?: string;
    readonly description?: string;
    readonly factualContext?: string;
    readonly iconKey?: string;
}

export interface PrecisionEvolutionLinePayload {
    readonly trend?: PrecisionTrendSummary;
    readonly nextValidationHint?: string;
    readonly blockedClips?: readonly unknown[];
    readonly validResultIds?: readonly string[];
    readonly metadata?: Record<string, unknown>;
}

export interface PrecisionCheckpointPayload {
    readonly trend: PrecisionTrendSummary;
    readonly nextValidationHint: string;
    readonly blockerReasons?: readonly unknown[];
    readonly metadata?: Record<string, unknown>;
}

export interface CoachProtocolOutcomePayload {
    readonly coachSnapshot?: CoachProtocolOutcomeCoachSnapshot;
    readonly precisionTrendLabel?: PrecisionTrendSummary['label'];
    readonly validationTarget?: string;
    readonly recordedBy?: 'user';
    readonly metadata?: Record<string, unknown>;
}

export type CompleteTrainingProtocolRevisionTierDirection =
    | 'stronger'
    | 'same'
    | 'more_conservative';

export type CompleteTrainingProtocolChangedFieldsPayload =
    | readonly string[]
    | Record<string, unknown>;

export interface CompleteTrainingProtocolRevisionEvidencePayload {
    readonly source?: 'compatible_clip' | 'outcome' | 'transfer' | 'manual_review' | 'system';
    readonly summary?: string;
    readonly metadata?: Record<string, unknown>;
    readonly [key: string]: unknown;
}

export interface SprayLabSessionPayload {
    readonly snapshot: SprayLabSessionSnapshot;
    readonly metadata?: Record<string, unknown>;
}

export interface SprayLabSessionEventPayload {
    readonly event: SprayLabSessionEvent;
    readonly metadata?: Record<string, unknown>;
}

export interface TrainingProgramCyclePayload {
    readonly snapshot: TrainingProgramCycleSnapshot;
    readonly metadata?: Record<string, unknown>;
}

export interface TrainingProgramWeekPayload {
    readonly week: TrainingProgramAdaptiveWeek;
    readonly metadata?: Record<string, unknown>;
}

export interface TrainingProgramMissionPayload {
    readonly mission: TrainingProgramMission;
    readonly metadata?: Record<string, unknown>;
}

export interface TrainingProgramCheckpointPayload {
    readonly checkpoint: TrainingProgramCheckpoint;
    readonly metadata?: Record<string, unknown>;
}

export interface TrainingProgramEventPayload {
    readonly event: TrainingProgramTransitionEvent;
    readonly metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════
// Auth.js Tables (NextAuth adapter)
// ═══════════════════════════════════════════

export type SocialProCollectionVisibility = 'private';

export interface SocialProReportPayload {
    readonly publicSafeSnapshotVersion: 1;
    readonly sourceIds?: {
        readonly analysisSessionId?: string;
        readonly historySessionId?: string;
        readonly protocolRevisionId?: string;
        readonly sprayLabSessionId?: string;
        readonly trainingProgramCycleId?: string;
        readonly validationLinkId?: string;
    };
    readonly visibleOptionalSections?: readonly string[];
    readonly evidenceLabels?: Record<string, string>;
}

export interface SocialProReportLinkPayload {
    readonly createdReason?: string;
    readonly regeneratedReason?: string;
    readonly revokedReason?: string;
}

export interface SocialProReportAuditMetadata {
    readonly actionSource?: string;
    readonly requestId?: string;
    readonly [key: string]: unknown;
}

export interface SocialProCollectionPayload {
    readonly automaticRuleId?: string;
    readonly sourceSurface?: string;
    readonly [key: string]: unknown;
}

export interface SocialProCollectionContextFacets {
    readonly weaponId?: string;
    readonly opticId?: string;
    readonly distanceMeters?: number;
    readonly diagnosisKey?: string;
    readonly activeLineId?: string;
    readonly programCycleId?: string;
    readonly sprayLabLaneId?: string;
    readonly objectiveKey?: string;
    readonly validationState?: string;
    readonly blockerKey?: string;
    readonly [key: string]: unknown;
}

export interface TeamCoachWorkspacePayload {
    readonly source?: 'manual_beta' | 'admin_grant' | 'system';
    readonly [key: string]: unknown;
}

export interface TeamCoachMembershipPayload {
    readonly invitedByUserId?: string;
    readonly statusReason?: string;
    readonly [key: string]: unknown;
}

export interface TeamCoachInvitePayload {
    readonly createdReason?: string;
    readonly revokedReason?: string;
    readonly acceptedReason?: string;
    readonly [key: string]: unknown;
}

export interface TeamCoachSafeReportSnapshot {
    readonly honesty: TeamCoachHonestyFields;
    readonly sourceSummary?: Record<string, unknown>;
    readonly sections?: Record<string, unknown>;
    readonly [key: string]: unknown;
}

export interface TeamCoachSharePayload {
    readonly sourceIds?: {
        readonly analysisSessionId?: string;
        readonly historySessionId?: string;
        readonly protocolRevisionId?: string;
        readonly sprayLabSessionId?: string;
        readonly trainingProgramCycleId?: string;
        readonly validationLinkId?: string;
    };
    readonly [key: string]: unknown;
}

export interface TeamCoachReviewNotePayload {
    readonly visibility?: 'workspace_private';
    readonly [key: string]: unknown;
}

export interface TeamCoachReviewStatusPayload {
    readonly requestedNextAction?: TeamCoachNextActionKind;
    readonly [key: string]: unknown;
}

export interface TeamCoachReviewPacketPayload {
    readonly printExportEnabled?: boolean;
    readonly sourceList?: readonly string[];
    readonly [key: string]: unknown;
}

export interface TeamCoachPacketLinkPayload {
    readonly createdReason?: string;
    readonly revokedReason?: string;
    readonly [key: string]: unknown;
}

export interface TeamCoachSeatLedgerMetadata {
    readonly reason?: string;
    readonly source?: 'invite' | 'membership' | 'workspace';
    readonly [key: string]: unknown;
}

export interface TeamCoachAuditMetadata {
    readonly requestId?: string;
    readonly actionSource?: string;
    readonly [key: string]: unknown;
}

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name'),
    email: text('email').unique(),
    emailVerified: timestamp('email_verified', { mode: 'date' }),
    image: text('image'),
    language: text('language').default('pt-BR').notNull(),
    discordId: text('discord_id').unique(),
    role: text('role').default('user').notNull(),

    // Player Settings (Added in Phase 1)
    fov: integer('fov').default(90).notNull(),
    resolution: text('resolution').default('1920x1080').notNull(),
    mouseDpi: integer('mouse_dpi').default(800).notNull(),
    sensGeneral: real('sens_general').default(50).notNull(),
    sens1x: real('sens_1x').default(50).notNull(),
    sens3x: real('sens_3x').default(50).notNull(),
    sens4x: real('sens_4x').default(50).notNull(),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
    profile: one(playerProfiles, {
        fields: [users.id],
        references: [playerProfiles.userId],
    }),
    analyses: many(analysisSessions),
    sensitivityHistory: many(sensitivityHistory),
    communityProfile: one(communityProfiles, {
        fields: [users.id],
        references: [communityProfiles.userId],
    }),
    communityPosts: many(communityPosts),
    communityPostCopyEvents: many(communityPostCopyEvents),
    userEntitlements: many(userEntitlements),
    progressionAggregates: many(communityUserProgressionAggregates),
    progressionEventsAuthored: many(communityProgressionEvents, {
        relationName: 'community_progression_events_actor',
    }),
    progressionEventsBenefited: many(communityProgressionEvents, {
        relationName: 'community_progression_events_beneficiary',
    }),
    coachProtocolOutcomes: many(coachProtocolOutcomes),
    completeTrainingProtocolRevisions: many(completeTrainingProtocolRevisions),
    trainingProtocolTransferRecords: many(trainingProtocolTransferRecords),
    sprayLabSessions: many(sprayLabSessions),
    sprayLabSessionEvents: many(sprayLabSessionEvents),
    sprayLabBenchmarkSnapshots: many(sprayLabBenchmarkSnapshots),
    sprayLabValidationLinks: many(sprayLabValidationLinks),
    trainingProgramCycles: many(trainingProgramCycles),
    trainingProgramWeeks: many(trainingProgramWeeks),
    trainingProgramMissions: many(trainingProgramMissions),
    trainingProgramCheckpoints: many(trainingProgramCheckpoints),
    trainingProgramEvents: many(trainingProgramEvents),
    squadOwnerships: many(communitySquads, {
        relationName: 'community_squads_owner',
    }),
    squadMemberships: many(communitySquadMemberships),
    squadInvitesCreated: many(communitySquadInvites, {
        relationName: 'community_squad_invites_creator',
    }),
    squadInvitesReceived: many(communitySquadInvites, {
        relationName: 'community_squad_invites_invited_user',
    }),
    squadInvitesAccepted: many(communitySquadInvites, {
        relationName: 'community_squad_invites_accepted_user',
    }),
    rewardRecords: many(communityRewardRecords),
}));

export const accounts = pgTable(
    'accounts',
    {
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        type: text('type').$type<AdapterAccount['type']>().notNull(),
        provider: text('provider').notNull(),
        providerAccountId: text('provider_account_id').notNull(),
        refresh_token: text('refresh_token'),
        access_token: text('access_token'),
        expires_at: integer('expires_at'),
        token_type: text('token_type'),
        scope: text('scope'),
        id_token: text('id_token'),
        session_state: text('session_state'),
    },
    (account) => [
        primaryKey({ columns: [account.provider, account.providerAccountId] }),
    ]
);

export const sessions = pgTable('sessions', {
    sessionToken: text('session_token').primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
    'verification_tokens',
    {
        identifier: text('identifier').notNull(),
        token: text('token').notNull(),
        expires: timestamp('expires', { mode: 'date' }).notNull(),
    },
    (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ═══════════════════════════════════════════
// Player Profiles
// ═══════════════════════════════════════════

export const playerProfiles = pgTable('player_profiles', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .unique()
        .references(() => users.id, { onDelete: 'cascade' }),

    // Mouse
    mouseModel: text('mouse_model').notNull(),
    mouseSensor: text('mouse_sensor').notNull(),
    mouseDpi: integer('mouse_dpi').notNull(),
    mousePollingRate: integer('mouse_polling_rate').notNull(),
    mouseWeight: real('mouse_weight').notNull(),
    mouseLod: real('mouse_lod').notNull(),

    // Mousepad
    mousepadModel: text('mousepad_model').notNull(),
    mousepadWidth: real('mousepad_width').notNull(),
    mousepadHeight: real('mousepad_height').notNull(),
    mousepadType: text('mousepad_type').notNull(), // speed | control | hybrid
    mousepadMaterial: text('mousepad_material').notNull(), // cloth | hard | glass

    // Style
    gripStyle: text('grip_style').notNull(), // palm | claw | fingertip | hybrid
    playStyle: text('play_style').notNull(), // arm | wrist | hybrid

    // Monitor
    monitorResolution: text('monitor_resolution').notNull(),
    monitorRefreshRate: integer('monitor_refresh_rate').notNull(),
    monitorPanel: text('monitor_panel').notNull(), // ips | tn | va

    // PUBG Settings
    generalSens: real('general_sens').notNull(),
    adsSens: real('ads_sens').notNull(),
    scopeSens: jsonb('scope_sens').notNull().$type<Record<string, number>>(),
    fov: integer('fov').notNull(),
    verticalMultiplier: real('vertical_multiplier').notNull(),
    mouseAcceleration: boolean('mouse_acceleration').notNull().default(false),

    // Physical
    armLength: text('arm_length').notNull(), // short | medium | long
    deskSpace: real('desk_space').notNull(), // cm

    // Identity & Social
    bio: text('bio'),
    twitter: text('twitter'),
    twitch: text('twitch'),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const playerProfilesRelations = relations(playerProfiles, ({ one }) => ({
    user: one(users, {
        fields: [playerProfiles.userId],
        references: [users.id],
    }),
}));

// ═══════════════════════════════════════════
// Analysis Sessions
// ═══════════════════════════════════════════

export const analysisSessions = pgTable('analysis_sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    weaponId: text('weapon_id').notNull(),
    scopeId: text('scope_id').notNull(),
    patchVersion: text('patch_version').notNull(),
    stance: text('stance').notNull().default('standing'),
    attachments: jsonb('attachments').notNull().default('{}').$type<{ muzzle: string; grip: string; stock: string }>(),
    distance: integer('distance').notNull(),

    // Metrics snapshot
    stabilityScore: real('stability_score').notNull(),
    verticalControl: real('vertical_control').notNull(),
    horizontalNoise: real('horizontal_noise').notNull(),
    recoilResponseMs: real('recoil_response_ms').notNull(),
    driftBias: jsonb('drift_bias').notNull().$type<{ direction: string; magnitude: number }>(),
    consistencyScore: real('consistency_score').notNull(),

    // Diagnoses
    diagnoses: jsonb('diagnoses').notNull().$type<string[]>(),

    // Full analysis data
    trajectoryData: jsonb('trajectory_data').$type<Record<string, unknown>>(),
    coachingData: jsonb('coaching_data').$type<Record<string, unknown>[]>(),
    fullResult: jsonb('full_result').$type<Record<string, unknown>>(), // Stores the complete AnalysisResult

    // Scoring (Added in Phase 1)
    sprayScore: integer('spray_score').default(0).notNull(),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const precisionEvolutionLines = pgTable('precision_evolution_lines', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    compatibilityKey: text('compatibility_key').notNull(),
    status: text('status').$type<PrecisionCheckpointState>().notNull(),
    variableInTest: text('variable_in_test').$type<PrecisionVariableInTest>().notNull(),
    baselineSessionId: uuid('baseline_session_id')
        .references(() => analysisSessions.id, { onDelete: 'set null' }),
    currentSessionId: uuid('current_session_id')
        .references(() => analysisSessions.id, { onDelete: 'set null' }),
    validClipCount: integer('valid_clip_count').default(0).notNull(),
    blockedClipCount: integer('blocked_clip_count').default(0).notNull(),
    payload: jsonb('payload').default('{}').notNull().$type<PrecisionEvolutionLinePayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex('precision_evolution_lines_user_key_uidx').on(table.userId, table.compatibilityKey),
    index('precision_evolution_lines_user_status_idx').on(table.userId, table.status),
    index('precision_evolution_lines_current_session_idx').on(table.currentSessionId),
]);

export const precisionCheckpoints = pgTable('precision_checkpoints', {
    id: uuid('id').defaultRandom().primaryKey(),
    lineId: uuid('line_id')
        .notNull()
        .references(() => precisionEvolutionLines.id, { onDelete: 'cascade' }),
    analysisSessionId: uuid('analysis_session_id')
        .references(() => analysisSessions.id, { onDelete: 'set null' }),
    state: text('state').$type<PrecisionCheckpointState>().notNull(),
    variableInTest: text('variable_in_test').$type<PrecisionVariableInTest>().notNull(),
    payload: jsonb('payload').default('{}').notNull().$type<PrecisionCheckpointPayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index('precision_checkpoints_line_created_idx').on(table.lineId, table.createdAt),
    index('precision_checkpoints_session_idx').on(table.analysisSessionId),
]);

export const coachProtocolOutcomes = pgTable('coach_protocol_outcomes', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    analysisSessionId: uuid('analysis_session_id')
        .notNull()
        .references(() => analysisSessions.id, { onDelete: 'cascade' }),
    coachPlanId: text('coach_plan_id').notNull(),
    protocolId: text('protocol_id').notNull(),
    focusArea: text('focus_area').$type<CoachFocusArea>().notNull(),
    status: text('status').$type<CoachProtocolOutcomeStatus>().notNull(),
    reasonCodes: jsonb('reason_codes')
        .notNull()
        .default('[]')
        .$type<readonly CoachProtocolOutcomeReasonCode[]>(),
    note: text('note'),
    revisionOfId: uuid('revision_of_id').references(
        (): AnyPgColumn => coachProtocolOutcomes.id,
        { onDelete: 'set null' },
    ),
    evidenceStrength: text('evidence_strength').$type<CoachOutcomeEvidenceStrength>().notNull(),
    conflictPayload: jsonb('conflict_payload').$type<CoachOutcomeConflict>(),
    payload: jsonb('payload')
        .notNull()
        .default('{}')
        .$type<CoachProtocolOutcomePayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index('coach_protocol_outcomes_user_status_updated_idx').on(table.userId, table.status, table.updatedAt),
    index('coach_protocol_outcomes_session_created_idx').on(table.analysisSessionId, table.createdAt),
    index('coach_protocol_outcomes_user_protocol_idx').on(table.userId, table.protocolId),
    index('coach_protocol_outcomes_revision_idx').on(table.revisionOfId),
]);

export const completeTrainingProtocolRevisions = pgTable('complete_training_protocol_revisions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    analysisSessionId: uuid('analysis_session_id')
        .notNull()
        .references(() => analysisSessions.id, { onDelete: 'cascade' }),
    coachPlanId: text('coach_plan_id').notNull(),
    protocolId: text('protocol_id').notNull(),
    revisionReason: text('revision_reason').notNull(),
    tierDirection: text('tier_direction')
        .$type<CompleteTrainingProtocolRevisionTierDirection>()
        .notNull(),
    changedFields: jsonb('changed_fields')
        .notNull()
        .$type<CompleteTrainingProtocolChangedFieldsPayload>(),
    previousProtocol: jsonb('previous_protocol')
        .notNull()
        .$type<CompleteTrainingProtocol>(),
    revisedProtocol: jsonb('revised_protocol')
        .notNull()
        .$type<CompleteTrainingProtocol>(),
    evidencePayload: jsonb('evidence_payload')
        .notNull()
        .$type<CompleteTrainingProtocolRevisionEvidencePayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index('complete_training_protocol_revisions_user_session_idx').on(table.userId, table.analysisSessionId),
    index('complete_training_protocol_revisions_protocol_idx').on(table.protocolId),
]);

export const trainingProtocolTransferRecords = pgTable('training_protocol_transfer_records', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    analysisSessionId: uuid('analysis_session_id')
        .notNull()
        .references(() => analysisSessions.id, { onDelete: 'cascade' }),
    protocolId: text('protocol_id').notNull(),
    situation: text('situation').notNull(),
    weaponId: text('weapon_id'),
    opticId: text('optic_id'),
    approximateDistanceMeters: integer('approximate_distance_meters'),
    pressureLevel: text('pressure_level').notNull(),
    feltControl: text('felt_control').notNull(),
    result: text('result').notNull(),
    note: text('note'),
    countsAsTechnicalValidation: boolean('counts_as_technical_validation').default(false).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index('training_protocol_transfer_records_user_session_idx').on(table.userId, table.analysisSessionId),
    index('training_protocol_transfer_records_protocol_idx').on(table.protocolId),
]);

export const sprayLabSessions = pgTable('spray_lab_sessions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    baseAnalysisSessionId: uuid('base_analysis_session_id')
        .notNull()
        .references(() => analysisSessions.id, { onDelete: 'cascade' }),
    protocolRevisionId: uuid('protocol_revision_id').references(
        () => completeTrainingProtocolRevisions.id,
        { onDelete: 'set null' },
    ),
    protocolId: text('protocol_id').notNull(),
    laneId: text('lane_id').notNull(),
    contextKey: text('context_key').notNull(),
    status: text('status').$type<SprayLabSessionStatus>().notNull().default('draft'),
    act: text('act').$type<SprayLabAct>().notNull().default('preparar'),
    stepState: text('step_state').$type<SprayLabStepState>().notNull().default('preparar'),
    evidenceLevel: text('evidence_level').$type<SprayLabEvidenceLevel>().notNull().default('practice'),
    fidelityTier: text('fidelity_tier').$type<SprayLabFidelityTier>(),
    validationStatus: text('validation_status')
        .$type<SprayLabValidationStatus>()
        .notNull()
        .default('not_requested'),
    snapshot: jsonb('snapshot').notNull().$type<SprayLabSessionSnapshot>(),
    payload: jsonb('payload').notNull().default('{}').$type<SprayLabSessionPayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { mode: 'date' }),
}, (table) => [
    index('spray_lab_sessions_user_status_updated_idx').on(table.userId, table.status, table.updatedAt),
    index('spray_lab_sessions_base_analysis_idx').on(table.baseAnalysisSessionId),
    index('spray_lab_sessions_user_base_idx').on(table.userId, table.baseAnalysisSessionId),
    index('spray_lab_sessions_context_status_idx').on(table.contextKey, table.status),
    index('spray_lab_sessions_protocol_revision_idx').on(table.protocolRevisionId),
]);

export const sprayLabSessionEvents = pgTable('spray_lab_session_events', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    labSessionId: uuid('lab_session_id')
        .notNull()
        .references(() => sprayLabSessions.id, { onDelete: 'cascade' }),
    eventId: text('event_id').notNull(),
    eventType: text('event_type').$type<SprayLabSessionEventType>().notNull(),
    act: text('act').$type<SprayLabAct>().notNull(),
    stepState: text('step_state').$type<SprayLabStepState>().notNull(),
    occurredAt: timestamp('occurred_at', { mode: 'date' }).notNull(),
    payload: jsonb('payload').notNull().$type<SprayLabSessionEventPayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex('spray_lab_session_events_session_event_uidx').on(table.labSessionId, table.eventId),
    index('spray_lab_session_events_user_created_idx').on(table.userId, table.createdAt),
    index('spray_lab_session_events_session_created_idx').on(table.labSessionId, table.createdAt),
]);

export const sprayLabBenchmarkSnapshots = pgTable('spray_lab_benchmark_snapshots', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    labSessionId: uuid('lab_session_id')
        .notNull()
        .references(() => sprayLabSessions.id, { onDelete: 'cascade' }),
    baseAnalysisSessionId: uuid('base_analysis_session_id')
        .notNull()
        .references(() => analysisSessions.id, { onDelete: 'cascade' }),
    protocolRevisionId: uuid('protocol_revision_id').references(
        () => completeTrainingProtocolRevisions.id,
        { onDelete: 'set null' },
    ),
    protocolId: text('protocol_id').notNull(),
    laneId: text('lane_id').notNull(),
    contextKey: text('context_key').notNull(),
    evidenceLevel: text('evidence_level').$type<SprayLabEvidenceLevel>().notNull(),
    fidelityTier: text('fidelity_tier').$type<SprayLabFidelityTier>().notNull(),
    validationStatus: text('validation_status').$type<SprayLabValidationStatus>().notNull(),
    eligibleForReleaseBenchmark: boolean('eligible_for_release_benchmark').default(false).notNull(),
    snapshot: jsonb('snapshot').notNull().$type<SprayLabBenchmarkSnapshot>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index('spray_lab_benchmark_snapshots_user_context_idx').on(table.userId, table.contextKey),
    index('spray_lab_benchmark_snapshots_session_created_idx').on(table.labSessionId, table.createdAt),
    index('spray_lab_benchmark_snapshots_base_analysis_idx').on(table.baseAnalysisSessionId),
    index('spray_lab_benchmark_snapshots_release_idx').on(table.eligibleForReleaseBenchmark, table.createdAt),
]);

export const sprayLabValidationLinks = pgTable('spray_lab_validation_links', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    labSessionId: uuid('lab_session_id')
        .notNull()
        .references(() => sprayLabSessions.id, { onDelete: 'cascade' }),
    baseAnalysisSessionId: uuid('base_analysis_session_id')
        .notNull()
        .references(() => analysisSessions.id, { onDelete: 'cascade' }),
    validationAnalysisSessionId: uuid('validation_analysis_session_id').references(
        () => analysisSessions.id,
        { onDelete: 'set null' },
    ),
    contextKey: text('context_key').notNull(),
    status: text('status').$type<SprayLabValidationStatus>().notNull().default('pending'),
    confirmedVariables: boolean('confirmed_variables').default(false).notNull(),
    payload: jsonb('payload').notNull().$type<SprayLabValidationLink>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index('spray_lab_validation_links_user_status_idx').on(table.userId, table.status),
    index('spray_lab_validation_links_lab_session_idx').on(table.labSessionId),
    index('spray_lab_validation_links_base_analysis_idx').on(table.baseAnalysisSessionId),
    index('spray_lab_validation_links_validation_analysis_idx').on(table.validationAnalysisSessionId),
    index('spray_lab_validation_links_context_status_idx').on(table.contextKey, table.status),
]);

export const trainingProgramCycles = pgTable('training_program_cycles', {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    baseAnalysisSessionId: uuid('base_analysis_session_id')
        .notNull()
        .references(() => analysisSessions.id, { onDelete: 'cascade' }),
    protocolRevisionId: uuid('protocol_revision_id').references(
        () => completeTrainingProtocolRevisions.id,
        { onDelete: 'set null' },
    ),
    protocolId: text('protocol_id'),
    activeLineId: text('active_line_id'),
    activeLineContextKey: text('active_line_context_key').notNull(),
    strictContextKey: text('strict_context_key').notNull(),
    kind: text('kind').$type<TrainingProgramKind>().notNull(),
    state: text('state').$type<TrainingProgramState>().notNull(),
    currentWeekNumber: integer('current_week_number').default(1).notNull(),
    currentMissionId: text('current_mission_id'),
    recoveryAction: text('recovery_action').$type<TrainingProgramRecoveryAction>().notNull(),
    reasonCodes: jsonb('reason_codes')
        .notNull()
        .default('[]')
        .$type<readonly TrainingProgramReasonCode[]>(),
    visibleReason: text('visible_reason').notNull(),
    blockerSummary: text('blocker_summary').notNull(),
    snapshot: jsonb('snapshot').notNull().$type<TrainingProgramCycleSnapshot>(),
    payload: jsonb('payload').notNull().default('{}').$type<TrainingProgramCyclePayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { mode: 'date' }),
    completedAt: timestamp('completed_at', { mode: 'date' }),
}, (table) => [
    index('training_program_cycles_user_state_updated_idx').on(table.userId, table.state, table.updatedAt),
    index('training_program_cycles_user_kind_updated_idx').on(table.userId, table.kind, table.updatedAt),
    index('training_program_cycles_user_context_state_idx').on(table.userId, table.strictContextKey, table.state),
    index('training_program_cycles_base_analysis_idx').on(table.baseAnalysisSessionId),
    index('training_program_cycles_active_line_idx').on(table.userId, table.activeLineContextKey),
    index('training_program_cycles_current_mission_idx').on(table.currentMissionId),
]);

export const trainingProgramWeeks = pgTable('training_program_weeks', {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    cycleId: text('cycle_id')
        .notNull()
        .references(() => trainingProgramCycles.id, { onDelete: 'cascade' }),
    weekNumber: integer('week_number').notNull(),
    state: text('state').$type<TrainingProgramState>().notNull(),
    recoveryAction: text('recovery_action').$type<TrainingProgramRecoveryAction>(),
    reasonCodes: jsonb('reason_codes')
        .notNull()
        .default('[]')
        .$type<readonly TrainingProgramReasonCode[]>(),
    canIncreaseDifficulty: boolean('can_increase_difficulty').default(false).notNull(),
    snapshot: jsonb('snapshot').notNull().$type<TrainingProgramAdaptiveWeek>(),
    payload: jsonb('payload').notNull().default('{}').$type<TrainingProgramWeekPayload>(),
    startedAt: timestamp('started_at', { mode: 'date' }),
    closedAt: timestamp('closed_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex('training_program_weeks_cycle_week_uidx').on(table.cycleId, table.weekNumber),
    index('training_program_weeks_user_state_updated_idx').on(table.userId, table.state, table.updatedAt),
    index('training_program_weeks_cycle_state_idx').on(table.cycleId, table.state),
]);

export const trainingProgramMissions = pgTable('training_program_missions', {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    cycleId: text('cycle_id')
        .notNull()
        .references(() => trainingProgramCycles.id, { onDelete: 'cascade' }),
    weekId: text('week_id')
        .notNull()
        .references(() => trainingProgramWeeks.id, { onDelete: 'cascade' }),
    weekNumber: integer('week_number').notNull(),
    slot: text('slot').$type<TrainingProgramMissionSlot>().notNull(),
    category: text('category').$type<TrainingProgramMissionCategory>().notNull(),
    status: text('status').$type<TrainingProgramMissionStatus>().notNull(),
    stateAfterCompletion: text('state_after_completion').$type<TrainingProgramState>().notNull(),
    protocolRevisionId: uuid('protocol_revision_id').references(
        () => completeTrainingProtocolRevisions.id,
        { onDelete: 'set null' },
    ),
    protocolId: text('protocol_id'),
    labSessionId: uuid('lab_session_id').references(() => sprayLabSessions.id, { onDelete: 'set null' }),
    validationLinkId: uuid('validation_link_id').references(() => sprayLabValidationLinks.id, { onDelete: 'set null' }),
    reasonCodes: jsonb('reason_codes')
        .notNull()
        .default('[]')
        .$type<readonly TrainingProgramReasonCode[]>(),
    evidenceRefs: jsonb('evidence_refs')
        .notNull()
        .default('[]')
        .$type<readonly TrainingProgramEvidenceReference[]>(),
    visibleReason: text('visible_reason').notNull(),
    snapshot: jsonb('snapshot').notNull().$type<TrainingProgramMission>(),
    payload: jsonb('payload').notNull().default('{}').$type<TrainingProgramMissionPayload>(),
    startedAt: timestamp('started_at', { mode: 'date' }),
    completedAt: timestamp('completed_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex('training_program_missions_week_slot_uidx').on(table.weekId, table.slot),
    index('training_program_missions_user_status_updated_idx').on(table.userId, table.status, table.updatedAt),
    index('training_program_missions_cycle_status_idx').on(table.cycleId, table.status),
    index('training_program_missions_cycle_week_idx').on(table.cycleId, table.weekNumber),
    index('training_program_missions_lab_session_idx').on(table.labSessionId),
    index('training_program_missions_validation_link_idx').on(table.validationLinkId),
]);

export const trainingProgramCheckpoints = pgTable('training_program_checkpoints', {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    cycleId: text('cycle_id')
        .notNull()
        .references(() => trainingProgramCycles.id, { onDelete: 'cascade' }),
    weekId: text('week_id').references(() => trainingProgramWeeks.id, { onDelete: 'set null' }),
    weekNumber: integer('week_number'),
    layer: text('layer').$type<TrainingProgramCheckpointLayer>().notNull(),
    state: text('state').$type<TrainingProgramState>().notNull(),
    outcome: text('outcome').$type<TrainingProgramCheckpointOutcome>().notNull(),
    nextRecommendation: text('next_recommendation').$type<TrainingProgramRecoveryAction>().notNull(),
    canIncreaseDifficulty: boolean('can_increase_difficulty').default(false).notNull(),
    labSessionId: uuid('lab_session_id').references(() => sprayLabSessions.id, { onDelete: 'set null' }),
    validationLinkId: uuid('validation_link_id').references(() => sprayLabValidationLinks.id, { onDelete: 'set null' }),
    precisionCheckpointId: uuid('precision_checkpoint_id').references(() => precisionCheckpoints.id, { onDelete: 'set null' }),
    reasonCodes: jsonb('reason_codes')
        .notNull()
        .default('[]')
        .$type<readonly TrainingProgramReasonCode[]>(),
    evidenceSnapshot: jsonb('evidence_snapshot').notNull().$type<TrainingProgramEvidenceSummary>(),
    snapshot: jsonb('snapshot').notNull().$type<TrainingProgramCheckpoint>(),
    payload: jsonb('payload').notNull().default('{}').$type<TrainingProgramCheckpointPayload>(),
    summary: text('summary').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index('training_program_checkpoints_cycle_layer_created_idx').on(table.cycleId, table.layer, table.createdAt),
    index('training_program_checkpoints_user_layer_created_idx').on(table.userId, table.layer, table.createdAt),
    index('training_program_checkpoints_week_idx').on(table.weekId),
    index('training_program_checkpoints_validation_link_idx').on(table.validationLinkId),
    index('training_program_checkpoints_precision_idx').on(table.precisionCheckpointId),
]);

export const trainingProgramEvents = pgTable('training_program_events', {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    cycleId: text('cycle_id')
        .notNull()
        .references(() => trainingProgramCycles.id, { onDelete: 'cascade' }),
    missionId: text('mission_id').references(() => trainingProgramMissions.id, { onDelete: 'set null' }),
    checkpointId: text('checkpoint_id').references(() => trainingProgramCheckpoints.id, { onDelete: 'set null' }),
    eventType: text('event_type').$type<TrainingProgramEventType>().notNull(),
    fromState: text('from_state').$type<TrainingProgramState>().notNull(),
    toState: text('to_state').$type<TrainingProgramState>().notNull(),
    reasonCodes: jsonb('reason_codes')
        .notNull()
        .default('[]')
        .$type<readonly TrainingProgramReasonCode[]>(),
    evidenceRefs: jsonb('evidence_refs')
        .notNull()
        .default('[]')
        .$type<readonly TrainingProgramEvidenceReference[]>(),
    userVisibleReason: text('user_visible_reason').notNull(),
    payload: jsonb('payload').notNull().$type<TrainingProgramEventPayload>(),
    occurredAt: timestamp('occurred_at', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index('training_program_events_cycle_occurred_idx').on(table.cycleId, table.occurredAt),
    index('training_program_events_user_occurred_idx').on(table.userId, table.occurredAt),
    index('training_program_events_mission_idx').on(table.missionId),
    index('training_program_events_checkpoint_idx').on(table.checkpointId),
]);

export const analysisSessionsRelations = relations(analysisSessions, ({ one, many }) => ({
    user: one(users, {
        fields: [analysisSessions.userId],
        references: [users.id],
    }),
    sensitivityHistory: many(sensitivityHistory),
    precisionBaselineLines: many(precisionEvolutionLines, {
        relationName: 'precision_evolution_lines_baseline_session',
    }),
    precisionCurrentLines: many(precisionEvolutionLines, {
        relationName: 'precision_evolution_lines_current_session',
    }),
    precisionCheckpoints: many(precisionCheckpoints),
    coachProtocolOutcomes: many(coachProtocolOutcomes),
    completeTrainingProtocolRevisions: many(completeTrainingProtocolRevisions),
    trainingProtocolTransferRecords: many(trainingProtocolTransferRecords),
    sprayLabSessions: many(sprayLabSessions),
    sprayLabBenchmarkSnapshots: many(sprayLabBenchmarkSnapshots),
    sprayLabBaseValidationLinks: many(sprayLabValidationLinks, {
        relationName: 'spray_lab_validation_links_base_analysis',
    }),
    sprayLabValidationLinks: many(sprayLabValidationLinks, {
        relationName: 'spray_lab_validation_links_validation_analysis',
    }),
    trainingProgramCycles: many(trainingProgramCycles),
    communitySourcePosts: many(communityPosts),
    communityPostAnalysisSnapshots: many(communityPostAnalysisSnapshots),
}));

// ═══════════════════════════════════════════
// Sensitivity History
// ═══════════════════════════════════════════

export const sensitivityHistory = pgTable('sensitivity_history', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
        .notNull()
        .references(() => analysisSessions.id, { onDelete: 'cascade' }),
    profileType: text('profile_type').notNull(), // low | balanced | high
    generalSens: real('general_sens').notNull(),
    adsSens: real('ads_sens').notNull(),
    scopeSens: jsonb('scope_sens').notNull().$type<Record<string, number>>(),
    applied: boolean('applied').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const sensitivityHistoryRelations = relations(sensitivityHistory, ({ one }) => ({
    user: one(users, {
        fields: [sensitivityHistory.userId],
        references: [users.id],
    }),
    session: one(analysisSessions, {
        fields: [sensitivityHistory.sessionId],
        references: [analysisSessions.id],
    }),
}));

// ═══════════════════════════════════════════
// Weapon Profiles (Added in Phase 1)
// ═══════════════════════════════════════════

export const weaponProfiles = pgTable('weapon_profiles', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').unique().notNull(),
    category: text('category').notNull(), // AR | SMG | DMR
    baseVerticalRecoil: real('base_vertical_recoil').notNull(),
    baseHorizontalRng: real('base_horizontal_rng').notNull(),
    fireRateMs: integer('fire_rate_ms').notNull(),

    // Legacy multipliers kept for compatibility with the current analyzer.
    multipliers: jsonb('multipliers').notNull().default('{}').$type<WeaponProfileLegacyMultipliers>(),

    // Canonical patch-ready shape that can express multidimensional attachment effects.
    canonicalProfile: jsonb('canonical_profile').$type<WeaponProfileCanonical>(),

    // Compatible attachments list (optional, but keep for consistency)
    attachments: jsonb('attachments').notNull().default('[]').$type<string[]>(),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const weaponRegistry = pgTable('weapon_registry', {
    id: uuid('id').defaultRandom().primaryKey(),
    weaponId: text('weapon_id').unique().notNull(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const weaponPatchProfiles = pgTable('weapon_patch_profiles', {
    id: uuid('id').defaultRandom().primaryKey(),
    weaponId: uuid('weapon_id')
        .notNull()
        .references(() => weaponRegistry.id, { onDelete: 'cascade' }),
    patchVersion: text('patch_version').notNull(),
    lifecycleStatus: text('lifecycle_status').$type<WeaponPatchLifecycleStatus>().notNull().default('active'),
    baseVerticalRecoil: real('base_vertical_recoil').notNull(),
    baseHorizontalRng: real('base_horizontal_rng').notNull(),
    fireRateMs: integer('fire_rate_ms').notNull(),
    multipliers: jsonb('multipliers').notNull().default('{}').$type<WeaponProfileLegacyMultipliers>(),
    canonicalProfile: jsonb('canonical_profile').$type<WeaponProfileCanonical>(),
    attachments: jsonb('attachments').notNull().default('[]').$type<string[]>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex('weapon_patch_profiles_weapon_patch_uidx').on(table.weaponId, table.patchVersion),
]);

export const weaponRegistryRelations = relations(weaponRegistry, ({ many }) => ({
    patchProfiles: many(weaponPatchProfiles),
}));

export const weaponPatchProfilesRelations = relations(weaponPatchProfiles, ({ one }) => ({
    weapon: one(weaponRegistry, {
        fields: [weaponPatchProfiles.weaponId],
        references: [weaponRegistry.id],
    }),
}));

export const communityProfiles = pgTable('community_profiles', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
        .notNull()
        .unique()
        .references(() => users.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    displayName: text('display_name').notNull(),
    headline: text('headline'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    links: jsonb('links').notNull().default('[]').$type<CommunityProfileLink[]>(),
    visibility: text('visibility').$type<CommunityProfileVisibility>().notNull().default('public'),
    creatorProgramStatus: text('creator_program_status')
        .$type<CommunityCreatorProgramStatus>()
        .notNull()
        .default('none'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const communityProfilesRelations = relations(communityProfiles, ({ one, many }) => ({
    user: one(users, {
        fields: [communityProfiles.userId],
        references: [users.id],
    }),
    posts: many(communityPosts),
}));

export const communityPosts = pgTable(
    'community_posts',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        authorId: uuid('author_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        communityProfileId: uuid('community_profile_id')
            .notNull()
            .references(() => communityProfiles.id, { onDelete: 'cascade' }),
        slug: text('slug').notNull(),
        type: text('type').$type<CommunityPostType>().notNull(),
        status: text('status').$type<CommunityPostStatus>().notNull().default('draft'),
        visibility: text('visibility').$type<CommunityPostVisibility>().notNull().default('public'),
        title: text('title').notNull(),
        excerpt: text('excerpt').notNull(),
        bodyMarkdown: text('body_markdown').notNull(),
        sourceAnalysisSessionId: uuid('source_analysis_session_id').references(() => analysisSessions.id, {
            onDelete: 'set null',
        }),
        primaryWeaponId: text('primary_weapon_id').notNull(),
        primaryPatchVersion: text('primary_patch_version').notNull(),
        primaryDiagnosisKey: text('primary_diagnosis_key').notNull(),
        copySensPreset: jsonb('copy_sens_preset').notNull().$type<CommunityPostCopySensPreset>(),
        requiredEntitlementKey: text('required_entitlement_key').$type<CommunityEntitlementKey>(),
        featuredUntil: timestamp('featured_until', { mode: 'date' }),
        publishedAt: timestamp('published_at', { mode: 'date' }),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [uniqueIndex('community_posts_slug_uidx').on(table.slug)],
);

export const communityPostsRelations = relations(communityPosts, ({ one, many }) => ({
    author: one(users, {
        fields: [communityPosts.authorId],
        references: [users.id],
    }),
    communityProfile: one(communityProfiles, {
        fields: [communityPosts.communityProfileId],
        references: [communityProfiles.id],
    }),
    sourceAnalysisSession: one(analysisSessions, {
        fields: [communityPosts.sourceAnalysisSessionId],
        references: [analysisSessions.id],
    }),
    analysisSnapshot: one(communityPostAnalysisSnapshots, {
        fields: [communityPosts.id],
        references: [communityPostAnalysisSnapshots.postId],
    }),
    copyEvents: many(communityPostCopyEvents),
}));

export const communityPostAnalysisSnapshots = pgTable('community_post_analysis_snapshots', {
    postId: uuid('post_id')
        .notNull()
        .references(() => communityPosts.id, { onDelete: 'cascade' })
        .primaryKey(),
    analysisSessionId: uuid('analysis_session_id')
        .notNull()
        .references(() => analysisSessions.id),
    analysisResultId: text('analysis_result_id').notNull(),
    analysisTimestamp: timestamp('analysis_timestamp', { mode: 'string', withTimezone: true }).notNull(),
    analysisResultSchemaVersion: integer('analysis_result_schema_version').notNull(),
    patchVersion: text('patch_version').notNull(),
    weaponId: text('weapon_id').notNull(),
    scopeId: text('scope_id').notNull(),
    distance: integer('distance').notNull(),
    stance: text('stance').notNull(),
    attachmentsSnapshot: jsonb('attachments_snapshot')
        .notNull()
        .$type<CommunityPostAnalysisSnapshot['attachmentsSnapshot']>(),
    metricsSnapshot: jsonb('metrics_snapshot')
        .notNull()
        .$type<CommunityPostAnalysisSnapshot['metricsSnapshot']>(),
    diagnosesSnapshot: jsonb('diagnoses_snapshot')
        .notNull()
        .$type<CommunityPostAnalysisSnapshot['diagnosesSnapshot']>(),
    coachingSnapshot: jsonb('coaching_snapshot')
        .notNull()
        .$type<CommunityPostAnalysisSnapshot['coachingSnapshot']>(),
    sensSnapshot: jsonb('sens_snapshot')
        .notNull()
        .$type<CommunityPostAnalysisSnapshot['sensSnapshot']>(),
    trackingSnapshot: jsonb('tracking_snapshot')
        .notNull()
        .$type<CommunityPostAnalysisSnapshot['trackingSnapshot']>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const communityPostAnalysisSnapshotsRelations = relations(
    communityPostAnalysisSnapshots,
    ({ one }) => ({
        post: one(communityPosts, {
            fields: [communityPostAnalysisSnapshots.postId],
            references: [communityPosts.id],
        }),
        analysisSession: one(analysisSessions, {
            fields: [communityPostAnalysisSnapshots.analysisSessionId],
            references: [analysisSessions.id],
        }),
    }),
);

// ═══════════════════════════════════════════
// Community Engagement & Moderation
// ═══════════════════════════════════════════

// =================================================================
// Community Gamification
// =================================================================

export const communitySeasons = pgTable(
    'community_seasons',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        slug: text('slug').notNull(),
        title: text('title').notNull(),
        theme: text('theme').notNull(),
        summary: text('summary'),
        status: text('status')
            .$type<CommunitySeasonStatus>()
            .notNull()
            .default('draft'),
        startsAt: timestamp('starts_at', { mode: 'date' }).notNull(),
        endsAt: timestamp('ends_at', { mode: 'date' }).notNull(),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('community_seasons_slug_uidx').on(table.slug),
        index('community_seasons_status_window_idx').on(
            table.status,
            table.startsAt,
            table.endsAt,
        ),
    ],
);

export const communitySeasonsRelations = relations(communitySeasons, ({ many }) => ({
    progressionAggregates: many(communityUserProgressionAggregates),
    missions: many(communityMissions),
    squads: many(communitySquads),
    progressionEvents: many(communityProgressionEvents),
    rewardRecords: many(communityRewardRecords),
}));

export const communityUserProgressionAggregates = pgTable(
    'community_user_progression_aggregates',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        seasonId: uuid('season_id').references(() => communitySeasons.id, {
            onDelete: 'set null',
        }),
        scope: text('scope')
            .$type<CommunityProgressionAggregateScope>()
            .notNull()
            .default('evergreen'),
        scopeKey: text('scope_key').notNull().default('evergreen'),
        totalXp: integer('total_xp').notNull().default(0),
        currentLevel: integer('current_level').notNull().default(1),
        currentLevelXp: integer('current_level_xp').notNull().default(0),
        nextLevelXp: integer('next_level_xp').notNull().default(100),
        activeMissionCount: integer('active_mission_count').notNull().default(0),
        currentStreak: integer('current_streak').notNull().default(0),
        longestStreak: integer('longest_streak').notNull().default(0),
        streakState: text('streak_state')
            .$type<CommunityProgressionStreakState>()
            .notNull()
            .default('inactive'),
        lastMeaningfulAt: timestamp('last_meaningful_at', { mode: 'date' }),
        lastWindowStartedAt: timestamp('last_window_started_at', { mode: 'date' }),
        lastWindowEndedAt: timestamp('last_window_ended_at', { mode: 'date' }),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('community_user_progression_aggregates_scope_uidx').on(
            table.userId,
            table.scope,
            table.scopeKey,
        ),
        index('community_user_progression_aggregates_season_idx').on(
            table.seasonId,
            table.userId,
        ),
    ],
);

export const communityUserProgressionAggregatesRelations = relations(
    communityUserProgressionAggregates,
    ({ one }) => ({
        user: one(users, {
            fields: [communityUserProgressionAggregates.userId],
            references: [users.id],
        }),
        season: one(communitySeasons, {
            fields: [communityUserProgressionAggregates.seasonId],
            references: [communitySeasons.id],
        }),
    }),
);

export const communityMissions = pgTable(
    'community_missions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        seasonId: uuid('season_id').references(() => communitySeasons.id, {
            onDelete: 'set null',
        }),
        slug: text('slug').notNull(),
        title: text('title').notNull(),
        description: text('description').notNull(),
        theme: text('theme'),
        missionType: text('mission_type')
            .$type<CommunityMissionType>()
            .notNull(),
        status: text('status')
            .$type<CommunityMissionStatus>()
            .notNull()
            .default('draft'),
        cadence: text('cadence')
            .$type<CommunityMissionCadence>()
            .notNull()
            .default('one_time'),
        targetCount: integer('target_count').notNull().default(1),
        rewardXp: integer('reward_xp').notNull().default(0),
        eligibleActions: jsonb('eligible_actions')
            .notNull()
            .default('[]')
            .$type<CommunityMissionEligibleAction[]>(),
        config: jsonb('config')
            .notNull()
            .default('{}')
            .$type<CommunityMissionConfig>(),
        startsAt: timestamp('starts_at', { mode: 'date' }),
        endsAt: timestamp('ends_at', { mode: 'date' }),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('community_missions_slug_uidx').on(table.slug),
        index('community_missions_status_window_idx').on(
            table.status,
            table.cadence,
            table.startsAt,
            table.endsAt,
        ),
    ],
);

export const communityMissionsRelations = relations(communityMissions, ({ one, many }) => ({
    season: one(communitySeasons, {
        fields: [communityMissions.seasonId],
        references: [communitySeasons.id],
    }),
    progressionEvents: many(communityProgressionEvents),
    rewardRecords: many(communityRewardRecords),
}));

export const communitySquads = pgTable(
    'community_squads',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        ownerUserId: uuid('owner_user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        seasonId: uuid('season_id').references(() => communitySeasons.id, {
            onDelete: 'set null',
        }),
        slug: text('slug').notNull(),
        name: text('name').notNull(),
        description: text('description'),
        visibility: text('visibility')
            .$type<CommunitySquadVisibility>()
            .notNull()
            .default('private'),
        status: text('status')
            .$type<CommunitySquadStatus>()
            .notNull()
            .default('active'),
        memberLimit: integer('member_limit').notNull().default(4),
        activeGoal: jsonb('active_goal').$type<CommunitySquadGoalState | null>(),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('community_squads_slug_uidx').on(table.slug),
        index('community_squads_owner_idx').on(table.ownerUserId),
        index('community_squads_status_idx').on(table.status, table.visibility),
    ],
);

export const communitySquadsRelations = relations(communitySquads, ({ one, many }) => ({
    owner: one(users, {
        relationName: 'community_squads_owner',
        fields: [communitySquads.ownerUserId],
        references: [users.id],
    }),
    season: one(communitySeasons, {
        fields: [communitySquads.seasonId],
        references: [communitySeasons.id],
    }),
    memberships: many(communitySquadMemberships),
    invites: many(communitySquadInvites),
    progressionEvents: many(communityProgressionEvents),
    rewardRecords: many(communityRewardRecords),
}));

export const communitySquadMemberships = pgTable(
    'community_squad_memberships',
    {
        squadId: uuid('squad_id')
            .notNull()
            .references(() => communitySquads.id, { onDelete: 'cascade' }),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        role: text('role').$type<CommunitySquadRole>().notNull().default('member'),
        status: text('status')
            .$type<CommunitySquadMembershipStatus>()
            .notNull()
            .default('active'),
        isPubliclyVisible: boolean('is_publicly_visible').notNull().default(true),
        joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow().notNull(),
        leftAt: timestamp('left_at', { mode: 'date' }),
        updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        primaryKey({
            columns: [table.squadId, table.userId],
            name: 'community_squad_memberships_squad_id_user_id_pk',
        }),
        index('community_squad_memberships_user_idx').on(table.userId, table.status),
    ],
);

export const communitySquadMembershipsRelations = relations(
    communitySquadMemberships,
    ({ one }) => ({
        squad: one(communitySquads, {
            fields: [communitySquadMemberships.squadId],
            references: [communitySquads.id],
        }),
        user: one(users, {
            fields: [communitySquadMemberships.userId],
            references: [users.id],
        }),
    }),
);

export const communitySquadInvites = pgTable(
    'community_squad_invites',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        squadId: uuid('squad_id')
            .notNull()
            .references(() => communitySquads.id, { onDelete: 'cascade' }),
        createdByUserId: uuid('created_by_user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        invitedUserId: uuid('invited_user_id').references(() => users.id, {
            onDelete: 'set null',
        }),
        acceptedByUserId: uuid('accepted_by_user_id').references(() => users.id, {
            onDelete: 'set null',
        }),
        inviteCode: text('invite_code').notNull(),
        status: text('status')
            .$type<CommunitySquadInviteStatus>()
            .notNull()
            .default('pending'),
        expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
        acceptedAt: timestamp('accepted_at', { mode: 'date' }),
        revokedAt: timestamp('revoked_at', { mode: 'date' }),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('community_squad_invites_code_uidx').on(table.inviteCode),
        index('community_squad_invites_squad_idx').on(table.squadId, table.status),
        index('community_squad_invites_user_idx').on(table.invitedUserId, table.status),
    ],
);

export const communitySquadInvitesRelations = relations(
    communitySquadInvites,
    ({ one }) => ({
        squad: one(communitySquads, {
            fields: [communitySquadInvites.squadId],
            references: [communitySquads.id],
        }),
        createdByUser: one(users, {
            relationName: 'community_squad_invites_creator',
            fields: [communitySquadInvites.createdByUserId],
            references: [users.id],
        }),
        invitedUser: one(users, {
            relationName: 'community_squad_invites_invited_user',
            fields: [communitySquadInvites.invitedUserId],
            references: [users.id],
        }),
        acceptedByUser: one(users, {
            relationName: 'community_squad_invites_accepted_user',
            fields: [communitySquadInvites.acceptedByUserId],
            references: [users.id],
        }),
    }),
);

export const communityProgressionEvents = pgTable(
    'community_progression_events',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        seasonId: uuid('season_id').references(() => communitySeasons.id, {
            onDelete: 'set null',
        }),
        missionId: uuid('mission_id').references(() => communityMissions.id, {
            onDelete: 'set null',
        }),
        squadId: uuid('squad_id').references(() => communitySquads.id, {
            onDelete: 'set null',
        }),
        actorUserId: uuid('actor_user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        beneficiaryUserId: uuid('beneficiary_user_id').references(() => users.id, {
            onDelete: 'set null',
        }),
        eventType: text('event_type')
            .$type<CommunityProgressionEventType>()
            .notNull(),
        entityType: text('entity_type')
            .$type<CommunityProgressionEntityType>()
            .notNull(),
        entityId: text('entity_id').notNull(),
        idempotencyKey: text('idempotency_key').notNull(),
        rawXp: integer('raw_xp').notNull().default(0),
        effectiveXp: integer('effective_xp').notNull().default(0),
        metadata: jsonb('metadata')
            .notNull()
            .default('{}')
            .$type<Record<string, unknown>>(),
        occurredAt: timestamp('occurred_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('community_progression_events_idempotency_uidx').on(
            table.idempotencyKey,
        ),
        index('community_progression_events_actor_idx').on(
            table.actorUserId,
            table.occurredAt,
        ),
        index('community_progression_events_beneficiary_idx').on(
            table.beneficiaryUserId,
            table.occurredAt,
        ),
        index('community_progression_events_scope_idx').on(
            table.seasonId,
            table.missionId,
            table.squadId,
            table.occurredAt,
        ),
    ],
);

export const communityProgressionEventsRelations = relations(
    communityProgressionEvents,
    ({ one, many }) => ({
        season: one(communitySeasons, {
            fields: [communityProgressionEvents.seasonId],
            references: [communitySeasons.id],
        }),
        mission: one(communityMissions, {
            fields: [communityProgressionEvents.missionId],
            references: [communityMissions.id],
        }),
        squad: one(communitySquads, {
            fields: [communityProgressionEvents.squadId],
            references: [communitySquads.id],
        }),
        actor: one(users, {
            relationName: 'community_progression_events_actor',
            fields: [communityProgressionEvents.actorUserId],
            references: [users.id],
        }),
        beneficiary: one(users, {
            relationName: 'community_progression_events_beneficiary',
            fields: [communityProgressionEvents.beneficiaryUserId],
            references: [users.id],
        }),
        rewardRecords: many(communityRewardRecords),
    }),
);

export const communityRewardRecords = pgTable(
    'community_reward_records',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        seasonId: uuid('season_id').references(() => communitySeasons.id, {
            onDelete: 'set null',
        }),
        missionId: uuid('mission_id').references(() => communityMissions.id, {
            onDelete: 'set null',
        }),
        squadId: uuid('squad_id').references(() => communitySquads.id, {
            onDelete: 'set null',
        }),
        userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
        awardedByEventId: uuid('awarded_by_event_id').references(
            () => communityProgressionEvents.id,
            { onDelete: 'set null' },
        ),
        ownerType: text('owner_type')
            .$type<CommunityRewardOwnerType>()
            .notNull(),
        rewardKind: text('reward_kind')
            .$type<CommunityRewardKind>()
            .notNull(),
        rewardKey: text('reward_key').notNull(),
        rewardFingerprint: text('reward_fingerprint').notNull(),
        status: text('status')
            .$type<CommunityRewardStatus>()
            .notNull()
            .default('earned'),
        displayState: text('display_state')
            .$type<CommunityRewardDisplayState>()
            .notNull()
            .default('hidden'),
        isPublicSafe: boolean('is_public_safe').notNull().default(false),
        label: text('label').notNull(),
        description: text('description'),
        publicPayload: jsonb('public_payload')
            .notNull()
            .default('{}')
            .$type<CommunityRewardPublicPayload>(),
        metadata: jsonb('metadata')
            .notNull()
            .default('{}')
            .$type<Record<string, unknown>>(),
        earnedAt: timestamp('earned_at', { mode: 'date' }).defaultNow().notNull(),
        expiresAt: timestamp('expires_at', { mode: 'date' }),
        revokedAt: timestamp('revoked_at', { mode: 'date' }),
    },
    (table) => [
        uniqueIndex('community_reward_records_fingerprint_uidx').on(
            table.rewardFingerprint,
        ),
        index('community_reward_records_owner_idx').on(
            table.ownerType,
            table.userId,
            table.squadId,
        ),
        index('community_reward_records_display_idx').on(
            table.displayState,
            table.status,
        ),
    ],
);

export const communityRewardRecordsRelations = relations(
    communityRewardRecords,
    ({ one }) => ({
        season: one(communitySeasons, {
            fields: [communityRewardRecords.seasonId],
            references: [communitySeasons.id],
        }),
        mission: one(communityMissions, {
            fields: [communityRewardRecords.missionId],
            references: [communityMissions.id],
        }),
        squad: one(communitySquads, {
            fields: [communityRewardRecords.squadId],
            references: [communitySquads.id],
        }),
        user: one(users, {
            fields: [communityRewardRecords.userId],
            references: [users.id],
        }),
        awardedByEvent: one(communityProgressionEvents, {
            fields: [communityRewardRecords.awardedByEventId],
            references: [communityProgressionEvents.id],
        }),
    }),
);

export const communityPostLikes = pgTable(
    'community_post_likes',
    {
        postId: uuid('post_id')
            .notNull()
            .references(() => communityPosts.id, { onDelete: 'cascade' }),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        primaryKey({
            columns: [table.postId, table.userId],
            name: 'community_post_likes_post_id_user_id_pk',
        }),
    ],
);

export const communityPostLikesRelations = relations(communityPostLikes, ({ one }) => ({
    post: one(communityPosts, {
        fields: [communityPostLikes.postId],
        references: [communityPosts.id],
    }),
    user: one(users, {
        fields: [communityPostLikes.userId],
        references: [users.id],
    }),
}));

export const communityPostSaves = pgTable(
    'community_post_saves',
    {
        postId: uuid('post_id')
            .notNull()
            .references(() => communityPosts.id, { onDelete: 'cascade' }),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        primaryKey({
            columns: [table.postId, table.userId],
            name: 'community_post_saves_post_id_user_id_pk',
        }),
    ],
);

export const communityPostSavesRelations = relations(communityPostSaves, ({ one }) => ({
    post: one(communityPosts, {
        fields: [communityPostSaves.postId],
        references: [communityPosts.id],
    }),
    user: one(users, {
        fields: [communityPostSaves.userId],
        references: [users.id],
    }),
}));

export const communityPostCopyEvents = pgTable(
    'community_post_copy_events',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        postId: uuid('post_id')
            .notNull()
            .references(() => communityPosts.id, { onDelete: 'cascade' }),
        copiedByUserId: uuid('copied_by_user_id').references(() => users.id, {
            onDelete: 'set null',
        }),
        copyTarget: text('copy_target').$type<CommunityPostCopyTarget>().notNull(),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        index('community_post_copy_events_post_id_created_at_idx').on(
            table.postId,
            table.createdAt,
        ),
    ],
);

export const communityPostCopyEventsRelations = relations(communityPostCopyEvents, ({ one }) => ({
    post: one(communityPosts, {
        fields: [communityPostCopyEvents.postId],
        references: [communityPosts.id],
    }),
    copiedByUser: one(users, {
        fields: [communityPostCopyEvents.copiedByUserId],
        references: [users.id],
    }),
}));

export const communityPostComments = pgTable('community_post_comments', {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
        .notNull()
        .references(() => communityPosts.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').$type<CommunityCommentStatus>().notNull().default('visible'),
    bodyMarkdown: text('body_markdown').notNull(),
    diagnosisContextKey: text('diagnosis_context_key'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const communityPostCommentsRelations = relations(communityPostComments, ({ one }) => ({
    post: one(communityPosts, {
        fields: [communityPostComments.postId],
        references: [communityPosts.id],
    }),
    author: one(users, {
        fields: [communityPostComments.authorId],
        references: [users.id],
    }),
}));

export const communityFollows = pgTable(
    'community_follows',
    {
        followerUserId: uuid('follower_user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        followedUserId: uuid('followed_user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        primaryKey({
            columns: [table.followerUserId, table.followedUserId],
            name: 'community_follows_follower_user_id_followed_user_id_pk',
        }),
    ],
);

export const communityFollowsRelations = relations(communityFollows, ({ one }) => ({
    follower: one(users, {
        relationName: 'community_follows_follower',
        fields: [communityFollows.followerUserId],
        references: [users.id],
    }),
    followed: one(users, {
        relationName: 'community_follows_followed',
        fields: [communityFollows.followedUserId],
        references: [users.id],
    }),
}));

export const communityReports = pgTable('community_reports', {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: text('entity_type').$type<CommunityReportEntityType>().notNull(),
    entityId: uuid('entity_id').notNull(),
    reportedByUserId: uuid('reported_by_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'no action' }),
    reasonKey: text('reason_key').notNull(),
    details: text('details'),
    status: text('status').$type<CommunityReportStatus>().notNull().default('open'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at', { mode: 'date' }),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
});

export const communityReportsRelations = relations(communityReports, ({ one }) => ({
    reporter: one(users, {
        relationName: 'community_reports_reporter',
        fields: [communityReports.reportedByUserId],
        references: [users.id],
    }),
    reviewer: one(users, {
        relationName: 'community_reports_reviewer',
        fields: [communityReports.reviewedByUserId],
        references: [users.id],
    }),
}));

export const communityModerationActions = pgTable('community_moderation_actions', {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: text('entity_type').$type<CommunityReportEntityType>().notNull(),
    entityId: uuid('entity_id').notNull(),
    actionKey: text('action_key').notNull(),
    actorUserId: uuid('actor_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'no action' }),
    notes: text('notes'),
    metadata: jsonb('metadata').notNull().default('{}').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const communityModerationActionsRelations = relations(
    communityModerationActions,
    ({ one }) => ({
        actor: one(users, {
            fields: [communityModerationActions.actorUserId],
            references: [users.id],
        }),
    }),
);

export const socialProReports = pgTable('social_pro_reports', {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerUserId: uuid('owner_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    communityProfileId: uuid('community_profile_id').references(() => communityProfiles.id, {
        onDelete: 'set null',
    }),
    publicSlug: text('public_slug'),
    visibility: text('visibility')
        .$type<SocialProReportVisibility>()
        .notNull()
        .default('link_private'),
    status: text('status')
        .$type<SocialProReportStatus>()
        .notNull()
        .default('draft'),
    title: text('title').notNull(),
    publicSafeSnapshot: jsonb('public_safe_snapshot')
        .notNull()
        .$type<SocialProPublicReport>(),
    sourceAnalysisSessionId: uuid('source_analysis_session_id').references(() => analysisSessions.id, {
        onDelete: 'set null',
    }),
    sourceHistorySessionId: uuid('source_history_session_id').references(() => analysisSessions.id, {
        onDelete: 'set null',
    }),
    sourceProtocolRevisionId: uuid('source_protocol_revision_id').references(
        () => completeTrainingProtocolRevisions.id,
        { onDelete: 'set null' },
    ),
    sourceSprayLabSessionId: uuid('source_spray_lab_session_id').references(() => sprayLabSessions.id, {
        onDelete: 'set null',
    }),
    sourceTrainingProgramCycleId: text('source_training_program_cycle_id').references(() => trainingProgramCycles.id, {
        onDelete: 'set null',
    }),
    sourceValidationLinkId: uuid('source_validation_link_id').references(() => sprayLabValidationLinks.id, {
        onDelete: 'set null',
    }),
    payload: jsonb('payload').notNull().default('{}').$type<SocialProReportPayload>(),
    publishedAt: timestamp('published_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { mode: 'date' }),
}, (table) => [
    uniqueIndex('social_pro_reports_public_slug_uidx').on(table.publicSlug),
    index('social_pro_reports_owner_status_updated_idx').on(table.ownerUserId, table.status, table.updatedAt),
    index('social_pro_reports_visibility_status_idx').on(table.visibility, table.status),
    index('social_pro_reports_source_analysis_idx').on(table.sourceAnalysisSessionId),
    index('social_pro_reports_source_program_idx').on(table.sourceTrainingProgramCycleId),
]);

export const socialProReportLinks = pgTable('social_pro_report_links', {
    id: uuid('id').defaultRandom().primaryKey(),
    reportId: uuid('report_id')
        .notNull()
        .references(() => socialProReports.id, { onDelete: 'cascade' }),
    ownerUserId: uuid('owner_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    tokenVerifierHash: text('token_verifier_hash').notNull(),
    tokenVerifierPrefix: text('token_verifier_prefix').notNull(),
    status: text('status')
        .$type<SocialProPrivateLinkStatus>()
        .notNull()
        .default('active'),
    regeneratedFromLinkId: uuid('regenerated_from_link_id').references(
        (): AnyPgColumn => socialProReportLinks.id,
        { onDelete: 'set null' },
    ),
    revokedByUserId: uuid('revoked_by_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    lastRegeneratedAt: timestamp('last_regenerated_at', { mode: 'date' }),
    payload: jsonb('payload').notNull().default('{}').$type<SocialProReportLinkPayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex('social_pro_report_links_token_hash_uidx').on(table.tokenVerifierHash),
    index('social_pro_report_links_report_status_idx').on(table.reportId, table.status),
    index('social_pro_report_links_owner_status_idx').on(table.ownerUserId, table.status),
    index('social_pro_report_links_expiration_idx').on(table.expiresAt),
]);

export const socialProReportAuditEvents = pgTable('social_pro_report_audit_events', {
    id: uuid('id').defaultRandom().primaryKey(),
    reportId: uuid('report_id')
        .notNull()
        .references(() => socialProReports.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    linkId: uuid('link_id').references(() => socialProReportLinks.id, {
        onDelete: 'set null',
    }),
    eventType: text('event_type').notNull(),
    reportStatus: text('report_status').$type<SocialProReportStatus>(),
    reasonKey: text('reason_key').$type<SocialProReportModerationReason>(),
    publicSafeSnapshot: jsonb('public_safe_snapshot').$type<SocialProPublicReport>(),
    metadata: jsonb('metadata').notNull().default('{}').$type<SocialProReportAuditMetadata>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index('social_pro_report_audit_events_report_created_idx').on(table.reportId, table.createdAt),
    index('social_pro_report_audit_events_link_created_idx').on(table.linkId, table.createdAt),
    index('social_pro_report_audit_events_actor_created_idx').on(table.actorUserId, table.createdAt),
    index('social_pro_report_audit_events_type_created_idx').on(table.eventType, table.createdAt),
]);

export const socialProCollections = pgTable('social_pro_collections', {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerUserId: uuid('owner_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    mode: text('mode')
        .$type<SocialProCollectionMode>()
        .notNull()
        .default('manual'),
    visibility: text('visibility')
        .$type<SocialProCollectionVisibility>()
        .notNull()
        .default('private'),
    shareable: boolean('shareable').notNull().default(false),
    label: text('label').notNull(),
    description: text('description'),
    contextKey: text('context_key').notNull(),
    weaponId: text('weapon_id'),
    opticId: text('optic_id'),
    distanceMeters: integer('distance_meters'),
    diagnosisKey: text('diagnosis_key'),
    activeLineId: text('active_line_id'),
    programCycleId: text('program_cycle_id').references(() => trainingProgramCycles.id, {
        onDelete: 'set null',
    }),
    sprayLabLaneId: text('spray_lab_lane_id'),
    objectiveKey: text('objective_key'),
    validationState: text('validation_state'),
    blockerKey: text('blocker_key'),
    payload: jsonb('payload').notNull().default('{}').$type<SocialProCollectionPayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index('social_pro_collections_owner_updated_idx').on(table.ownerUserId, table.updatedAt),
    index('social_pro_collections_owner_mode_idx').on(table.ownerUserId, table.mode),
    index('social_pro_collections_owner_context_idx').on(table.ownerUserId, table.contextKey),
]);

export const socialProCollectionItems = pgTable('social_pro_collection_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    collectionId: uuid('collection_id')
        .notNull()
        .references(() => socialProCollections.id, { onDelete: 'cascade' }),
    ownerUserId: uuid('owner_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<SocialProLibraryItemKind>().notNull(),
    itemId: text('item_id').notNull(),
    socialProReportId: uuid('social_pro_report_id').references(() => socialProReports.id, {
        onDelete: 'set null',
    }),
    communityPostId: uuid('community_post_id').references(() => communityPosts.id, {
        onDelete: 'set null',
    }),
    sprayLabSessionId: uuid('spray_lab_session_id').references(() => sprayLabSessions.id, {
        onDelete: 'set null',
    }),
    trainingProgramMissionId: text('training_program_mission_id').references(() => trainingProgramMissions.id, {
        onDelete: 'set null',
    }),
    validationLinkId: uuid('validation_link_id').references(() => sprayLabValidationLinks.id, {
        onDelete: 'set null',
    }),
    contextKey: text('context_key').notNull(),
    contextFacets: jsonb('context_facets')
        .notNull()
        .default('{}')
        .$type<SocialProCollectionContextFacets>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex('social_pro_collection_items_collection_item_uidx').on(table.collectionId, table.kind, table.itemId),
    index('social_pro_collection_items_collection_kind_idx').on(table.collectionId, table.kind),
    index('social_pro_collection_items_owner_kind_created_idx').on(table.ownerUserId, table.kind, table.createdAt),
]);

export const socialProReportsRelations = relations(socialProReports, ({ one, many }) => ({
    owner: one(users, {
        fields: [socialProReports.ownerUserId],
        references: [users.id],
    }),
    communityProfile: one(communityProfiles, {
        fields: [socialProReports.communityProfileId],
        references: [communityProfiles.id],
    }),
    sourceAnalysisSession: one(analysisSessions, {
        relationName: 'social_pro_reports_source_analysis',
        fields: [socialProReports.sourceAnalysisSessionId],
        references: [analysisSessions.id],
    }),
    sourceHistorySession: one(analysisSessions, {
        relationName: 'social_pro_reports_source_history',
        fields: [socialProReports.sourceHistorySessionId],
        references: [analysisSessions.id],
    }),
    sourceProtocolRevision: one(completeTrainingProtocolRevisions, {
        fields: [socialProReports.sourceProtocolRevisionId],
        references: [completeTrainingProtocolRevisions.id],
    }),
    sourceSprayLabSession: one(sprayLabSessions, {
        fields: [socialProReports.sourceSprayLabSessionId],
        references: [sprayLabSessions.id],
    }),
    sourceTrainingProgramCycle: one(trainingProgramCycles, {
        fields: [socialProReports.sourceTrainingProgramCycleId],
        references: [trainingProgramCycles.id],
    }),
    sourceValidationLink: one(sprayLabValidationLinks, {
        fields: [socialProReports.sourceValidationLinkId],
        references: [sprayLabValidationLinks.id],
    }),
    links: many(socialProReportLinks),
    auditEvents: many(socialProReportAuditEvents),
    collectionItems: many(socialProCollectionItems),
}));

export const socialProReportLinksRelations = relations(socialProReportLinks, ({ one, many }) => ({
    report: one(socialProReports, {
        fields: [socialProReportLinks.reportId],
        references: [socialProReports.id],
    }),
    owner: one(users, {
        fields: [socialProReportLinks.ownerUserId],
        references: [users.id],
    }),
    regeneratedFromLink: one(socialProReportLinks, {
        relationName: 'social_pro_report_links_regeneration',
        fields: [socialProReportLinks.regeneratedFromLinkId],
        references: [socialProReportLinks.id],
    }),
    regeneratedLinks: many(socialProReportLinks, {
        relationName: 'social_pro_report_links_regeneration',
    }),
    revokedBy: one(users, {
        fields: [socialProReportLinks.revokedByUserId],
        references: [users.id],
    }),
    auditEvents: many(socialProReportAuditEvents),
}));

export const socialProReportAuditEventsRelations = relations(socialProReportAuditEvents, ({ one }) => ({
    report: one(socialProReports, {
        fields: [socialProReportAuditEvents.reportId],
        references: [socialProReports.id],
    }),
    actor: one(users, {
        fields: [socialProReportAuditEvents.actorUserId],
        references: [users.id],
    }),
    link: one(socialProReportLinks, {
        fields: [socialProReportAuditEvents.linkId],
        references: [socialProReportLinks.id],
    }),
}));

export const socialProCollectionsRelations = relations(socialProCollections, ({ one, many }) => ({
    owner: one(users, {
        fields: [socialProCollections.ownerUserId],
        references: [users.id],
    }),
    programCycle: one(trainingProgramCycles, {
        fields: [socialProCollections.programCycleId],
        references: [trainingProgramCycles.id],
    }),
    items: many(socialProCollectionItems),
}));

export const socialProCollectionItemsRelations = relations(socialProCollectionItems, ({ one }) => ({
    collection: one(socialProCollections, {
        fields: [socialProCollectionItems.collectionId],
        references: [socialProCollections.id],
    }),
    owner: one(users, {
        fields: [socialProCollectionItems.ownerUserId],
        references: [users.id],
    }),
    socialProReport: one(socialProReports, {
        fields: [socialProCollectionItems.socialProReportId],
        references: [socialProReports.id],
    }),
    communityPost: one(communityPosts, {
        fields: [socialProCollectionItems.communityPostId],
        references: [communityPosts.id],
    }),
    sprayLabSession: one(sprayLabSessions, {
        fields: [socialProCollectionItems.sprayLabSessionId],
        references: [sprayLabSessions.id],
    }),
    trainingProgramMission: one(trainingProgramMissions, {
        fields: [socialProCollectionItems.trainingProgramMissionId],
        references: [trainingProgramMissions.id],
    }),
    validationLink: one(sprayLabValidationLinks, {
        fields: [socialProCollectionItems.validationLinkId],
        references: [sprayLabValidationLinks.id],
    }),
}));

export const teamCoachWorkspaces = pgTable('team_coach_workspaces', {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerUserId: uuid('owner_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status')
        .$type<TeamCoachWorkspaceStatus>()
        .notNull()
        .default('active'),
    seatLimit: integer('seat_limit').notNull().default(8),
    payload: jsonb('payload').notNull().default('{}').$type<TeamCoachWorkspacePayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { mode: 'date' }),
}, (table) => [
    index('team_coach_workspaces_owner_status_idx').on(table.ownerUserId, table.status),
    index('team_coach_workspaces_status_updated_idx').on(table.status, table.updatedAt),
]);

export const teamCoachWorkspaceMemberships = pgTable('team_coach_workspace_memberships', {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => teamCoachWorkspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role')
        .$type<TeamCoachWorkspaceRole>()
        .notNull()
        .default('player'),
    status: text('status')
        .$type<TeamCoachMembershipStatus>()
        .notNull()
        .default('active'),
    seatState: text('seat_state')
        .$type<TeamCoachSeatState>()
        .notNull()
        .default('occupied'),
    joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow().notNull(),
    leftAt: timestamp('left_at', { mode: 'date' }),
    suspendedAt: timestamp('suspended_at', { mode: 'date' }),
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    payload: jsonb('payload').notNull().default('{}').$type<TeamCoachMembershipPayload>(),
}, (table) => [
    uniqueIndex('team_coach_workspace_memberships_workspace_user_uidx').on(table.workspaceId, table.userId),
    index('team_coach_workspace_memberships_workspace_status_idx').on(table.workspaceId, table.status),
    index('team_coach_workspace_memberships_user_status_idx').on(table.userId, table.status),
    index('team_coach_workspace_memberships_role_status_idx').on(table.role, table.status),
]);

export const teamCoachWorkspaceInvites = pgTable('team_coach_workspace_invites', {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => teamCoachWorkspaces.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    invitedUserId: uuid('invited_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    invitedEmail: text('invited_email'),
    intendedRole: text('intended_role')
        .$type<TeamCoachWorkspaceRole>()
        .notNull()
        .default('player'),
    inviteCode: text('invite_code').notNull(),
    status: text('status')
        .$type<TeamCoachInviteStatus>()
        .notNull()
        .default('pending'),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    acceptedByUserId: uuid('accepted_by_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    acceptedAt: timestamp('accepted_at', { mode: 'date' }),
    revokedByUserId: uuid('revoked_by_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    payload: jsonb('payload').notNull().default('{}').$type<TeamCoachInvitePayload>(),
}, (table) => [
    uniqueIndex('team_coach_workspace_invites_code_uidx').on(table.inviteCode),
    index('team_coach_workspace_invites_workspace_status_idx').on(table.workspaceId, table.status),
    index('team_coach_workspace_invites_invited_user_status_idx').on(table.invitedUserId, table.status),
    index('team_coach_workspace_invites_email_status_idx').on(table.invitedEmail, table.status),
    index('team_coach_workspace_invites_expires_idx').on(table.expiresAt),
]);

export const teamCoachReportShares = pgTable('team_coach_report_shares', {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => teamCoachWorkspaces.id, { onDelete: 'cascade' }),
    playerUserId: uuid('player_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    sharedByUserId: uuid('shared_by_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    revokedByUserId: uuid('revoked_by_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    consentStatus: text('consent_status')
        .$type<TeamCoachConsentStatus>()
        .notNull()
        .default('granted'),
    consentScopes: jsonb('consent_scopes')
        .notNull()
        .default('[]')
        .$type<readonly TeamCoachConsentScope[]>(),
    shareStatus: text('share_status')
        .$type<TeamCoachShareStatus>()
        .notNull()
        .default('active'),
    teamSafeSnapshot: jsonb('team_safe_snapshot')
        .notNull()
        .$type<TeamCoachSafeReportSnapshot>(),
    sourceAnalysisSessionId: uuid('source_analysis_session_id').references(() => analysisSessions.id, {
        onDelete: 'set null',
    }),
    sourceHistorySessionId: uuid('source_history_session_id').references(() => analysisSessions.id, {
        onDelete: 'set null',
    }),
    sourceProtocolRevisionId: uuid('source_protocol_revision_id').references(
        () => completeTrainingProtocolRevisions.id,
        { onDelete: 'set null' },
    ),
    sourceSprayLabSessionId: uuid('source_spray_lab_session_id').references(() => sprayLabSessions.id, {
        onDelete: 'set null',
    }),
    sourceTrainingProgramCycleId: text('source_training_program_cycle_id').references(() => trainingProgramCycles.id, {
        onDelete: 'set null',
    }),
    sourceValidationLinkId: uuid('source_validation_link_id').references(() => sprayLabValidationLinks.id, {
        onDelete: 'set null',
    }),
    grantedAt: timestamp('granted_at', { mode: 'date' }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    payload: jsonb('payload').notNull().default('{}').$type<TeamCoachSharePayload>(),
}, (table) => [
    index('team_coach_report_shares_workspace_player_status_idx').on(table.workspaceId, table.playerUserId, table.shareStatus),
    index('team_coach_report_shares_player_status_idx').on(table.playerUserId, table.shareStatus),
    index('team_coach_report_shares_source_analysis_idx').on(table.sourceAnalysisSessionId),
    index('team_coach_report_shares_source_program_idx').on(table.sourceTrainingProgramCycleId),
]);

export const teamCoachReviewNotes = pgTable('team_coach_review_notes', {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => teamCoachWorkspaces.id, { onDelete: 'cascade' }),
    shareId: uuid('share_id')
        .notNull()
        .references(() => teamCoachReportShares.id, { onDelete: 'cascade' }),
    authorUserId: uuid('author_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    playerUserId: uuid('player_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    note: text('note').notNull(),
    requestedNextAction: text('requested_next_action').$type<TeamCoachNextActionKind>(),
    payload: jsonb('payload').notNull().default('{}').$type<TeamCoachReviewNotePayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { mode: 'date' }),
}, (table) => [
    index('team_coach_review_notes_workspace_created_idx').on(table.workspaceId, table.createdAt),
    index('team_coach_review_notes_share_created_idx').on(table.shareId, table.createdAt),
    index('team_coach_review_notes_player_created_idx').on(table.playerUserId, table.createdAt),
]);

export const teamCoachReviewStatusEvents = pgTable('team_coach_review_status_events', {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => teamCoachWorkspaces.id, { onDelete: 'cascade' }),
    shareId: uuid('share_id')
        .notNull()
        .references(() => teamCoachReportShares.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    playerUserId: uuid('player_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    previousStatus: text('previous_status').$type<TeamCoachReviewStatus>(),
    nextStatus: text('next_status')
        .$type<TeamCoachReviewStatus>()
        .notNull(),
    reason: text('reason'),
    payload: jsonb('payload').notNull().default('{}').$type<TeamCoachReviewStatusPayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index('team_coach_review_status_events_workspace_created_idx').on(table.workspaceId, table.createdAt),
    index('team_coach_review_status_events_share_created_idx').on(table.shareId, table.createdAt),
    index('team_coach_review_status_events_next_status_idx').on(table.nextStatus, table.createdAt),
]);

export const teamCoachReviewPackets = pgTable('team_coach_review_packets', {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => teamCoachWorkspaces.id, { onDelete: 'cascade' }),
    shareId: uuid('share_id')
        .notNull()
        .references(() => teamCoachReportShares.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    playerUserId: uuid('player_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    visibility: text('visibility')
        .$type<TeamCoachPacketVisibility>()
        .notNull()
        .default('private'),
    status: text('status')
        .$type<TeamCoachPacketStatus>()
        .notNull()
        .default('draft'),
    title: text('title').notNull(),
    teamSafeSnapshot: jsonb('team_safe_snapshot')
        .notNull()
        .$type<TeamCoachSafeReportSnapshot>(),
    reviewStatus: text('review_status').$type<TeamCoachReviewStatus>(),
    requestedNextAction: text('requested_next_action').$type<TeamCoachNextActionKind>(),
    payload: jsonb('payload').notNull().default('{}').$type<TeamCoachReviewPacketPayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
}, (table) => [
    index('team_coach_review_packets_workspace_status_idx').on(table.workspaceId, table.status),
    index('team_coach_review_packets_share_status_idx').on(table.shareId, table.status),
    index('team_coach_review_packets_player_updated_idx').on(table.playerUserId, table.updatedAt),
]);

export const teamCoachPacketLinks = pgTable('team_coach_packet_links', {
    id: uuid('id').defaultRandom().primaryKey(),
    packetId: uuid('packet_id')
        .notNull()
        .references(() => teamCoachReviewPackets.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => teamCoachWorkspaces.id, { onDelete: 'cascade' }),
    ownerUserId: uuid('owner_user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    tokenVerifierHash: text('token_verifier_hash').notNull(),
    tokenVerifierPrefix: text('token_verifier_prefix').notNull(),
    status: text('status')
        .$type<TeamCoachPrivateLinkStatus>()
        .notNull()
        .default('active'),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    revokedByUserId: uuid('revoked_by_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
    payload: jsonb('payload').notNull().default('{}').$type<TeamCoachPacketLinkPayload>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex('team_coach_packet_links_token_hash_uidx').on(table.tokenVerifierHash),
    index('team_coach_packet_links_packet_status_idx').on(table.packetId, table.status),
    index('team_coach_packet_links_workspace_status_idx').on(table.workspaceId, table.status),
    index('team_coach_packet_links_expires_idx').on(table.expiresAt),
]);

export const teamCoachSeatLedger = pgTable('team_coach_seat_ledger', {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => teamCoachWorkspaces.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    targetUserId: uuid('target_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    inviteId: uuid('invite_id').references(() => teamCoachWorkspaceInvites.id, {
        onDelete: 'set null',
    }),
    membershipId: uuid('membership_id').references(() => teamCoachWorkspaceMemberships.id, {
        onDelete: 'set null',
    }),
    eventType: text('event_type').notNull(),
    seatState: text('seat_state').$type<TeamCoachSeatState>().notNull(),
    delta: integer('delta').notNull().default(0),
    seatLimit: integer('seat_limit').notNull(),
    occupiedSeats: integer('occupied_seats').notNull(),
    invitedSeats: integer('invited_seats').notNull(),
    reasonCode: text('reason_code'),
    metadata: jsonb('metadata').notNull().default('{}').$type<TeamCoachSeatLedgerMetadata>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index('team_coach_seat_ledger_workspace_created_idx').on(table.workspaceId, table.createdAt),
    index('team_coach_seat_ledger_invite_idx').on(table.inviteId),
    index('team_coach_seat_ledger_membership_idx').on(table.membershipId),
]);

export const teamCoachAuditEvents = pgTable('team_coach_audit_events', {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
        .notNull()
        .references(() => teamCoachWorkspaces.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    targetUserId: uuid('target_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    inviteId: uuid('invite_id').references(() => teamCoachWorkspaceInvites.id, {
        onDelete: 'set null',
    }),
    membershipId: uuid('membership_id').references(() => teamCoachWorkspaceMemberships.id, {
        onDelete: 'set null',
    }),
    shareId: uuid('share_id').references(() => teamCoachReportShares.id, {
        onDelete: 'set null',
    }),
    noteId: uuid('note_id').references(() => teamCoachReviewNotes.id, {
        onDelete: 'set null',
    }),
    packetId: uuid('packet_id').references(() => teamCoachReviewPackets.id, {
        onDelete: 'set null',
    }),
    packetLinkId: uuid('packet_link_id').references(() => teamCoachPacketLinks.id, {
        onDelete: 'set null',
    }),
    eventType: text('event_type')
        .$type<TeamCoachAuditEventType>()
        .notNull(),
    reasonCode: text('reason_code'),
    metadata: jsonb('metadata').notNull().default('{}').$type<TeamCoachAuditMetadata>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
    index('team_coach_audit_events_workspace_created_idx').on(table.workspaceId, table.createdAt),
    index('team_coach_audit_events_actor_created_idx').on(table.actorUserId, table.createdAt),
    index('team_coach_audit_events_target_created_idx').on(table.targetUserId, table.createdAt),
    index('team_coach_audit_events_type_created_idx').on(table.eventType, table.createdAt),
    index('team_coach_audit_events_share_created_idx').on(table.shareId, table.createdAt),
]);

export const teamCoachWorkspacesRelations = relations(teamCoachWorkspaces, ({ one, many }) => ({
    owner: one(users, {
        relationName: 'team_coach_workspaces_owner',
        fields: [teamCoachWorkspaces.ownerUserId],
        references: [users.id],
    }),
    memberships: many(teamCoachWorkspaceMemberships),
    invites: many(teamCoachWorkspaceInvites),
    shares: many(teamCoachReportShares),
    packets: many(teamCoachReviewPackets),
    auditEvents: many(teamCoachAuditEvents),
}));

export const teamCoachWorkspaceMembershipsRelations = relations(teamCoachWorkspaceMemberships, ({ one, many }) => ({
    workspace: one(teamCoachWorkspaces, {
        fields: [teamCoachWorkspaceMemberships.workspaceId],
        references: [teamCoachWorkspaces.id],
    }),
    user: one(users, {
        fields: [teamCoachWorkspaceMemberships.userId],
        references: [users.id],
    }),
    seatLedgerEvents: many(teamCoachSeatLedger),
    auditEvents: many(teamCoachAuditEvents),
}));

export const teamCoachWorkspaceInvitesRelations = relations(teamCoachWorkspaceInvites, ({ one, many }) => ({
    workspace: one(teamCoachWorkspaces, {
        fields: [teamCoachWorkspaceInvites.workspaceId],
        references: [teamCoachWorkspaces.id],
    }),
    createdByUser: one(users, {
        relationName: 'team_coach_workspace_invites_created_by',
        fields: [teamCoachWorkspaceInvites.createdByUserId],
        references: [users.id],
    }),
    invitedUser: one(users, {
        relationName: 'team_coach_workspace_invites_invited_user',
        fields: [teamCoachWorkspaceInvites.invitedUserId],
        references: [users.id],
    }),
    acceptedByUser: one(users, {
        relationName: 'team_coach_workspace_invites_accepted_by',
        fields: [teamCoachWorkspaceInvites.acceptedByUserId],
        references: [users.id],
    }),
    revokedByUser: one(users, {
        relationName: 'team_coach_workspace_invites_revoked_by',
        fields: [teamCoachWorkspaceInvites.revokedByUserId],
        references: [users.id],
    }),
    seatLedgerEvents: many(teamCoachSeatLedger),
    auditEvents: many(teamCoachAuditEvents),
}));

export const teamCoachReportSharesRelations = relations(teamCoachReportShares, ({ one, many }) => ({
    workspace: one(teamCoachWorkspaces, {
        fields: [teamCoachReportShares.workspaceId],
        references: [teamCoachWorkspaces.id],
    }),
    player: one(users, {
        relationName: 'team_coach_report_shares_player',
        fields: [teamCoachReportShares.playerUserId],
        references: [users.id],
    }),
    sharedBy: one(users, {
        relationName: 'team_coach_report_shares_shared_by',
        fields: [teamCoachReportShares.sharedByUserId],
        references: [users.id],
    }),
    sourceAnalysisSession: one(analysisSessions, {
        relationName: 'team_coach_report_shares_source_analysis',
        fields: [teamCoachReportShares.sourceAnalysisSessionId],
        references: [analysisSessions.id],
    }),
    sourceHistorySession: one(analysisSessions, {
        relationName: 'team_coach_report_shares_source_history',
        fields: [teamCoachReportShares.sourceHistorySessionId],
        references: [analysisSessions.id],
    }),
    sourceProtocolRevision: one(completeTrainingProtocolRevisions, {
        fields: [teamCoachReportShares.sourceProtocolRevisionId],
        references: [completeTrainingProtocolRevisions.id],
    }),
    sourceSprayLabSession: one(sprayLabSessions, {
        fields: [teamCoachReportShares.sourceSprayLabSessionId],
        references: [sprayLabSessions.id],
    }),
    sourceTrainingProgramCycle: one(trainingProgramCycles, {
        fields: [teamCoachReportShares.sourceTrainingProgramCycleId],
        references: [trainingProgramCycles.id],
    }),
    sourceValidationLink: one(sprayLabValidationLinks, {
        fields: [teamCoachReportShares.sourceValidationLinkId],
        references: [sprayLabValidationLinks.id],
    }),
    notes: many(teamCoachReviewNotes),
    statusEvents: many(teamCoachReviewStatusEvents),
    packets: many(teamCoachReviewPackets),
    auditEvents: many(teamCoachAuditEvents),
}));

export const teamCoachReviewNotesRelations = relations(teamCoachReviewNotes, ({ one, many }) => ({
    workspace: one(teamCoachWorkspaces, {
        fields: [teamCoachReviewNotes.workspaceId],
        references: [teamCoachWorkspaces.id],
    }),
    share: one(teamCoachReportShares, {
        fields: [teamCoachReviewNotes.shareId],
        references: [teamCoachReportShares.id],
    }),
    author: one(users, {
        relationName: 'team_coach_review_notes_author',
        fields: [teamCoachReviewNotes.authorUserId],
        references: [users.id],
    }),
    player: one(users, {
        relationName: 'team_coach_review_notes_player',
        fields: [teamCoachReviewNotes.playerUserId],
        references: [users.id],
    }),
    auditEvents: many(teamCoachAuditEvents),
}));

export const teamCoachReviewStatusEventsRelations = relations(teamCoachReviewStatusEvents, ({ one }) => ({
    workspace: one(teamCoachWorkspaces, {
        fields: [teamCoachReviewStatusEvents.workspaceId],
        references: [teamCoachWorkspaces.id],
    }),
    share: one(teamCoachReportShares, {
        fields: [teamCoachReviewStatusEvents.shareId],
        references: [teamCoachReportShares.id],
    }),
    actor: one(users, {
        relationName: 'team_coach_review_status_events_actor',
        fields: [teamCoachReviewStatusEvents.actorUserId],
        references: [users.id],
    }),
    player: one(users, {
        relationName: 'team_coach_review_status_events_player',
        fields: [teamCoachReviewStatusEvents.playerUserId],
        references: [users.id],
    }),
}));

export const teamCoachReviewPacketsRelations = relations(teamCoachReviewPackets, ({ one, many }) => ({
    workspace: one(teamCoachWorkspaces, {
        fields: [teamCoachReviewPackets.workspaceId],
        references: [teamCoachWorkspaces.id],
    }),
    share: one(teamCoachReportShares, {
        fields: [teamCoachReviewPackets.shareId],
        references: [teamCoachReportShares.id],
    }),
    createdBy: one(users, {
        relationName: 'team_coach_review_packets_created_by',
        fields: [teamCoachReviewPackets.createdByUserId],
        references: [users.id],
    }),
    player: one(users, {
        relationName: 'team_coach_review_packets_player',
        fields: [teamCoachReviewPackets.playerUserId],
        references: [users.id],
    }),
    links: many(teamCoachPacketLinks),
    auditEvents: many(teamCoachAuditEvents),
}));

export const teamCoachPacketLinksRelations = relations(teamCoachPacketLinks, ({ one, many }) => ({
    packet: one(teamCoachReviewPackets, {
        fields: [teamCoachPacketLinks.packetId],
        references: [teamCoachReviewPackets.id],
    }),
    workspace: one(teamCoachWorkspaces, {
        fields: [teamCoachPacketLinks.workspaceId],
        references: [teamCoachWorkspaces.id],
    }),
    owner: one(users, {
        fields: [teamCoachPacketLinks.ownerUserId],
        references: [users.id],
    }),
    revokedBy: one(users, {
        fields: [teamCoachPacketLinks.revokedByUserId],
        references: [users.id],
    }),
    auditEvents: many(teamCoachAuditEvents),
}));

export const teamCoachSeatLedgerRelations = relations(teamCoachSeatLedger, ({ one }) => ({
    workspace: one(teamCoachWorkspaces, {
        fields: [teamCoachSeatLedger.workspaceId],
        references: [teamCoachWorkspaces.id],
    }),
    actor: one(users, {
        relationName: 'team_coach_seat_ledger_actor',
        fields: [teamCoachSeatLedger.actorUserId],
        references: [users.id],
    }),
    target: one(users, {
        relationName: 'team_coach_seat_ledger_target',
        fields: [teamCoachSeatLedger.targetUserId],
        references: [users.id],
    }),
    invite: one(teamCoachWorkspaceInvites, {
        fields: [teamCoachSeatLedger.inviteId],
        references: [teamCoachWorkspaceInvites.id],
    }),
    membership: one(teamCoachWorkspaceMemberships, {
        fields: [teamCoachSeatLedger.membershipId],
        references: [teamCoachWorkspaceMemberships.id],
    }),
}));

export const teamCoachAuditEventsRelations = relations(teamCoachAuditEvents, ({ one }) => ({
    workspace: one(teamCoachWorkspaces, {
        fields: [teamCoachAuditEvents.workspaceId],
        references: [teamCoachWorkspaces.id],
    }),
    actor: one(users, {
        relationName: 'team_coach_audit_events_actor',
        fields: [teamCoachAuditEvents.actorUserId],
        references: [users.id],
    }),
    target: one(users, {
        relationName: 'team_coach_audit_events_target',
        fields: [teamCoachAuditEvents.targetUserId],
        references: [users.id],
    }),
    invite: one(teamCoachWorkspaceInvites, {
        fields: [teamCoachAuditEvents.inviteId],
        references: [teamCoachWorkspaceInvites.id],
    }),
    membership: one(teamCoachWorkspaceMemberships, {
        fields: [teamCoachAuditEvents.membershipId],
        references: [teamCoachWorkspaceMemberships.id],
    }),
    share: one(teamCoachReportShares, {
        fields: [teamCoachAuditEvents.shareId],
        references: [teamCoachReportShares.id],
    }),
    note: one(teamCoachReviewNotes, {
        fields: [teamCoachAuditEvents.noteId],
        references: [teamCoachReviewNotes.id],
    }),
    packet: one(teamCoachReviewPackets, {
        fields: [teamCoachAuditEvents.packetId],
        references: [teamCoachReviewPackets.id],
    }),
    packetLink: one(teamCoachPacketLinks, {
        fields: [teamCoachAuditEvents.packetLinkId],
        references: [teamCoachPacketLinks.id],
    }),
}));

export const featureEntitlements = pgTable('feature_entitlements', {
    key: text('key').$type<CommunityEntitlementKey>().primaryKey(),
    description: text('description').notNull(),
    status: text('status')
        .$type<CommunityFeatureEntitlementStatus>()
        .notNull()
        .default('inactive'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const featureEntitlementsRelations = relations(featureEntitlements, ({ many }) => ({
    userEntitlements: many(userEntitlements),
}));

export const userEntitlements = pgTable(
    'user_entitlements',
    {
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        entitlementKey: text('entitlement_key')
            .$type<CommunityEntitlementKey>()
            .notNull()
            .references(() => featureEntitlements.key),
        source: text('source').$type<CommunityUserEntitlementSource>().notNull(),
        expiresAt: timestamp('expires_at', { mode: 'date' }),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        primaryKey({
            columns: [table.userId, table.entitlementKey],
            name: 'user_entitlements_user_id_entitlement_key_pk',
        }),
    ],
);

export const userEntitlementsRelations = relations(userEntitlements, ({ one }) => ({
    user: one(users, {
        fields: [userEntitlements.userId],
        references: [users.id],
    }),
    featureEntitlement: one(featureEntitlements, {
        fields: [userEntitlements.entitlementKey],
        references: [featureEntitlements.key],
    }),
}));

export const productFeatureEntitlements = pgTable('product_feature_entitlements', {
    key: text('key').$type<ProductEntitlementKey>().primaryKey(),
    status: text('status')
        .$type<ProductEntitlementStatus>()
        .notNull()
        .default('active'),
    tier: text('tier').$type<ProductFeatureTier>().notNull(),
    surface: text('surface').notNull(),
    labelKey: text('label_key').notNull(),
    internalDescription: text('internal_description').notNull(),
    introducedPhase: text('introduced_phase').notNull().default('05'),
    ownerDomain: text('owner_domain').notNull(),
    gatingMode: text('gating_mode').$type<ProductEntitlementGatingMode>().notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const productCheckoutAttempts = pgTable(
    'product_checkout_attempts',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        internalPriceKey: text('internal_price_key').$type<ProductPriceKey>().notNull(),
        status: text('status').notNull().default('created'),
        stripeCheckoutSessionId: text('stripe_checkout_session_id'),
        stripeCustomerId: text('stripe_customer_id'),
        idempotencyKey: text('idempotency_key').notNull(),
        environment: text('environment').notNull().default('test'),
        metadata: jsonb('metadata').notNull().default('{}').$type<Record<string, unknown>>(),
        expiresAt: timestamp('expires_at', { mode: 'date' }),
        completedAt: timestamp('completed_at', { mode: 'date' }),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('product_checkout_attempts_session_uidx').on(table.stripeCheckoutSessionId),
        uniqueIndex('product_checkout_attempts_idempotency_uidx').on(table.idempotencyKey),
        index('product_checkout_attempts_user_status_idx').on(table.userId, table.status),
    ],
);

export const productSubscriptions = pgTable(
    'product_subscriptions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        stripeCustomerId: text('stripe_customer_id').notNull(),
        stripeSubscriptionId: text('stripe_subscription_id').notNull(),
        internalPriceKey: text('internal_price_key').$type<ProductPriceKey>().notNull(),
        tier: text('tier').$type<ProductTier>().notNull().default('pro'),
        billingStatus: text('billing_status').$type<BillingStatus>().notNull(),
        accessState: text('access_state').$type<ProductAccessState>().notNull(),
        currentPeriodStart: timestamp('current_period_start', { mode: 'date' }),
        currentPeriodEnd: timestamp('current_period_end', { mode: 'date' }),
        cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
        canceledAt: timestamp('canceled_at', { mode: 'date' }),
        graceEndsAt: timestamp('grace_ends_at', { mode: 'date' }),
        suspendedAt: timestamp('suspended_at', { mode: 'date' }),
        suspensionReason: text('suspension_reason'),
        metadata: jsonb('metadata').notNull().default('{}').$type<Record<string, unknown>>(),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('product_subscriptions_subscription_uidx').on(table.stripeSubscriptionId),
        index('product_subscriptions_user_status_idx').on(table.userId, table.billingStatus),
        index('product_subscriptions_customer_idx').on(table.stripeCustomerId),
    ],
);

export const processedStripeEvents = pgTable(
    'processed_stripe_events',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        stripeEventId: text('stripe_event_id').notNull(),
        eventType: text('event_type').notNull(),
        livemode: boolean('livemode').notNull().default(false),
        processingStatus: text('processing_status').notNull().default('received'),
        checkoutAttemptId: uuid('checkout_attempt_id').references(() => productCheckoutAttempts.id, {
            onDelete: 'set null',
        }),
        subscriptionId: uuid('subscription_id').references(() => productSubscriptions.id, {
            onDelete: 'set null',
        }),
        payloadHash: text('payload_hash'),
        errorMessage: text('error_message'),
        metadata: jsonb('metadata').notNull().default('{}').$type<Record<string, unknown>>(),
        receivedAt: timestamp('received_at', { mode: 'date' }).defaultNow().notNull(),
        processedAt: timestamp('processed_at', { mode: 'date' }),
    },
    (table) => [
        uniqueIndex('processed_stripe_events_event_uidx').on(table.stripeEventId),
        index('processed_stripe_events_status_idx').on(table.processingStatus, table.receivedAt),
    ],
);

export const productUserGrants = pgTable(
    'product_user_grants',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        entitlementKey: text('entitlement_key')
            .$type<ProductEntitlementKey>()
            .notNull()
            .references(() => productFeatureEntitlements.key),
        tier: text('tier').$type<ProductTier>().notNull().default('pro'),
        source: text('source').notNull(),
        status: text('status').notNull().default('active'),
        reasonCode: text('reason_code').notNull(),
        quotaBoost: integer('quota_boost').default(0).notNull(),
        actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
        auditMetadata: jsonb('audit_metadata').notNull().default('{}').$type<Record<string, unknown>>(),
        startsAt: timestamp('starts_at', { mode: 'date' }).defaultNow().notNull(),
        endsAt: timestamp('ends_at', { mode: 'date' }),
        revokedAt: timestamp('revoked_at', { mode: 'date' }),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        index('product_user_grants_user_status_idx').on(table.userId, table.status),
        index('product_user_grants_entitlement_idx').on(table.entitlementKey),
        index('product_user_grants_actor_idx').on(table.actorUserId),
    ],
);

export const productQuotaLedger = pgTable(
    'product_quota_ledger',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        analysisSessionId: uuid('analysis_session_id').references(() => analysisSessions.id, {
            onDelete: 'set null',
        }),
        analysisSaveAttemptId: text('analysis_save_attempt_id').notNull(),
        idempotencyKey: text('idempotency_key').notNull(),
        state: text('state').$type<ProductQuotaState>().notNull(),
        reasonCode: text('reason_code').$type<QuotaReasonCode>().notNull(),
        amount: integer('amount').default(1).notNull(),
        quotaLimit: integer('quota_limit').notNull(),
        periodStart: timestamp('period_start', { mode: 'date' }).notNull(),
        periodEnd: timestamp('period_end', { mode: 'date' }).notNull(),
        finalizedAt: timestamp('finalized_at', { mode: 'date' }),
        voidedAt: timestamp('voided_at', { mode: 'date' }),
        metadata: jsonb('metadata').notNull().default('{}').$type<Record<string, unknown>>(),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex('product_quota_ledger_idempotency_uidx').on(table.idempotencyKey),
        index('product_quota_ledger_user_period_idx').on(table.userId, table.periodStart, table.periodEnd),
        index('product_quota_ledger_attempt_idx').on(table.analysisSaveAttemptId),
        index('product_quota_ledger_session_idx').on(table.analysisSessionId),
    ],
);

export const monetizationAnalyticsEvents = pgTable(
    'monetization_analytics_events',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
        eventType: text('event_type').$type<MonetizationEventType>().notNull(),
        surface: text('surface'),
        featureKey: text('feature_key').$type<ProductEntitlementKey>(),
        accessState: text('access_state').$type<ProductAccessState>(),
        quotaState: text('quota_state').$type<ProductQuotaState>(),
        priceKey: text('price_key').$type<ProductPriceKey>(),
        billingStatus: text('billing_status').$type<BillingStatus>(),
        reasonCode: text('reason_code').$type<QuotaReasonCode>(),
        cohortTag: text('cohort_tag'),
        creatorCode: text('creator_code'),
        eventSource: text('event_source').notNull().default('server'),
        metadata: jsonb('metadata').notNull().default('{}').$type<Record<string, unknown>>(),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        index('monetization_analytics_events_type_created_idx').on(table.eventType, table.createdAt),
        index('monetization_analytics_events_user_created_idx').on(table.userId, table.createdAt),
    ],
);

export const monetizationFlags = pgTable('monetization_flags', {
    key: text('key').$type<MonetizationFlagKey>().primaryKey(),
    enabled: boolean('enabled').notNull().default(false),
    environment: text('environment').notNull().default('test'),
    reason: text('reason'),
    updatedByUserId: uuid('updated_by_user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    metadata: jsonb('metadata').notNull().default('{}').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const productSupportNotes = pgTable(
    'product_support_notes',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        actorUserId: uuid('actor_user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'no action' }),
        category: text('category').notNull(),
        note: text('note').notNull(),
        visibility: text('visibility').notNull().default('internal'),
        metadata: jsonb('metadata').notNull().default('{}').$type<Record<string, unknown>>(),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        index('product_support_notes_user_created_idx').on(table.userId, table.createdAt),
        index('product_support_notes_actor_idx').on(table.actorUserId),
    ],
);

export const productBillingEvents = pgTable(
    'product_billing_events',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
        actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
        eventType: text('event_type').notNull(),
        targetType: text('target_type').notNull(),
        targetId: text('target_id'),
        severity: text('severity').notNull().default('info'),
        metadata: jsonb('metadata').notNull().default('{}').$type<Record<string, unknown>>(),
        createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    },
    (table) => [
        index('product_billing_events_user_created_idx').on(table.userId, table.createdAt),
        index('product_billing_events_type_created_idx').on(table.eventType, table.createdAt),
    ],
);

export const productFeatureEntitlementsRelations = relations(productFeatureEntitlements, ({ many }) => ({
    grants: many(productUserGrants),
}));

export const productCheckoutAttemptsRelations = relations(productCheckoutAttempts, ({ one, many }) => ({
    user: one(users, {
        fields: [productCheckoutAttempts.userId],
        references: [users.id],
    }),
    stripeEvents: many(processedStripeEvents),
}));

export const productSubscriptionsRelations = relations(productSubscriptions, ({ one, many }) => ({
    user: one(users, {
        fields: [productSubscriptions.userId],
        references: [users.id],
    }),
    stripeEvents: many(processedStripeEvents),
}));

export const processedStripeEventsRelations = relations(processedStripeEvents, ({ one }) => ({
    checkoutAttempt: one(productCheckoutAttempts, {
        fields: [processedStripeEvents.checkoutAttemptId],
        references: [productCheckoutAttempts.id],
    }),
    subscription: one(productSubscriptions, {
        fields: [processedStripeEvents.subscriptionId],
        references: [productSubscriptions.id],
    }),
}));

export const productUserGrantsRelations = relations(productUserGrants, ({ one }) => ({
    user: one(users, {
        relationName: 'product_user_grants_user',
        fields: [productUserGrants.userId],
        references: [users.id],
    }),
    actor: one(users, {
        relationName: 'product_user_grants_actor',
        fields: [productUserGrants.actorUserId],
        references: [users.id],
    }),
    entitlement: one(productFeatureEntitlements, {
        fields: [productUserGrants.entitlementKey],
        references: [productFeatureEntitlements.key],
    }),
}));

export const productQuotaLedgerRelations = relations(productQuotaLedger, ({ one }) => ({
    user: one(users, {
        fields: [productQuotaLedger.userId],
        references: [users.id],
    }),
    analysisSession: one(analysisSessions, {
        fields: [productQuotaLedger.analysisSessionId],
        references: [analysisSessions.id],
    }),
}));

export const monetizationAnalyticsEventsRelations = relations(monetizationAnalyticsEvents, ({ one }) => ({
    user: one(users, {
        fields: [monetizationAnalyticsEvents.userId],
        references: [users.id],
    }),
}));

export const monetizationFlagsRelations = relations(monetizationFlags, ({ one }) => ({
    updatedByUser: one(users, {
        fields: [monetizationFlags.updatedByUserId],
        references: [users.id],
    }),
}));

export const productSupportNotesRelations = relations(productSupportNotes, ({ one }) => ({
    user: one(users, {
        relationName: 'product_support_notes_user',
        fields: [productSupportNotes.userId],
        references: [users.id],
    }),
    actor: one(users, {
        relationName: 'product_support_notes_actor',
        fields: [productSupportNotes.actorUserId],
        references: [users.id],
    }),
}));

export const productBillingEventsRelations = relations(productBillingEvents, ({ one }) => ({
    user: one(users, {
        relationName: 'product_billing_events_user',
        fields: [productBillingEvents.userId],
        references: [users.id],
    }),
    actor: one(users, {
        relationName: 'product_billing_events_actor',
        fields: [productBillingEvents.actorUserId],
        references: [users.id],
    }),
}));

export const precisionEvolutionLinesRelations = relations(precisionEvolutionLines, ({ one, many }) => ({
    user: one(users, {
        fields: [precisionEvolutionLines.userId],
        references: [users.id],
    }),
    baselineSession: one(analysisSessions, {
        relationName: 'precision_evolution_lines_baseline_session',
        fields: [precisionEvolutionLines.baselineSessionId],
        references: [analysisSessions.id],
    }),
    currentSession: one(analysisSessions, {
        relationName: 'precision_evolution_lines_current_session',
        fields: [precisionEvolutionLines.currentSessionId],
        references: [analysisSessions.id],
    }),
    checkpoints: many(precisionCheckpoints),
}));

export const precisionCheckpointsRelations = relations(precisionCheckpoints, ({ one }) => ({
    line: one(precisionEvolutionLines, {
        fields: [precisionCheckpoints.lineId],
        references: [precisionEvolutionLines.id],
    }),
    analysisSession: one(analysisSessions, {
        fields: [precisionCheckpoints.analysisSessionId],
        references: [analysisSessions.id],
    }),
}));

export const coachProtocolOutcomesRelations = relations(coachProtocolOutcomes, ({ one, many }) => ({
    user: one(users, {
        fields: [coachProtocolOutcomes.userId],
        references: [users.id],
    }),
    analysisSession: one(analysisSessions, {
        fields: [coachProtocolOutcomes.analysisSessionId],
        references: [analysisSessions.id],
    }),
    revisionOf: one(coachProtocolOutcomes, {
        relationName: 'coach_protocol_outcomes_revision',
        fields: [coachProtocolOutcomes.revisionOfId],
        references: [coachProtocolOutcomes.id],
    }),
    revisions: many(coachProtocolOutcomes, {
        relationName: 'coach_protocol_outcomes_revision',
    }),
}));

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// System / Bot Status
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export const completeTrainingProtocolRevisionsRelations = relations(completeTrainingProtocolRevisions, ({ one }) => ({
    user: one(users, {
        fields: [completeTrainingProtocolRevisions.userId],
        references: [users.id],
    }),
    analysisSession: one(analysisSessions, {
        fields: [completeTrainingProtocolRevisions.analysisSessionId],
        references: [analysisSessions.id],
    }),
}));

export const trainingProtocolTransferRecordsRelations = relations(trainingProtocolTransferRecords, ({ one }) => ({
    user: one(users, {
        fields: [trainingProtocolTransferRecords.userId],
        references: [users.id],
    }),
    analysisSession: one(analysisSessions, {
        fields: [trainingProtocolTransferRecords.analysisSessionId],
        references: [analysisSessions.id],
    }),
}));

export const sprayLabSessionsRelations = relations(sprayLabSessions, ({ one, many }) => ({
    user: one(users, {
        fields: [sprayLabSessions.userId],
        references: [users.id],
    }),
    baseAnalysisSession: one(analysisSessions, {
        fields: [sprayLabSessions.baseAnalysisSessionId],
        references: [analysisSessions.id],
    }),
    protocolRevision: one(completeTrainingProtocolRevisions, {
        fields: [sprayLabSessions.protocolRevisionId],
        references: [completeTrainingProtocolRevisions.id],
    }),
    events: many(sprayLabSessionEvents),
    benchmarkSnapshots: many(sprayLabBenchmarkSnapshots),
    validationLinks: many(sprayLabValidationLinks),
}));

export const sprayLabSessionEventsRelations = relations(sprayLabSessionEvents, ({ one }) => ({
    user: one(users, {
        fields: [sprayLabSessionEvents.userId],
        references: [users.id],
    }),
    labSession: one(sprayLabSessions, {
        fields: [sprayLabSessionEvents.labSessionId],
        references: [sprayLabSessions.id],
    }),
}));

export const sprayLabBenchmarkSnapshotsRelations = relations(sprayLabBenchmarkSnapshots, ({ one }) => ({
    user: one(users, {
        fields: [sprayLabBenchmarkSnapshots.userId],
        references: [users.id],
    }),
    labSession: one(sprayLabSessions, {
        fields: [sprayLabBenchmarkSnapshots.labSessionId],
        references: [sprayLabSessions.id],
    }),
    baseAnalysisSession: one(analysisSessions, {
        fields: [sprayLabBenchmarkSnapshots.baseAnalysisSessionId],
        references: [analysisSessions.id],
    }),
    protocolRevision: one(completeTrainingProtocolRevisions, {
        fields: [sprayLabBenchmarkSnapshots.protocolRevisionId],
        references: [completeTrainingProtocolRevisions.id],
    }),
}));

export const sprayLabValidationLinksRelations = relations(sprayLabValidationLinks, ({ one }) => ({
    user: one(users, {
        fields: [sprayLabValidationLinks.userId],
        references: [users.id],
    }),
    labSession: one(sprayLabSessions, {
        fields: [sprayLabValidationLinks.labSessionId],
        references: [sprayLabSessions.id],
    }),
    baseAnalysisSession: one(analysisSessions, {
        relationName: 'spray_lab_validation_links_base_analysis',
        fields: [sprayLabValidationLinks.baseAnalysisSessionId],
        references: [analysisSessions.id],
    }),
    validationAnalysisSession: one(analysisSessions, {
        relationName: 'spray_lab_validation_links_validation_analysis',
        fields: [sprayLabValidationLinks.validationAnalysisSessionId],
        references: [analysisSessions.id],
    }),
}));

export const trainingProgramCyclesRelations = relations(trainingProgramCycles, ({ one, many }) => ({
    user: one(users, {
        fields: [trainingProgramCycles.userId],
        references: [users.id],
    }),
    baseAnalysisSession: one(analysisSessions, {
        fields: [trainingProgramCycles.baseAnalysisSessionId],
        references: [analysisSessions.id],
    }),
    protocolRevision: one(completeTrainingProtocolRevisions, {
        fields: [trainingProgramCycles.protocolRevisionId],
        references: [completeTrainingProtocolRevisions.id],
    }),
    weeks: many(trainingProgramWeeks),
    missions: many(trainingProgramMissions),
    checkpoints: many(trainingProgramCheckpoints),
    events: many(trainingProgramEvents),
}));

export const trainingProgramWeeksRelations = relations(trainingProgramWeeks, ({ one, many }) => ({
    user: one(users, {
        fields: [trainingProgramWeeks.userId],
        references: [users.id],
    }),
    cycle: one(trainingProgramCycles, {
        fields: [trainingProgramWeeks.cycleId],
        references: [trainingProgramCycles.id],
    }),
    missions: many(trainingProgramMissions),
    checkpoints: many(trainingProgramCheckpoints),
}));

export const trainingProgramMissionsRelations = relations(trainingProgramMissions, ({ one, many }) => ({
    user: one(users, {
        fields: [trainingProgramMissions.userId],
        references: [users.id],
    }),
    cycle: one(trainingProgramCycles, {
        fields: [trainingProgramMissions.cycleId],
        references: [trainingProgramCycles.id],
    }),
    week: one(trainingProgramWeeks, {
        fields: [trainingProgramMissions.weekId],
        references: [trainingProgramWeeks.id],
    }),
    protocolRevision: one(completeTrainingProtocolRevisions, {
        fields: [trainingProgramMissions.protocolRevisionId],
        references: [completeTrainingProtocolRevisions.id],
    }),
    labSession: one(sprayLabSessions, {
        fields: [trainingProgramMissions.labSessionId],
        references: [sprayLabSessions.id],
    }),
    validationLink: one(sprayLabValidationLinks, {
        fields: [trainingProgramMissions.validationLinkId],
        references: [sprayLabValidationLinks.id],
    }),
    events: many(trainingProgramEvents),
}));

export const trainingProgramCheckpointsRelations = relations(trainingProgramCheckpoints, ({ one, many }) => ({
    user: one(users, {
        fields: [trainingProgramCheckpoints.userId],
        references: [users.id],
    }),
    cycle: one(trainingProgramCycles, {
        fields: [trainingProgramCheckpoints.cycleId],
        references: [trainingProgramCycles.id],
    }),
    week: one(trainingProgramWeeks, {
        fields: [trainingProgramCheckpoints.weekId],
        references: [trainingProgramWeeks.id],
    }),
    labSession: one(sprayLabSessions, {
        fields: [trainingProgramCheckpoints.labSessionId],
        references: [sprayLabSessions.id],
    }),
    validationLink: one(sprayLabValidationLinks, {
        fields: [trainingProgramCheckpoints.validationLinkId],
        references: [sprayLabValidationLinks.id],
    }),
    precisionCheckpoint: one(precisionCheckpoints, {
        fields: [trainingProgramCheckpoints.precisionCheckpointId],
        references: [precisionCheckpoints.id],
    }),
    events: many(trainingProgramEvents),
}));

export const trainingProgramEventsRelations = relations(trainingProgramEvents, ({ one }) => ({
    user: one(users, {
        fields: [trainingProgramEvents.userId],
        references: [users.id],
    }),
    cycle: one(trainingProgramCycles, {
        fields: [trainingProgramEvents.cycleId],
        references: [trainingProgramCycles.id],
    }),
    mission: one(trainingProgramMissions, {
        fields: [trainingProgramEvents.missionId],
        references: [trainingProgramMissions.id],
    }),
    checkpoint: one(trainingProgramCheckpoints, {
        fields: [trainingProgramEvents.checkpointId],
        references: [trainingProgramCheckpoints.id],
    }),
}));

export const botHeartbeat = pgTable('bot_heartbeat', {
    id: text('id').primaryKey().default('main_bot'),
    lastSeen: timestamp('last_seen', { mode: 'date' }).defaultNow().notNull(),
});

// ═══════════════════════════════════════════
// Admin & System Management
// ═══════════════════════════════════════════

export const auditLogs = pgTable('audit_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(), // e.g., 'CHANGE_ROLE', 'TOGGLE_MAINTENANCE'
    target: text('target'), // e.g., 'user_id', 'main_bot'
    details: jsonb('details').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    admin: one(users, {
        fields: [auditLogs.adminId],
        references: [users.id],
    }),
}));

export const systemSettings = pgTable('system_settings', {
    key: text('key').primaryKey(), // e.g., 'maintenance_mode', 'site_version'
    value: jsonb('value').$type<Record<string, unknown>>().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ═══════════════════════════════════════════
// Inferred Types (auto-generated from schema)
// ═══════════════════════════════════════════

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type NewPlayerProfile = typeof playerProfiles.$inferInsert;
export type AnalysisSessionRow = typeof analysisSessions.$inferSelect;
export type NewAnalysisSession = typeof analysisSessions.$inferInsert;
export type PrecisionEvolutionLineRow = typeof precisionEvolutionLines.$inferSelect;
export type NewPrecisionEvolutionLine = typeof precisionEvolutionLines.$inferInsert;
export type PrecisionCheckpointRow = typeof precisionCheckpoints.$inferSelect;
export type NewPrecisionCheckpoint = typeof precisionCheckpoints.$inferInsert;
export type CoachProtocolOutcomeRow = typeof coachProtocolOutcomes.$inferSelect;
export type NewCoachProtocolOutcome = typeof coachProtocolOutcomes.$inferInsert;
export type CompleteTrainingProtocolRevisionRow = typeof completeTrainingProtocolRevisions.$inferSelect;
export type NewCompleteTrainingProtocolRevision = typeof completeTrainingProtocolRevisions.$inferInsert;
export type TrainingProtocolTransferRecordRow = typeof trainingProtocolTransferRecords.$inferSelect;
export type NewTrainingProtocolTransferRecord = typeof trainingProtocolTransferRecords.$inferInsert;
export type SprayLabSessionRow = typeof sprayLabSessions.$inferSelect;
export type NewSprayLabSession = typeof sprayLabSessions.$inferInsert;
export type SprayLabSessionEventRow = typeof sprayLabSessionEvents.$inferSelect;
export type NewSprayLabSessionEvent = typeof sprayLabSessionEvents.$inferInsert;
export type SprayLabBenchmarkSnapshotRow = typeof sprayLabBenchmarkSnapshots.$inferSelect;
export type NewSprayLabBenchmarkSnapshot = typeof sprayLabBenchmarkSnapshots.$inferInsert;
export type SprayLabValidationLinkRow = typeof sprayLabValidationLinks.$inferSelect;
export type NewSprayLabValidationLink = typeof sprayLabValidationLinks.$inferInsert;
export type TrainingProgramCycleRow = typeof trainingProgramCycles.$inferSelect;
export type NewTrainingProgramCycle = typeof trainingProgramCycles.$inferInsert;
export type TrainingProgramWeekRow = typeof trainingProgramWeeks.$inferSelect;
export type NewTrainingProgramWeek = typeof trainingProgramWeeks.$inferInsert;
export type TrainingProgramMissionRow = typeof trainingProgramMissions.$inferSelect;
export type NewTrainingProgramMission = typeof trainingProgramMissions.$inferInsert;
export type TrainingProgramCheckpointRow = typeof trainingProgramCheckpoints.$inferSelect;
export type NewTrainingProgramCheckpoint = typeof trainingProgramCheckpoints.$inferInsert;
export type TrainingProgramEventRow = typeof trainingProgramEvents.$inferSelect;
export type NewTrainingProgramEvent = typeof trainingProgramEvents.$inferInsert;
export type SensitivityHistoryRow = typeof sensitivityHistory.$inferSelect;
export type NewSensitivityHistory = typeof sensitivityHistory.$inferInsert;
export type WeaponProfile = typeof weaponProfiles.$inferSelect;
export type NewWeaponProfile = typeof weaponProfiles.$inferInsert;
export type WeaponRegistryRow = typeof weaponRegistry.$inferSelect;
export type NewWeaponRegistry = typeof weaponRegistry.$inferInsert;
export type WeaponPatchProfileRow = typeof weaponPatchProfiles.$inferSelect;
export type NewWeaponPatchProfile = typeof weaponPatchProfiles.$inferInsert;
export type CommunityProfileRow = typeof communityProfiles.$inferSelect;
export type NewCommunityProfile = typeof communityProfiles.$inferInsert;
export type CommunityPostRow = typeof communityPosts.$inferSelect;
export type NewCommunityPost = typeof communityPosts.$inferInsert;
export type CommunityPostAnalysisSnapshotRow = typeof communityPostAnalysisSnapshots.$inferSelect;
export type NewCommunityPostAnalysisSnapshot = typeof communityPostAnalysisSnapshots.$inferInsert;
export type CommunityPostLikeRow = typeof communityPostLikes.$inferSelect;
export type NewCommunityPostLike = typeof communityPostLikes.$inferInsert;
export type CommunityPostSaveRow = typeof communityPostSaves.$inferSelect;
export type NewCommunityPostSave = typeof communityPostSaves.$inferInsert;
export type CommunityPostCopyEventRow = typeof communityPostCopyEvents.$inferSelect;
export type NewCommunityPostCopyEvent = typeof communityPostCopyEvents.$inferInsert;
export type CommunityPostCommentRow = typeof communityPostComments.$inferSelect;
export type NewCommunityPostComment = typeof communityPostComments.$inferInsert;
export type CommunityFollowRow = typeof communityFollows.$inferSelect;
export type NewCommunityFollow = typeof communityFollows.$inferInsert;
export type CommunityReportRow = typeof communityReports.$inferSelect;
export type NewCommunityReport = typeof communityReports.$inferInsert;
export type CommunityModerationActionRow = typeof communityModerationActions.$inferSelect;
export type NewCommunityModerationAction = typeof communityModerationActions.$inferInsert;
export type SocialProReportRow = typeof socialProReports.$inferSelect;
export type NewSocialProReport = typeof socialProReports.$inferInsert;
export type SocialProReportLinkRow = typeof socialProReportLinks.$inferSelect;
export type NewSocialProReportLink = typeof socialProReportLinks.$inferInsert;
export type SocialProReportAuditEventRow = typeof socialProReportAuditEvents.$inferSelect;
export type NewSocialProReportAuditEvent = typeof socialProReportAuditEvents.$inferInsert;
export type SocialProCollectionRow = typeof socialProCollections.$inferSelect;
export type NewSocialProCollection = typeof socialProCollections.$inferInsert;
export type SocialProCollectionItemRow = typeof socialProCollectionItems.$inferSelect;
export type NewSocialProCollectionItem = typeof socialProCollectionItems.$inferInsert;
export type TeamCoachWorkspaceRow = typeof teamCoachWorkspaces.$inferSelect;
export type NewTeamCoachWorkspace = typeof teamCoachWorkspaces.$inferInsert;
export type TeamCoachWorkspaceMembershipRow =
    typeof teamCoachWorkspaceMemberships.$inferSelect;
export type NewTeamCoachWorkspaceMembership =
    typeof teamCoachWorkspaceMemberships.$inferInsert;
export type TeamCoachWorkspaceInviteRow =
    typeof teamCoachWorkspaceInvites.$inferSelect;
export type NewTeamCoachWorkspaceInvite =
    typeof teamCoachWorkspaceInvites.$inferInsert;
export type TeamCoachReportShareRow = typeof teamCoachReportShares.$inferSelect;
export type NewTeamCoachReportShare = typeof teamCoachReportShares.$inferInsert;
export type TeamCoachReviewNoteRow = typeof teamCoachReviewNotes.$inferSelect;
export type NewTeamCoachReviewNote = typeof teamCoachReviewNotes.$inferInsert;
export type TeamCoachReviewStatusEventRow =
    typeof teamCoachReviewStatusEvents.$inferSelect;
export type NewTeamCoachReviewStatusEvent =
    typeof teamCoachReviewStatusEvents.$inferInsert;
export type TeamCoachReviewPacketRow = typeof teamCoachReviewPackets.$inferSelect;
export type NewTeamCoachReviewPacket = typeof teamCoachReviewPackets.$inferInsert;
export type TeamCoachPacketLinkRow = typeof teamCoachPacketLinks.$inferSelect;
export type NewTeamCoachPacketLink = typeof teamCoachPacketLinks.$inferInsert;
export type TeamCoachSeatLedgerRow = typeof teamCoachSeatLedger.$inferSelect;
export type NewTeamCoachSeatLedger = typeof teamCoachSeatLedger.$inferInsert;
export type TeamCoachAuditEventRow = typeof teamCoachAuditEvents.$inferSelect;
export type NewTeamCoachAuditEvent = typeof teamCoachAuditEvents.$inferInsert;
export type FeatureEntitlementRow = typeof featureEntitlements.$inferSelect;
export type NewFeatureEntitlement = typeof featureEntitlements.$inferInsert;
export type UserEntitlementRow = typeof userEntitlements.$inferSelect;
export type NewUserEntitlement = typeof userEntitlements.$inferInsert;
export type ProductFeatureEntitlementRow = typeof productFeatureEntitlements.$inferSelect;
export type NewProductFeatureEntitlement = typeof productFeatureEntitlements.$inferInsert;
export type ProductCheckoutAttemptRow = typeof productCheckoutAttempts.$inferSelect;
export type NewProductCheckoutAttempt = typeof productCheckoutAttempts.$inferInsert;
export type ProductSubscriptionRow = typeof productSubscriptions.$inferSelect;
export type NewProductSubscription = typeof productSubscriptions.$inferInsert;
export type ProcessedStripeEventRow = typeof processedStripeEvents.$inferSelect;
export type NewProcessedStripeEvent = typeof processedStripeEvents.$inferInsert;
export type ProductUserGrantRow = typeof productUserGrants.$inferSelect;
export type NewProductUserGrant = typeof productUserGrants.$inferInsert;
export type ProductQuotaLedgerRow = typeof productQuotaLedger.$inferSelect;
export type NewProductQuotaLedger = typeof productQuotaLedger.$inferInsert;
export type MonetizationAnalyticsEventRow = typeof monetizationAnalyticsEvents.$inferSelect;
export type NewMonetizationAnalyticsEvent = typeof monetizationAnalyticsEvents.$inferInsert;
export type MonetizationFlagRow = typeof monetizationFlags.$inferSelect;
export type NewMonetizationFlag = typeof monetizationFlags.$inferInsert;
export type ProductSupportNoteRow = typeof productSupportNotes.$inferSelect;
export type NewProductSupportNote = typeof productSupportNotes.$inferInsert;
export type ProductBillingEventRow = typeof productBillingEvents.$inferSelect;
export type NewProductBillingEvent = typeof productBillingEvents.$inferInsert;
export type CommunitySeasonRow = typeof communitySeasons.$inferSelect;
export type NewCommunitySeason = typeof communitySeasons.$inferInsert;
export type CommunityUserProgressionAggregateRow =
    typeof communityUserProgressionAggregates.$inferSelect;
export type NewCommunityUserProgressionAggregate =
    typeof communityUserProgressionAggregates.$inferInsert;
export type CommunityMissionRow = typeof communityMissions.$inferSelect;
export type NewCommunityMission = typeof communityMissions.$inferInsert;
export type CommunitySquadRow = typeof communitySquads.$inferSelect;
export type NewCommunitySquad = typeof communitySquads.$inferInsert;
export type CommunitySquadMembershipRow =
    typeof communitySquadMemberships.$inferSelect;
export type NewCommunitySquadMembership =
    typeof communitySquadMemberships.$inferInsert;
export type CommunitySquadInviteRow =
    typeof communitySquadInvites.$inferSelect;
export type NewCommunitySquadInvite =
    typeof communitySquadInvites.$inferInsert;
export type CommunityProgressionEventRow =
    typeof communityProgressionEvents.$inferSelect;
export type NewCommunityProgressionEvent =
    typeof communityProgressionEvents.$inferInsert;
export type CommunityRewardRecordRow =
    typeof communityRewardRecords.$inferSelect;
export type NewCommunityRewardRecord =
    typeof communityRewardRecords.$inferInsert;
