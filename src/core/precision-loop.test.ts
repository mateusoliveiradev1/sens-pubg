import { describe, expect, it } from 'vitest';

import {
    buildPrecisionCompatibilityKey,
    comparePrecisionCompatibility,
    formatPrecisionTrendLabel,
    PRECISION_ACTIONABLE_DEAD_ZONE_POINTS,
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

function trendFixture(input: {
    readonly id: string;
    readonly timestamp: string;
    readonly actionableScore: number;
    readonly mechanicalScore?: number;
    readonly control?: number;
    readonly consistency?: number;
    readonly confidence?: number;
    readonly clipQuality?: number;
    readonly coverage?: number;
    readonly sampleSize?: number;
}): AnalysisResult {
    const confidence = input.confidence ?? 86;
    const clipQuality = input.clipQuality ?? 82;
    const coverage = input.coverage ?? 0.88;
    const sampleSize = input.sampleSize ?? 30;

    return createAnalysisResultFixture({
        id: input.id,
        timestamp: new Date(input.timestamp),
        metrics: {
            sprayScore: input.actionableScore,
            consistencyScore: asScore(input.consistency ?? input.actionableScore),
        },
        mastery: {
            actionState: 'ready',
            actionLabel: 'Pronto',
            mechanicalLevel: 'advanced',
            mechanicalLevelLabel: 'Avancado',
            actionableScore: input.actionableScore,
            mechanicalScore: input.mechanicalScore ?? input.actionableScore,
            pillars: {
                control: input.control ?? input.actionableScore,
                consistency: input.consistency ?? input.actionableScore,
                confidence,
                clipQuality,
            },
            evidence: {
                coverage,
                confidence: confidence / 100,
                visibleFrames: 30,
                lostFrames: 2,
                framesProcessed: 32,
                sampleSize,
                qualityScore: clipQuality,
                usableForAnalysis: true,
            },
            reasons: ['Fixture com mastery para trend preciso.'],
            blockedRecommendations: [],
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
        expect(trend.compatibleCount).toBe(1);
        expect(trend.current?.resultId).toBe(analysisResultBase.id);
        expect(trend.actionableDelta).toBeNull();
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

    it('treats two compatible clips as initial signal only', () => {
        const prior = trendFixture({
            id: 'prior-baseline',
            timestamp: '2026-04-18T12:00:00.000Z',
            actionableScore: 70,
        });
        const current = trendFixture({
            id: 'current-initial',
            timestamp: '2026-04-19T12:00:00.000Z',
            actionableScore: 78,
        });

        const trend = resolvePrecisionTrend({
            current,
            history: [prior],
        });

        expect(trend.label).toBe('initial_signal');
        expect(trend.compatibleCount).toBe(2);
        expect(trend.actionableDelta?.delta).toBe(8);
        expect(trend.pillarDeltas).toHaveLength(4);
    });

    it('validates progress only with enough compatible evidence and no critical pillar deterioration', () => {
        const baseline = trendFixture({
            id: 'baseline-progress',
            timestamp: '2026-04-18T12:00:00.000Z',
            actionableScore: 62,
            control: 61,
        });
        const prior = trendFixture({
            id: 'prior-progress',
            timestamp: '2026-04-19T12:00:00.000Z',
            actionableScore: 70,
            control: 69,
        });
        const current = trendFixture({
            id: 'current-progress',
            timestamp: '2026-04-20T12:00:00.000Z',
            actionableScore: 80,
            control: 80,
        });

        const trend = resolvePrecisionTrend({
            current,
            history: [prior, baseline],
        });

        expect(trend.label).toBe('validated_progress');
        expect(trend.evidenceLevel).toBe('strong');
        expect(trend.baseline?.resultId).toBe('baseline-progress');
        expect(trend.actionableDelta).toEqual(expect.objectContaining({
            baseline: 62,
            current: 80,
            delta: 18,
        }));
        expect(trend.recurringDiagnoses[0]).toEqual(expect.objectContaining({
            type: 'underpull',
            count: 3,
        }));
    });

    it('validates regression with the same evidence bar as progress', () => {
        const baseline = trendFixture({
            id: 'baseline-regression',
            timestamp: '2026-04-18T12:00:00.000Z',
            actionableScore: 84,
        });
        const prior = trendFixture({
            id: 'prior-regression',
            timestamp: '2026-04-19T12:00:00.000Z',
            actionableScore: 80,
        });
        const current = trendFixture({
            id: 'current-regression',
            timestamp: '2026-04-20T12:00:00.000Z',
            actionableScore: 70,
        });

        const trend = resolvePrecisionTrend({
            current,
            history: [prior, baseline],
        });

        expect(trend.label).toBe('validated_regression');
        expect(trend.actionableDelta?.delta).toBe(-14);
        expect(trend.nextValidationHint).toContain('Regressao validada');
    });

    it('keeps small deltas inside oscillation dead zone', () => {
        const baseline = trendFixture({
            id: 'baseline-oscillation',
            timestamp: '2026-04-18T12:00:00.000Z',
            actionableScore: 72,
        });
        const prior = trendFixture({
            id: 'prior-oscillation',
            timestamp: '2026-04-19T12:00:00.000Z',
            actionableScore: 73,
        });
        const current = trendFixture({
            id: 'current-oscillation',
            timestamp: '2026-04-20T12:00:00.000Z',
            actionableScore: 72 + PRECISION_ACTIONABLE_DEAD_ZONE_POINTS - 1,
        });

        const trend = resolvePrecisionTrend({
            current,
            history: [baseline, prior],
        });

        expect(trend.label).toBe('oscillation');
        expect(trend.actionableDelta?.delta).toBe(3);
    });

    it('keeps strong positive deltas in validation when evidence is not strong enough', () => {
        const baseline = trendFixture({
            id: 'baseline-weak-evidence',
            timestamp: '2026-04-18T12:00:00.000Z',
            actionableScore: 60,
            confidence: 79,
            clipQuality: 72,
            coverage: 0.79,
        });
        const prior = trendFixture({
            id: 'prior-weak-evidence',
            timestamp: '2026-04-19T12:00:00.000Z',
            actionableScore: 68,
            confidence: 79,
            clipQuality: 72,
            coverage: 0.79,
        });
        const current = trendFixture({
            id: 'current-weak-evidence',
            timestamp: '2026-04-20T12:00:00.000Z',
            actionableScore: 82,
            confidence: 79,
            clipQuality: 72,
            coverage: 0.79,
        });

        const trend = resolvePrecisionTrend({
            current,
            history: [baseline, prior],
        });

        expect(trend.label).toBe('in_validation');
        expect(trend.evidenceLevel).toBe('weak');
        expect(trend.actionableDelta?.delta).toBe(22);
    });

    it('does not validate progress when confidence or clip quality deteriorates hard', () => {
        const baseline = trendFixture({
            id: 'baseline-critical-deterioration',
            timestamp: '2026-04-18T12:00:00.000Z',
            actionableScore: 62,
            confidence: 92,
            clipQuality: 92,
        });
        const prior = trendFixture({
            id: 'prior-critical-deterioration',
            timestamp: '2026-04-19T12:00:00.000Z',
            actionableScore: 70,
            confidence: 90,
            clipQuality: 90,
        });
        const current = trendFixture({
            id: 'current-critical-deterioration',
            timestamp: '2026-04-20T12:00:00.000Z',
            actionableScore: 84,
            confidence: 84,
            clipQuality: 84,
        });

        const trend = resolvePrecisionTrend({
            current,
            history: [baseline, prior],
        });

        expect(trend.label).toBe('oscillation');
        expect(trend.actionableDelta?.delta).toBe(22);
        expect(trend.pillarDeltas.filter((delta) => delta.status === 'declined').map((delta) => delta.pillar)).toEqual(expect.arrayContaining([
            'confidence',
            'clipQuality',
        ]));
    });
});
