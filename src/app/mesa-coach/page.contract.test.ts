import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pagePath = 'src/app/mesa-coach/page.tsx';

function readPageSource(): string {
    const absolutePath = join(process.cwd(), pagePath);
    if (!existsSync(absolutePath)) {
        throw new Error(`Missing Mesa do Coach route at ${pagePath}. Expected Team locked, empty, and cockpit states.`);
    }

    return readFileSync(absolutePath, 'utf8');
}

describe('Mesa do Coach page contract', () => {
    it('renders a product surface, not a marketing hero, and keeps Team access server-owned', () => {
        const source = readPageSource();
        const normalized = source.toLowerCase();

        expect(normalized).toContain('mesa');
        expect(normalized).toContain('coach');
        expect(normalized).toContain('team');
        expect(normalized).toContain('server');
        expect(normalized).not.toContain('localstorage');
        expect(normalized).not.toContain('success url');
        expect(normalized).not.toContain('hero');
    });

    it('keeps private account, billing, raw analysis, and ranking/certification copy out of the page source', () => {
        const normalized = readPageSource()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        expect(normalized).not.toMatch(/stripecustomer|billingstate|paymentmetadata|rawanalysispayload|privateaccountdata/);
        expect(normalized).not.toMatch(/global rank|rank proof|certificacao|certification|melhora garantida|sensibilidade perfeita/);
    });
});
