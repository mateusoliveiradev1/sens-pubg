import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('analysis ingestion copy contract', () => {
    it('routes analyze entry copy through the shared duration helper instead of hardcoded ranges', () => {
        const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
        const clientSource = readFileSync(new URL('./analysis-client.tsx', import.meta.url), 'utf8');
        const guideSource = readFileSync(new URL('./analysis-guide.tsx', import.meta.url), 'utf8');

        expect(pageSource).toMatch(/formatSprayClipDurationLabel/);
        expect(clientSource).toMatch(/formatSprayClipDurationLabel/);
        expect(guideSource).toMatch(/formatSprayClipDurationLabel/);

        expect(pageSource).not.toMatch(/5-15 segundos/);
        expect(clientSource).not.toMatch(/5-15 segundos/);
        expect(guideSource).not.toMatch(/5 a 15 segundos/);
    });
});
