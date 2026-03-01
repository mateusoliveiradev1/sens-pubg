import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { playerProfiles } from '@/db/schema';

// ═══════════════════════════════════════════
// Player Profile Form (Drizzle Integrated)
// ═══════════════════════════════════════════

// The database schema is our single source of truth.
// We use createInsertSchema to get a Zod schema matching the DB table.
export const playerProfilesBaseSchema = createInsertSchema(playerProfiles);

// ═══════════════════════════════════════════
// Player Profile Form
// ═══════════════════════════════════════════

// Helper for consistent numeric fields with nice error messages
const numericField = (label: string, min?: number, max?: number, isInt = false) => {
    let schema = z.coerce.number();

    if (isInt) {
        schema = schema.int({ message: `${label} deve ser um número inteiro` });
    }

    if (min !== undefined) {
        schema = schema.min(min, { message: `Mínimo: ${min}` });
    }

    if (max !== undefined) {
        schema = schema.max(max, { message: `Máximo: ${max}` });
    }

    return schema;
};

export const mouseSchema = z.object({
    model: z.string().min(1, 'Modelo do mouse é obrigatório'),
    sensor: z.string().min(1, 'Sensor é obrigatório'),
    dpi: numericField('DPI', 100, 25600, true),
    pollingRate: z.coerce.number().int().refine(
        (v) => [125, 250, 500, 1000, 2000, 4000, 8000].includes(v),
        'Polling rate inválido'
    ),
    weightGrams: numericField('Peso', 30, 200),
    liftOffDistance: numericField('LOD', 0.5, 3),
});

export const mousepadSchema = z.object({
    model: z.string().min(1, 'Modelo do mousepad é obrigatório'),
    widthCm: numericField('Largura', 10, 120),
    heightCm: numericField('Altura', 10, 60),
    type: z.enum(['speed', 'control', 'hybrid']),
    material: z.enum(['cloth', 'hard', 'glass']),
});

export const monitorSchema = z.object({
    resolution: z.string().min(1, 'Resolução é obrigatória'),
    refreshRate: numericField('Refresh Rate', 60, 500, true),
    panelType: z.enum(['ips', 'tn', 'va']),
});

export const pubgSettingsSchema = z.object({
    generalSens: numericField('Sensibilidade', 0.01, 100),
    adsSens: numericField('Sensibilidade ADS', 0.01, 100),
    scopeSens: z.record(z.string(), z.coerce.number().min(0.01).max(100)),
    fov: numericField('FOV', 80, 103, true),
    verticalMultiplier: numericField('Multiplicador Vertical', 0.5, 1.5),
    mouseAcceleration: z.boolean(),
});

export const physicalSchema = z.object({
    armLength: z.enum(['short', 'medium', 'long']),
    deskSpaceCm: numericField('Espaço na Mesa', 20, 200),
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
    attachments: z.object({
        muzzle: z.string().default('none'),
        grip: z.string().default('none'),
        stock: z.string().default('none'),
    }),
    distance: z.number().int().min(10).max(500),
});

export type ClipUploadInput = z.infer<typeof clipUploadSchema>;

// ═══════════════════════════════════════════
// Setup Wizard Form (Added in Phase 2)
// ═══════════════════════════════════════════

export const setupWizardSchema = z.object({
    resolution: z.string().min(1, 'Resolução é obrigatória'),
    fov: numericField('FOV', 80, 103, true),
    mouseDpi: numericField('DPI', 100, 25600, true),
    sensGeneral: numericField('Sensibilidade Geral', 0.01, 100),
    sens1x: numericField('Sensibilidade 1x', 0.01, 100),
    sens3x: numericField('Sensibilidade 3x', 0.01, 100),
    sens4x: numericField('Sensibilidade 4x', 0.01, 100),
});

export type SetupWizardInput = z.infer<typeof setupWizardSchema>;

// ═══════════════════════════════════════════
// Sensitivity Adjustment Form
// ═══════════════════════════════════════════

export const sensitivityApplySchema = z.object({
    profileType: z.enum(['low', 'balanced', 'high']),
    sessionId: z.string().uuid(),
});

export type SensitivityApplyInput = z.infer<typeof sensitivityApplySchema>;
