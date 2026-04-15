import { describe, expect, it } from 'vitest';
import type { CapturedBenchmarkPlan } from './captured-benchmark-plan';
import { buildCapturedCaptureSlotTemplate } from './captured-capture-slot-template';

const plan: CapturedBenchmarkPlan = {
    datasetId: 'captured-benchmark-draft',
    currentStarterGate: {
        passed: false,
        checks: [],
    },
    promotionActions: [],
    captureBlueprints: [
        {
            slotId: 'captured-slot-1',
            purpose: [
                'fechar gap de quantidade minima de clips capturados',
                'fechar gap de arma distinta',
                'fechar gap de diagnostico esperado',
            ],
            targetReviewStatus: 'reviewed',
            targetTrackingTier: 'clean',
            targetVisibilityTier: 'clean',
            targetOcclusionLevel: 'light',
            targetCompressionLevel: 'light',
            targetDistanceBucket: '0-30m',
            weaponPolicy: 'new-distinct-weapon',
            avoidWeaponIds: ['aug'],
            requiresExpectedDiagnosis: true,
            notes: 'Escolher uma arma diferente da atual.',
        },
        {
            slotId: 'captured-slot-2',
            purpose: ['fechar gap de quantidade minima de clips capturados'],
            targetReviewStatus: 'reviewed',
            targetTrackingTier: 'degraded',
            targetVisibilityTier: 'degraded',
            targetOcclusionLevel: 'moderate',
            targetCompressionLevel: 'medium',
            targetDistanceBucket: '101m+',
            weaponPolicy: 'any',
            avoidWeaponIds: [],
            requiresExpectedDiagnosis: false,
            notes: 'Cobrir um bucket ainda vazio de distancia/qualidade.',
        },
    ],
    projectedStarterGate: {
        passed: true,
        checks: [],
    },
};

describe('captured capture slot template', () => {
    it('creates machine-editable slot requests for the missing captured clips', () => {
        const template = buildCapturedCaptureSlotTemplate({
            requestSetId: 'captured-capture-slots-todo-2026-04-14',
            datasetId: plan.datasetId,
            createdAt: '2026-04-14T23:30:00.000Z',
            plan,
        });

        expect(template.datasetId).toBe('captured-benchmark-draft');
        expect(template.slots).toEqual([
            {
                slotId: 'captured-slot-1',
                purpose: [
                    'fechar gap de quantidade minima de clips capturados',
                    'fechar gap de arma distinta',
                    'fechar gap de diagnostico esperado',
                ],
                targetReviewStatus: 'reviewed',
                targetTrackingTier: 'clean',
                targetVisibilityTier: 'clean',
                targetOcclusionLevel: 'light',
                targetCompressionLevel: 'light',
                targetDistanceBucket: '0-30m',
                weaponPolicy: 'new-distinct-weapon',
                avoidWeaponIds: ['aug'],
                requiresExpectedDiagnosis: true,
                notes: 'Escolher uma arma diferente da atual.',
                intakeTemplate: {
                    clipId: 'captured-captured-slot-1',
                    videoPath: null,
                    contactPreviewPath: null,
                    centerPreviewPath: null,
                    sha256: null,
                },
            },
            {
                slotId: 'captured-slot-2',
                purpose: ['fechar gap de quantidade minima de clips capturados'],
                targetReviewStatus: 'reviewed',
                targetTrackingTier: 'degraded',
                targetVisibilityTier: 'degraded',
                targetOcclusionLevel: 'moderate',
                targetCompressionLevel: 'medium',
                targetDistanceBucket: '101m+',
                weaponPolicy: 'any',
                avoidWeaponIds: [],
                requiresExpectedDiagnosis: false,
                notes: 'Cobrir um bucket ainda vazio de distancia/qualidade.',
                intakeTemplate: {
                    clipId: 'captured-captured-slot-2',
                    videoPath: null,
                    contactPreviewPath: null,
                    centerPreviewPath: null,
                    sha256: null,
                },
            },
        ]);
    });
});
