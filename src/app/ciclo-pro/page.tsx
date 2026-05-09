import type { Metadata } from 'next';

import { auth } from '@/auth';
import { saveSocialProLibraryItem } from '@/actions/social-pro-library';
import { createSocialProReportAction } from '@/actions/social-pro-reports';
import {
    getActiveTrainingProgramCycleAction,
    getTrainingProgramCycleAction,
} from '@/actions/training-programs';
import { projectTrainingProgramForAccess } from '@/lib/training-program-projection';
import { resolveServerProductAccess } from '@/lib/product-access-server';
import { Header } from '@/ui/components/header';
import { LoopRail } from '@/ui/components/loop-rail';
import { PageCommandHeader } from '@/ui/components/page-command-header';
import type { TrainingProgramCycleSnapshot } from '@/types/training-programs';
import { CicloProProgramMap } from './ciclo-pro-program-map';
import { buildCicloProViewModel, type CicloProSocialProModel } from './ciclo-pro-view-model';
import styles from './ciclo-pro.module.css';

export const metadata: Metadata = {
    title: 'Ciclo Pro | Sens PUBG',
    description: 'Mapa independente do Ciclo Pro de 30 dias com missoes, checkpoints, reparo e validacao guiados por evidencia.',
};

type CicloProSearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(params: CicloProSearchParams, key: string): string | undefined {
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

async function createCicloProSocialProReport(formData: FormData): Promise<void> {
    'use server';

    const sourceTrainingProgramCycleId = readFormText(formData, 'sourceTrainingProgramCycleId');
    if (!sourceTrainingProgramCycleId) {
        return;
    }

    const sourceAnalysisSessionId = readFormText(formData, 'sourceAnalysisSessionId');
    const sourceValidationLinkId = readFormText(formData, 'sourceValidationLinkId');

    await createSocialProReportAction({
        sourceTrainingProgramCycleId,
        ...(sourceAnalysisSessionId ? { sourceAnalysisSessionId } : {}),
        ...(sourceValidationLinkId ? { sourceValidationLinkId } : {}),
        visibility: 'link_private',
        title: readFormText(formData, 'title') ?? 'Ciclo Pro no Social Pro',
        requestedSections: ['evidence_timeline', 'validation', 'next_actions'],
    });
}

async function saveCicloProSocialProMission(formData: FormData): Promise<void> {
    'use server';

    const itemId = readFormText(formData, 'itemId');
    if (!itemId) {
        return;
    }

    const programCycleId = readFormText(formData, 'programCycleId');
    const activeLineId = readFormText(formData, 'activeLineId');
    const validationState = readFormText(formData, 'validationState') ?? 'compatible_validation_pending';
    const blockerKey = readFormText(formData, 'blockerKey');

    await saveSocialProLibraryItem({
        item: {
            kind: 'program_mission',
            id: itemId,
            context: {
                ...(programCycleId ? { programCycleId } : {}),
                ...(activeLineId ? { activeLineId } : {}),
                validationState,
                ...(blockerKey ? { blockerKey } : {}),
            },
        },
    });
}

function HiddenInputs({
    values,
}: {
    readonly values: Readonly<Record<string, string | null | undefined>>;
}): React.JSX.Element {
    return (
        <>
            {Object.entries(values).map(([name, value]) => (
                value ? <input key={name} name={name} type="hidden" value={value} /> : null
            ))}
        </>
    );
}

function CicloProSocialProPanel({
    socialPro,
}: {
    readonly socialPro: CicloProSocialProModel;
}): React.JSX.Element {
    return (
        <section className={styles.activeLinePanel} aria-label="Social Pro do Ciclo Pro">
            <div>
                <span className={styles.kicker}>{socialPro.title}</span>
                <h2>Relatorio e biblioteca do treino</h2>
                <p>{socialPro.body}</p>
                <div className={styles.reasonList} aria-label="Hierarquia de evidencia Social Pro">
                    {socialPro.evidenceHierarchy.map((item) => (
                        <span key={item}>{item}</span>
                    ))}
                </div>
                <div className={styles.reasonList} aria-label="Blockers preservados no Social Pro">
                    {socialPro.blockerLabels.map((item) => (
                        <span key={item}>{item}</span>
                    ))}
                </div>
            </div>

            <div className={styles.lineActions}>
                <form action={createCicloProSocialProReport}>
                    <HiddenInputs values={{ ...socialPro.reportAction.sourceIds }} />
                    <input name="title" type="hidden" value={socialPro.reportAction.title} />
                    <button
                        className={styles.primaryLink}
                        disabled={socialPro.reportAction.disabled}
                        title={socialPro.reportAction.lockCopy ?? socialPro.reportAction.body}
                        type="submit"
                    >
                        {socialPro.reportAction.label}
                    </button>
                </form>
                <form action={saveCicloProSocialProMission}>
                    <HiddenInputs
                        values={{
                            itemId: socialPro.libraryAction.item.id,
                            ...socialPro.libraryAction.item.context,
                        }}
                    />
                    <button
                        className={styles.secondaryLink}
                        disabled={socialPro.libraryAction.disabled}
                        title={socialPro.libraryAction.lockCopy ?? socialPro.libraryAction.body}
                        type="submit"
                    >
                        {socialPro.libraryAction.label}
                    </button>
                </form>
            </div>
        </section>
    );
}

async function resolveSearchParams(
    searchParams: Promise<CicloProSearchParams> | undefined,
): Promise<CicloProSearchParams> {
    return searchParams ? Promise.resolve(searchParams) : {};
}

async function resolveProgramCycle(input: {
    readonly userId: string | null;
    readonly params: CicloProSearchParams;
}): Promise<{
    readonly cycle: TrainingProgramCycleSnapshot | null;
    readonly loadError: string | null;
}> {
    if (!input.userId) {
        return { cycle: null, loadError: null };
    }

    const cycleId = readSearchParam(input.params, 'cycleId');
    const baseAnalysisSessionId = readSearchParam(input.params, 'baseSessionId')
        ?? readSearchParam(input.params, 'sourceSessionId');

    const loaded = cycleId
        ? await getTrainingProgramCycleAction({ cycleId })
        : await getActiveTrainingProgramCycleAction(baseAnalysisSessionId ? { baseAnalysisSessionId } : {});

    return loaded.success
        ? { cycle: loaded.value, loadError: null }
        : { cycle: null, loadError: loaded.error };
}

export default async function CicloProPage({
    searchParams,
}: {
    readonly searchParams?: Promise<CicloProSearchParams>;
}): Promise<React.JSX.Element> {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const params = await resolveSearchParams(searchParams);
    const access = await resolveServerProductAccess(userId);
    const programState = await resolveProgramCycle({ userId, params });
    const projection = projectTrainingProgramForAccess({
        access,
        cycle: programState.cycle,
    });
    const model = buildCicloProViewModel({
        projection,
        loadError: programState.loadError,
    });

    return (
        <div className={styles.shell}>
            <Header />
            <main className={styles.main}>
                <div className={styles.container}>
                    <PageCommandHeader
                        body={model.body}
                        evidenceItems={model.evidenceItems}
                        primaryAction={model.primaryAction}
                        roleLabel={model.roleLabel}
                        title={model.title}
                    />
                    <div className={styles.loopWrap}>
                        <LoopRail
                            blocked={model.routeState === 'empty' || model.routeState === 'locked' || model.routeState === 'repair'}
                            currentStage={model.loopStage}
                            evidenceLabel={model.loopEvidenceLabel}
                            nextActionLabel={model.primaryAction.label}
                        />
                    </div>
                    <CicloProProgramMap model={model} />
                    <CicloProSocialProPanel socialPro={model.socialPro} />
                </div>
            </main>
        </div>
    );
}
