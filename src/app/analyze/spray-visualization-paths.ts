import type { ShotRecoilResidual, SprayTrajectory } from '@/types/engine';

export interface SprayVisualizationDelta {
    readonly dx: number;
    readonly dy: number;
}

export interface SprayVisualizationPoint {
    readonly x: number;
    readonly y: number;
}

export interface SprayVisualizationDeltaSet {
    readonly realDeltas: readonly SprayVisualizationDelta[];
    readonly idealDeltas: readonly SprayVisualizationDelta[];
}

export interface BuildSprayVisualizationPathsInput {
    readonly trajectory: SprayTrajectory;
    readonly shotResiduals?: readonly ShotRecoilResidual[] | undefined;
    readonly width: number;
    readonly height: number;
    readonly padding?: number;
    readonly showIdeal?: boolean;
}

export interface SprayVisualizationPathSet {
    readonly realPoints: readonly SprayVisualizationPoint[];
    readonly idealPoints: readonly SprayVisualizationPoint[];
    readonly usesIdealPattern: boolean;
}

function accumulateSprayDeltas(
    deltas: readonly SprayVisualizationDelta[]
): readonly SprayVisualizationPoint[] {
    let currentX = 0;
    let currentY = 0;
    const points: SprayVisualizationPoint[] = [{ x: 0, y: 0 }];

    for (const delta of deltas) {
        currentX += delta.dx;
        currentY += delta.dy;
        points.push({ x: currentX, y: currentY });
    }

    return points;
}

function projectSprayPoints(
    points: readonly SprayVisualizationPoint[],
    width: number,
    height: number,
    scale: number
): readonly SprayVisualizationPoint[] {
    const centerX = width / 2;
    const centerY = height / 2;

    return points.map((point) => ({
        x: centerX + point.x * scale,
        y: centerY + point.y * scale,
    }));
}

export function resolveSprayVisualizationDeltas(
    trajectory: SprayTrajectory,
    shotResiduals?: readonly ShotRecoilResidual[] | undefined,
    showIdeal: boolean = true
): SprayVisualizationDeltaSet {
    if (shotResiduals && shotResiduals.length > 0) {
        return {
            realDeltas: shotResiduals.map((shot) => ({
                dx: shot.observed.yaw,
                dy: shot.observed.pitch,
            })),
            idealDeltas: showIdeal
                ? shotResiduals.map((shot) => ({
                    dx: shot.expected.yaw,
                    dy: shot.expected.pitch,
                }))
                : [],
        };
    }

    return {
        realDeltas: trajectory.displacements.map((displacement) => ({
            dx: displacement.dx,
            dy: displacement.dy,
        })),
        idealDeltas: [],
    };
}

export function buildSprayVisualizationPaths(
    input: BuildSprayVisualizationPathsInput
): SprayVisualizationPathSet {
    const { realDeltas, idealDeltas } = resolveSprayVisualizationDeltas(
        input.trajectory,
        input.shotResiduals,
        input.showIdeal ?? true
    );

    const rawRealPoints = accumulateSprayDeltas(realDeltas);
    const rawIdealPoints = accumulateSprayDeltas(idealDeltas);
    const allPoints = [...rawRealPoints, ...rawIdealPoints];
    const maxAbsX = Math.max(1, ...allPoints.map((point) => Math.abs(point.x)));
    const maxAbsY = Math.max(1, ...allPoints.map((point) => Math.abs(point.y)));
    const padding = input.padding ?? 24;
    const halfWidth = Math.max(1, (input.width / 2) - padding);
    const halfHeight = Math.max(1, (input.height / 2) - padding);
    const scale = Math.min(halfWidth / maxAbsX, halfHeight / maxAbsY);

    return {
        realPoints: projectSprayPoints(rawRealPoints, input.width, input.height, scale),
        idealPoints: projectSprayPoints(rawIdealPoints, input.width, input.height, scale),
        usesIdealPattern: idealDeltas.length > 0,
    };
}
