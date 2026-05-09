'use server';

import { randomUUID } from 'node:crypto';

import { and, eq, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import {
    redactSocialProReportForPublic,
    sanitizeSocialProReportControls,
} from '@/core/social-pro-report-redaction';
import { db } from '@/db';
import {
    analysisSessions,
    completeTrainingProtocolRevisions,
    socialProReportAuditEvents,
    socialProReportLinks,
    socialProReports,
    sprayLabSessions,
    sprayLabValidationLinks,
    trainingProgramCycles,
} from '@/db/schema';
import {
    createSocialProLinkTokenVerifier,
    generateSocialProLinkToken,
    verifySocialProLinkToken,
} from '@/lib/social-pro-link-token';
import {
    hasSocialProCapability,
    resolveSocialProAccessForUser,
    type SocialProCapability,
    type SocialProUserRole,
} from '@/lib/social-pro-access';
import type {
    SocialProPrivateLinkStatus,
    SocialProPublicReport,
    SocialProPublicSectionKey,
    SocialProReportStatus,
    SocialProReportVisibility,
} from '@/types/social-pro';

export type SocialProReportActionResult =
    | {
        readonly success: true;
        readonly report?: Record<string, unknown>;
        readonly link?: Record<string, unknown>;
        readonly auditEvents?: readonly Record<string, unknown>[];
    }
    | {
        readonly success: false;
        readonly error: string;
    };

export type SocialProPublicReportResult = SocialProReportActionResult;

export interface CreateSocialProReportActionInput {
    readonly sourceAnalysisSessionId?: string;
    readonly sourceHistorySessionId?: string;
    readonly sourceProtocolRevisionId?: string;
    readonly sourceSprayLabSessionId?: string;
    readonly sourceTrainingProgramCycleId?: string;
    readonly sourceValidationLinkId?: string;
    readonly visibility?: SocialProReportVisibility;
    readonly title?: string;
    readonly controls?: Record<string, unknown>;
    readonly requestedSections?: readonly unknown[];
}

export interface UpdateSocialProReportActionInput {
    readonly reportId?: string;
    readonly visibility?: SocialProReportVisibility;
    readonly status?: SocialProReportStatus;
    readonly title?: string;
    readonly controls?: Record<string, unknown>;
}

export interface SocialProReportLinkActionInput {
    readonly reportId?: string;
    readonly linkId?: string;
    readonly previousLinkId?: string;
    readonly expiresAt?: string | Date | null;
    readonly now?: string | Date;
}

export interface ReadSocialProReportByPrivateLinkInput {
    readonly token?: string;
    readonly now?: string | Date;
}

type ActionUserContext =
    | {
        readonly ok: true;
        readonly userId: string;
        readonly role: SocialProUserRole;
    }
    | {
        readonly ok: false;
        readonly error: string;
    };

type CapabilityContext =
    | {
        readonly ok: true;
        readonly userId: string;
    }
    | {
        readonly ok: false;
        readonly error: string;
    };

interface OwnedSourceEvidence {
    readonly sourceIds: {
        readonly analysisSessionId?: string;
        readonly historySessionId?: string;
        readonly protocolRevisionId?: string;
        readonly sprayLabSessionId?: string;
        readonly trainingProgramCycleId?: string;
        readonly validationLinkId?: string;
    };
    readonly analysisResult: Record<string, unknown> | null;
}

interface StoredReportRow {
    readonly id: string;
    readonly ownerUserId?: string;
    readonly visibility: SocialProReportVisibility;
    readonly status: SocialProReportStatus;
    readonly publicSafeSnapshot: SocialProPublicReport;
}

interface PublicStoredReportRow extends StoredReportRow {
    readonly publicSlug?: string | null;
    readonly sourceAnalysisSessionId?: string | null;
    readonly sourceHistorySessionId?: string | null;
    readonly sourceProtocolRevisionId?: string | null;
    readonly sourceSprayLabSessionId?: string | null;
    readonly sourceTrainingProgramCycleId?: string | null;
    readonly sourceValidationLinkId?: string | null;
    readonly archivedAt?: Date | string | null;
}

interface StoredLinkRow {
    readonly id: string;
    readonly reportId: string;
    readonly status: SocialProPrivateLinkStatus;
    readonly tokenVerifierHash: string;
    readonly expiresAt?: Date | string | null;
}

const REQUIRED_HONESTY_FIELDS = [
    'confidence',
    'coverage',
    'blockers',
    'inconclusive_state',
    'limited_support',
    'validation_state',
    'no_overclaim_disclaimer',
] as const;

const PRO_REQUIRED_MESSAGE =
    'Recurso Pro exige assinatura ativa do Sens PUBG.';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): readonly string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
}

function readNestedRecord(
    value: Record<string, unknown> | null,
    key: string,
): Record<string, unknown> | null {
    const nested = value?.[key];

    return isRecord(nested) ? nested : null;
}

function parseDate(value: string | Date | null | undefined): Date | null {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isFinite(date.getTime()) ? date : null;
}

