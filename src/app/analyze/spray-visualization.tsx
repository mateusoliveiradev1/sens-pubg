/**
 * Spray Visualization Component
 * Renders the player's spray trajectory compared to the ideal pattern.
 */

'use client';

import { useEffect, useRef } from 'react';
import type { SprayTrajectory } from '@/types/engine';

interface Props {
    readonly trajectory: SprayTrajectory;
    readonly width?: number;
    readonly height?: number;
    readonly showIdeal?: boolean;
}

export function SprayVisualization({
    trajectory,
    width = 400,
    height = 400,
    showIdeal = true
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

        let currentX = centerX;
        let currentY = centerY;

        // Draw Player Trajectory
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.strokeStyle = 'rgba(255, 107, 0, 1)';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const scale = 8; // Scale pixels for visibility (increased for better detail)

        // Shadow/Glow for trajectory
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(255, 107, 0, 0.5)';

        trajectory.displacements.forEach((d) => {
            currentX += d.dx * scale;
            currentY += d.dy * scale;
            ctx.lineTo(currentX, currentY);
        });
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw Shots (Impact points with glow)
        currentX = centerX;
        currentY = centerY;
        trajectory.displacements.forEach((d) => {
            currentX += d.dx * scale;
            currentY += d.dy * scale;

            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#fff';

            ctx.beginPath();
            ctx.arc(currentX, currentY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;

    }, [trajectory, width, height, showIdeal]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
}
