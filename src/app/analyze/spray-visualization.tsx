/**
 * Spray Visualization Component
 * Renders the player's spray trajectory compared to the ideal pattern.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import type { ShotRecoilResidual, SprayTrajectory } from '@/types/engine';
import type { TrackingReviewOverlayMarker } from '@/core/captured-frame-labeler-view';
import { buildSprayVisualizationPaths } from './spray-visualization-paths';

export type SprayVisualizationEvidenceState = 'normal' | 'weak' | 'inconclusive' | 'blocked';

interface Props {
    readonly trajectory: SprayTrajectory;
    readonly shotResiduals?: readonly ShotRecoilResidual[] | undefined;
    readonly width?: number;
    readonly height?: number;
    readonly showIdeal?: boolean;
    readonly trackingReviewOverlay?: readonly TrackingReviewOverlayMarker[] | undefined;
    readonly evidenceState?: SprayVisualizationEvidenceState;
}

function getRealPathPaint(evidenceState: SprayVisualizationEvidenceState): {
    readonly strokeStyle: string;
    readonly shadowColor: string;
    readonly shotFillStyle: string;
    readonly lineWidth: number;
} {
    if (evidenceState === 'blocked') {
        return {
            strokeStyle: 'rgba(255, 61, 61, 0.58)',
            shadowColor: 'rgba(255, 61, 61, 0.18)',
            shotFillStyle: 'rgba(255, 255, 255, 0.68)',
            lineWidth: 1.75,
        };
    }

    if (evidenceState === 'weak' || evidenceState === 'inconclusive') {
        return {
            strokeStyle: 'rgba(255, 193, 7, 0.62)',
            shadowColor: 'rgba(255, 193, 7, 0.2)',
            shotFillStyle: 'rgba(255, 255, 255, 0.72)',
            lineWidth: 1.75,
        };
    }

    return {
        strokeStyle: 'rgba(255, 107, 0, 1)',
        shadowColor: 'rgba(255, 107, 0, 0.5)',
        shotFillStyle: 'rgba(255, 255, 255, 1)',
        lineWidth: 2,
    };
}

function getTrackingReviewColor(marker: TrackingReviewOverlayMarker): string {
    if (marker.statusMatches === false) {
        return 'rgba(239, 68, 68, 0.95)';
    }

    switch (marker.status) {
        case 'tracked':
            return 'rgba(34, 197, 94, 0.95)';
        case 'uncertain':
            return 'rgba(245, 158, 11, 0.95)';
        case 'occluded':
            return 'rgba(168, 85, 247, 0.95)';
        case 'lost':
            return 'rgba(239, 68, 68, 0.95)';
    }
}

function scaleNormalizedPoint(
    normalizedX: number | undefined,
    normalizedY: number | undefined,
    width: number,
    height: number
): { readonly x: number; readonly y: number } | null {
    if (normalizedX === undefined || normalizedY === undefined) {
        return null;
    }

    return {
        x: normalizedX * width,
        y: normalizedY * height,
    };
}

export function SprayVisualization({
    trajectory,
    shotResiduals,
    width = 400,
    height = 400,
    showIdeal = true,
    trackingReviewOverlay,
    evidenceState = 'normal',
}: Props): React.JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Draw Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const x = (i / 10) * width;
            const y = (i / 10) * height;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }

        const centerX = width / 2;
        const centerY = height / 2;

        // Center Crosshair / Target
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Cross
        ctx.moveTo(centerX - 15, centerY); ctx.lineTo(centerX + 15, centerY);
        ctx.moveTo(centerX, centerY - 15); ctx.lineTo(centerX, centerY + 15);
        ctx.stroke();

        // Circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.stroke();

        const paths = buildSprayVisualizationPaths({
            trajectory,
            shotResiduals,
            width,
            height,
            showIdeal,
        });
        const realPathPaint = getRealPathPaint(evidenceState);

        if (showIdeal && paths.usesIdealPattern && paths.idealPoints.length > 1) {
            ctx.beginPath();
            ctx.moveTo(paths.idealPoints[0]!.x, paths.idealPoints[0]!.y);
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
            ctx.lineWidth = 1.5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.setLineDash([6, 4]);
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(0, 240, 255, 0.35)';
            for (const point of paths.idealPoints.slice(1)) {
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
        }

        // Draw Player Trajectory
        if (paths.realPoints.length > 1) {
            ctx.beginPath();
            ctx.moveTo(paths.realPoints[0]!.x, paths.realPoints[0]!.y);
            ctx.strokeStyle = realPathPaint.strokeStyle;
            ctx.lineWidth = realPathPaint.lineWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.shadowBlur = 10;
            ctx.shadowColor = realPathPaint.shadowColor;
            for (const point of paths.realPoints.slice(1)) {
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }

        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw Shots (Impact points with glow)
        paths.realPoints.slice(1).forEach((point) => {
            ctx.fillStyle = realPathPaint.shotFillStyle;
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#fff';

            ctx.beginPath();
            ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;

        if (trackingReviewOverlay && trackingReviewOverlay.length > 0) {
            ctx.font = '10px var(--font-mono)';
            ctx.textBaseline = 'middle';

            for (const marker of trackingReviewOverlay) {
                const observedPoint = scaleNormalizedPoint(marker.normalizedX, marker.normalizedY, width, height);
                const labelPoint = scaleNormalizedPoint(marker.labelNormalizedX, marker.labelNormalizedY, width, height);
                const drawPoint = labelPoint ?? observedPoint;

                if (observedPoint && labelPoint && marker.errorPx !== undefined) {
                    ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3, 3]);
                    ctx.beginPath();
                    ctx.moveTo(observedPoint.x, observedPoint.y);
                    ctx.lineTo(labelPoint.x, labelPoint.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                if (!drawPoint) {
                    continue;
                }

                ctx.fillStyle = getTrackingReviewColor(marker);
                ctx.shadowBlur = 8;
                ctx.shadowColor = getTrackingReviewColor(marker);
                ctx.beginPath();
                ctx.arc(drawPoint.x, drawPoint.y, marker.statusMatches === false ? 5 : 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                if (marker.errorPx !== undefined) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                    ctx.fillText(`${Math.round(marker.errorPx)}px`, drawPoint.x + 7, drawPoint.y - 7);
                }
            }
        }

    }, [trajectory, shotResiduals, width, height, showIdeal, trackingReviewOverlay, evidenceState]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            aria-hidden="true"
            data-evidence-state={evidenceState}
            data-spray-canvas
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
}
