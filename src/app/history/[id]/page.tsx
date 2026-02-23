import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { analysisSessions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import Link from 'next/link';
import { getWeapon } from '@/game/pubg/weapon-data';
import { SCOPE_LIST } from '@/game/pubg';
import { ResultsDashboard } from '@/app/analyze/results-dashboard';
import type { AnalysisResult } from '@/types/engine';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function HistoryDetailRoute({ params }: Props) {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/history');
    }

    const { id } = await params;

    // Validate UUID format roughly
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        notFound();
    }

    const [record] = await db
        .select()
        .from(analysisSessions)
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

    const weapon = getWeapon(record.weaponId);
    const scope = SCOPE_LIST.find(s => s.id === record.scopeId);

    // Reconstruct the AnalysisResult package expected by the Dashboard
    const analysisResult = record.fullResult as unknown as AnalysisResult;

    if (!analysisResult || !analysisResult.trajectory) {
        return (
            <div className="container center" style={{ marginTop: 'var(--space-3xl)' }}>
                <h2 style={{ color: 'var(--color-error)' }}>Análise Incompleta</h2>
                <p style={{ color: 'var(--color-text-muted)' }}>Esta sessão é antiga e não possui os dados detalhados salvos na nuvem.</p>
                <Link href="/history" className="btn btn-outline" style={{ marginTop: 'var(--space-md)' }}>Voltar</Link>
            </div>
        );
    }

    return (
        <>
            {/* Background Effects */}
            <div className="bg-glow bg-glow-primary" style={{ top: '-10%', left: '-10%' }} />

            <div className="container" style={{ padding: 'calc(var(--header-height) + var(--space-2xl)) var(--space-md) var(--space-3xl)' }}>
                <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
                        <Link href="/history" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <span>←</span> Voltar
                        </Link>
                        <div style={{ textAlign: 'right' }}>
                            <h1 style={{ margin: 0, fontSize: 'var(--text-3xl)', letterSpacing: '-0.02em', textShadow: '0 0 20px rgba(121, 40, 202, 0.3)' }}>
                                {weapon?.name || record.weaponId}
                            </h1>
                            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                                {scope?.name || record.scopeId} • {record.distance}m • {new Date(record.createdAt).toLocaleString('pt-BR')}
                            </p>
                        </div>
                    </div>

                    {/* Dashboard */}
                    <ResultsDashboard result={analysisResult} />

                </div>
            </div>
        </>
    );
}
