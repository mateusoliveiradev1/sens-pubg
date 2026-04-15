import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('results dashboard visualization contract', () => {
    it('passes angular recoil residuals into the spray visualization so the ideal trail can be drawn', () => {
        const source = readFileSync(new URL('./results-dashboard.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/shotResiduals=\{activeSession\.metrics\.shotResiduals\}/);
    });
});