function parseNow(value: string | Date | undefined): Date {
    return parseDate(value) ?? new Date();
}

function parseVisibility(value: unknown): SocialProReportVisibility {
    return value === 'public' || value === 'link_private' ? value : 'link_private';
}

function parseStatus(value: unknown, fallback: SocialProReportStatus): SocialProReportStatus {
    return (
        value === 'draft'
        || value === 'published'
        || value === 'hidden'
        || value === 'disabled'
        || value === 'archived'
    )
        ? value
        : fallback;
}

function parseOptionalSections(value: readonly unknown[] | undefined): readonly SocialProPublicSectionKey[] {
    const allowed = new Set<SocialProPublicSectionKey>([
        'setup_summary',
        'drill_context',
        'evidence_timeline',
        'validation',
        'advanced_context',
        'safe_sensitivity_setup',
        'next_actions',
    ]);

    return Array.from(new Set((value ?? []).filter((item): item is SocialProPublicSectionKey => (
        typeof item === 'string' && allowed.has(item as SocialProPublicSectionKey)
    ))));
}

function readRole(value: unknown): SocialProUserRole {
    return value === 'admin' ? 'admin' : 'user';
}

async function resolveActionUserContext(): Promise<ActionUserContext> {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return {
            ok: false,
            error: 'Nao autenticado.',
        };
    }

    return {
        ok: true,
        userId,
        role: readRole((session.user as { readonly role?: unknown }).role),
    };
}

async function requireSocialProCapability(
    capability: SocialProCapability,
): Promise<CapabilityContext> {
    const user = await resolveActionUserContext();

    if (!user.ok) {
        return user;
    }

    const policy = await resolveSocialProAccessForUser(user.userId, user.role);

    if (!hasSocialProCapability(policy, capability)) {
        return {
            ok: false,
            error: PRO_REQUIRED_MESSAGE,
        };
    }

    return {
        ok: true,
        userId: user.userId,
    };
}

async function loadOwnedAnalysisResult(
    userId: string,
    analysisSessionId: string,
): Promise<Record<string, unknown> | null> {
    const [row] = await db
        .select({
            id: analysisSessions.id,
            fullResult: analysisSessions.fullResult,
        })
        .from(analysisSessions)
        .where(and(
            eq(analysisSessions.id, analysisSessionId),
            eq(analysisSessions.userId, userId),
        ))
        .limit(1);

    return isRecord(row?.fullResult) ? row.fullResult : null;
}

async function assertOwnedRow(
    userId: string,
    id: string | undefined,
    loader: () => Promise<readonly unknown[]>,
): Promise<boolean> {
    if (!id) {
        return true;
    }

    const rows = await loader();

    return rows.length > 0 && Boolean(userId);
}

async function loadOwnedSourceEvidence(
    userId: string,
    input: CreateSocialProReportActionInput,
): Promise<
    | { readonly ok: true; readonly value: OwnedSourceEvidence }
    | { readonly ok: false; readonly error: string }
> {
    const sourceIds = {
        ...(input.sourceAnalysisSessionId ? { analysisSessionId: input.sourceAnalysisSessionId } : {}),
        ...(input.sourceHistorySessionId ? { historySessionId: input.sourceHistorySessionId } : {}),
        ...(input.sourceProtocolRevisionId ? { protocolRevisionId: input.sourceProtocolRevisionId } : {}),
        ...(input.sourceSprayLabSessionId ? { sprayLabSessionId: input.sourceSprayLabSessionId } : {}),
        ...(input.sourceTrainingProgramCycleId ? { trainingProgramCycleId: input.sourceTrainingProgramCycleId } : {}),
        ...(input.sourceValidationLinkId ? { validationLinkId: input.sourceValidationLinkId } : {}),
    };

    if (Object.keys(sourceIds).length === 0) {
        return {
            ok: false,
            error: 'Informe uma fonte salva para gerar o relatorio.',
        };
    }

    const analysisId = input.sourceAnalysisSessionId ?? input.sourceHistorySessionId;
    const analysisResult = analysisId ? await loadOwnedAnalysisResult(userId, analysisId) : null;

    if (analysisId && !analysisResult) {
        return {
            ok: false,
            error: 'Fonte do relatorio nao encontrada ou nao pertence ao usuario.',
        };
    }

    const protocolOwned = await assertOwnedRow(userId, input.sourceProtocolRevisionId, async () => db
        .select({ id: completeTrainingProtocolRevisions.id })
        .from(completeTrainingProtocolRevisions)
        .where(and(
            eq(completeTrainingProtocolRevisions.id, input.sourceProtocolRevisionId!),
            eq(completeTrainingProtocolRevisions.userId, userId),
        ))
        .limit(1));

    const labOwned = await assertOwnedRow(userId, input.sourceSprayLabSessionId, async () => db
        .select({ id: sprayLabSessions.id })
        .from(sprayLabSessions)
        .where(and(
            eq(sprayLabSessions.id, input.sourceSprayLabSessionId!),
            eq(sprayLabSessions.userId, userId),
        ))
        .limit(1));

    const cycleOwned = await assertOwnedRow(userId, input.sourceTrainingProgramCycleId, async () => db
        .select({ id: trainingProgramCycles.id })
        .from(trainingProgramCycles)
        .where(and(
            eq(trainingProgramCycles.id, input.sourceTrainingProgramCycleId!),
            eq(trainingProgramCycles.userId, userId),
        ))
        .limit(1));

    const validationOwned = await assertOwnedRow(userId, input.sourceValidationLinkId, async () => db
        .select({ id: sprayLabValidationLinks.id })
        .from(sprayLabValidationLinks)
        .where(and(
            eq(sprayLabValidationLinks.id, input.sourceValidationLinkId!),
            eq(sprayLabValidationLinks.userId, userId),
        ))
        .limit(1));

    if (!protocolOwned || !labOwned || !cycleOwned || !validationOwned) {
        return {
            ok: false,
            error: 'Fonte do relatorio nao encontrada ou nao pertence ao usuario.',
        };
    }

    return {
        ok: true,
        value: {
            sourceIds,
            analysisResult,
        },
    };
}

