import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('dashboard arsenal icon contract', () => {
    it('uses the reusable weapon icon component instead of emoji placeholders for weapons', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/WeaponIcon/);
        expect(source).toMatch(/weaponId=\{weapon\.weaponId\}/);
        expect(source).not.toMatch(/🔫/);
    });
});
