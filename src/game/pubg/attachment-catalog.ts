import { CURRENT_PUBG_PATCH_VERSION, normalizePatchVersion, UNKNOWN_PUBG_PATCH_VERSION } from './patch';

export type AttachmentSlot = 'muzzle' | 'grip' | 'stock';

export interface AttachmentEffects {
    readonly verticalRecoilControlPct?: number;
    readonly horizontalRecoilControlPct?: number;
    readonly cameraShakeControlPct?: number;
    readonly recoilRecoveryPct?: number;
    readonly recoilRecoveryAfterShotPct?: number;
    readonly adsSpeedPct?: number;
    readonly hipFireAccuracyPct?: number;
    readonly initialShotRecoilControlPct?: number;
    readonly muzzleRiseControlPct?: number;
    readonly breathingSwayControlPct?: number;
    readonly firingSwayControlPct?: number;
}

export interface AttachmentAvailability {
    readonly worldSpawn: boolean;
}

export interface AttachmentDefinition {
    readonly id: string;
    readonly name: string;
    readonly slot: AttachmentSlot;
    readonly legacyId?: string;
    readonly availability: AttachmentAvailability;
    readonly effects: AttachmentEffects;
}

export interface AttachmentCatalogSnapshot {
    readonly patchVersion: string;
    readonly attachments: readonly AttachmentDefinition[];
}

const attachment = (definition: AttachmentDefinition): AttachmentDefinition => definition;

function mergeAttachments(
    base: readonly AttachmentDefinition[],
    overrides: readonly AttachmentDefinition[]
): readonly AttachmentDefinition[] {
    const byId = new Map(base.map((definition) => [definition.id, definition]));
    for (const definition of overrides) {
        byId.set(definition.id, definition);
    }

    const merged = base.map((definition) => byId.get(definition.id) ?? definition);
    for (const definition of overrides) {
        if (!base.some((baseDefinition) => baseDefinition.id === definition.id)) {
            merged.push(definition);
        }
    }

    return merged;
}

const heavyStock192 = attachment({
    id: 'heavy-stock',
    name: 'Heavy Stock',
    slot: 'stock',
    legacyId: 'heavy',
    availability: { worldSpawn: true },
    effects: {
        verticalRecoilControlPct: 5,
        horizontalRecoilControlPct: 5,
        recoilRecoveryPct: 5,
        adsSpeedPct: -10,
        hipFireAccuracyPct: -10,
    },
});

const compensator = attachment({
    id: 'compensator',
    name: 'Compensator',
    slot: 'muzzle',
    legacyId: 'compensator',
    availability: { worldSpawn: true },
    effects: {
        verticalRecoilControlPct: 10,
        horizontalRecoilControlPct: 15,
    },
});

const verticalGrip201 = attachment({
    id: 'vertical-grip',
    name: 'Vertical Foregrip',
    slot: 'grip',
    legacyId: 'vertical',
    availability: { worldSpawn: true },
    effects: {
        verticalRecoilControlPct: 15,
        firingSwayControlPct: 0,
    },
});

const angledForegrip201 = attachment({
    id: 'angled-foregrip',
    name: 'Angled Foregrip',
    slot: 'grip',
    legacyId: 'angled',
    availability: { worldSpawn: true },
    effects: {
        horizontalRecoilControlPct: 20,
        adsSpeedPct: 10,
        breathingSwayControlPct: -10,
        firingSwayControlPct: 0,
    },
});

const halfGrip201 = attachment({
    id: 'half-grip',
    name: 'Half Grip',
    slot: 'grip',
    legacyId: 'half',
    availability: { worldSpawn: true },
    effects: {
        verticalRecoilControlPct: 8,
        horizontalRecoilControlPct: 8,
        breathingSwayControlPct: -10,
        recoilRecoveryPct: 10,
        firingSwayControlPct: -5,
    },
});