function readAnalysisConfidence(result: Record<string, unknown> | null): number | null {
    const metrics = readNestedRecord(result, 'metrics');
    const mastery = readNestedRecord(result, 'mastery');
    const decision = readNestedRecord(result, 'analysisDecision');

    return readNumber(metrics?.confidence)
        ?? readNumber(mastery?.confidence)
        ?? readNumber(decision?.confidence)
        ?? null;
}

function readAnalysisCoverage(result: Record<string, unknown> | null): number | null {
    const metrics = readNestedRecord(result, 'metrics');
    const videoQuality = readNestedRecord(result, 'videoQualityReport');

    return readNumber(metrics?.coverage)
        ?? readNumber(metrics?.trackingCoverage)
        ?? readNumber(videoQuality?.coverage)
        ?? null;
}

function readAnalysisBlockers(result: Record<string, unknown> | null): readonly string[] {
    const decision = readNestedRecord(result, 'analysisDecision');
    const blockers = readStringArray(decision?.blockers);

    return blockers.length > 0 ? blockers : ['validacao compativel pendente'];
}

function buildPublicReportSnapshot(input: {
    readonly reportId: string;
    readonly title: string;
    readonly visibility: SocialProReportVisibility;
    readonly status: SocialProReportStatus;
    readonly controls?: Record<string, unknown>;
    readonly requestedSections?: readonly unknown[];
    readonly evidence: OwnedSourceEvidence;
}): SocialProPublicReport {
    const visibleOptionalSections = parseOptionalSections(input.requestedSections);
    const controls = sanitizeSocialProReportControls({
        ...(input.controls ?? {}),
        visibleOptionalSections,
    });
    const confidence = readAnalysisConfidence(input.evidence.analysisResult);
    const coverage = readAnalysisCoverage(input.evidence.analysisResult);
    const blockers = readAnalysisBlockers(input.evidence.analysisResult);

    return redactSocialProReportForPublic({
        id: input.reportId,
        visibility: input.visibility,
        status: input.status,
        publicSummary: {
            title: input.title,
            whatChanged: 'Evolucao organizada com evidencia publica segura, sem expor historico privado.',
            nextAction: 'Continuar analise, coach, Spray Lab, Ciclo Pro e validacao compativel.',
        },
        honesty: {
            confidence,
            coverage,
            blockers,
            inconclusiveState: confidence === null || coverage === null,
            limitedSupport: ['Relatorio publico resume apenas campos seguros.'],
            validationState: input.evidence.sourceIds.validationLinkId
                ? 'compatible_validation_linked'
                : 'compatible_validation_pending',
            noOverclaimDisclaimer:
                'Relatorio publico organiza evidencias sem prometer sensibilidade perfeita, rank ou melhora garantida.',
        },
        controls,
        sections: {
            public_summary: {
                sourceIds: input.evidence.sourceIds,
            },
            evidence_timeline: [
                {
                    layer: 'technical_evidence',
                    title: 'Analise base',
                    summary: `Confianca ${confidence ?? 'nao disponivel'} e cobertura ${coverage ?? 'nao disponivel'}.`,
                    sourceId: input.evidence.sourceIds.analysisSessionId ?? input.evidence.sourceIds.historySessionId ?? null,
                },
                {
                    layer: 'training_execution',
                    title: 'Treino conectado',
                    summary: 'Protocolos, Spray Lab e Ciclo Pro entram como execucao auditavel.',
                    sourceId: input.evidence.sourceIds.sprayLabSessionId ?? input.evidence.sourceIds.protocolRevisionId ?? null,
                },
                {
                    layer: 'compatible_validation',
                    title: 'Validacao compativel',
                    summary: input.evidence.sourceIds.validationLinkId
                        ? 'Validacao compativel vinculada ao relatorio.'
                        : 'Validacao compativel ainda e o proximo passo de prova tecnica.',
                    sourceId: input.evidence.sourceIds.validationLinkId ?? null,
                },
            ],
            next_actions: {
                primary: 'Continuar Ciclo Pro, abrir Spray Lab ou gravar validacao compativel.',
            },
        },
    });
}

