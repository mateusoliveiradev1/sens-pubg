import { describe, expect, it } from 'vitest';

import {
    buildPrecisionCompatibilityKey,
    comparePrecisionCompatibility,
    formatPrecisionTrendLabel,
    resolvePrecisionTrend,
    STRICT_DISTANCE_TOLERANCE_METERS,
} from './precision-loop';
import {
    analysisResultBase,
    analysisResultWithWeakCapture,
    createAnalysisResultFixture,
} from './coach-test-fixtures';
import { asMilliseconds, asScore } from '../types/branded';
import type { AnalysisResult, PrecisionCompatibilityBlockerCode } from '../types/engine';

function blockerCodes(result: ReturnType<typeof comparePrecisionCompatibility>): readonly PrecisionCompatibilityBlockerCode[] {
    return result.blockers.map((blocker) => blocker.code);
}

function expectReadableBlockers(result: ReturnType<typeof comparePrecisionCompatibility>): void {
    expect(result.compatible).toBe(false);
    expect(result.blockers.length).toBeGreaterThan(0);
    expect(result.blockers.every((blocker) => blocker.message.length > 12)).toBe(true);
}

function withSprayWindow(overrides: Partial<{
    readonly startMs: number;
    readonly endMs: number;
    readonly shotLikeEvents: number;
    readonly durationMs: number;
}> = {}): AnalysisResult {
    const startMs = overrides.startMs ?? 120;
    const endMs = overrides.endMs ?? 2800;
    const shotLikeEvents = overrides.shotLikeEvents ?? 30;

    return createAnalysisResultFixture({
        trajectory: {
            durationMs: asMilliseconds(overrides.durationMs ?? endMs),
        },
        videoQualityReport: {
            diagnostic: {
                preprocessing: {
                    sprayWindow: {
                        startMs: asMilliseconds(startMs),
                        endMs: asMilliseconds(endMs),
                        confidence: 0.9,
                        shotLikeEvents,
                        rejectedLeadingMs: asMilliseconds(80),
                        rejectedTrailingMs: asMilliseconds(100),
                    },
                },
            },
        },
    });
}

