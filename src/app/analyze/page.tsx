/**
 * Analysis Page - Clip upload + weapon/scope selection + analysis progress.
 */

import { Header } from '@/ui/components/header';
import { AnalysisClient } from './analysis-client';
import { getProfile } from '@/actions/profile';
import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/db';
import { isProfileReadyForAnalysis } from './analysis-profile';
import { formatSprayClipDurationLabel } from '@/core';

const clipDurationLabel = formatSprayClipDurationLabel('pt-BR');

export const metadata: Metadata = {
    title: 'Analisar Clip',
    description: `Envie um clip de spray de ${clipDurationLabel} e receba um diagnostico estruturado do seu spray.`,
};

export default async function AnalyzePage() {
    const profileBundle = await getProfile();
    const profile = profileBundle?.profile ?? null;
    const dbWeaponProfiles = await db.query.weaponProfiles.findMany({
        orderBy: (wp, { asc }) => [asc(wp.name)],
    });

    return (
        <>
            <Header />
            <div className="page">
                <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <h1 style={{ marginBottom: 'var(--space-sm)' }}>Analisar Clip</h1>
                    <p style={{ marginBottom: 'var(--space-2xl)' }}>
                        Envie um clip de spray de {clipDurationLabel}. O motor de analise vai extrair os frames,
                        rastrear sua mira e estimar metricas de controle para gerar um diagnostico guiado.
                    </p>

                    {!isProfileReadyForAnalysis(profile) ? (
                        <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--space-4xl) var(--space-xl)' }}>
                            <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>!</div>
                            <h2 style={{ marginBottom: 'var(--space-md)' }}>Configuracao de Setup Requerida</h2>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)', maxWidth: 500, margin: '0 auto var(--space-xl)' }}>
                                Para contextualizar a analise e reduzir erro na recomendacao de sensibilidade,
                                precisamos do seu perfil tecnico com resolucao, FOV e DPI validados.
                            </p>
                            <Link href="/setup" className="btn btn-primary btn-lg">
                                Iniciar Assistente de Setup
                            </Link>
                        </div>
                    ) : (
                        <AnalysisClient profile={profile} dbWeapons={dbWeaponProfiles} />
                    )}
                </div>
            </div>
        </>
    );
}
