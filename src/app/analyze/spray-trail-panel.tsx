'use client';

import React from 'react';
import type { ShotRecoilResidual, SprayTrajectory } from '@/types/engine';
import { EvidenceChip, type EvidenceTone } from '@/ui/components/evidence-chip';
import { SprayVisualization, type SprayVisualizationEvidenceState } from './spray-visualization';
import styles from './analysis.module.css';

export type SprayTrailEvidenceState = SprayVisualizationEvidenceState;

interface SprayTrailPanelProps {
    readonly trajectory: SprayTrajectory;
    readonly shotResiduals?: readonly ShotRecoilResidual[] | undefined;
    readonly confidence: number;
    readonly coverage: number;
    readonly framesLost: number;
    readonly framesProcessed: number;
    readonly blockerReasons?: readonly string[] | undefined;
    readonly actionLabel?: string | undefined;
    readonly className?: string | undefined;
}

interface ResolveSprayTrailEvidenceStateInput {
    readonly confidence: number;
    readonly coverage: number;
    readonly blockerCount: number;
    readonly actionLabel?: string | undefined;
}

function clampUnit(value: number): number {
    return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function formatPercent(value: number): string {
    return `${Math.round(clampUnit(value) * 100)}%`;
}

function formatCount(value: number): string {
    return String(Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));
}

export function resolveSprayTrailEvidenceState({
    confidence,
    coverage,
    blockerCount,
    actionLabel,
}: ResolveSprayTrailEvidenceStateInput): SprayTrailEvidenceState {
    if (actionLabel === 'Capturar de novo' || (blockerCount > 0 && (confidence < 0.55 || coverage < 0.55))) {
        return 'blocked';
    }

    if (actionLabel === 'Incerto') {
        return 'inconclusive';
    }

    if (confidence < 0.75 || coverage < 0.75 || blockerCount > 0) {
        return 'weak';
    }

    return 'normal';
}

function getEvidenceStateLabel(evidenceState: SprayTrailEvidenceState): string {
    switch (evidenceState) {
        case 'blocked':
            return 'Captura bloqueada';
        case 'inconclusive':
            return 'Leitura inconclusiva';
        case 'weak':
            return 'Evidencia fraca';
        case 'normal':
            return 'Evidencia util';
    }
}

function getEvidenceStateTone(evidenceState: SprayTrailEvidenceState): EvidenceTone {
    switch (evidenceState) {
        case 'blocked':
            return 'error';
        case 'inconclusive':
        case 'weak':
            return 'warning';
        case 'normal':
            return 'info';
    }
}

function getPathQualityLabel(
    trajectory: SprayTrajectory,
    shotResiduals: readonly ShotRecoilResidual[] | undefined,
    hasReferenceTrail: boolean
): string {
    if (hasReferenceTrail) {
        return `${shotResiduals?.length ?? 0} tiros com referencia`;
    }

    const measuredPoints = Math.max(
        trajectory.displacements.length,
        trajectory.points.length,
        trajectory.framesTracked
    );

    return `${measuredPoints} pontos reais`;
}

function buildTextSummary(input: {
    readonly evidenceState: SprayTrailEvidenceState;
    readonly confidence: number;
    readonly coverage: number;
    readonly framesLost: number;
    readonly framesProcessed: number;
    readonly blockerReasons: readonly string[];
    readonly hasReferenceTrail: boolean;
}): string {
    const blockerSummary = input.blockerReasons.length > 0
        ? `Bloqueadores: ${input.blockerReasons.join(', ')}.`
        : 'Sem bloqueadores visuais fortes.';
    const referenceSummary = input.hasReferenceTrail
        ? 'Referencia tecnica disponivel para comparacao.'
        : 'Referencia tecnica indisponivel para este contexto.';

    return [
        `${getEvidenceStateLabel(input.evidenceState)} no rastro do spray.`,
        `Confianca ${formatPercent(input.confidence)}, cobertura ${formatPercent(input.coverage)}.`,
        `${formatCount(input.framesLost)} de ${formatCount(input.framesProcessed)} frames perdidos.`,
        blockerSummary,
        referenceSummary,
    ].join(' ');
}