function reportPayload(sourceIds: OwnedSourceEvidence['sourceIds'], visibleOptionalSections: readonly SocialProPublicSectionKey[]) {
    return {
        publicSafeSnapshotVersion: 1 as const,
        sourceIds,
        visibleOptionalSections,
    };
}

function reportResult(row: StoredReportRow | Record<string, unknown>): Record<string, unknown> {
    const snapshot = isRecord(row.publicSafeSnapshot)
        ? redactSocialProReportForPublic(row.publicSafeSnapshot)
        : null;
    const visibility = parseVisibility(row.visibility);
    const status = parseStatus(row.status, snapshot?.status ?? 'published');

    return {
        id: readString(row.id) ?? snapshot?.id ?? 'social-pro-report',
        visibility,
        status,
        publicSafeSnapshot: snapshot,
        requiredHonestyFields: REQUIRED_HONESTY_FIELDS,
        discoverableInFeed: visibility === 'public' && status === 'published',
    };
}

function isReadablePublicReportStatus(status: unknown): boolean {
    return status === 'published';
}

function sourceIdsFromReport(row: PublicStoredReportRow): OwnedSourceEvidence['sourceIds'] {
    return {
        ...(row.sourceAnalysisSessionId ? { analysisSessionId: row.sourceAnalysisSessionId } : {}),
        ...(row.sourceHistorySessionId ? { historySessionId: row.sourceHistorySessionId } : {}),
        ...(row.sourceProtocolRevisionId ? { protocolRevisionId: row.sourceProtocolRevisionId } : {}),
        ...(row.sourceSprayLabSessionId ? { sprayLabSessionId: row.sourceSprayLabSessionId } : {}),
        ...(row.sourceTrainingProgramCycleId ? { trainingProgramCycleId: row.sourceTrainingProgramCycleId } : {}),
        ...(row.sourceValidationLinkId ? { validationLinkId: row.sourceValidationLinkId } : {}),
    };
}

async function buildPublicReportResult(
    row: PublicStoredReportRow,
    accessMode: SocialProReportVisibility,
): Promise<SocialProPublicReportResult> {
    const policy = await resolveSocialProAccessForUser(row.ownerUserId, 'user');
    const proBadgeVisible = hasSocialProCapability(policy, 'display_pro_badge');

    return {
        success: true,
        report: {
            ...reportResult(row),
            accessMode,
            sourceIds: sourceIdsFromReport(row),
            discoverableInFeed: accessMode === 'public' && row.visibility === 'public' && row.status === 'published',
            proBadge: {
                visible: proBadgeVisible,
                label: proBadgeVisible ? 'Pro' : null,
                tooltip: 'Pro: acesso aos recursos premium do Sens PUBG',
                meaning: 'active_pro_access',
            },
        },
    };
}

function safeUnavailableReport(error: string): SocialProPublicReportResult {
    return {
        success: false,
        error,
    };
}

async function loadPublicReportBySlugOrId(token: string): Promise<PublicStoredReportRow | null> {
    const [row] = await db
        .select({
            id: socialProReports.id,
            ownerUserId: socialProReports.ownerUserId,
            publicSlug: socialProReports.publicSlug,
            visibility: socialProReports.visibility,
            status: socialProReports.status,
            publicSafeSnapshot: socialProReports.publicSafeSnapshot,
            sourceAnalysisSessionId: socialProReports.sourceAnalysisSessionId,
            sourceHistorySessionId: socialProReports.sourceHistorySessionId,
            sourceProtocolRevisionId: socialProReports.sourceProtocolRevisionId,
            sourceSprayLabSessionId: socialProReports.sourceSprayLabSessionId,
            sourceTrainingProgramCycleId: socialProReports.sourceTrainingProgramCycleId,
            sourceValidationLinkId: socialProReports.sourceValidationLinkId,
            archivedAt: socialProReports.archivedAt,
        })
        .from(socialProReports)
        .where(or(
            eq(socialProReports.publicSlug, token),
            eq(socialProReports.id, token),
        ))
        .limit(1) as PublicStoredReportRow[];

    return row ?? null;
}

