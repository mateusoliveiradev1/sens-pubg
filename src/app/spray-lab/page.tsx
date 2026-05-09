import type { Metadata } from 'next';
import { and, desc, eq } from 'drizzle-orm';

import { auth } from '@/auth';
import { saveSocialProLibraryItem } from '@/actions/social-pro-library';
import { createSocialProReportAction } from '@/actions/social-pro-reports';
import {
    createSprayLabSessionAction,
    getActiveSprayLabSessionAction,
    getSprayLabSessionAction,
} from '@/actions/spray-lab';
import { db } from '@/db';
import { sprayLabBenchmarkSnapshots } from '@/db/schema';
import { projectSprayLabForAccess } from '@/lib/spray-lab-projection';
import { resolveServerProductAccess } from '@/lib/product-access-server';
import { Header } from '@/ui/components/header';
import { LoopRail } from '@/ui/components/loop-rail';
import { PageCommandHeader } from '@/ui/components/page-command-header';
import type { SprayLabBenchmarkSnapshot, SprayLabSessionSnapshot } from '@/types/engine';
import { SprayLabRunner } from './spray-lab-runner';
import { buildSprayLabViewModel, type SprayLabSocialProModel } from './spray-lab-view-model';
import styles from './spray-lab.module.css';

export const metadata: Metadata = {
    title: 'Spray Lab',
    description: 'Execute blocos guiados de spray com contexto fixo, fidelidade auditavel e validacao compativel.',
};

type SprayLabSearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(params: SprayLabSearchParams, key: string): string | undefined {
    const value = params[key];
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
}