const thumbGrip201 = attachment({
    id: 'thumb-grip',
    name: 'Thumb Grip',
    slot: 'grip',
    legacyId: 'thumb',
    availability: { worldSpawn: true },
    effects: {
        verticalRecoilControlPct: 8,
        adsSpeedPct: 40,
        breathingSwayControlPct: 20,
    },
});

const lightweightGrip201 = attachment({
    id: 'lightweight-grip',
    name: 'Lightweight Grip',
    slot: 'grip',
    legacyId: 'lightweight',
    availability: { worldSpawn: true },
    effects: {
        firingSwayControlPct: 20,
        initialShotRecoilControlPct: 40,
        breathingSwayControlPct: 20,
        recoilRecoveryAfterShotPct: 20,
    },
});

const muzzleBrake311 = attachment({
    id: 'muzzle-brake',
    name: 'Muzzle Brake',
    slot: 'muzzle',
    legacyId: 'muzzle_brake',
    availability: { worldSpawn: true },
    effects: {
        verticalRecoilControlPct: 10,
        horizontalRecoilControlPct: 10,
        cameraShakeControlPct: 50,
    },
});

const thumbGrip311 = attachment({
    ...thumbGrip201,
    effects: {
        ...thumbGrip201.effects,
        verticalRecoilControlPct: 10,
        recoilRecoveryAfterShotPct: 10,
    },
});

const angledForegrip311 = attachment({
    ...angledForegrip201,
    effects: {
        ...angledForegrip201.effects,
        horizontalRecoilControlPct: 25,
    },
});

const lightweightGrip311 = attachment({
    ...lightweightGrip201,
    effects: {
        ...lightweightGrip201.effects,
        muzzleRiseControlPct: 10,
        initialShotRecoilControlPct: 30,
    },
});

const heavyStock311 = attachment({
    ...heavyStock192,
    effects: {
        ...heavyStock192.effects,
        verticalRecoilControlPct: 10,
        horizontalRecoilControlPct: 10,
    },
});

const muzzleBrake321 = attachment({
    ...muzzleBrake311,
    effects: {
        verticalRecoilControlPct: 8,
        horizontalRecoilControlPct: 8,
        cameraShakeControlPct: 35,
    },
});

const muzzleBrake361 = attachment({
    ...muzzleBrake321,
    effects: {
        ...muzzleBrake321.effects,
        verticalRecoilControlPct: 10,
    },
});

const halfGrip411 = attachment({
    ...halfGrip201,
    effects: {
        ...halfGrip201.effects,
        horizontalRecoilControlPct: 16,
    },
});

const angledForegrip411 = attachment({
    ...angledForegrip311,
    availability: { worldSpawn: false },
});

const tiltedGrip411 = attachment({
    id: 'tilted-grip',
    name: 'Tilted Grip',
    slot: 'grip',
    legacyId: 'tilted',
    availability: { worldSpawn: true },
    effects: {
        verticalRecoilControlPct: 12,
        horizontalRecoilControlPct: 6,
        cameraShakeControlPct: 25,
    },
});

const snapshot192 = [
    heavyStock192,
] as const;

const snapshot201 = [
    compensator,
    verticalGrip201,
    angledForegrip201,
    halfGrip201,
    thumbGrip201,
    lightweightGrip201,
    heavyStock192,
] as const;

const snapshot311 = mergeAttachments(snapshot201, [
    muzzleBrake311,
    thumbGrip311,
    angledForegrip311,
    lightweightGrip311,
    heavyStock311,
]);

const snapshot321 = mergeAttachments(snapshot311, [muzzleBrake321]);
const snapshot361 = mergeAttachments(snapshot321, [muzzleBrake361]);
const snapshot411 = mergeAttachments(snapshot361, [halfGrip411, angledForegrip411, tiltedGrip411]);