async function loadReportByPrivateToken(input: {
    readonly token: string;
    readonly now?: string | Date;
}): Promise<SocialProPublicReportResult> {
    const verifier = createSocialProLinkTokenVerifier(input.token);
    const [link] = await db
        .select({
            id: socialProReportLinks.id,
            reportId: socialProReportLinks.reportId,
            status: socialProReportLinks.status,
            tokenVerifierHash: socialProReportLinks.tokenVerifierHash,
            expiresAt: socialProReportLinks.expiresAt,
        })
        .from(socialProReportLinks)
        .where(eq(socialProReportLinks.tokenVerifierPrefix, verifier.tokenVerifierPrefix))
        .limit(1) as StoredLinkRow[];

    if (!link) {
        return safeUnavailableReport('Relatorio nao encontrado.');
    }

    const verification = verifySocialProLinkToken({
        token: input.token,
        tokenVerifierHash: link.tokenVerifierHash,
        status: link.status,
        ...(link.expiresAt === undefined ? {} : { expiresAt: link.expiresAt }),
        now: parseNow(input.now),
    });

    if (!verification.active) {
        return safeUnavailableReport(verification.reason === 'expired'
            ? 'Link privado expirado.'
            : 'Link privado revogado ou invalido.');
    }

    const [report] = await db
        .select({
            id: socialProReports.id,
            ownerUserId: socialProReports.ownerUserId,
            publicSlug: socialProReports.publicSlug,
            visibility: socialProReports.visibility,
            status: socialProReports.status,
            publicSafeSnapshot: socialProReports.publicSafeSnapshot,
            sourceAnalysisSessionId: socialProReports.sourceAnalysisSessionId,
            sourceHistorySessionId: socialProReports.sourceHistorySessionId,
            sourceProtocolRevisionId: socialProReports.sourceProtocolRevisionId,
            sourceSprayLabSessionId: socialProReports.sourceSprayLabSessionId,
            sourceTrainingProgramCycleId: socialProReports.sourceTrainingProgramCycleId,
            sourceValidationLinkId: socialProReports.sourceValidationLinkId,
            archivedAt: socialProReports.archivedAt,
        })
        .from(socialProReports)
        .where(eq(socialProReports.id, link.reportId))
        .limit(1) as PublicStoredReportRow[];

    if (!report || !isReadablePublicReportStatus(report.status)) {
        return safeUnavailableReport('Relatorio nao esta disponivel.');
    }

    return buildPublicReportResult(report, 'link_private');
}

function auditResult(type: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        type,
        ...extra,
    };
}

async function writeAuditEvent(input: {
    readonly reportId: string;
    readonly actorUserId?: string;
    readonly linkId?: string;
    readonly eventType: string;
    readonly reportStatus?: SocialProReportStatus;
    readonly publicSafeSnapshot?: SocialProPublicReport;
    readonly metadata?: Record<string, unknown>;
}): Promise<void> {
    await db.insert(socialProReportAuditEvents).values({
        reportId: input.reportId,
        ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
        ...(input.linkId ? { linkId: input.linkId } : {}),
        eventType: input.eventType,
        ...(input.reportStatus ? { reportStatus: input.reportStatus } : {}),
        ...(input.publicSafeSnapshot ? { publicSafeSnapshot: input.publicSafeSnapshot } : {}),
        metadata: input.metadata ?? {},
    });
}

async function loadOwnedReport(userId: string, reportId: string | undefined): Promise<StoredReportRow | null> {
    if (!reportId) {
        return null;
    }

    const [row] = await db
        .select({
            id: socialProReports.id,
            ownerUserId: socialProReports.ownerUserId,
            visibility: socialProReports.visibility,
            status: socialProReports.status,
            publicSafeSnapshot: socialProReports.publicSafeSnapshot,
        })
        .from(socialProReports)
        .where(and(
            eq(socialProReports.id, reportId),
            eq(socialProReports.ownerUserId, userId),
        ))
        .limit(1);

    return row as StoredReportRow | null ?? null;
}

async function loadOwnedLink(input: {
    readonly userId: string;
    readonly reportId: string;
    readonly linkId: string | undefined;
}): Promise<StoredLinkRow | null> {
    if (!input.linkId) {
        return null;
    }

    const [row] = await db
        .select({
            id: socialProReportLinks.id,
            reportId: socialProReportLinks.reportId,
            status: socialProReportLinks.status,
            tokenVerifierHash: socialProReportLinks.tokenVerifierHash,
            expiresAt: socialProReportLinks.expiresAt,
        })
        .from(socialProReportLinks)
        .where(and(
            eq(socialProReportLinks.id, input.linkId),
            eq(socialProReportLinks.reportId, input.reportId),
            eq(socialProReportLinks.ownerUserId, input.userId),
        ))
        .limit(1);

    return row as StoredLinkRow | null ?? null;
}

function revalidateSocialProPaths(reportId?: string): void {
    revalidatePath('/community');
    revalidatePath('/dashboard');
    revalidatePath('/history');

    if (reportId) {
        revalidatePath(`/community/reports/${reportId}`);
    }
}

