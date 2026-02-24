/**
 * Zod Schemas — Validação runtime em todas as fronteiras.
 * Formulários, Server Actions, API params, env vars.
 */

import { z } from 'zod';

// ═══════════════════════════════════════════
// Environment Variables
// ═══════════════════════════════════════════

export const envSchema = z.object({
    DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL válida'),
    AUTH_SECRET: z.string().min(1, 'AUTH_SECRET é obrigatório'),
    AUTH_URL: z.string().url('AUTH_URL deve ser uma URL válida'),
    AUTH_DISCORD_ID: z.string().optional(),
    AUTH_DISCORD_SECRET: z.string().optional(),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL deve ser uma URL válida'),
});

export type EnvVars = z.infer<typeof envSchema>;

// ═══════════════════════════════════════════
// Player Profile Form
// ═══════════════════════════════════════════

export const mouseSchema = z.object({
    model: z.string().min(1, 'Modelo do mouse é obrigatório'),
    sensor: z.string().min(1, 'Sensor é obrigatório'),
    dpi: z.number().int().min(100).max(25600),
    pollingRate: z.number().int().refine(
        (v) => [125, 250, 500, 1000, 2000, 4000, 8000].includes(v),
        'Polling rate inválido'
    ),
    weightGrams: z.number().min(30).max(200),
    liftOffDistance: z.number().min(0.5).max(3),
});

export const mousepadSchema = z.object({
    model: z.string().min(1, 'Modelo do mousepad é obrigatório'),
    widthCm: z.number().min(10).max(120),
    heightCm: z.number().min(10).max(60),
    type: z.enum(['speed', 'control', 'hybrid']),
    material: z.enum(['cloth', 'hard', 'glass']),
});

export const monitorSchema = z.object({
    resolution: z.string().min(1, 'Resolução é obrigatória'),
    refreshRate: z.number().int().min(60).max(500),
    panelType: z.enum(['ips', 'tn', 'va']),
});

export const pubgSettingsSchema = z.object({
    generalSens: z.number().min(0.01).max(100),
    adsSens: z.number().min(0.01).max(100),
    scopeSens: z.record(z.string(), z.number().min(0.01).max(100)),
    fov: z.number().int().min(80).max(103),
    verticalMultiplier: z.number().min(0.5).max(1.5),
    mouseAcceleration: z.boolean(),
});

export const physicalSchema = z.object({
    armLength: z.enum(['short', 'medium', 'long']),
    deskSpaceCm: z.number().min(20).max(200),
});

export const playerProfileSchema = z.object({
    mouse: mouseSchema,
    mousepad: mousepadSchema,
    gripStyle: z.enum(['palm', 'claw', 'fingertip', 'hybrid']),
    playStyle: z.enum(['arm', 'wrist', 'hybrid']),
    monitor: monitorSchema,
    pubgSettings: pubgSettingsSchema,
    physical: physicalSchema,
    identity: z.object({
        bio: z.string().max(300, 'Bio muito longa').optional().nullable(),
        twitter: z.string().optional().nullable(),
        twitch: z.string().optional().nullable(),
    }).optional(),
});

export type PlayerProfileInput = z.infer<typeof playerProfileSchema>;

// ═══════════════════════════════════════════
// Clip Upload Form
// ═══════════════════════════════════════════

export const clipUploadSchema = z.object({
    weaponId: z.string().min(1, 'Selecione uma arma'),
    scopeId: z.string().min(1, 'Selecione uma mira'),
    distance: z.number().int().min(10).max(500),
});

export type ClipUploadInput = z.infer<typeof clipUploadSchema>;

// ═══════════════════════════════════════════
// Sensitivity Adjustment Form
// ═══════════════════════════════════════════

export const sensitivityApplySchema = z.object({
    profileType: z.enum(['low', 'balanced', 'high']),
    sessionId: z.string().uuid(),
});

export type SensitivityApplyInput = z.infer<typeof sensitivityApplySchema>;
