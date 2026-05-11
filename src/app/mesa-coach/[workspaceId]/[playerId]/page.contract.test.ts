import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pagePath = 'src/app/mesa-coach/[workspaceId]/[playerId]/page.tsx';

function readPageSource(): string {
    const absolutePath = join(process.cwd(), pagePath);
    if (!existsSync(absolutePath)) {
        throw new Error(`Missing player dossier route at ${pagePath}. Expected scoped Team player review surface.`);
    }

    return readFileSync(absolutePath, 'utf8');
}

describe('Mesa do Coach player dossier page contract', () => {
    it('requires scoped workspace/player route params and evidence honesty fields', () => {
        const source = readPageSource();
        const normalized = source.toLowerCase();

        expect(normalized).toContain('workspaceid');
        expect(normalized).toContain('playerid');
        expect(normalized).toContain('confidence');
        expect(normalized).toContain('coverage');
        expect(normalized).toContain('blocker');
        expect(normalized).toContain('validation');
    });

    it('does not present coach notes or packets as deterministic analysis truth', () => {
        const normalized = readPageSource()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        expect(normalized).not.toMatch(/coach note.*mutate.*analysis|packet.*certification|rank proof|melhora garantida/);
        expect(normalized).not.toMatch(/rawanalysispayload|privatehistory|billingstate|paymentmetadata/);
    });
});
