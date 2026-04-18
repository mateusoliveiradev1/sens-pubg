import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('history sensitivity acceptance panel contract', () => {
    it('lets the player record how the recommended sens performed in real matches', () => {
        const source = readFileSync(new URL('./sensitivity-acceptance-panel.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/recordSensitivityAcceptance/);
        expect(source).toMatch(/router\.refresh\(\)/);
        expect(source).toMatch(/Melhorou/);
        expect(source).toMatch(/Ficou igual/);
        expect(source).toMatch(/Piorou/);
    });

    it('mounts the acceptance panel in the history detail route before the dashboard', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/SensitivityAcceptancePanel/);
    });
});
