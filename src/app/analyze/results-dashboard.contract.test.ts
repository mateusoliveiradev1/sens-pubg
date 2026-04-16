import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('results dashboard visualization contract', () => {
    it('passes angular recoil residuals into the spray visualization so the ideal trail can be drawn', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/shotResiduals=\{activeSession\.metrics\.shotResiduals\}/);
    });

    it('uses a human summary for sensitivity calibration instead of dumping raw reasoning telemetry', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/buildSensitivitySummary/);
        expect(source).not.toMatch(/\{sensitivity\.reasoning\}/);
    });

    it('shows coach verification context and attachment suggestions in the action plan', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/c\.verifyNextClip/);
        expect(source).toMatch(/c\.evidence\.recommendedAttachments/);
        expect(source).toMatch(/Plano do Coach/);
    });

    it('renders contextual profile callouts instead of only static profile descriptions', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/buildProfileNarrative/);
        expect(source).toMatch(/buildProfileHighlights/);
        expect(source).toMatch(/profileMiniScopes/);
    });

    it('renders video quality score and degradation reasons when present', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/activeSession\.videoQualityReport/);
        expect(source).toMatch(/Qualidade do clip/);
        expect(source).toMatch(/blockingReasons/);
    });

    it('renders technical tracking transparency for spray window, losses, and reacquisition', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/trackingOverview\.effectiveWindowMs/);
        expect(source).toMatch(/trackingOverview\.reacquisitionEvents/);
        expect(source).toMatch(/trackingOverview\.maxReacquisitionFrames/);
        expect(source).toMatch(/Leitura tecnica do tracking/);
    });
});