export async function createSocialProReportAction(
    input: CreateSocialProReportActionInput,
): Promise<SocialProReportActionResult> {
    const capability = await requireSocialProCapability('create_report');

    if (!capability.ok) {
        return {
            success: false,
            error: capability.error,
        };
    }

    const evidence = await loadOwnedSourceEvidence(capability.userId, input);

    if (!evidence.ok) {
        return {
            success: false,
            error: evidence.error,
        };
    }

    const reportId = randomUUID();
    const visibility = parseVisibility(input.visibility);
    const status: SocialProReportStatus = 'published';
    const title = readString(input.title) ?? 'Relatorio Pro Compartilhavel';
    const publicSafeSnapshot = buildPublicReportSnapshot({
        reportId,
        title,
        visibility,
        status,
        ...(input.controls ? { controls: input.controls } : {}),
        ...(input.requestedSections ? { requestedSections: input.requestedSections } : {}),
        evidence: evidence.value,
    });
    const visibleOptionalSections = publicSafeSnapshot.controls.visibleOptionalSections;
    const now = new Date();

    const [createdReport] = await db
        .insert(socialProReports)
        .values({
            id: reportId,
            ownerUserId: capability.userId,
            ...(visibility === 'public' ? { publicSlug: `relatorio-pro-${reportId}` } : {}),
            visibility,
            status,
            title,
            publicSafeSnapshot,
            ...(evidence.value.sourceIds.analysisSessionId ? {
                sourceAnalysisSessionId: evidence.value.sourceIds.analysisSessionId,
            } : {}),
            ...(evidence.value.sourceIds.historySessionId ? {
                sourceHistorySessionId: evidence.value.sourceIds.historySessionId,
            } : {}),
            ...(evidence.value.sourceIds.protocolRevisionId ? {
                sourceProtocolRevisionId: evidence.value.sourceIds.protocolRevisionId,
            } : {}),
            ...(evidence.value.sourceIds.sprayLabSessionId ? {
                sourceSprayLabSessionId: evidence.value.sourceIds.sprayLabSessionId,
            } : {}),
            ...(evidence.value.sourceIds.trainingProgramCycleId ? {
                sourceTrainingProgramCycleId: evidence.value.sourceIds.trainingProgramCycleId,
            } : {}),
            ...(evidence.value.sourceIds.validationLinkId ? {
                sourceValidationLinkId: evidence.value.sourceIds.validationLinkId,
            } : {}),
            payload: reportPayload(evidence.value.sourceIds, visibleOptionalSections),
            publishedAt: now,
            createdAt: now,
            updatedAt: now,
        })
        .returning({
            id: socialProReports.id,
            visibility: socialProReports.visibility,
            status: socialProReports.status,
            publicSafeSnapshot: socialProReports.publicSafeSnapshot,
        });

    const report = (createdReport ?? {
        id: reportId,
        visibility,
        status,
        publicSafeSnapshot,
    }) as StoredReportRow;
    await writeAuditEvent({
        reportId: report.id,
        actorUserId: capability.userId,
        eventType: 'social_pro.report.created',
        reportStatus: status,
        publicSafeSnapshot,
    });
    revalidateSocialProPaths(report.id);

    return {
        success: true,
        report: reportResult(report),
        auditEvents: [auditResult('social_pro.report.created')],
    };
}

export async function updateSocialProReportAction(
    input: UpdateSocialProReportActionInput,
): Promise<SocialProReportActionResult> {
    const capability = await requireSocialProCapability('edit_report');

    if (!capability.ok) {
        return {
            success: false,
            error: capability.error,
        };
    }

    const report = await loadOwnedReport(capability.userId, input.reportId);

    if (!report) {
        return {
            success: false,
            error: 'Relatorio nao encontrado ou nao pertence ao usuario.',
        };
    }

    const visibility = input.visibility ? parseVisibility(input.visibility) : report.visibility;
    const status = input.status ? parseStatus(input.status, report.status) : report.status;
    const publicSafeSnapshot = redactSocialProReportForPublic({
        ...report.publicSafeSnapshot,
        visibility,
        status,
        publicSummary: {
            ...report.publicSafeSnapshot.publicSummary,
            title: readString(input.title) ?? report.publicSafeSnapshot.publicSummary.title,
        },
        controls: sanitizeSocialProReportControls({
            ...report.publicSafeSnapshot.controls,
            ...(input.controls ?? {}),
        }),
    });

    await db
        .update(socialProReports)
        .set({
            visibility,
            status,
            title: publicSafeSnapshot.publicSummary.title,
            publicSafeSnapshot,
            ...(visibility === 'public' ? { publicSlug: `relatorio-pro-${report.id}` } : {}),
            updatedAt: new Date(),
        })
        .where(and(
            eq(socialProReports.id, report.id),
            eq(socialProReports.ownerUserId, capability.userId),
        ));
    await writeAuditEvent({
        reportId: report.id,
        actorUserId: capability.userId,
        eventType: 'social_pro.report.updated',
        reportStatus: status,
        publicSafeSnapshot,
    });
    revalidateSocialProPaths(report.id);

    return {
        success: true,
        report: reportResult({
            ...report,
            visibility,
            status,
            publicSafeSnapshot,
        }),
        auditEvents: [auditResult('social_pro.report.updated')],
    };
}

