/**
 * Analysis Page — Clip upload + weapon/scope selection + analysis progress.
 */

import { Header } from '@/ui/components/header';
import { AnalysisClient } from './analysis-client';
import { getProfile } from '@/actions/profile';
import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/db';
import { weaponProfiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const metadata: Metadata = {
    title: 'Analisar Clip',
    description: 'Envie um clip de spray de 5-15 segundos e receba diagnóstico completo com IA.',
};

export default async function AnalyzePage() {
    const profile = await getProfile();
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
                        Envie um clip de spray de 5-15 segundos. A IA vai extrair os frames,
                        rastrear sua mira e calcular todas as métricas em tempo real.
                    </p>

                    {!profile || !profile.fov ? (
                        <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--space-4xl) var(--space-xl)' }}>
                            <div style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>⚠️</div>
                            <h2 style={{ marginBottom: 'var(--space-md)' }}>Configuração de Setup Requerida</h2>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)', maxWidth: 500, margin: '0 auto var(--space-xl)' }}>
                                Para que a Inteligência Artificial calcule sua sensibilidade exata,
                                precisamos conhecer sua resolução, FOV e DPI atual.
                            </p>
                            <Link href="/setup" className="btn btn-primary btn-lg">
                                Iniciar Assistente de Setup
                            </Link>
                        </div>
                    ) : (
                        <AnalysisClient profile={profile as any} dbWeapons={dbWeaponProfiles} />
                    )}
                </div>
            </div>
        </>
    );
}
