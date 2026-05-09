'use server';

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { db } from '@/db';
import {
    communityPosts,
    socialProCollectionItems,
    socialProCollections,
    socialProReports,
    sprayLabSessions,
    sprayLabValidationLinks,
    trainingProgramMissions,
    type SocialProCollectionContextFacets,
    type SocialProCollectionRow,
} from '@/db/schema';
import { resolveSocialProAccessForUser } from '@/lib/social-pro-access';
import {
    socialProCollectionModeValues,
    socialProLibraryItemKindValues,
    type SocialProCollectionMode,
    type SocialProLibraryItemKind,
} from '@/types/social-pro';

const PRO_LIBRARY_FEATURE = 'community.pro_library' as const;

type SocialProLibraryActionResult =
    | {
        readonly success: true;
        readonly item: SocialProLibraryItemView;
        readonly auditEvents: readonly SocialProLibraryAuditEvent[];
    }
    | {
        readonly success: false;
        readonly error: string;
        readonly projection?: SocialProLibraryProjection;
    };

type SocialProCollectionActionResult =
    | {
        readonly success: true;
        readonly collection: SocialProCollectionView;
    }
    | {
        readonly success: false;
        readonly error: string;
        readonly projection?: SocialProLibraryProjection;
    };

type SocialProCollectionListResult =
    | {
        readonly success: true;
        readonly collections: readonly SocialProCollectionView[];
    }
    | {
        readonly success: false;
        readonly error: string;
        readonly projection?: SocialProLibraryProjection;
    };

type SocialProLibraryRemoveResult =
    | {
        readonly success: true;
        readonly removed: true;
    }
    | {
        readonly success: false;
        readonly error: string;
        readonly projection?: SocialProLibraryProjection;
    };

interface SocialProLibraryProjection {
    readonly normalCommunitySaveAllowed: true;
    readonly proLibraryLocked: boolean;
    readonly featureKey: typeof PRO_LIBRARY_FEATURE;
    readonly lockCopy: string;
    readonly previewBullets: readonly string[];
}

interface SocialProLibraryAuditEvent {
    readonly type: 'social_pro.library_item.saved';
    readonly itemKind: SocialProLibraryItemKind;
    readonly itemId: string;
    readonly contextKey: string;
}

interface SocialProLibraryItemView {
    readonly id: string;
    readonly collectionId: string;
    readonly kind: SocialProLibraryItemKind;
    readonly itemId: string;
    readonly visibility: 'private';
    readonly contextKey: string;
    readonly contextFacets: SocialProCollectionContextFacets;
}

interface SocialProCollectionView {
    readonly id: string;
    readonly label: string;
    readonly mode: SocialProCollectionMode;
    readonly visibility: 'private';
    readonly shareable: false;
    readonly contextKey: string;
    readonly contextFacets: SocialProCollectionContextFacets;
    readonly itemCount?: number;
}

interface SaveSocialProLibraryItemInput {
    readonly collectionId?: unknown;
    readonly item?: {
        readonly kind?: unknown;
        readonly id?: unknown;
        readonly context?: Record<string, unknown>;
    };
}

interface CreateSocialProCollectionInput {
    readonly mode?: unknown;
    readonly label?: unknown;
    readonly description?: unknown;
    readonly visibility?: unknown;
    readonly context?: Record<string, unknown>;
}

interface RemoveSocialProLibraryItemInput {
    readonly collectionId?: unknown;
    readonly itemId?: unknown;
    readonly kind?: unknown;
}

interface AuthenticatedSocialProLibraryActor {
    readonly userId: string;
    readonly accessState: string | null;
}

interface SourceReference {
    readonly socialProReportId?: string | null;
    readonly communityPostId?: string | null;
    readonly sprayLabSessionId?: string | null;
    readonly trainingProgramMissionId?: string | null;
    readonly validationLinkId?: string | null;
}

const modeSet = new Set<string>(socialProCollectionModeValues);
const itemKindSet = new Set<string>(socialProLibraryItemKindValues);

