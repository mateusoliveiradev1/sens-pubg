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
        expect(source).toMatch(/data-community-section=["']hero-pulse["']/);
        expect(source).toMatch(/section=["']community-now-band["']/);
        expect(source).toMatch(/section=["']community-pulse-band["']/);
        expect(source).toMatch(/section=["']community-explore-band["']/);
        expect(source).toMatch(/data-community-section=["']featured-posts["']/);
        expect(source).toMatch(/data-community-section=["']creator-plates["']/);
        expect(source).toMatch(/data-community-section=["']season-context["']/);
        expect(source).toMatch(/data-community-section=["']weekly-challenge-board["']/);
        expect(source).toMatch(/data-community-section=["']progression-summary["']/);
        expect(source).toMatch(/data-community-section=["']personal-recap["']/);
        expect(source).toMatch(/data-community-section=["']squad-spotlight["']/);
        expect(source).toMatch(/data-community-section=["']mission-board["']/);
        expect(source).toMatch(/data-community-card=["']snapshot-plate["']/);
        expect(source).toMatch(/data-community-chip=["']loadout-chip["']/);
        expect(source).toMatch(/data-community-signal=["']recoil-signal["']/);
        expect(source).toMatch(/data-community-section=["']profile-trust-rail["']/);
        expect(source).toMatch(/data-community-section=["']profile-reward-strip["']/);
        expect(source).toMatch(/data-community-section=["']profile-streak-summary["']/);
        expect(source).toMatch(/data-community-section=["']profile-squad-identity["']/);
        expect(source).toMatch(/data-community-section=["']community-trust-rail["']/);
        expect(source).toMatch(/data-community-signal=["']community-trust-signal["']/);
    });

    it('uses domain component names instead of generic social or dashboard names', () => {
        const source = [
            readCommunitySource('./page.tsx'),
            readCommunitySource('./community-hub.module.css'),
            readCommunitySource('./users/[slug]/page.tsx'),
            readCommunitySource('./[slug]/post-detail.tsx'),
        ].join('\n');

        expect(source).toMatch(/SquadBoard|CommunityBand|SnapshotPlate|LoadoutChip|RecoilSignal|CreatorPlate/);
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

    it('marks metric plates and trust rails as stable responsive surfaces', () => {
        const source = [
            readCommunitySource('./page.tsx'),
            readCommunitySource('./community-hub.module.css'),
            readCommunitySource('./users/[slug]/page.tsx'),
        ].join('\n');

        expect(source).toMatch(/data-community-layout=["']stable-metric-plate["']/);
        expect(source).toMatch(/data-community-layout=["']stable-trust-rail["']/);
        expect(source).toMatch(/data-community-layout=["']stable-reward-rail["']/);
        expect(source).toMatch(/trustSignalRail/);
        expect(source).toMatch(/bandGrid|ritualDeck|missionGrid|profileRecognitionGrid/);
        expect(source).toMatch(/min-height:\s*92px/);
        expect(source).toMatch(/@media \(max-width: 767px\)[\s\S]*trustSignalRail/);
        expect(source).toMatch(/@media \(max-width: 1023px\)[\s\S]*(bandGrid|ritualDeck|missionGrid|profileRecognitionGrid)/);
    });
});
