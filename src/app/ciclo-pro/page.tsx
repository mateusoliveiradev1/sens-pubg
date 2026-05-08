import type { Metadata } from 'next';

import { auth } from '@/auth';
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
import { buildCicloProViewModel } from './ciclo-pro-view-model';
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
                </div>
            </main>
        </div>
    );
}
