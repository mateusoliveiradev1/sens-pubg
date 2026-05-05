import { describe, expect, it } from 'vitest';

import {
    buildPrecisionCompatibilityKey,
    formatPrecisionTrendLabel,
    resolvePrecisionTrend,
} from './precision-loop';
import { analysisResultBase } from './coach-test-fixtures';

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
});
