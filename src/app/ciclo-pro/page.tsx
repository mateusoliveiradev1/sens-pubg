import type { Metadata } from 'next';

import { auth } from '@/auth';
import {
    getActiveTrainingProgramCycleAction,
    getTrainingProgramCycleAction,
} from '@/actions/training-programs';
import { projectTrainingProgramForAccess } from '@/lib/training-program-projection';
import { resolveServerProductAccess } from '@/lib/product-access-server';
import { Header } from '@/ui/components/header';
import { PageCommandHeader } from '@/ui/components/page-command-header';
import type { TrainingProgramCycleSnapshot } from '@/types/training-programs';

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

    if (programState.loadError) {
        return (
            <div className="min-h-screen bg-[#08080c] text-white">
                <Header />
                <main className="page">
                    <div className="container" style={{ maxWidth: '1180px' }}>
                        <PageCommandHeader
                            body="Nao foi possivel abrir esse ciclo com seguranca. Use uma analise salva ou retome pelo historico."
                            evidenceItems={[
                                { label: 'Estado', value: 'Reparo', tone: 'warning' },
                                { label: 'Motivo', value: programState.loadError, tone: 'warning' },
                                { label: 'Acesso', value: projection.tier, tone: projection.tier === 'free' ? 'info' : 'pro' },
                            ]}
                            primaryAction={{ label: 'Abrir historico', href: '/history' }}
                            roleLabel="Ciclo Pro"
                            title="Ciclo Pro em reparo"
                        />
                    </div>
                </main>
            </div>
        );
    }

    if (!programState.cycle) {
        return (
            <div className="min-h-screen bg-[#08080c] text-white">
                <Header />
                <main className="page">
                    <div className="container" style={{ maxWidth: '1180px' }}>
                        <PageCommandHeader
                            body="Nenhum Ciclo Pro ativo foi encontrado. Salve uma analise com protocolo, abra o historico ou grave uma validacao antes de criar um mapa real."
                            evidenceItems={[
                                { label: 'Estado', value: 'Sem ciclo ativo', tone: 'warning' },
                                { label: 'Entrada', value: 'analise salva ou protocolo', tone: 'info' },
                                { label: 'Verdade', value: 'sem programa inventado', tone: 'success' },
                            ]}
                            primaryAction={{ label: 'Abrir Analyze', href: '/analyze' }}
                            roleLabel="Ciclo Pro"
                            title="Nenhum Ciclo Pro ativo"
                        />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#08080c] text-white">
            <Header />
            <main className="page">
                <div className="container" style={{ maxWidth: '1180px' }}>
                    <PageCommandHeader
                        body={projection.evidence?.summary ?? 'Ciclo carregado com evidencia preservada.'}
                        evidenceItems={[
                            { label: 'Estado', value: projection.fullCycle?.state ?? programState.cycle.state, tone: 'info' },
                            { label: 'Semana', value: `${programState.cycle.currentWeekNumber} de 4`, tone: 'info' },
                            { label: 'Acesso', value: projection.tier, tone: projection.tier === 'free' ? 'info' : 'pro' },
                        ]}
                        primaryAction={projection.nextStep}
                        roleLabel="Ciclo Pro"
                        title={projection.fullCycle?.label ?? 'Desbloqueie o Ciclo Pro de 30 dias'}
                    />
                </div>
            </main>
        </div>
    );
}