function buildLockedProjection(proLibraryLocked: boolean): SocialProLibraryProjection {
    return {
        normalCommunitySaveAllowed: true,
        proLibraryLocked,
        featureKey: PRO_LIBRARY_FEATURE,
        lockCopy: proLibraryLocked
            ? 'O Free mantem leitura publica e saves normais. O Pro organiza este contexto em biblioteca privada, relatorio e continuidade de treino.'
            : 'Biblioteca Pro ativa para organizar relatorios, posts, drills, Spray Lab, Ciclo Pro e validacoes por contexto.',
        previewBullets: [
            'Colecoes privadas por arma, mira, distancia e diagnostico.',
            'Atalhos para Spray Lab, Ciclo Pro e validacao compativel.',
            'Sem colecoes publicas compartilhaveis nesta fase.',
        ],
    };
}

function asTrimmedText(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseCollectionMode(value: unknown): SocialProCollectionMode {
    const text = asTrimmedText(value);
    return text && modeSet.has(text) ? text as SocialProCollectionMode : 'manual';
}

function parseItemKind(value: unknown): SocialProLibraryItemKind | null {
    const text = asTrimmedText(value);
    return text && itemKindSet.has(text) ? text as SocialProLibraryItemKind : null;
}

function normalizeContextFacets(context: Record<string, unknown> = {}): SocialProCollectionContextFacets {
    const distanceMeters = asNumber(context.distanceMeters);

    return {
        ...(asTrimmedText(context.weaponId) ? { weaponId: asTrimmedText(context.weaponId)! } : {}),
        ...(asTrimmedText(context.opticId) ? { opticId: asTrimmedText(context.opticId)! } : {}),
        ...(distanceMeters !== undefined ? { distanceMeters } : {}),
        ...(asTrimmedText(context.diagnosisKey) ?? asTrimmedText(context.diagnosis)
            ? { diagnosisKey: (asTrimmedText(context.diagnosisKey) ?? asTrimmedText(context.diagnosis))! }
            : {}),
        ...(asTrimmedText(context.activeLineId) ? { activeLineId: asTrimmedText(context.activeLineId)! } : {}),
        ...(asTrimmedText(context.programCycleId) ? { programCycleId: asTrimmedText(context.programCycleId)! } : {}),
        ...(asTrimmedText(context.sprayLabLaneId) ? { sprayLabLaneId: asTrimmedText(context.sprayLabLaneId)! } : {}),
        ...(asTrimmedText(context.objectiveKey) ?? asTrimmedText(context.objective)
            ? { objectiveKey: (asTrimmedText(context.objectiveKey) ?? asTrimmedText(context.objective))! }
            : {}),
        ...(asTrimmedText(context.validationState) ? { validationState: asTrimmedText(context.validationState)! } : {}),
        ...(asTrimmedText(context.blockerKey) ?? asTrimmedText(context.blocker)
            ? { blockerKey: (asTrimmedText(context.blockerKey) ?? asTrimmedText(context.blocker))! }
            : {}),
    };
}

function buildContextKey(
    itemKind: SocialProLibraryItemKind | 'collection',
    itemId: string,
    facets: SocialProCollectionContextFacets,
): string {
    const parts = [
        facets.weaponId ? `weapon:${facets.weaponId}` : null,
        facets.opticId ? `optic:${facets.opticId}` : null,
        facets.distanceMeters ? `distance:${facets.distanceMeters}m` : null,
        facets.diagnosisKey ? `diagnosis:${facets.diagnosisKey}` : null,
        facets.activeLineId ? `line:${facets.activeLineId}` : null,
        facets.programCycleId ? `cycle:${facets.programCycleId}` : null,
        facets.sprayLabLaneId ? `lane:${facets.sprayLabLaneId}` : null,
        facets.objectiveKey ? `objective:${facets.objectiveKey}` : null,
        facets.validationState ? `validation:${facets.validationState}` : null,
        facets.blockerKey ? `blocker:${facets.blockerKey}` : null,
    ].filter((part): part is string => Boolean(part));

    return parts.length > 0 ? parts.join('|') : `${itemKind}:${itemId}`;
}

function collectionLabelFor(kind: SocialProLibraryItemKind, contextKey: string): string {
    if (contextKey.includes('cycle:')) {
        return 'Ciclo Pro ativo';
    }

    if (contextKey.includes('lane:')) {
        return 'Spray Lab - consistencia';
    }

    if (contextKey.includes('validation:pending')) {
        return 'Validacoes pendentes';
    }

    if (contextKey.includes('blocker:')) {
        return 'Reparo de captura';
    }

    return kind === 'drill' ? 'Drills salvos' : 'Biblioteca Pro por contexto';
}

async function resolveAuthenticatedActor(): Promise<
    | {
        readonly success: true;
        readonly actor: AuthenticatedSocialProLibraryActor;
    }
    | {
        readonly success: false;
        readonly error: string;
        readonly projection: SocialProLibraryProjection;
    }
> {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    if (!userId) {
        return {
            success: false,
            error: 'Nao autenticado.',
            projection: buildLockedProjection(true),
        };
    }

    const policy = await resolveSocialProAccessForUser(userId, 'user');

    if (!policy.canWriteProLibrary) {
        return {
            success: false,
            error: 'Biblioteca Pro exige acesso Pro ativo.',
            projection: buildLockedProjection(true),
        };
    }

    return {
        success: true,
        actor: {
            userId,
            accessState: policy.productAccess.accessState ?? null,
        },
    };
}

async function resolveSocialProLibraryProjectionForCurrentUser(): Promise<SocialProLibraryProjection> {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const policy = await resolveSocialProAccessForUser(userId, userId ? 'user' : 'anonymous');

    return buildLockedProjection(!policy.canWriteProLibrary);
}

async function loadSourceReference(
    ownerUserId: string,
    kind: SocialProLibraryItemKind,
    itemId: string,
): Promise<SourceReference | null> {
    if (kind === 'report') {
        const [report] = await db
            .select({ id: socialProReports.id })
            .from(socialProReports)
            .where(and(
                eq(socialProReports.id, itemId),
                eq(socialProReports.ownerUserId, ownerUserId),
            ))
            .limit(1);

        return report ? { socialProReportId: report.id } : null;
    }

    if (kind === 'community_post') {
        const [post] = await db
            .select({
                id: communityPosts.id,
                status: communityPosts.status,
                visibility: communityPosts.visibility,
            })
            .from(communityPosts)
            .where(and(
                eq(communityPosts.id, itemId),
                eq(communityPosts.status, 'published'),
                eq(communityPosts.visibility, 'public'),
            ))
            .limit(1);

        return post ? { communityPostId: post.id } : null;
    }

    if (kind === 'spray_lab_session') {
        const [session] = await db
            .select({ id: sprayLabSessions.id })
            .from(sprayLabSessions)
            .where(and(
                eq(sprayLabSessions.id, itemId),
                eq(sprayLabSessions.userId, ownerUserId),
            ))
            .limit(1);

        return session ? { sprayLabSessionId: session.id } : null;
    }

    if (kind === 'program_mission') {
        const [mission] = await db
            .select({ id: trainingProgramMissions.id })
            .from(trainingProgramMissions)
            .where(and(
                eq(trainingProgramMissions.id, itemId),
                eq(trainingProgramMissions.userId, ownerUserId),
            ))
            .limit(1);

        return mission ? { trainingProgramMissionId: mission.id } : null;
    }

    if (kind === 'compatible_validation') {
        const [validation] = await db
            .select({ id: sprayLabValidationLinks.id })
            .from(sprayLabValidationLinks)
            .where(and(
                eq(sprayLabValidationLinks.id, itemId),
                eq(sprayLabValidationLinks.userId, ownerUserId),
            ))
            .limit(1);

        return validation ? { validationLinkId: validation.id } : null;
    }

    return {};
}

async function createPrivateCollectionRow(input: {
    readonly ownerUserId: string;
    readonly mode: SocialProCollectionMode;
    readonly label: string;
    readonly description?: string | null;
    readonly contextKey: string;
    readonly facets: SocialProCollectionContextFacets;
    readonly sourceSurface?: string;
}): Promise<SocialProCollectionView> {
    const collectionId = randomUUID();

    await db
        .insert(socialProCollections)
        .values({
            id: collectionId,
            ownerUserId: input.ownerUserId,
            mode: input.mode,
            visibility: 'private',
            shareable: false,
            label: input.label,
            description: input.description ?? null,
            contextKey: input.contextKey,
            weaponId: input.facets.weaponId ?? null,
            opticId: input.facets.opticId ?? null,
            distanceMeters: input.facets.distanceMeters ?? null,
            diagnosisKey: input.facets.diagnosisKey ?? null,
            activeLineId: input.facets.activeLineId ?? null,
            programCycleId: input.facets.programCycleId ?? null,
            sprayLabLaneId: input.facets.sprayLabLaneId ?? null,
            objectiveKey: input.facets.objectiveKey ?? null,
            validationState: input.facets.validationState ?? null,
            blockerKey: input.facets.blockerKey ?? null,
            payload: {
                sourceSurface: input.sourceSurface ?? 'social_pro_library',
            },
        });

    return {
        id: collectionId,
        label: input.label,
        mode: input.mode,
        visibility: 'private',
        shareable: false,
        contextKey: input.contextKey,
        contextFacets: input.facets,
    };
}

function toCollectionView(row: SocialProCollectionRow & { readonly itemCount?: unknown }): SocialProCollectionView {
    const contextFacets: SocialProCollectionContextFacets = {
        ...(row.weaponId ? { weaponId: row.weaponId } : {}),
        ...(row.opticId ? { opticId: row.opticId } : {}),
        ...(row.distanceMeters !== null ? { distanceMeters: row.distanceMeters } : {}),
        ...(row.diagnosisKey ? { diagnosisKey: row.diagnosisKey } : {}),
        ...(row.activeLineId ? { activeLineId: row.activeLineId } : {}),
        ...(row.programCycleId ? { programCycleId: row.programCycleId } : {}),
        ...(row.sprayLabLaneId ? { sprayLabLaneId: row.sprayLabLaneId } : {}),
        ...(row.objectiveKey ? { objectiveKey: row.objectiveKey } : {}),
        ...(row.validationState ? { validationState: row.validationState } : {}),
        ...(row.blockerKey ? { blockerKey: row.blockerKey } : {}),
    };

    return {
        id: row.id,
        label: row.label,
        mode: row.mode,
        visibility: 'private',
        shareable: false,
        contextKey: row.contextKey,
        contextFacets,
        itemCount: Number(row.itemCount ?? 0),
    };
}

export async function resolveSocialProLibraryProjection(
    _input: { readonly item?: unknown } = {},
): Promise<{
    readonly success: true;
    readonly projection: SocialProLibraryProjection;
}> {
    return {
        success: true,
        projection: await resolveSocialProLibraryProjectionForCurrentUser(),
    };
}

export async function createSocialProCollection(
    input: CreateSocialProCollectionInput,
): Promise<SocialProCollectionActionResult> {
    const actor = await resolveAuthenticatedActor();

    if (!actor.success) {
        return actor;
    }

    const mode = parseCollectionMode(input.mode);
    const label = asTrimmedText(input.label) ?? 'Biblioteca Pro por contexto';
    const facets = normalizeContextFacets(input.context);
    const contextKey = buildContextKey('collection', label.toLowerCase().replace(/\s+/g, '-'), facets);
    const collection = await createPrivateCollectionRow({
        ownerUserId: actor.actor.userId,
        mode,
        label,
        description: asTrimmedText(input.description),
        contextKey,
        facets,
        sourceSurface: 'manual_collection',
    });

    revalidatePath('/community');

    return {
        success: true,
        collection,
    };
}

export async function saveSocialProLibraryItem(
    input: SaveSocialProLibraryItemInput,
): Promise<SocialProLibraryActionResult> {
    const actor = await resolveAuthenticatedActor();

    if (!actor.success) {
        return actor;
    }

    const kind = parseItemKind(input.item?.kind);
    const itemId = asTrimmedText(input.item?.id);

    if (!kind || !itemId) {
        return {
            success: false,
            error: 'Item da biblioteca Pro invalido.',
        };
    }

    const sourceReference = await loadSourceReference(actor.actor.userId, kind, itemId);

    if (!sourceReference) {
        return {
            success: false,
            error: 'Item da biblioteca Pro nao encontrado ou sem permissao.',
        };
    }

    const facets = normalizeContextFacets(input.item?.context);
    const contextKey = buildContextKey(kind, itemId, facets);
    const existingCollectionId = asTrimmedText(input.collectionId);
    const collection = existingCollectionId
        ? null
        : await createPrivateCollectionRow({
            ownerUserId: actor.actor.userId,
            mode: 'automatic',
            label: collectionLabelFor(kind, contextKey),
            contextKey,
            facets,
            sourceSurface: 'auto_item_save',
        });
    const collectionId = existingCollectionId ?? collection?.id;

    if (!collectionId) {
        return {
            success: false,
            error: 'Colecao da biblioteca Pro invalida.',
        };
    }

    await db
        .insert(socialProCollectionItems)
        .values({
            id: randomUUID(),
            collectionId,
            ownerUserId: actor.actor.userId,
            kind,
            itemId,
            socialProReportId: sourceReference.socialProReportId ?? null,
            communityPostId: sourceReference.communityPostId ?? null,
            sprayLabSessionId: sourceReference.sprayLabSessionId ?? null,
            trainingProgramMissionId: sourceReference.trainingProgramMissionId ?? null,
            validationLinkId: sourceReference.validationLinkId ?? null,
            contextKey,
            contextFacets: facets,
        })
        .onConflictDoNothing({
            target: [
                socialProCollectionItems.collectionId,
                socialProCollectionItems.kind,
                socialProCollectionItems.itemId,
            ],
        });

    revalidatePath('/community');

    return {
        success: true,
        item: {
            id: itemId,
            collectionId,
            kind,
            itemId,
            visibility: 'private',
            contextKey,
            contextFacets: facets,
        },
        auditEvents: [{
            type: 'social_pro.library_item.saved',
            itemKind: kind,
            itemId,
            contextKey,
        }],
    };
}

export async function listSocialProCollections(): Promise<SocialProCollectionListResult> {
    const actor = await resolveAuthenticatedActor();

    if (!actor.success) {
        return actor;
    }

    const rows = await db
        .select()
        .from(socialProCollections)
        .where(eq(socialProCollections.ownerUserId, actor.actor.userId))
        .limit(50);

    return {
        success: true,
        collections: rows.map((row) => toCollectionView(row as SocialProCollectionRow)),
    };
}

export async function removeSocialProLibraryItem(
    input: RemoveSocialProLibraryItemInput,
): Promise<SocialProLibraryRemoveResult> {
    const actor = await resolveAuthenticatedActor();

    if (!actor.success) {
        return actor;
    }

    const kind = parseItemKind(input.kind);
    const collectionId = asTrimmedText(input.collectionId);
    const itemId = asTrimmedText(input.itemId);

    if (!kind || !collectionId || !itemId) {
        return {
            success: false,
            error: 'Item da biblioteca Pro invalido.',
        };
    }

    await db
        .delete(socialProCollectionItems)
        .where(and(
            eq(socialProCollectionItems.ownerUserId, actor.actor.userId),
            eq(socialProCollectionItems.collectionId, collectionId),
            eq(socialProCollectionItems.kind, kind),
            eq(socialProCollectionItems.itemId, itemId),
        ));

    revalidatePath('/community');

    return {
        success: true,
        removed: true,
    };
}
