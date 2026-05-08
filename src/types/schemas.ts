import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { playerProfiles } from '@/db/schema';

export const playerProfilesBaseSchema = createInsertSchema(playerProfiles);

const numericField = (label: string, min?: number, max?: number, isInt = false) => {
    let schema = z.coerce.number();

    if (isInt) {
        schema = schema.int({ message: `${label} deve ser um numero inteiro` });
    }

    if (min !== undefined) {
        schema = schema.min(min, { message: `Minimo: ${min}` });
    }

    if (max !== undefined) {
        schema = schema.max(max, { message: `Maximo: ${max}` });
    }

    return schema;
};

const requiredTextField = (label: string) => z.string()
    .trim()
    .min(1, `${label} e obrigatorio`);

export const mouseSchema = z.object({
    model: requiredTextField('Modelo do mouse'),
    sensor: requiredTextField('Sensor'),
    dpi: numericField('DPI', 100, 25600, true),
    pollingRate: z.coerce.number().int().refine(
        (v) => [125, 250, 500, 1000, 2000, 4000, 8000].includes(v),
        'Polling rate invalido',
    ),
    weightGrams: numericField('Peso', 30, 200),
    liftOffDistance: numericField('LOD', 0.5, 3),
});

export const mousepadSchema = z.object({
    model: requiredTextField('Modelo do mousepad'),
    widthCm: numericField('Largura', 10, 120),
    heightCm: numericField('Altura', 10, 60),
    type: z.enum(['speed', 'control', 'hybrid']),
    material: z.enum(['cloth', 'hard', 'glass']),
});

export const monitorSchema = z.object({
    resolution: requiredTextField('Resolucao'),
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
    deskSpaceCm: numericField('Espaco na Mesa', 20, 200),
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
        bio: z.string().trim().max(300, 'Bio muito longa').optional().nullable(),
        twitter: z.string().trim().optional().nullable(),
        twitch: z.string().trim().optional().nullable(),
    }).optional(),
});

export type PlayerProfileInput = z.infer<typeof playerProfileSchema>;

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

export const setupWizardSchema = playerProfileSchema;

export type SetupWizardInput = z.infer<typeof setupWizardSchema>;

export const sensitivityApplySchema = z.object({
    profileType: z.enum(['low', 'balanced', 'high']),
    sessionId: z.string().uuid(),
});

export type SensitivityApplyInput = z.infer<typeof sensitivityApplySchema>;