export function SprayTrailPanel({
    trajectory,
    shotResiduals,
    confidence,
    coverage,
    framesLost,
    framesProcessed,
    blockerReasons = [],
    actionLabel,
    className,
}: SprayTrailPanelProps): React.JSX.Element {
    const hasReferenceTrail = (shotResiduals?.length ?? 0) > 0;
    const evidenceState = resolveSprayTrailEvidenceState({
        confidence,
        coverage,
        blockerCount: blockerReasons.length,
        actionLabel,
    });
    const evidenceTone = getEvidenceStateTone(evidenceState);
    const pathQualityLabel = getPathQualityLabel(trajectory, shotResiduals, hasReferenceTrail);
    const summary = buildTextSummary({
        evidenceState,
        confidence,
        coverage,
        framesLost,
        framesProcessed,
        blockerReasons,
        hasReferenceTrail,
    });

    return (
        <section
            className={[styles.sprayTrailPanel, className].filter(Boolean).join(' ')}
            data-evidence-state={evidenceState}
            data-reference-state={hasReferenceTrail ? 'available' : 'unavailable'}
            data-spray-trail-panel
            aria-label="Prova visual do rastro do spray"
        >
            <div className={styles.sprayTrailHeader}>
                <div className={styles.sprayTrailIntro}>
                    <span className={styles.reportEyebrow}>Prova visual</span>
                    <h3>Rastro do spray</h3>
                    <p>
                        Caminho real medido, qualidade da evidencia e referencia tecnica quando ela existe.
                    </p>
                </div>
                <EvidenceChip
                    label={getEvidenceStateLabel(evidenceState)}
                    tone={evidenceTone}
                    value={pathQualityLabel}
                />
            </div>

            <p className={styles.sprayTrailSummary} data-spray-trail-summary>
                {summary}
            </p>

            <div className={styles.sprayTrailEvidence} aria-label="Qualidade do rastro">
                <EvidenceChip label="Confianca" tone={evidenceTone} value={formatPercent(confidence)} />
                <EvidenceChip label="Cobertura" tone={evidenceTone} value={formatPercent(coverage)} />
                <EvidenceChip label="Frames perdidos" tone={framesLost > 0 ? 'warning' : 'info'} value={`${formatCount(framesLost)}/${formatCount(framesProcessed)}`} />
                <EvidenceChip label="Bloqueadores" tone={blockerReasons.length > 0 ? 'warning' : 'info'} value={formatCount(blockerReasons.length)} />
            </div>

            <div className={styles.sprayTrailCanvas}>
                <SprayVisualization
                    evidenceState={evidenceState}
                    showIdeal={hasReferenceTrail}
                    shotResiduals={shotResiduals}
                    trajectory={trajectory}
                />
            </div>

            <div className={styles.sprayTrailLegend} aria-label="Legenda da trajetoria">
                <span><span className={`${styles.legendSwatch} ${styles.legendReal}`} />Rastro real</span>
                {hasReferenceTrail ? (
                    <span><span className={`${styles.legendSwatch} ${styles.legendIdeal}`} />Referencia tecnica</span>
                ) : (
                    <span data-reference-unavailable>Referencia tecnica indisponivel para este contexto</span>
                )}
                <span><span className={`${styles.legendSwatch} ${styles.legendTarget}`} />Centro / ancora inicial</span>
            </div>

            {blockerReasons.length > 0 ? (
                <ul className={styles.sprayTrailBlockers} aria-label="Bloqueadores do rastro">
                    {blockerReasons.slice(0, 4).map((reason) => (
                        <li key={reason}>{reason}</li>
                    ))}
                </ul>
            ) : null}
        </section>
    );
}
