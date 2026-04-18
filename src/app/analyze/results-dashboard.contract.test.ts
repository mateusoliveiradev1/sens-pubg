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
        expect(source).toMatch(/buildSensitivityDecisionInsight/);
        expect(source).not.toMatch(/\{sensitivity\.reasoning\}/);
        expect(source).toMatch(/sensitivity\.tier/);
        expect(source).toMatch(/sensitivity\.evidenceTier/);
        expect(source).toMatch(/sensitivity\.confidenceScore/);
        expect(source).toMatch(/sensitivity\.historyConvergence/);
        expect(source).toMatch(/sensitivity\.acceptanceFeedback/);
        expect(source).toMatch(/selectedProfile = \(\s*sensitivity\.profiles\.find/);
    });

    it('shows coach verification context and attachment suggestions in the action plan', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/c\.verifyNextClip/);
        expect(source).toMatch(/c\.evidence\.recommendedAttachments/);
        expect(source).toMatch(/Plano do Coach/);
    });

    it('renders the coachPlan session verdict, primary focus, and next block before detailed cards', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/const coachPlan = activeSession\.coachPlan/);
        expect(source).toMatch(/formatCoachDecisionTierLabel\(coachPlan\.tier\)/);
        expect(source).toMatch(/coachPlan\.sessionSummary/);
        expect(source).toMatch(/coachPlan\.primaryFocus\.title/);
        expect(source).toMatch(/coachPlan\.nextBlock\.title/);
        expect(source).toMatch(/coachPlan\.nextBlock\.steps\.slice\(0, 3\)/);
        expect(source).toMatch(/Veredito da sessao/);
        expect(source).toMatch(/Foco principal/);
        expect(source).toMatch(/Proximo bloco/);
    });

    it('keeps the legacy coach cards as detailed evidence below the session summary', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/Evidencia detalhada do Coach/);
        expect(source).toMatch(/groupedCoaching\.map/);
        expect(source).toMatch(/c\.whatIsWrong/);
        expect(source).toMatch(/c\.howToTest/);
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

    it('renders a tracking timeline with tracked and degraded windows instead of only aggregate counters', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/createTrackingTimeline/);
        expect(source).toMatch(/trackingTimeline\.segments\.map/);
        expect(source).toMatch(/Linha do tracking/);
        expect(source).toMatch(/Janelas rastreadas/);
    });

    it('renders the enriched video quality diagnostic with preprocessing evidence', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/videoQualityDiagnostic/);
        expect(source).toMatch(/preprocessing\.normalizationApplied/);
        expect(source).toMatch(/recommendations\.map/);
        expect(source).toMatch(/Laudo automatico/);
    });

    it('renders frame-by-frame quality evidence and degraded segments in the dashboard', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/videoQualityTimeline/);
        expect(source).toMatch(/timeline\.summary\.lostFrames/);
        expect(source).toMatch(/degradedSegments\.map/);
        expect(source).toMatch(/Evidencia frame-a-frame/);
    });
});
