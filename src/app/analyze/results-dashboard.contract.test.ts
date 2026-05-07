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
        expect(source).toMatch(/coachEvidence\.recommendedAttachments/);
        expect(source).toMatch(/Evidencia legada/);
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

    it('renders a verdict-first mastery report before the detailed audit sections', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/buildResultVerdictModel/);
        expect(source).toMatch(/activeSession\.mastery/);
        expect(source).toMatch(/verdictModel\.actionLabel/);
        expect(source).toMatch(/verdictModel\.actionableScore/);
        expect(source).toMatch(/verdictModel\.mechanicalLevelLabel/);
        expect(source).toMatch(/Leitura de mastery/);

        const verdictIndex = source.indexOf('styles.verdictReport');
        const trackingIndex = source.indexOf('Leitura tecnica do tracking');
        const metricsIndex = source.indexOf('Métricas');

        expect(verdictIndex).toBeGreaterThan(-1);
        expect(trackingIndex).toBeGreaterThan(verdictIndex);
        expect(metricsIndex).toBeGreaterThan(verdictIndex);
    });

    it('renders the precision trend block after verdict and before technical details', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/buildPrecisionTrendBlockModel/);
        expect(source).toMatch(/buildAdaptiveCoachLoopModel/);
        expect(source).toMatch(/activeSession\.precisionTrend/);
        expect(source).toMatch(/styles\.adaptiveCoachLoop/);
        expect(source).toMatch(/styles\.precisionTrendBlock/);
        expect(source).toMatch(/precisionTrendBlock\.ctaLabel/);
        expect(source).toMatch(/precisionTrendBlock\.blockerReasons/);

        const verdictIndex = source.indexOf('styles.verdictReport');
        const coachLoopIndex = source.indexOf('styles.adaptiveCoachLoop');
        const trendIndex = source.indexOf('styles.precisionTrendBlock');
        const videoQualityIndex = source.indexOf('Qualidade do clip', trendIndex);
        const trackingIndex = source.indexOf('Leitura tecnica do tracking', trendIndex);

        expect(verdictIndex).toBeGreaterThan(-1);
        expect(coachLoopIndex).toBeGreaterThan(verdictIndex);
        expect(trendIndex).toBeGreaterThan(coachLoopIndex);
        expect(trendIndex).toBeGreaterThan(verdictIndex);
        expect(videoQualityIndex).toBeGreaterThan(trendIndex);
        expect(trackingIndex).toBeGreaterThan(trendIndex);
    });

    it('renders the adaptive coach loop CTA states without history audit noise', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');
        const viewModelSource = readFileSync(new URL('./results-dashboard-view-model.ts', import.meta.url), 'utf8');

        expect(source).toMatch(/adaptiveCoachLoop\.primaryFocus\.title/);
        expect(source).toMatch(/adaptiveCoachLoop\.secondaryFocuses/);
        expect(source).toMatch(/adaptiveCoachLoop\.nextBlock\.title/);
        expect(source).toMatch(/adaptiveCoachLoop\.badges/);
        expect(source).toMatch(/adaptiveCoachLoop\.cta\.label/);
        expect(viewModelSource).toMatch(/Gravar analise para registrar resultado/);
        expect(viewModelSource).toMatch(/Registrar resultado do bloco/);
        expect(viewModelSource).toMatch(/Gravar validacao compativel/);

        const coachLoopIndex = source.indexOf('styles.adaptiveCoachLoop');
        const revisionIndex = source.indexOf('revision', coachLoopIndex);

        expect(coachLoopIndex).toBeGreaterThan(-1);
        expect(revisionIndex).toBe(-1);
    });

    it('shows the next block, evidence badges, mastery pillars, and spray proof in the report', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/buildEvidenceBadges/);
        expect(source).toMatch(/buildMasteryPillarCards/);
        expect(source).toMatch(/verdictModel\.nextBlock\.steps/);
        expect(source).toMatch(/Evidencia do resultado/);
        expect(source).toMatch(/Pilares de mastery/);
        expect(source).toMatch(/Prova visual/);

        const verdictIndex = source.indexOf('styles.verdictReport');
        const sprayIndex = source.indexOf('<SprayVisualization', verdictIndex);
        const sensitivityIndex = source.indexOf('Calibração de Sensibilidade');

        expect(sprayIndex).toBeGreaterThan(verdictIndex);
        expect(sensitivityIndex).toBeGreaterThan(sprayIndex);
    });

    it('uses user-facing diagnosis truth labels instead of uppercase engine labels', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/formatDiagnosisTruthLabel/);
        expect(source).not.toMatch(/OVERPULL|UNDERPULL|JITTER|H\. DRIFT|INCONSISTENCY|LATE RESPONSE/);
    });

    it('keeps report copy away from perfect, guaranteed, or final-skill claims', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        expect(source).not.toMatch(/perfeito|garantid|definitiv|verdade final|veredito final|sentenca final/);
    });

    it('keeps the legacy coach cards as detailed evidence below the session summary', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/Evidencia detalhada do Coach/);
        expect(source).toMatch(/groupedCoaching\.map/);
        expect(source).toMatch(/getCoachFeedbackEvidenceDisplay/);
        expect(source).toMatch(/coachEvidence\.recommendedAttachments/);
        expect(source).toMatch(/c\.whatIsWrong/);
        expect(source).toMatch(/c\.howToTest/);
        expect(source).not.toMatch(/c\.evidence\.confidence/);
        expect(source).not.toMatch(/c\.evidence\.coverage/);
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

    it('keeps expandable result cards keyboard-accessible', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/handleCardKeyboardActivation/);
        expect(source).toMatch(/role="button"/);
        expect(source).toMatch(/tabIndex=\{0\}/);
        expect(source).toMatch(/aria-expanded/);
    });
});