const ATTACHMENT_CATALOG_SNAPSHOTS: readonly AttachmentCatalogSnapshot[] = [
    {
        patchVersion: '19.2',
        attachments: snapshot192,
    },
    {
        patchVersion: '20.1',
        attachments: snapshot201,
    },
    {
        patchVersion: '31.1',
        attachments: snapshot311,
    },
    {
        patchVersion: '32.1',
        attachments: snapshot321,
    },
    {
        patchVersion: '36.1',
        attachments: snapshot361,
    },
    {
        patchVersion: '41.1',
        attachments: snapshot411,
    },
] as const;

export const SUPPORTED_ATTACHMENT_PATCHES = ATTACHMENT_CATALOG_SNAPSHOTS.map(
    (snapshot) => snapshot.patchVersion
);

function parsePatchVersion(version: string): [number, number] | null {
    const match = /^(\d+)\.(\d+)$/.exec(version.trim());
    if (!match) {
        return null;
    }

    return [Number(match[1]), Number(match[2])];
}

function comparePatchVersions(left: string, right: string): number {
    const parsedLeft = parsePatchVersion(left);
    const parsedRight = parsePatchVersion(right);

    if (!parsedLeft || !parsedRight) {
        return left.localeCompare(right, undefined, { numeric: true });
    }

    if (parsedLeft[0] !== parsedRight[0]) {
        return parsedLeft[0] - parsedRight[0];
    }

    return parsedLeft[1] - parsedRight[1];
}

export function resolveAttachmentCatalogVersion(patchVersion: string): string {
    const normalized = normalizePatchVersion(patchVersion);
    if (normalized === UNKNOWN_PUBG_PATCH_VERSION) {
        return CURRENT_PUBG_PATCH_VERSION;
    }

    const exact = ATTACHMENT_CATALOG_SNAPSHOTS.find((snapshot) => snapshot.patchVersion === normalized);
    if (exact) {
        return exact.patchVersion;
    }

    const sorted = [...ATTACHMENT_CATALOG_SNAPSHOTS].sort((left, right) =>
        comparePatchVersions(left.patchVersion, right.patchVersion)
    );

    let resolved = sorted[0]?.patchVersion ?? CURRENT_PUBG_PATCH_VERSION;
    for (const snapshot of sorted) {
        if (comparePatchVersions(snapshot.patchVersion, normalized) <= 0) {
            resolved = snapshot.patchVersion;
        }
    }

    return resolved;
}

export function getAttachmentCatalog(patchVersion: string): AttachmentCatalogSnapshot {
    const resolvedVersion = resolveAttachmentCatalogVersion(patchVersion);
    return ATTACHMENT_CATALOG_SNAPSHOTS.find((snapshot) => snapshot.patchVersion === resolvedVersion)
        ?? ATTACHMENT_CATALOG_SNAPSHOTS[ATTACHMENT_CATALOG_SNAPSHOTS.length - 1]!;
}

export function getAttachment(
    patchVersion: string,
    attachmentId: string
): AttachmentDefinition | undefined {
    return getAttachmentCatalog(patchVersion).attachments.find(
        (attachmentDefinition) => attachmentDefinition.id === attachmentId
    );
}

export function getAttachmentByLegacyId(
    patchVersion: string,
    legacyId: string,
    slot?: AttachmentSlot
): AttachmentDefinition | undefined {
    return getAttachmentCatalog(patchVersion).attachments.find(
        (attachmentDefinition) =>
            attachmentDefinition.legacyId === legacyId
            && (!slot || attachmentDefinition.slot === slot)
    );
}

export function listAttachmentsBySlot(
    patchVersion: string,
    slot: AttachmentSlot
): readonly AttachmentDefinition[] {
    return getAttachmentCatalog(patchVersion).attachments.filter(
        (attachmentDefinition) => attachmentDefinition.slot === slot
    );
}

export function listAvailableAttachmentsBySlot(
    patchVersion: string,
    slot: AttachmentSlot
): readonly AttachmentDefinition[] {
    return listAttachmentsBySlot(patchVersion, slot).filter(
        (attachmentDefinition) => attachmentDefinition.availability.worldSpawn
    );
}
