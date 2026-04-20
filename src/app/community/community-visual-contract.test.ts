import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readCommunitySource(relativePath: string): string {
    return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('community visual contract', () => {
    it('adds snapshot-friendly markers for project-native community sections', () => {
        const source = [
            readCommunitySource('./page.tsx'),
            readCommunitySource('./community-hub.module.css'),
            readCommunitySource('./users/[slug]/page.tsx'),
            readCommunitySource('./[slug]/post-detail.tsx'),
        ].join('\n');

        expect(source).toMatch(/data-community-section=["']squad-board["']/);
        expect(source).toMatch(/data-community-section=["']featured-posts["']/);
        expect(source).toMatch(/data-community-section=["']creator-plates["']/);
        expect(source).toMatch(/data-community-card=["']snapshot-plate["']/);
        expect(source).toMatch(/data-community-chip=["']loadout-chip["']/);
        expect(source).toMatch(/data-community-signal=["']recoil-signal["']/);
    });

    it('uses domain component names instead of generic social or dashboard names', () => {
        const source = [
            readCommunitySource('./page.tsx'),
            readCommunitySource('./community-hub.module.css'),
            readCommunitySource('./users/[slug]/page.tsx'),
            readCommunitySource('./[slug]/post-detail.tsx'),
        ].join('\n');

        expect(source).toMatch(/SquadBoard|SnapshotPlate|LoadoutChip|RecoilSignal|CreatorPlate/);
        expect(source).not.toMatch(/SocialFeed|SocialCard|DashboardFeed|DashboardCard|MarketingHero|GenericAvatarCard/);
    });

    it('keeps the visual DNA tied to current glass, accent and mono HUD tokens', () => {
        const source = [
            readCommunitySource('./page.tsx'),
            readCommunitySource('./community-hub.module.css'),
            readCommunitySource('./users/[slug]/page.tsx'),
            readCommunitySource('./[slug]/post-detail.tsx'),
        ].join('\n');

        expect(source).toMatch(/glass-card|--glass-bg/);
        expect(source).toMatch(/--color-accent-primary/);
        expect(source).toMatch(/--color-accent-cyan/);
        expect(source).toMatch(/--font-mono|fontFamily:\s*['"`]var\(--font-mono\)/);
        expect(source).toMatch(/crosshair|grid|HUD|recoil/i);
    });
});
