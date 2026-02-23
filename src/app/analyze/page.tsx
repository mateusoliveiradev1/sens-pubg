/**
 * Analysis Page — Clip upload + weapon/scope selection + analysis progress.
 */

import { Header } from '@/ui/components/header';
import { AnalysisClient } from './analysis-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Analisar Clip',
    description: 'Envie um clip de spray de 5-15 segundos e receba diagnóstico completo com IA.',
};

export default function AnalyzePage(): React.JSX.Element {
    return (
        <>
            <Header />
            <div className="page">
                <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <h1 style={{ marginBottom: 'var(--space-sm)' }}>Analisar Clip</h1>
                    <p style={{ marginBottom: 'var(--space-2xl)' }}>
                        Envie um clip de spray de 5-15 segundos. A IA vai extrair os frames,
                        rastrear sua mira e calcular todas as métricas em tempo real.
                    </p>
                    <AnalysisClient />
                </div>
            </div>
        </>
    );
}
