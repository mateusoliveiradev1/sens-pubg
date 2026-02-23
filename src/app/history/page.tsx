/**
 * History Page — Lista de sessões de análise com comparação.
 */

import { Header } from '@/ui/components/header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Histórico de Análises',
    description: 'Acompanhe sua evolução ao longo do tempo com o histórico completo de análises.',
};

export default function HistoryPage(): React.JSX.Element {
    return (
        <>
            <Header />
            <div className="page">
                <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <h1 style={{ marginBottom: 'var(--space-sm)' }}>Histórico de Análises</h1>
                    <p style={{ marginBottom: 'var(--space-2xl)' }}>
                        Acompanhe sua evolução ao longo do tempo. Compare sessões e identifique tendências.
                    </p>

                    {/* Empty state */}
                    <div
                        className="glass-card"
                        style={{
                            textAlign: 'center',
                            padding: 'var(--space-4xl) var(--space-xl)',
                        }}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-lg)' }}>📊</div>
                        <h3>Nenhuma análise ainda</h3>
                        <p style={{ marginBottom: 'var(--space-xl)' }}>
                            Envie seu primeiro clip de spray para começar a rastrear seu progresso.
                        </p>
                        <a href="/analyze" className="btn btn-primary btn-lg">
                            Fazer Primeira Análise
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