function readFormText(formData: FormData, key: string): string | null {
    const value = formData.get(key);

    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readFormNumber(formData: FormData, key: string): number | null {
    const value = readFormText(formData, key);
    const numberValue = value ? Number(value) : Number.NaN;

    return Number.isFinite(numberValue) ? numberValue : null;
}

async function createSprayLabSocialProReport(formData: FormData): Promise<void> {
    'use server';

    const sourceSprayLabSessionId = readFormText(formData, 'sourceSprayLabSessionId');
    if (!sourceSprayLabSessionId) {
        return;
    }

    const sourceAnalysisSessionId = readFormText(formData, 'sourceAnalysisSessionId');
    const sourceValidationLinkId = readFormText(formData, 'sourceValidationLinkId');

    await createSocialProReportAction({
        sourceSprayLabSessionId,
        ...(sourceAnalysisSessionId ? { sourceAnalysisSessionId } : {}),
        ...(sourceValidationLinkId ? { sourceValidationLinkId } : {}),
        visibility: 'link_private',
        title: readFormText(formData, 'title') ?? 'Spray Lab no Social Pro',
        requestedSections: ['drill_context', 'evidence_timeline', 'validation', 'next_actions'],
    });
}

async function saveSprayLabSocialProLibraryItem(formData: FormData): Promise<void> {
    'use server';

    const itemKind = readFormText(formData, 'kind');
    const itemId = readFormText(formData, 'itemId');
    if ((itemKind !== 'spray_lab_session' && itemKind !== 'compatible_validation') || !itemId) {
        return;
    }

    const sprayLabLaneId = readFormText(formData, 'sprayLabLaneId');
    const weaponId = readFormText(formData, 'weaponId');
    const opticId = readFormText(formData, 'opticId');
    const distanceMeters = readFormNumber(formData, 'distanceMeters');
    const objectiveKey = readFormText(formData, 'objectiveKey');
    const validationState = readFormText(formData, 'validationState') ?? 'not_requested';
    const blockerKey = readFormText(formData, 'blockerKey');

    await saveSocialProLibraryItem({
        item: {
            kind: itemKind,
            id: itemId,
            context: {
                ...(sprayLabLaneId ? { sprayLabLaneId } : {}),
                ...(weaponId ? { weaponId } : {}),
                ...(opticId ? { opticId } : {}),
                ...(distanceMeters !== null ? { distanceMeters } : {}),
                ...(objectiveKey ? { objectiveKey } : {}),
                validationState,
                ...(blockerKey ? { blockerKey } : {}),
            },
        },
    });
}

function HiddenInputs({
    values,
}: {
    readonly values: Readonly<Record<string, string | number | null | undefined>>;
}): React.JSX.Element {
    return (
        <>
            {Object.entries(values).map(([name, value]) => (
                value !== null && value !== undefined && value !== ''
                    ? <input key={name} name={name} type="hidden" value={String(value)} />
                    : null
            ))}
        </>
    );
}

function SprayLabSocialProPanel({
    socialPro,
}: {
    readonly socialPro: SprayLabSocialProModel;
}): React.JSX.Element {
    return (
        <section className={styles.lockPanel} aria-label="Social Pro do Spray Lab">
            <strong>{socialPro.title}</strong>
            <p>{socialPro.body}</p>
            <p>{socialPro.evidenceHierarchy.join(' / ')}</p>
            <p>{socialPro.blockerLabels.join(' ')}</p>

            <div className={styles.controls}>
                <form action={createSprayLabSocialProReport}>
                    <HiddenInputs values={{ ...socialPro.reportAction.sourceIds }} />
                    <input name="title" type="hidden" value={socialPro.reportAction.title} />
                    <button
                        className={styles.controlPrimary}
                        disabled={socialPro.reportAction.disabled}
                        title={socialPro.reportAction.lockCopy ?? socialPro.reportAction.body}
                        type="submit"
                    >
                        {socialPro.reportAction.label}
                    </button>
                </form>
                {socialPro.libraryActions.map((action) => (
                    <form action={saveSprayLabSocialProLibraryItem} key={`${action.item.kind}:${action.item.id ?? 'missing'}`}>
                        <HiddenInputs
                            values={{
                                kind: action.item.kind,
                                itemId: action.item.id,
                                ...action.item.context,
                            }}
                        />
                        <button
                            className={styles.controlButton}
                            disabled={action.disabled}
                            title={action.lockCopy ?? action.body}
                            type="submit"
                        >
                            {action.label}
                        </button>
                    </form>
                ))}
            </div>
        </section>
    );
}

async function resolveSearchParams(
    searchParams: Promise<SprayLabSearchParams> | undefined,
): Promise<SprayLabSearchParams> {
    return searchParams ? Promise.resolve(searchParams) : {};
}

async function loadLatestBenchmark(
    userId: string | null,
    labSessionId: string | null,
): Promise<SprayLabBenchmarkSnapshot | null> {
    if (!userId || !labSessionId) {
        return null;
    }

    const [row] = await db
        .select({ snapshot: sprayLabBenchmarkSnapshots.snapshot })
        .from(sprayLabBenchmarkSnapshots)
        .where(and(
            eq(sprayLabBenchmarkSnapshots.userId, userId),
            eq(sprayLabBenchmarkSnapshots.labSessionId, labSessionId),
        ))
        .orderBy(desc(sprayLabBenchmarkSnapshots.createdAt))
        .limit(1);

    return row?.snapshot ?? null;
}

async function resolveLabSession(input: {
    readonly userId: string | null;
    readonly params: SprayLabSearchParams;
}): Promise<{
    readonly session: SprayLabSessionSnapshot | null;
    readonly loadError: string | null;
}> {
    if (!input.userId) {
        return { session: null, loadError: null };
    }

    const labSessionId = readSearchParam(input.params, 'labSessionId')
        ?? readSearchParam(input.params, 'sessionId');
    const baseAnalysisSessionId = readSearchParam(input.params, 'sourceSessionId')
        ?? readSearchParam(input.params, 'baseSessionId');
    const protocolId = readSearchParam(input.params, 'protocolId');

    if (labSessionId) {
        const loaded = await getSprayLabSessionAction({ labSessionId });

        return loaded.success
            ? { session: loaded.value, loadError: null }
            : { session: null, loadError: loaded.error };
    }

    if (baseAnalysisSessionId) {
        const active = await getActiveSprayLabSessionAction({ baseAnalysisSessionId });
        if (!active.success) {
            return { session: null, loadError: active.error };
        }

        if (active.value) {
            return { session: active.value, loadError: null };
        }

        const created = await createSprayLabSessionAction({
            baseAnalysisSessionId,
            ...(protocolId ? { protocolId } : {}),
        });

        return created.success
            ? { session: created.value, loadError: null }
            : { session: null, loadError: created.error };
    }

    const active = await getActiveSprayLabSessionAction();

    return active.success
        ? { session: active.value, loadError: null }
        : { session: null, loadError: active.error };
}

export default async function SprayLabPage({
    searchParams,
}: {
    readonly searchParams?: Promise<SprayLabSearchParams>;
}): Promise<React.JSX.Element> {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const params = await resolveSearchParams(searchParams);
    const labState = await resolveLabSession({ userId, params });
    const access = await resolveServerProductAccess(userId);
    const benchmark = await loadLatestBenchmark(userId, labState.session?.id ?? null);
    const projection = projectSprayLabForAccess({
        access,
        session: labState.session,
        benchmark,
    });
    const model = buildSprayLabViewModel({
        projection,
        session: labState.session,
        loadError: labState.loadError,
    });

    return (
        <div className={styles.shell}>
            <Header />
            <main className={styles.main}>
                <div className={styles.container}>
                    {model.routeState === 'empty' ? null : (
                        <PageCommandHeader
                            body={model.body}
                            evidenceItems={model.evidenceItems}
                            primaryAction={model.primaryAction}
                            roleLabel="Spray Lab"
                            title={model.title}
                        />
                    )}
                    {model.routeState === 'empty' ? null : (
                        <div className={styles.loopWrap}>
                            <LoopRail
                                blocked={model.routeState !== 'session'}
                                currentStage={model.loopStage}
                                evidenceLabel={model.loopEvidenceLabel}
                                nextActionLabel={model.primaryAction.label}
                            />
                        </div>
                    )}
                    <SprayLabRunner model={model} />
                    <SprayLabSocialProPanel socialPro={model.socialPro} />
                </div>
            </main>
        </div>
    );
}
