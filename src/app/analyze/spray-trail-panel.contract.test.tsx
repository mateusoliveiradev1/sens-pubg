import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { asMilliseconds, asPixels } from '@/types/branded';
import type { ShotRecoilResidual, SprayTrajectory } from '@/types/engine';

import { resolveSprayTrailEvidenceState, SprayTrailPanel } from './spray-trail-panel';

const trajectory: SprayTrajectory = {
    points: [
        { frame: 0, timestamp: asMilliseconds(0), x: asPixels(320), y: asPixels(240), confidence: 0.9 },
        { frame: 1, timestamp: asMilliseconds(86), x: asPixels(322), y: asPixels(250), confidence: 0.86 },
    ],
    trackingFrames: [],
    displacements: [
        { dx: 0.4, dy: 1.2, timestamp: asMilliseconds(0), shotIndex: 0 },
        { dx: -0.1, dy: 0.9, timestamp: asMilliseconds(86), shotIndex: 1 },
    ],
    totalFrames: 32,
    durationMs: asMilliseconds(2752),
    shotAlignmentErrorMs: 18,
    weaponId: 'beryl-m762',
    trackingQuality: 0.86,
    framesTracked: 28,
    framesLost: 4,
    visibleFrames: 28,
    framesProcessed: 32,
    statusCounts: {
        tracked: 28,
        occluded: 0,
        lost: 4,
        uncertain: 0,
    },
};

const shotResiduals: readonly ShotRecoilResidual[] = [
    {
        shotIndex: 0,
        timestamp: asMilliseconds(0),
        observed: { yaw: 0.4, pitch: 1.2 },
        expected: { yaw: 0.2, pitch: 0.9 },
        residual: { yaw: 0.2, pitch: 0.3 },
        residualMagnitudeDegrees: 0.36,
    },
];

describe('SprayTrailPanel contract', () => {
    it('renders the rastro proof surface with semantic evidence and accessible summary', () => {
        const html = renderToStaticMarkup(
            <SprayTrailPanel
                actionLabel="Pronto"
                confidence={0.88}
                coverage={0.91}
                framesLost={2}
                framesProcessed={32}
                shotResiduals={shotResiduals}
                trajectory={trajectory}
            />
        );

        expect(html).toContain('data-spray-trail-panel="true"');
        expect(html).toContain('data-reference-state="available"');
        expect(html).toContain('Rastro do spray');
        expect(html).toContain('Rastro real');
        expect(html).toContain('Referencia tecnica');
        expect(html).toContain('Centro / ancora inicial');
        expect(html).toContain('Confianca');
        expect(html).toContain('Cobertura');
        expect(html).toContain('Frames perdidos');
        expect(html).toContain('Bloqueadores');
        expect(html).toContain('data-spray-trail-summary="true"');
    });

    it('does not imply or draw a fake reference trail when residual data is unavailable', () => {
        const html = renderToStaticMarkup(
            <SprayTrailPanel
                actionLabel="Testavel"
                confidence={0.82}
                coverage={0.84}
                framesLost={3}
                framesProcessed={32}
                trajectory={trajectory}
            />
        );

        expect(html).toContain('data-reference-state="unavailable"');
        expect(html).toContain('Referencia tecnica indisponivel para este contexto');
        expect(html).not.toContain('tiros com referencia');
    });

    it('surfaces weak and inconclusive blockers with subdued warning states', () => {
        const weakHtml = renderToStaticMarkup(
            <SprayTrailPanel
                actionLabel="Capturar de novo"
                blockerReasons={['reticulo pouco visivel', 'cobertura baixa']}
                confidence={0.48}
                coverage={0.51}
                framesLost={16}
                framesProcessed={32}
                shotResiduals={shotResiduals}
                trajectory={trajectory}
            />
        );
        const inconclusiveHtml = renderToStaticMarkup(
            <SprayTrailPanel
                actionLabel="Incerto"
                blockerReasons={['tracking instavel']}
                confidence={0.69}
                coverage={0.7}
                framesLost={9}
                framesProcessed={32}
                shotResiduals={shotResiduals}
                trajectory={trajectory}
            />
        );

        expect(weakHtml).toContain('data-evidence-state="blocked"');
        expect(weakHtml).toContain('Captura bloqueada');
        expect(weakHtml).toContain('reticulo pouco visivel');
        expect(weakHtml).toContain('cobertura baixa');

        expect(inconclusiveHtml).toContain('data-evidence-state="inconclusive"');
        expect(inconclusiveHtml).toContain('Leitura inconclusiva');
        expect(inconclusiveHtml).toContain('tracking instavel');
    });

    it('derives the evidence state from confidence, coverage, blockers, and verdict', () => {
        expect(resolveSprayTrailEvidenceState({
            actionLabel: 'Pronto',
            blockerCount: 0,
            confidence: 0.9,
            coverage: 0.92,
        })).toBe('normal');
        expect(resolveSprayTrailEvidenceState({
            actionLabel: 'Testavel',
            blockerCount: 1,
            confidence: 0.82,
            coverage: 0.8,
        })).toBe('weak');
        expect(resolveSprayTrailEvidenceState({
            actionLabel: 'Incerto',
            blockerCount: 1,
            confidence: 0.7,
            coverage: 0.7,
        })).toBe('inconclusive');
        expect(resolveSprayTrailEvidenceState({
            actionLabel: 'Capturar de novo',
            blockerCount: 2,
            confidence: 0.4,
            coverage: 0.5,
        })).toBe('blocked');
    });
});
