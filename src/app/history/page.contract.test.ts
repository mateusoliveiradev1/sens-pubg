import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('history page field evolution contract', () => {
    it('renders weapon icons and field feedback summaries instead of weapon emojis', () => {
        const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

        expect(source).toMatch(/WeaponIcon/);
        expect(source).toMatch(/acceptanceFeedback/);
        expect(source).toMatch(/Leitura de campo/);
        expect(source).toMatch(/Aguardando teste real/);
        expect(source).not.toMatch(/🔫|🎯/);
    });
});
