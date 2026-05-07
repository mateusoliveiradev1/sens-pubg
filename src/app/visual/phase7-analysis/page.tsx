import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';

import { SprayTrailPanel } from '@/app/analyze/spray-trail-panel';
import { asMilliseconds, asPixels } from '@/types/branded';
import type { ShotRecoilResidual, SprayTrajectory } from '@/types/engine';

export const metadata = {
    title: 'Phase 7 Analysis Visual Matrix',
};

const pageStyle: CSSProperties = {
    minHeight: '100vh',
    padding: '32px',
    background: 'var(--color-bg-primary)',
};

const shellStyle: CSSProperties = {
    display: 'grid',
    gap: '24px',
    width: 'min(1180px, 100%)',
    margin: '0 auto',
};

const gridStyle: CSSProperties = {
    display: 'grid',
    gap: '24px',
};

const caseStyle: CSSProperties = {
    display: 'grid',
    gap: '12px',
};

const titleStyle: CSSProperties = {
    margin: 0,
    color: 'var(--color-text-primary)',
};

const bodyStyle: CSSProperties = {
    margin: 0,
    color: 'var(--color-text-secondary)',
};

const trajectory: SprayTrajectory = {
    points: [
        { frame: 0, timestamp: asMilliseconds(0), x: asPixels(320), y: asPixels(240), confidence: 0.91 },
        { frame: 1, timestamp: asMilliseconds(86), x: asPixels(322), y: asPixels(251), confidence: 0.87 },
        { frame: 2, timestamp: asMilliseconds(172), x: asPixels(321), y: asPixels(263), confidence: 0.84 },
    ],
    trackingFrames: [],
    displacements: [
        { dx: 0.34, dy: 0.92, timestamp: asMilliseconds(0), shotIndex: 0 },
        { dx: 0.12, dy: 1.08, timestamp: asMilliseconds(86), shotIndex: 1 },
        { dx: -0.2, dy: 0.96, timestamp: asMilliseconds(172), shotIndex: 2 },
        { dx: 0.28, dy: 1.14, timestamp: asMilliseconds(258), shotIndex: 3 },
        { dx: -0.12, dy: 1.02, timestamp: asMilliseconds(344), shotIndex: 4 },
    ],
    totalFrames: 42,
    durationMs: asMilliseconds(3612),
    shotAlignmentErrorMs: 18,
    weaponId: 'beryl-m762',
    trackingQuality: 0.88,
    framesTracked: 38,
    framesLost: 4,
    visibleFrames: 38,
    framesProcessed: 42,
    statusCounts: {
        tracked: 38,
        occluded: 0,
        lost: 4,
        uncertain: 0,
    },
};

const shotResiduals: readonly ShotRecoilResidual[] = [
    {
        shotIndex: 0,
        timestamp: asMilliseconds(0),
        observed: { yaw: 0.34, pitch: 0.92 },
        expected: { yaw: 0.12, pitch: 0.84 },
        residual: { yaw: 0.22, pitch: 0.08 },
        residualMagnitudeDegrees: 0.24,
    },
    {
        shotIndex: 1,
        timestamp: asMilliseconds(86),
        observed: { yaw: 0.12, pitch: 1.08 },
        expected: { yaw: 0.04, pitch: 0.9 },
        residual: { yaw: 0.08, pitch: 0.18 },
        residualMagnitudeDegrees: 0.2,
    },
    {
        shotIndex: 2,
        timestamp: asMilliseconds(172),
        observed: { yaw: -0.2, pitch: 0.96 },
        expected: { yaw: -0.04, pitch: 0.88 },
        residual: { yaw: -0.16, pitch: 0.08 },
        residualMagnitudeDegrees: 0.18,
    },
    {
        shotIndex: 3,
        timestamp: asMilliseconds(258),
        observed: { yaw: 0.28, pitch: 1.14 },
        expected: { yaw: 0.06, pitch: 0.92 },
        residual: { yaw: 0.22, pitch: 0.22 },
        residualMagnitudeDegrees: 0.31,
    },
];

export default function Phase7AnalysisVisualMatrixPage() {
    if (process.env.NODE_ENV === 'production') {
        notFound();
    }

    return (
        <main style={pageStyle}>
            <div style={shellStyle}>
                <header style={caseStyle}>
                    <p className="badge badge-info">Phase 7 visual verification</p>
                    <h1 style={titleStyle}>Analysis proof surface matrix</h1>
                    <p style={bodyStyle}>
                        Development-only matrix for normal, weak, inconclusive, and reference-unavailable spray trail states.
                    </p>
                </header>

                <section style={gridStyle} aria-label="Spray trail visual states">
                    <article data-spray-trail-case="normal" style={caseStyle}>
                        <h2 style={titleStyle}>Normal evidence with reference</h2>
                        <SprayTrailPanel
                            actionLabel="Pronto"
                            confidence={0.91}
                            coverage={0.9}
                            framesLost={2}
                            framesProcessed={42}
                            shotResiduals={shotResiduals}
                            trajectory={trajectory}
                        />
                    </article>

                    <article data-spray-trail-case="weak" style={caseStyle}>
                        <h2 style={titleStyle}>Weak evidence with blockers</h2>
                        <SprayTrailPanel
                            actionLabel="Capturar de novo"
                            blockerReasons={['reticulo pouco visivel', 'cobertura baixa']}
                            confidence={0.48}
                            coverage={0.51}
                            framesLost={18}
                            framesProcessed={42}
                            shotResiduals={shotResiduals}
                            trajectory={trajectory}
                        />
                    </article>

                    <article data-spray-trail-case="inconclusive" style={caseStyle}>
                        <h2 style={titleStyle}>Inconclusive evidence</h2>
                        <SprayTrailPanel
                            actionLabel="Incerto"
                            blockerReasons={['tracking instavel']}
                            confidence={0.67}
                            coverage={0.68}
                            framesLost={12}
                            framesProcessed={42}
                            shotResiduals={shotResiduals}
                            trajectory={trajectory}
                        />
                    </article>

                    <article data-spray-trail-case="reference-unavailable" style={caseStyle}>
                        <h2 style={titleStyle}>Reference unavailable</h2>
                        <SprayTrailPanel
                            actionLabel="Testavel"
                            confidence={0.82}
                            coverage={0.83}
                            framesLost={4}
                            framesProcessed={42}
                            trajectory={trajectory}
                        />
                    </article>
                </section>
            </div>
        </main>
    );
}
