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
} from 'drizzle-orm/pg-core';
import type { AdapterAccount } from '@auth/core/adapters';

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
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

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

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

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
    fullResult: jsonb('full_result').$type<any>(), // Stores the complete AnalysisResult

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

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
