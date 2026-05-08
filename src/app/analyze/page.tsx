/**
 * Analysis Page - Clip upload + weapon/scope selection + analysis progress.
 */

import { Header } from '@/ui/components/header';
import { AnalysisClient } from './analysis-client';
import { resolveSprayLabValidationTargetAction } from '@/actions/spray-lab';
import { getProfile } from '@/actions/profile';
import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/db';
import { isProfileReadyForAnalysis } from './analysis-profile';
import { formatSprayClipDurationLabel } from '@/core';
import { buildAnalysisValidationTarget, type AnalysisValidationTarget } from './analysis-validation-mode';

const clipDurationLabel = formatSprayClipDurationLabel('pt-BR');

export const metadata: Metadata = {
    title: 'Analisar Clip',
    description: `Envie um clip de spray de ${clipDurationLabel} e receba um diagnostico estruturado do seu spray.`,
};

type AnalyzeSearchParams = Record<string, string | string[] | undefined>;

function readSearchParam(params: AnalyzeSearchParams, key: string): string | undefined {
    const value = params[key];
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
}

async function resolveSearchParams(
    searchParams: Promise<AnalyzeSearchParams> | undefined,
): Promise<AnalyzeSearchParams> {
    return searchParams ? Promise.resolve(searchParams) : {};
}

async function resolveValidationTarget(
    params: AnalyzeSearchParams,
): Promise<{
    readonly target: AnalysisValidationTarget | null;
    readonly warning: string | null;
}> {
    if (readSearchParam(params, 'mode') !== 'validation') {
        return { target: null, warning: null };
    }

    const labSessionId = readSearchParam(params, 'labSessionId');
    const validationLinkId = readSearchParam(params, 'validationLinkId');
    const resolved = await resolveSprayLabValidationTargetAction({
        ...(labSessionId ? { labSessionId } : {}),
        ...(validationLinkId ? { validationLinkId } : {}),
    });

    return resolved.success
        ? { target: buildAnalysisValidationTarget(resolved.value), warning: null }
        : { target: null, warning: resolved.error };
}

export default async function AnalyzePage({
    searchParams,
}: {
    readonly searchParams?: Promise<AnalyzeSearchParams>;
}) {
    const params = await resolveSearchParams(searchParams);
    const validation = await resolveValidationTarget(params);
    const profileBundle = await getProfile();
    const profile = profileBundle?.profile ?? null;
    const profileReady = isProfileReadyForAnalysis(profile);
    const dbWeaponProfiles = profileReady
        ? await db.query.weaponProfiles.findMany({
            orderBy: (wp, { asc }) => [asc(wp.name)],
        })
        : [];

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

                    {!profileReady ? (
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
                        <AnalysisClient
                            dbWeapons={dbWeaponProfiles}
                            profile={profile}
                            validationTarget={validation.target}
                            validationWarning={validation.warning}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
