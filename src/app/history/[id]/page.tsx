import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { analysisSessions, weaponProfiles } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import Link from 'next/link';
import { SCOPE_LIST } from '@/game/pubg';
import { formatAnalysisDistancePresentation } from '@/app/analyze/analysis-distance-presentation';
import { ResultsDashboard } from '@/app/analyze/results-dashboard';
import { hydrateAnalysisResultFromHistory } from '../analysis-result-hydration';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function HistoryDetailRoute({ params }: Props) {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/history');
    }

    const { id } = await params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        notFound();
    }

    const [record] = await db
        .select({
            id: analysisSessions.id,
            weaponId: analysisSessions.weaponId,
            scopeId: analysisSessions.scopeId,
            patchVersion: analysisSessions.patchVersion,
            distance: analysisSessions.distance,
            createdAt: analysisSessions.createdAt,
            fullResult: analysisSessions.fullResult,
            weaponName: weaponProfiles.name,
        })
        .from(analysisSessions)
        .leftJoin(
            weaponProfiles,
            sql`CASE WHEN ${analysisSessions.weaponId} ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN ${analysisSessions.weaponId}::uuid ELSE NULL END = ${weaponProfiles.id}`
        )
        .where(
            and(
                eq(analysisSessions.id, id),
                eq(analysisSessions.userId, session.user.id)
            )
        )
        .limit(1);

    if (!record) {
        notFound();
    }

    const scope = SCOPE_LIST.find((item) => item.id === record.scopeId);
    const fullResult = (record.fullResult ?? {}) as Record<string, unknown>;
    const analysisResult = hydrateAnalysisResultFromHistory({
        fullResult,
        recordPatchVersion: record.patchVersion,
        scopeId: record.scopeId,
        distanceMeters: record.distance,
    });

    if (!analysisResult || !analysisResult.trajectory) {
        return (
            <div className="container center" style={{ marginTop: 'var(--space-3xl)' }}>
                <h2 style={{ color: 'var(--color-error)' }}>Analise Incompleta</h2>
                <p style={{ color: 'var(--color-text-muted)' }}>
                    Esta sessao e antiga e nao possui os dados detalhados salvos na nuvem.
                </p>
                <Link href="/history" className="btn btn-outline" style={{ marginTop: 'var(--space-md)' }}>
                    Voltar
                </Link>
            </div>
        );
    }

    const displayName = record.weaponName || record.weaponId;
    const distancePresentation = formatAnalysisDistancePresentation({
        targetDistanceMeters: analysisResult.analysisContext?.targetDistanceMeters ?? record.distance,
        distanceMode: analysisResult.analysisContext?.distanceMode,
        distanceNote: analysisResult.analysisContext?.distanceNote,
    });

    return (
        <>
            <div className="bg-glow bg-glow-primary" style={{ top: '-10%', left: '-10%' }} />

            <div
                className="container"
                style={{ padding: 'calc(var(--header-height) + var(--space-2xl)) var(--space-md) var(--space-3xl)' }}
            >
                <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
                        <Link
                            href="/history"
                            className="btn btn-outline"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}
                        >
                            <span>{'<-'}</span> Voltar
                        </Link>
                        <div style={{ textAlign: 'right' }}>
                            <h1
                                style={{
                                    margin: 0,
                                    fontSize: 'var(--text-3xl)',
                                    letterSpacing: '-0.02em',
                                    textShadow: '0 0 20px rgba(121, 40, 202, 0.3)',
                                }}
                            >
                                {displayName}
                            </h1>
                            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                                {scope?.name || record.scopeId} | <span title={distancePresentation.note}>{distancePresentation.inlineLabel}</span> | Patch {analysisResult.patchVersion} |{' '}
                                {new Date(record.createdAt).toLocaleString('pt-BR')}
                            </p>
                        </div>
                    </div>

                    <ResultsDashboard result={analysisResult} />
                </div>
            </div>
        </>
    );
}
