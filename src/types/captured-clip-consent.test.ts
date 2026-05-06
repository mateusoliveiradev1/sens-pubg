import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    capturedClipConsentManifestSchema,
    parseCapturedClipConsentManifest,
} from './captured-clip-consent';
import { parseCapturedClipIntakeManifest } from './captured-clip-intake';

const consentPath = 'tests/fixtures/captured-clips/consent.todo.v1.json';
const intakePath = 'tests/fixtures/captured-clips/intake.v1.json';

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

const validRecord = {
    clipId: 'captured-clip1-2026-04-14',
    contributorRef: 'fixture-contributor-001',
    consentCapturedAt: '2026-04-14T18:40:00.000Z',
    consentStatus: 'label_review',
    allowedPurposes: ['internal_validation'],
    trainabilityAuthorized: false,
    rawClipStorage: 'private_only',
    derivativeScope: 'metadata_and_report',
    redistributionAllowed: false,
    reviewerRef: 'fixture-maintainer',
    reviewedAt: '2026-04-14T19:00:00.000Z',
    transitionReason: 'Fixture placeholder for internal validation only.',
} as const;

function manifestWith(record: unknown) {
    return {
        schemaVersion: 1,
        manifestId: 'test-consent',
        createdAt: '2026-04-14T19:00:00.000Z',
        clips: [record],
    };
}

describe('captured clip consent manifest schema', () => {
    it('loads the placeholder consent fixture for every captured intake clip', () => {
        const consent = parseCapturedClipConsentManifest(readJson(consentPath));
        const intake = parseCapturedClipIntakeManifest(readJson(intakePath));

        expect(consent.schemaVersion).toBe(1);
        expect(consent.clips.map((clip) => clip.clipId).sort()).toEqual(
            intake.clips.map((clip) => clip.clipId).sort()
        );
        expect(consent.clips.every((clip) => clip.redistributionAllowed === false)).toBe(true);
        expect(consent.clips.every((clip) => clip.consentStatus === 'label_review')).toBe(true);
    });

    it('rejects missing contributor, consent date, and status fields', () => {
        const result = capturedClipConsentManifestSchema.safeParse(manifestWith({
            ...validRecord,
            contributorRef: undefined,
            consentCapturedAt: undefined,
            consentStatus: undefined,
        }));

        expect(result.success).toBe(false);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.contributorRef')).toBe(true);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.consentCapturedAt')).toBe(true);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.consentStatus')).toBe(true);
    });

    it('requires commercial benchmark purpose and trainability for golden promotion', () => {
        const result = capturedClipConsentManifestSchema.safeParse(manifestWith({
            ...validRecord,
            consentStatus: 'golden_promoted',
            allowedPurposes: ['internal_validation'],
            trainabilityAuthorized: false,
        }));

        expect(result.success).toBe(false);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.allowedPurposes')).toBe(true);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.trainabilityAuthorized')).toBe(true);
    });

    it('requires quarantine and rebaseline when a clip is withdrawn', () => {
        const result = capturedClipConsentManifestSchema.safeParse(manifestWith({
            ...validRecord,
            consentStatus: 'withdrawn',
            withdrawal: {
                withdrawnAt: '2026-04-16T10:00:00.000Z',
                reason: 'Contributor withdrew corpus permission.',
                quarantineRequired: false,
                requiresRebaseline: false,
            },
        }));

        expect(result.success).toBe(false);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.withdrawal.quarantineRequired')).toBe(true);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.withdrawal.requiresRebaseline')).toBe(true);
    });

    it('rejects redistribution unless derivatives are explicitly scoped', () => {
        const result = capturedClipConsentManifestSchema.safeParse(manifestWith({
            ...validRecord,
            redistributionAllowed: true,
            derivativeScope: 'metadata_and_report',
        }));

        expect(result.success).toBe(false);
        expect(result.error.issues.some((issue) => issue.path.join('.') === 'clips.0.redistributionAllowed')).toBe(true);
    });
});