async function requireOwnedReportForLink(input: {
    readonly userId: string;
    readonly reportId?: string;
}): Promise<
    | { readonly ok: true; readonly report: StoredReportRow }
    | { readonly ok: false; readonly error: string }
> {
    const report = await loadOwnedReport(input.userId, input.reportId);

    if (!report) {
        return {
            ok: false,
            error: 'Relatorio nao encontrado ou nao pertence ao usuario.',
        };
    }

    return {
        ok: true,
        report,
    };
}

export async function createSocialProReportLinkAction(
    input: SocialProReportLinkActionInput,
): Promise<SocialProReportActionResult> {
    const capability = await requireSocialProCapability('manage_private_links');

    if (!capability.ok) {
        return {
            success: false,
            error: capability.error,
        };
    }

    const reportResultForLink = await requireOwnedReportForLink({
        userId: capability.userId,
        ...(input.reportId ? { reportId: input.reportId } : {}),
    });

    if (!reportResultForLink.ok) {
        return {
            success: false,
            error: reportResultForLink.error,
        };
    }

    const token = generateSocialProLinkToken();
    const verifier = createSocialProLinkTokenVerifier(token);
    const expiresAt = parseDate(input.expiresAt);
    const now = new Date();
    const [createdLink] = await db
        .insert(socialProReportLinks)
        .values({
            reportId: reportResultForLink.report.id,
            ownerUserId: capability.userId,
            tokenVerifierHash: verifier.tokenVerifierHash,
            tokenVerifierPrefix: verifier.tokenVerifierPrefix,
            status: 'active',
            ...(expiresAt ? { expiresAt } : {}),
            createdAt: now,
            updatedAt: now,
        })
        .returning({
            id: socialProReportLinks.id,
            status: socialProReportLinks.status,
            expiresAt: socialProReportLinks.expiresAt,
        });
    const linkId = readString(createdLink?.id) ?? randomUUID();

    await writeAuditEvent({
        reportId: reportResultForLink.report.id,
        actorUserId: capability.userId,
        linkId,
        eventType: 'social_pro.private_link.created',
        reportStatus: reportResultForLink.report.status,
        metadata: { expiresAt: expiresAt?.toISOString() ?? null },
    });
    revalidateSocialProPaths(reportResultForLink.report.id);

    return {
        success: true,
        link: {
            id: linkId,
            token,
            status: createdLink?.status ?? 'active',
            discoverableInFeed: false,
            expiresAt: (createdLink?.expiresAt instanceof Date
                ? createdLink.expiresAt
                : expiresAt)?.toISOString() ?? null,
        },
        auditEvents: [auditResult('social_pro.private_link.created')],
    };
}

