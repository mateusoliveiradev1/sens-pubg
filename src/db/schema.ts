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
    PrecisionCheckpointState,
    PrecisionTrendSummary,
    PrecisionVariableInTest,
} from '@/types/engine';
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
export type CommunityReportEntityType = 'post' | 'comment' | 'profile';
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

// ═══════════════════════════════════════════
// Auth.js Tables (NextAuth adapter)
// ═══════════════════════════════════════════

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
export type FeatureEntitlementRow = typeof featureEntitlements.$inferSelect;
export type NewFeatureEntitlement = typeof featureEntitlements.$inferInsert;
export type UserEntitlementRow = typeof userEntitlements.$inferSelect;
export type NewUserEntitlement = typeof userEntitlements.$inferInsert;
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
