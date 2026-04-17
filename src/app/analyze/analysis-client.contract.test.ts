import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('analysis worker tracking contract', () => {
    it('does not overwrite worker tracking quality with artificial defaults', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).not.toMatch(/confidence:\s*1\.0/);
        expect(source).not.toMatch(/trackingQuality:\s*1\.0/);
        expect(source).not.toMatch(/framesLost:\s*0/);
    });

    it('does not mark every worker crosshair detection as perfect confidence', () => {
        const source = readFileSync(new URL('../../workers/aimAnalyzer.worker.ts', import.meta.url), 'utf8');

        expect(source).not.toMatch(/confidence:\s*1\.0/);
    });

    it('routes the worker through a shared session wrapper instead of inline tracking logic', () => {
        const workerSource = readFileSync(new URL('../../workers/aimAnalyzer.worker.ts', import.meta.url), 'utf8');
        const sessionSource = readFileSync(new URL('../../workers/aim-analyzer-session.ts', import.meta.url), 'utf8');

        expect(workerSource).toMatch(/createAimAnalyzerSession/);
        expect(workerSource).not.toMatch(/detectCrosshairCentroid\(/);
        expect(sessionSource).toMatch(/createStreamingCrosshairTracker/);
        expect(sessionSource).not.toMatch(/detectCrosshairCentroid\(/);
    });

    it('does not parse monitor resolution with an unsafe inline split assumption', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).not.toMatch(/monitorResolution\.split\('x'\)/);
    });

    it('derives spray extraction timing from the shared session config helper', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/calculateExpectedSprayDurationSeconds/);
        expect(source).not.toMatch(/\(\s*30\s*\*\s*0\.086\s*\)\s*\+\s*0\.5/);
    });

    it('derives worker attachment multipliers from the shared session config helper', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/resolveWorkerAttachmentMultipliers/);
        expect(source).not.toMatch(/horizontal:\s*1\.0/);
    });

    it('derives the spray projection from video plus optic context before calculating metrics', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/resolveSprayProjectionConfig/);
        expect(source).not.toMatch(/calculateSprayMetrics\(trajectory,\s*weaponData,\s*loadout,\s*undefined/);
    });

    it('routes weapon selection through the supported-analysis catalog instead of a raw slug hack', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/summarizeAnalysisWeaponSupport/);
        expect(source).not.toMatch(/replace\(' ', '-'\)/);
    });

    it('surfaces the current tilted grip option in the analysis selector', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/const GRIP_OPTIONS:[\s\S]*'tilted'/);
    });

    it('preserves decimal clip duration in the preview instead of rounding boundary uploads', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/formatPreviewClipDuration/);
        expect(source).not.toMatch(/Math\.round\(video\.duration\)\}s/);
    });

    it('passes optic and distance context into coaching instead of using patch-only defaults', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/opticId:\s*analysisContext\.optic\.opticId/);
        expect(source).toMatch(/targetDistanceMeters:\s*analysisContext\.targetDistanceMeters/);
        expect(source).not.toMatch(/generateCoaching\(diagnoses,\s*loadout,\s*\{\s*patchVersion:\s*CURRENT_PUBG_PATCH_VERSION\s*\}\)/);
    });

    it('uses the persisted server result when coaching is enriched during save', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/if\s*\(persisted\.result\)/);
        expect(source).toMatch(/setResult\(resultToDisplay\)/);
    });

    it('attaches the validated video quality report to every analysis result', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');
        const engineTypes = readFileSync(new URL('../../types/engine.ts', import.meta.url), 'utf8');
        const historySource = readFileSync(new URL('../../actions/history.ts', import.meta.url), 'utf8');

        expect(engineTypes).toMatch(/readonly videoQualityReport\?: VideoQualityReport/);
        expect(source).toMatch(/videoQualityReport:\s*video\.qualityReport/);
        expect(historySource).toMatch(/videoQualityReport:\s*enrichedResult\.videoQualityReport/);
    });

    it('treats heuristic low-quality uploads as warnings instead of blocking the setup flow', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');
        const lowQualityBranch = source.match(
            /if\s*\(!prepared\.metadata\.qualityReport\.usableForAnalysis\)\s*\{([\s\S]*?)\n\s*\}\s*else if/
        );

        expect(lowQualityBranch?.[1]).toMatch(/setQualityWarning/);
        expect(lowQualityBranch?.[1]).not.toMatch(/setError/);
        expect(lowQualityBranch?.[1]).not.toMatch(/releaseVideoUrl/);
    });

    it('surfaces the upload quality diagnostic before the user starts analysis', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/uploadedQualityDiagnostic/);
        expect(source).toMatch(/Laudo do clip/);
        expect(source).toMatch(/recommendations\.map/);
        expect(source).toMatch(/normalizationApplied/);
    });

    it('surfaces frame-by-frame quality evidence in the upload diagnostic', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/uploadedQualityTimeline/);
        expect(source).toMatch(/timeline\.summary\.goodFrames/);
        expect(source).toMatch(/degradedSegments\.map/);
        expect(source).toMatch(/Evidencia frame-a-frame/);
    });

    it('routes worker tracking through the backpressure runner instead of fire-and-forget frame posts', () => {
        const source = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/runWorkerTrackingAnalysis/);
        expect(source).not.toMatch(/for\s*\(const frame of framesForTracking\)[\s\S]*worker\.postMessage/);
        expect(source).not.toMatch(/new Promise<WorkerTrackingResult>/);
    });
});
