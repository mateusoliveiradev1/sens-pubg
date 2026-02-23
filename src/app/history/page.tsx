import { Header } from '@/ui/components/header';
import { getHistorySessions } from '@/actions/history';
import { getWeapon, SCOPE_LIST } from '@/game/pubg';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Histórico de Análises',
    description: 'Acompanhe sua evolução ao longo do tempo com o histórico completo de análises.',
};

export default async function HistoryPage() {
    const sessions = await getHistorySessions();
    const sortedSessions = sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return (
        <>
            <Header />
            <div className="page animate-fade-in">
                <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <h1 style={{ marginBottom: 'var(--space-sm)' }}>Histórico de Análises</h1>
                    <p style={{ marginBottom: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}>
                        Acompanhe sua evolução ao longo do tempo. Analise seus últimos resultados de spray e veja a consistência do seu progresso.
                    </p>

                    {sortedSessions.length === 0 ? (
                        <div
                            className="glass-card"
                            style={{
                                textAlign: 'center',
                                padding: 'var(--space-4xl) var(--space-xl)',
                            }}
                        >
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)' }}>📊</div>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Nenhuma análise ainda</h3>
                            <p style={{ marginBottom: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>
                                Envie seu primeiro clip de spray para começar a rastrear seu progresso e descobrir a sensibilidade perfeita para você.
                            </p>
                            <Link href="/analyze" className="btn btn-primary btn-lg">
                                Fazer Primeira Análise
                            </Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {sortedSessions.map((s, i) => {
                                const weapon = getWeapon(s.weaponId);
                                const scope = SCOPE_LIST.find(sc => sc.id === s.scopeId);
                                return (
                                    <div key={s.id} className={`glass-card animate-fade-in-up stagger-${Math.min(i + 1, 5)}`} style={{ padding: 'var(--space-lg)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xl)', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', minWidth: 200 }}>
                                            <div style={{ fontSize: '2rem' }}>{weapon?.category === 'ar' ? '🔫' : '🎯'}</div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>{weapon?.name || s.weaponId}</h3>
                                                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                                                    Mira: {scope?.name || s.scopeId} • {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 'var(--text-2xl)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: s.stabilityScore >= 70 ? 'var(--color-success)' : s.stabilityScore >= 40 ? 'var(--color-warning)' : 'var(--color-error)' }}>
                                                    {Math.round(s.stabilityScore)}
                                                </div>
                                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>ESTABILIDADE</div>
                                            </div>

                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 'var(--text-2xl)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: Math.abs(s.verticalControl - 1) < 0.15 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                                    {s.verticalControl.toFixed(2)}x
                                                </div>
                                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>RECOIL VERT.</div>
                                            </div>

                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 'var(--text-2xl)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: s.horizontalNoise <= 3 ? 'var(--color-success)' : 'var(--color-error)' }}>
                                                    {s.horizontalNoise.toFixed(1)}
                                                </div>
                                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>RUÍDO (px)</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
