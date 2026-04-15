import { describe, expect, it } from 'vitest';
import {
    MAX_SPRAY_CLIP_DURATION_SECONDS,
    MIN_SPRAY_CLIP_DURATION_SECONDS,
    formatSprayClipDurationLabel,
    formatSprayClipDurationRange,
    isSupportedSprayClipDuration,
} from './video-ingestion-contract';

describe('video ingestion contract', () => {
    it('defines a single supported spray clip duration range for product and validation', () => {
        expect(MIN_SPRAY_CLIP_DURATION_SECONDS).toBe(5);
        expect(MAX_SPRAY_CLIP_DURATION_SECONDS).toBe(15);
        expect(isSupportedSprayClipDuration(4.89)).toBe(false);
        expect(isSupportedSprayClipDuration(4.96)).toBe(true);
        expect(isSupportedSprayClipDuration(5)).toBe(true);
        expect(isSupportedSprayClipDuration(5.04)).toBe(true);
        expect(isSupportedSprayClipDuration(15)).toBe(true);
        expect(isSupportedSprayClipDuration(15.08)).toBe(true);
        expect(isSupportedSprayClipDuration(15.29)).toBe(true);
        expect(isSupportedSprayClipDuration(15.36)).toBe(false);
    });

    it('formats the same duration range for user-facing copy across supported locales', () => {
        expect(formatSprayClipDurationRange('pt-BR')).toBe('5-15');
        expect(formatSprayClipDurationRange('pt-BR', 'natural')).toBe('5 a 15');
        expect(formatSprayClipDurationLabel('pt-BR')).toBe('5-15 segundos');
        expect(formatSprayClipDurationLabel('en')).toBe('5-15 seconds');
        expect(formatSprayClipDurationLabel('es', 'natural')).toBe('5 a 15 segundos');
    });
});
