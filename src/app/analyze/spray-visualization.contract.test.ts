import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('SprayVisualization contract', () => {
    it('draws the reference trail only when reference data exists and the caller asks for it', () => {
        const source = readFileSync(new URL('./spray-visualization.tsx', import.meta.url), 'utf8');
        const pathsSource = readFileSync(new URL('./spray-visualization-paths.ts', import.meta.url), 'utf8');

        expect(source).toMatch(/if \(showIdeal && paths\.usesIdealPattern && paths\.idealPoints\.length > 1\)/);
        expect(pathsSource).toMatch(/idealDeltas: showIdeal/);
        expect(pathsSource).toMatch(/usesIdealPattern: idealDeltas\.length > 0/);
    });

    it('supports subdued path rendering for weak, inconclusive, and blocked evidence', () => {
        const source = readFileSync(new URL('./spray-visualization.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/SprayVisualizationEvidenceState = 'normal' \| 'weak' \| 'inconclusive' \| 'blocked'/);
        expect(source).toMatch(/getRealPathPaint/);
        expect(source).toMatch(/evidenceState === 'weak' \|\| evidenceState === 'inconclusive'/);
        expect(source).toMatch(/data-evidence-state=\{evidenceState\}/);
    });
});
