import { getWeapon, type WeaponCategory } from '@/game/pubg';

import { resolveWeaponVisualEntry, type WeaponVisualRegistryEntry } from './weapon-visual-registry';

export type WeaponSupportKind =
    | 'full'
    | 'visual'
    | 'technical_limited'
    | 'removed'
    | 'deprecated';

export interface WeaponSupportStatus {
    readonly kind: WeaponSupportKind;
    readonly label: 'suporte completo' | 'suporte visual' | 'suporte tecnico limitado' | 'removida' | 'deprecated';
    readonly description: string;
    readonly visualEntry?: WeaponVisualRegistryEntry;
    readonly technicalWeaponId?: string;
    readonly category?: WeaponCategory | 'ar' | 'smg' | 'dmr';
}

export interface ResolveWeaponSupportStatusInput {
    readonly weaponId?: string | null | undefined;
    readonly weaponName?: string | null | undefined;
    readonly category?: string | null | undefined;
    readonly calibrationLimited?: boolean;
}

function normalizeCategory(category: string | null | undefined): WeaponCategory | 'ar' | 'smg' | 'dmr' | undefined {
    if (!category) {
        return undefined;
    }

    const normalized = category.trim().toLowerCase();
    switch (normalized) {
        case 'ar':
        case 'smg':
        case 'dmr':
        case 'lmg':
        case 'sr':
        case 'shotgun':
        case 'pistol':
            return normalized;
        default:
            return undefined;
    }
}

export function resolveWeaponSupportStatus(
    input: string | ResolveWeaponSupportStatusInput
): WeaponSupportStatus {
    const resolvedInput = typeof input === 'string'
        ? { weaponId: input, weaponName: input }
        : input;
    const visualEntry = resolveWeaponVisualEntry(resolvedInput);
    const technicalWeapon = getWeapon(resolvedInput.weaponId ?? '')
        ?? getWeapon(resolvedInput.weaponName ?? '')
        ?? (visualEntry ? getWeapon(visualEntry.displayName) : undefined);
    const category = technicalWeapon?.category
        ?? normalizeCategory(resolvedInput.category)
        ?? (visualEntry?.category.toLowerCase() as 'ar' | 'smg' | 'dmr' | undefined);

    if (visualEntry?.lifecycleStatus === 'removed') {
        return {
            kind: 'removed',
            label: 'removida',
            description: 'Catalogo visual preservado para historico, mas a arma esta removida no patch atual.',
            visualEntry,
            ...(category ? { category } : {}),
        };
    }

    if (visualEntry?.lifecycleStatus === 'deprecated') {
        return {
            kind: 'deprecated',
            label: 'deprecated',
            description: 'Catalogo visual preservado para consultas antigas; use status tecnico com cautela.',
            visualEntry,
            ...(category ? { category } : {}),
        };
    }

    if (technicalWeapon && resolvedInput.calibrationLimited) {
        return {
            kind: 'technical_limited',
            label: 'suporte tecnico limitado',
            description: 'Analise tecnica existe, mas a calibracao exige leitura conservadora de confianca e cobertura.',
            ...(visualEntry ? { visualEntry } : {}),
            technicalWeaponId: technicalWeapon.id,
            ...(category ? { category } : {}),
        };
    }

    if (technicalWeapon) {
        return {
            kind: 'full',
            label: 'suporte completo',
            description: 'Icone visual autoral e perfil tecnico disponivel no motor de analise.',
            ...(visualEntry ? { visualEntry } : {}),
            technicalWeaponId: technicalWeapon.id,
            ...(category ? { category } : {}),
        };
    }

    return {
        kind: 'visual',
        label: 'suporte visual',
        description: visualEntry
            ? 'Icone visual autoral disponivel; analise tecnica completa ainda nao esta habilitada para esta arma.'
            : 'Fallback visual premium; analise tecnica completa ainda nao esta habilitada para esta arma.',
        ...(visualEntry ? { visualEntry } : {}),
        ...(category ? { category } : {}),
    };
}
