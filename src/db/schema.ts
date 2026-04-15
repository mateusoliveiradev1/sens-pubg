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
    primaryKey,
    uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccount } from '@auth/core/adapters';

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

export const analysisSessionsRelations = relations(analysisSessions, ({ one, many }) => ({
    user: one(users, {
        fields: [analysisSessions.userId],
        references: [users.id],
    }),
    sensitivityHistory: many(sensitivityHistory),
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

// ═══════════════════════════════════════════
// System / Bot Status
// ═══════════════════════════════════════════

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
export type SensitivityHistoryRow = typeof sensitivityHistory.$inferSelect;
export type NewSensitivityHistory = typeof sensitivityHistory.$inferInsert;
export type WeaponProfile = typeof weaponProfiles.$inferSelect;
export type NewWeaponProfile = typeof weaponProfiles.$inferInsert;
export type WeaponRegistryRow = typeof weaponRegistry.$inferSelect;
export type NewWeaponRegistry = typeof weaponRegistry.$inferInsert;
export type WeaponPatchProfileRow = typeof weaponPatchProfiles.$inferSelect;
export type NewWeaponPatchProfile = typeof weaponPatchProfiles.$inferInsert;
