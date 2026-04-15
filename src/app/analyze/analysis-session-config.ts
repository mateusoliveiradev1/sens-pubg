import type {
    WeaponProfileCanonical,
    WeaponProfileLegacyGripMultiplier,
    WeaponProfileLegacyMultipliers,
} from '@/db/schema';
import { getOpticState, type ProjectionConfig } from '@/game/pubg';
import type { WeaponData } from '@/game/pubg/weapon-data';
import type {
    AnalysisOpticContext,
    GripAttachment,
    MuzzleAttachment,
    StockAttachment,
} from '@/types/engine';

const EXTRACTION_BUFFER_SECONDS = 0.5;

const MUZZLE_CANONICAL_IDS: Partial<Record<MuzzleAttachment, string>> = {
    compensator: 'compensator',
    muzzle_brake: 'muzzle-brake',
};

const GRIP_CANONICAL_IDS: Partial<Record<GripAttachment, string>> = {
    vertical: 'vertical-grip',
    half: 'half-grip',
};

const STOCK_CANONICAL_IDS: Partial<Record<StockAttachment, string>> = {
    heavy: 'heavy-stock',
};

const MUZZLE_LEGACY_KEYS: Partial<Record<MuzzleAttachment, keyof WeaponProfileLegacyMultipliers>> = {
    compensator: 'compensator',
    muzzle_brake: 'muzzle_brake',
};

const GRIP_LEGACY_KEYS: Partial<Record<GripAttachment, keyof WeaponProfileLegacyMultipliers>> = {
    vertical: 'vertical_grip',
    half: 'half_grip',
};

const STOCK_LEGACY_KEYS: Partial<Record<StockAttachment, keyof WeaponProfileLegacyMultipliers>> = {
    heavy: 'heavy_stock',
};

interface WorkerAttachmentSource {
    readonly canonicalProfile?: WeaponProfileCanonical | null;
    readonly multipliers: WeaponProfileLegacyMultipliers;
}

interface WorkerAttachmentSelections {
    readonly muzzle: MuzzleAttachment;
    readonly grip: GripAttachment;
    readonly stock: StockAttachment;
}

export interface WorkerAttachmentMultipliers {
    readonly vertical: number;
    readonly horizontal: number;
}

export interface SprayProjectionInput {
    readonly widthPx: number;
    readonly heightPx: number;
    readonly baseHorizontalFovDegrees: number;
    readonly patchVersion: string;
    readonly opticId: string;
    readonly opticStateId?: string;
}

function isLegacyGripMultiplier(value: unknown): value is WeaponProfileLegacyGripMultiplier {
    return typeof value === 'object'
        && value !== null
        && typeof (value as WeaponProfileLegacyGripMultiplier).vertical === 'number'
        && typeof (value as WeaponProfileLegacyGripMultiplier).horizontal === 'number';
}

function resolveCanonicalMultipliers(
    canonicalProfile: WeaponProfileCanonical | null | undefined,
    attachmentId: string | undefined
): WorkerAttachmentMultipliers | null {
    if (!canonicalProfile || !attachmentId) return null;

    const attachmentProfile = canonicalProfile.attachmentProfiles[attachmentId];
    if (!attachmentProfile) return null;

    return {
        vertical: attachmentProfile.multipliers.verticalRecoil ?? 1.0,
        horizontal: attachmentProfile.multipliers.horizontalRecoil ?? 1.0,
    };
}

function resolveLegacyMultipliers(
    legacyMultipliers: WeaponProfileLegacyMultipliers,
    key: keyof WeaponProfileLegacyMultipliers | undefined
): WorkerAttachmentMultipliers | null {
    if (!key) return null;

    const value = legacyMultipliers[key];
    if (typeof value === 'number') {
        return {
            vertical: value,
            horizontal: 1.0,
        };
    }

    if (isLegacyGripMultiplier(value)) {
        return {
            vertical: value.vertical,
            horizontal: value.horizontal,
        };
    }

    return null;
}

function resolveSelectedAttachmentMultipliers(
    source: WorkerAttachmentSource,
    canonicalId: string | undefined,
    legacyKey: keyof WeaponProfileLegacyMultipliers | undefined
): WorkerAttachmentMultipliers {
    return resolveCanonicalMultipliers(source.canonicalProfile, canonicalId)
        ?? resolveLegacyMultipliers(source.multipliers, legacyKey)
        ?? { vertical: 1.0, horizontal: 1.0 };
}

export function resolveWorkerAttachmentMultipliers(
    source: WorkerAttachmentSource,
    selections: WorkerAttachmentSelections
): WorkerAttachmentMultipliers {
    const muzzle = resolveSelectedAttachmentMultipliers(
        source,
        MUZZLE_CANONICAL_IDS[selections.muzzle],
        MUZZLE_LEGACY_KEYS[selections.muzzle]
    );
    const grip = resolveSelectedAttachmentMultipliers(
        source,
        GRIP_CANONICAL_IDS[selections.grip],
        GRIP_LEGACY_KEYS[selections.grip]
    );
    const stock = resolveSelectedAttachmentMultipliers(
        source,
        STOCK_CANONICAL_IDS[selections.stock],
        STOCK_LEGACY_KEYS[selections.stock]
    );

    return {
        vertical: muzzle.vertical * grip.vertical * stock.vertical,
        horizontal: muzzle.horizontal * grip.horizontal * stock.horizontal,
    };
}

export function calculateExpectedSprayDurationSeconds(
    weaponData: Pick<WeaponData, 'msPerShot' | 'magazineSize' | 'recoilPattern'>
): number {
    const shotCount = weaponData.recoilPattern.length > 0
        ? weaponData.recoilPattern.length
        : Math.max(weaponData.magazineSize, 1);

    return (shotCount * weaponData.msPerShot) / 1000 + EXTRACTION_BUFFER_SECONDS;
}

export function resolveSprayProjectionConfig(input: SprayProjectionInput | (Pick<SprayProjectionInput, 'widthPx' | 'heightPx' | 'baseHorizontalFovDegrees' | 'patchVersion'> & AnalysisOpticContext)): ProjectionConfig {
    const opticState = getOpticState(input.patchVersion, input.opticId, input.opticStateId);
    const opticFovReduction = opticState?.fovReduction ?? 1;

    return {
        widthPx: input.widthPx,
        heightPx: input.heightPx,
        horizontalFovDegrees: input.baseHorizontalFovDegrees * opticFovReduction,
    };
}
