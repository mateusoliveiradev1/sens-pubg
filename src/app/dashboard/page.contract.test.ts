import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('dashboard arsenal icon contract', () => {
    it('uses the reusable weapon icon component instead of emoji placeholders for weapons', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/WeaponIcon/);
        expect(source).toMatch(/weaponId=\{weapon\.weaponId\}/);
        expect(source).not.toMatch(/🔫/);
    });

    it('renders an executive dashboard with next-step actions instead of only raw metric cards', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/Dashboard de performance/);
        expect(source).toMatch(/Leitura de agora/);
        expect(source).toMatch(/Proximo passo/);
        expect(source).toMatch(/Tendencia operacional/);
        expect(source).toMatch(/Arsenal prioritario/);
        expect(source).toMatch(/Analisar novo clip/);
        expect(source).toMatch(/pts/);
    });
});
