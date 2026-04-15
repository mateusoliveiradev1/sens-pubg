import { describe, expect, it } from 'vitest';
import { formatAnalysisDistancePresentation } from './analysis-distance-presentation';

describe('formatAnalysisDistancePresentation', () => {
    it('formats estimated distances as approximate labels', () => {
        expect(
            formatAnalysisDistancePresentation({
                targetDistanceMeters: 60,
                distanceMode: 'estimated',
                distanceNote: 'Distancia aproximada informada pelo jogador.',
            })
        ).toEqual({
            badgeLabel: 'Distancia aprox. 60m',
            inlineLabel: 'aprox. 60m',
            note: 'Distancia aproximada informada pelo jogador.',
        });
    });

    it('formats unknown distances as neutral references instead of measured values', () => {
        expect(
            formatAnalysisDistancePresentation({
                targetDistanceMeters: 30,
                distanceMode: 'unknown',
                distanceNote: 'Distancia nao informada; usando referencia neutra.',
            })
        ).toEqual({
            badgeLabel: 'Distancia ref. 30m',
            inlineLabel: 'ref. 30m',
            note: 'Distancia nao informada; usando referencia neutra.',
        });
    });

    it('falls back to an exact-style label when no mode is provided', () => {
        expect(
            formatAnalysisDistancePresentation({
                targetDistanceMeters: 75,
            })
        ).toEqual({
            badgeLabel: 'Distancia 75m',
            inlineLabel: '75m',
        });
    });
});