export async function regenerateSocialProReportLinkAction(
    input: SocialProReportLinkActionInput,
): Promise<SocialProReportActionResult> {
    const capability = await requireSocialProCapability('manage_private_links');

    if (!capability.ok) {
        return {
            success: false,
            error: capability.error,
        };
    }

    const reportResultForLink = await requireOwnedReportForLink({
        userId: capability.userId,
        ...(input.reportId ? { reportId: input.reportId } : {}),
    });

    if (!reportResultForLink.ok) {
        return {
            success: false,
            error: reportResultForLink.error,
        };
    }

    const previousLink = await loadOwnedLink({
        userId: capability.userId,
        reportId: reportResultForLink.report.id,
        linkId: input.previousLinkId ?? input.linkId,
    });

    if (!previousLink) {
        return {
            success: false,
            error: 'Link privado nao encontrado.',
        };
    }

    await db
        .update(socialProReportLinks)
        .set({
            status: 'revoked',
            revokedByUserId: capability.userId,
            revokedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(socialProReportLinks.id, previousLink.id));

    const token = generateSocialProLinkToken();
    const verifier = createSocialProLinkTokenVerifier(token);
    const now = new Date();
    const [createdLink] = await db
        .insert(socialProReportLinks)
        .values({
            reportId: reportResultForLink.report.id,
            ownerUserId: capability.userId,
            tokenVerifierHash: verifier.tokenVerifierHash,
            tokenVerifierPrefix: verifier.tokenVerifierPrefix,
            status: 'active',
            regeneratedFromLinkId: previousLink.id,
            lastRegeneratedAt: now,
            createdAt: now,
            updatedAt: now,
        })
        .returning({
            id: socialProReportLinks.id,
            status: socialProReportLinks.status,
            expiresAt: socialProReportLinks.expiresAt,
        });
    const linkId = readString(createdLink?.id) ?? randomUUID();

    await writeAuditEvent({
        reportId: reportResultForLink.report.id,
        actorUserId: capability.userId,
        linkId,
        eventType: 'social_pro.private_link.regenerated',
        reportStatus: reportResultForLink.report.status,
        metadata: { previousLinkId: previousLink.id },
    });
    revalidateSocialProPaths(reportResultForLink.report.id);

    return {
        success: true,
        link: {
            id: linkId,
            token,
            status: createdLink?.status ?? 'active',
            discoverableInFeed: false,
            expiresAt: createdLink?.expiresAt instanceof Date ? createdLink.expiresAt.toISOString() : null,
        },
        auditEvents: [auditResult('social_pro.private_link.regenerated')],
    };
}

export async function revokeSocialProReportLinkAction(
    input: SocialProReportLinkActionInput,
): Promise<SocialProReportActionResult> {
    const capability = await requireSocialProCapability('manage_private_links');

    if (!capability.ok) {
        return {
            success: false,
            error: capability.error,
        };
    }

    const reportResultForLink = await requireOwnedReportForLink({
        userId: capability.userId,
        ...(input.reportId ? { reportId: input.reportId } : {}),
    });

    if (!reportResultForLink.ok) {
        return {
            success: false,
            error: reportResultForLink.error,
        };
    }

    const link = await loadOwnedLink({
        userId: capability.userId,
        reportId: reportResultForLink.report.id,
        linkId: input.linkId,
    });

    if (!link) {
        return {
            success: false,
            error: 'Link privado nao encontrado.',
        };
    }

    await db
        .update(socialProReportLinks)
        .set({
            status: 'revoked',
            revokedByUserId: capability.userId,
            revokedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(socialProReportLinks.id, link.id));
    await writeAuditEvent({
        reportId: reportResultForLink.report.id,
        actorUserId: capability.userId,
        linkId: link.id,
        eventType: 'social_pro.private_link.revoked',
        reportStatus: reportResultForLink.report.status,
    });
    revalidateSocialProPaths(reportResultForLink.report.id);

    return {
        success: true,
        link: {
            id: link.id,
            status: 'revoked',
            discoverableInFeed: false,
        },
        auditEvents: [auditResult('social_pro.private_link.revoked')],
    };
}

export async function readSocialProReportByPrivateLinkAction(
    input: ReadSocialProReportByPrivateLinkInput,
): Promise<SocialProReportActionResult> {
    const token = readString(input.token);

    if (!token) {
        return {
            success: false,
            error: 'Link privado invalido.',
        };
    }

    const verifier = createSocialProLinkTokenVerifier(token);
    const [link] = await db
        .select({
            id: socialProReportLinks.id,
            reportId: socialProReportLinks.reportId,
            status: socialProReportLinks.status,
            tokenVerifierHash: socialProReportLinks.tokenVerifierHash,
            expiresAt: socialProReportLinks.expiresAt,
        })
        .from(socialProReportLinks)
        .where(eq(socialProReportLinks.tokenVerifierPrefix, verifier.tokenVerifierPrefix))
        .limit(1) as StoredLinkRow[];

    if (!link) {
        return {
            success: false,
            error: 'Link privado invalido.',
        };
    }

    const verification = verifySocialProLinkToken({
        token,
        tokenVerifierHash: link.tokenVerifierHash,
        status: link.status,
        ...(link.expiresAt === undefined ? {} : { expiresAt: link.expiresAt }),
        now: parseNow(input.now),
    });

    if (!verification.active) {
        return {
            success: false,
            error: verification.reason === 'expired'
                ? 'Link privado expirado.'
                : 'Link privado revogado ou invalido.',
        };
    }

    const [report] = await db
        .select({
            id: socialProReports.id,
            visibility: socialProReports.visibility,
            status: socialProReports.status,
            publicSafeSnapshot: socialProReports.publicSafeSnapshot,
        })
        .from(socialProReports)
        .where(eq(socialProReports.id, link.reportId))
        .limit(1) as StoredReportRow[];

    if (!report || report.status === 'hidden' || report.status === 'disabled' || report.status === 'archived') {
        return {
            success: false,
            error: 'Relatorio nao esta disponivel.',
        };
    }

    return {
        success: true,
        report: reportResult(report),
    };
}

export async function resolvePublicSocialProReportByToken(
    token: string,
    input: { readonly now?: string | Date } = {},
): Promise<SocialProPublicReportResult> {
    const normalizedToken = readString(token);

    if (!normalizedToken) {
        return safeUnavailableReport('Relatorio nao encontrado.');
    }

    const publicReport = await loadPublicReportBySlugOrId(normalizedToken);

    if (publicReport) {
        if (publicReport.visibility !== 'public' || !isReadablePublicReportStatus(publicReport.status)) {
            return safeUnavailableReport('Relatorio nao esta disponivel.');
        }

        return buildPublicReportResult(publicReport, 'public');
    }

    return loadReportByPrivateToken({
        token: normalizedToken,
        ...(input.now ? { now: input.now } : {}),
    });
}

export const createSocialProReport = createSocialProReportAction;
export const updateSocialProReportControls = updateSocialProReportAction;
export const createSocialProPrivateLink = createSocialProReportLinkAction;
export const regenerateSocialProPrivateLink = regenerateSocialProReportLinkAction;
export const revokeSocialProPrivateLink = revokeSocialProReportLinkAction;