describe('precision loop contract', () => {
    it('builds a strict compatibility key from analysis metadata', () => {
        const result = buildPrecisionCompatibilityKey(analysisResultBase);

        expect(result.compatible).toBe(true);
        expect(result.key).toEqual(expect.objectContaining({
            patchVersion: '41.1',
            weaponId: 'beryl-m762',
            scopeId: 'red-dot',
            opticStateId: '1x',
            stance: 'standing',
            muzzle: 'compensator',
            grip: 'vertical',
            stock: 'none',
            distanceMeters: 30,
        }));
    });

    it('exposes conservative label formatting for downstream UI', () => {
        expect(formatPrecisionTrendLabel('baseline')).toBe('Baseline');
        expect(formatPrecisionTrendLabel('initial_signal')).toBe('Sinal inicial');
        expect(formatPrecisionTrendLabel('validated_progress')).toBe('Progresso validado');
        expect(formatPrecisionTrendLabel('validated_regression')).toBe('Regressao validada');
        expect(formatPrecisionTrendLabel('not_comparable')).toBe('Nao comparavel');
    });

    it('creates a baseline summary for the first comparable clip', () => {
        const trend = resolvePrecisionTrend({
            current: analysisResultBase,
            history: [],
        });

        expect(trend.label).toBe('baseline');
        expect(trend.evidenceLevel).toBe('baseline');
    });

    it('blocks patch, weapon, scope, optic state, and loadout mismatches', () => {
        const candidate = createAnalysisResultFixture({
            patchVersion: '42.1',
            trajectory: { weaponId: 'ace32' },
            analysisContext: {
                optic: {
                    scopeId: 'holographic',
                    opticId: 'holographic',
                    opticStateId: '1x-alt',
                    opticName: 'Holographic Sight',
                    opticStateName: '1x alt',
                    availableStateIds: ['1x-alt'],
                    isDynamicOptic: false,
                },
            },
            loadout: {
                stance: 'crouching',
                muzzle: 'flash_hider',
                grip: 'angled',
                stock: 'tactical',
            },
        });

        const result = comparePrecisionCompatibility(analysisResultBase, candidate);

        expectReadableBlockers(result);
        expect(blockerCodes(result)).toEqual(expect.arrayContaining([
            'patch_mismatch',
            'weapon_mismatch',
            'scope_mismatch',
            'optic_state_mismatch',
            'stance_mismatch',
            'muzzle_mismatch',
            'grip_mismatch',
            'stock_mismatch',
        ]));
    });

    it('uses a strict distance tolerance and blocks missing or ambiguous distance', () => {
        const outOfTolerance = createAnalysisResultFixture({
            analysisContext: {
                targetDistanceMeters: analysisResultBase.analysisContext!.targetDistanceMeters + STRICT_DISTANCE_TOLERANCE_METERS + 1,
            },
            metrics: {
                targetDistanceMeters: analysisResultBase.metrics.targetDistanceMeters + STRICT_DISTANCE_TOLERANCE_METERS + 1,
            },
        });
        const missingDistance = createAnalysisResultFixture({
            analysisContext: {
                targetDistanceMeters: Number.NaN,
            },
        });
        const ambiguousDistance = createAnalysisResultFixture({
            analysisContext: {
                distanceMode: 'estimated',
            },
        });

        expect(STRICT_DISTANCE_TOLERANCE_METERS).toBeLessThan(10);
        expect(blockerCodes(comparePrecisionCompatibility(analysisResultBase, outOfTolerance))).toContain('distance_out_of_tolerance');
        expect(blockerCodes(comparePrecisionCompatibility(analysisResultBase, missingDistance))).toContain('distance_missing');
        expect(blockerCodes(comparePrecisionCompatibility(analysisResultBase, ambiguousDistance))).toContain('distance_ambiguous');
    });

    it('blocks missing metadata before precise trend comparison', () => {
        const missingMetadata = createAnalysisResultFixture({
            patchVersion: '',
            loadout: {
                stance: undefined,
                muzzle: undefined,
                grip: undefined,
                stock: undefined,
            } as never,
        });

        const result = buildPrecisionCompatibilityKey(missingMetadata);

        expect(result.compatible).toBe(false);
        expect(result.blockers.map((blocker) => blocker.code)).toEqual(expect.arrayContaining([
            'missing_metadata',
        ]));
    });

    it('blocks unusable, weak, or incomparable capture quality', () => {
        const weakQuality = createAnalysisResultFixture({
            videoQualityReport: {
                overallScore: asScore(61),
                usableForAnalysis: true,
                blockingReasons: [],
            },
        });
        const qualityFloor = createAnalysisResultFixture({
            videoQualityReport: {
                overallScore: asScore(75),
                usableForAnalysis: true,
                blockingReasons: [],
            },
        });
        const incomparableQuality = createAnalysisResultFixture({
            videoQualityReport: {
                overallScore: asScore(100),
                usableForAnalysis: true,
                blockingReasons: [],
            },
        });

        expect(blockerCodes(comparePrecisionCompatibility(analysisResultBase, analysisResultWithWeakCapture))).toEqual(expect.arrayContaining([
            'capture_quality_unusable',
            'capture_quality_weak',
        ]));
        expect(blockerCodes(comparePrecisionCompatibility(analysisResultBase, weakQuality))).toContain('capture_quality_weak');
        expect(blockerCodes(comparePrecisionCompatibility(qualityFloor, incomparableQuality))).toContain('capture_quality_mismatch');
    });

    it('blocks spray protocol, duration, and cadence mismatches', () => {
        const current = withSprayWindow();
        const missingWindow = analysisResultBase;
        const mismatchedWindow = withSprayWindow({
            startMs: 900,
            endMs: 4100,
            durationMs: 4100,
            shotLikeEvents: 24,
        });

        expect(blockerCodes(comparePrecisionCompatibility(current, missingWindow))).toContain('spray_type_missing');
        expect(blockerCodes(comparePrecisionCompatibility(current, mismatchedWindow))).toEqual(expect.arrayContaining([
            'spray_window_mismatch',
            'duration_mismatch',
            'cadence_mismatch',
        ]));
    });

    it('blocks strong sensitivity changes as a new precision line', () => {
        const changedSensitivity = createAnalysisResultFixture({
            sensitivity: {
                recommended: 'high',
            },
        });

        expect(blockerCodes(comparePrecisionCompatibility(analysisResultBase, changedSensitivity))).toContain('sensitivity_change');
    });

    it('returns incompatible history as blocked clips without trend math', () => {
        const incompatiblePrior = createAnalysisResultFixture({
            id: 'prior-patch-mismatch',
            patchVersion: '42.1',
        });

        const trend = resolvePrecisionTrend({
            current: analysisResultBase,
            history: [incompatiblePrior],
        });

        expect(trend.label).toBe('baseline');
        expect(trend.actionableDelta).toBeNull();
        expect(trend.blockedClips).toHaveLength(1);
        expect(trend.blockerSummaries.map((summary) => summary.code)).toContain('patch_mismatch');
    });
});
