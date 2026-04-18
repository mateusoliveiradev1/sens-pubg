/**
 * E2E: Public community feed page
 * Confirma que /community renderiza apenas posts publicos publicados
 * e aplica filtros basicos usando a query/core do feed publico.
 */

import { randomUUID } from 'node:crypto';

import { test, expect } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { eq } from 'drizzle-orm';

loadEnv({ path: '.env.local' });

type SeededAuthor = {
    readonly userId: string;
    readonly profileId: string;
    readonly email: string;
    readonly slug: string;
    readonly displayName: string;
};

function createSeededAuthor(seed: string, name: string): SeededAuthor {
    return {
        userId: randomUUID(),
        profileId: randomUUID(),
        email: `community-feed-${seed}-${randomUUID()}@example.com`,
        slug: `community-${seed}-${randomUUID().slice(0, 8)}`,
        displayName: name,
    };
}

async function seedCommunityFeedFixture() {
    const [{ db }, { users, communityProfiles, communityPosts }] = await Promise.all([
        import('../src/db'),
        import('../src/db/schema'),
    ]);

    const aceAuthor = createSeededAuthor('ace32', 'Ace Coach');
    const berylAuthor = createSeededAuthor('beryl', 'Beryl Coach');
    const hiddenAuthor = createSeededAuthor('hidden', 'Hidden Coach');
    const seedSuffix = randomUUID().slice(0, 8);
    const aceTitle = `Ace32 laser reset ${seedSuffix}`;
    const berylTitle = `Beryl anchor fundamentals ${seedSuffix}`;
    const hiddenTitle = `Draft hidden seed post ${seedSuffix}`;

    await db.insert(users).values([
        {
            id: aceAuthor.userId,
            name: aceAuthor.displayName,
            email: aceAuthor.email,
            image: '',
        },
        {
            id: berylAuthor.userId,
            name: berylAuthor.displayName,
            email: berylAuthor.email,
            image: '',
        },
        {
            id: hiddenAuthor.userId,
            name: hiddenAuthor.displayName,
            email: hiddenAuthor.email,
            image: '',
        },
    ]);

    await db.insert(communityProfiles).values([
        {
            id: aceAuthor.profileId,
            userId: aceAuthor.userId,
            slug: aceAuthor.slug,
            displayName: aceAuthor.displayName,
            links: [],
            visibility: 'public',
            creatorProgramStatus: 'none',
        },
        {
            id: berylAuthor.profileId,
            userId: berylAuthor.userId,
            slug: berylAuthor.slug,
            displayName: berylAuthor.displayName,
            links: [],
            visibility: 'public',
            creatorProgramStatus: 'none',
        },
        {
            id: hiddenAuthor.profileId,
            userId: hiddenAuthor.userId,
            slug: hiddenAuthor.slug,
            displayName: hiddenAuthor.displayName,
            links: [],
            visibility: 'public',
            creatorProgramStatus: 'none',
        },
    ]);

    await db.insert(communityPosts).values([
        {
            id: randomUUID(),
            authorId: aceAuthor.userId,
            communityProfileId: aceAuthor.profileId,
            slug: `ace32-laser-reset-${randomUUID().slice(0, 8)}`,
            type: 'analysis_snapshot',
            status: 'published',
            visibility: 'public',
            title: aceTitle,
            excerpt: 'Seed publico filtravel por arma, patch e diagnostico.',
            bodyMarkdown: 'Public post body',
            primaryWeaponId: 'ace32',
            primaryPatchVersion: '35.2',
            primaryDiagnosisKey: 'vertical_control',
            copySensPreset: {} as never,
            publishedAt: new Date('2026-04-18T15:30:00.000Z'),
        },
        {
            id: randomUUID(),
            authorId: berylAuthor.userId,
            communityProfileId: berylAuthor.profileId,
            slug: `beryl-anchor-fundamentals-${randomUUID().slice(0, 8)}`,
            type: 'analysis_snapshot',
            status: 'published',
            visibility: 'public',
            title: berylTitle,
            excerpt: 'Segundo seed publico que deve permanecer fora do filtro combinado.',
            bodyMarkdown: 'Another public post body',
            primaryWeaponId: 'beryl-m762',
            primaryPatchVersion: '35.1',
            primaryDiagnosisKey: 'horizontal_instability',
            copySensPreset: {} as never,
            publishedAt: new Date('2026-04-18T14:00:00.000Z'),
        },
        {
            id: randomUUID(),
            authorId: hiddenAuthor.userId,
            communityProfileId: hiddenAuthor.profileId,
            slug: `hidden-draft-seed-${randomUUID().slice(0, 8)}`,
            type: 'analysis_snapshot',
            status: 'draft',
            visibility: 'public',
            title: hiddenTitle,
            excerpt: 'Esse post nao deve aparecer no feed publico.',
            bodyMarkdown: 'Hidden draft body',
            primaryWeaponId: 'aug',
            primaryPatchVersion: '35.4',
            primaryDiagnosisKey: 'timing_delay',
            copySensPreset: {} as never,
            publishedAt: new Date('2026-04-18T16:30:00.000Z'),
        },
    ]);

    return {
        expectedTitles: {
            ace: aceTitle,
            beryl: berylTitle,
            hidden: hiddenTitle,
        },
        async cleanup() {
            await db.delete(users).where(eq(users.id, aceAuthor.userId));
            await db.delete(users).where(eq(users.id, berylAuthor.userId));
            await db.delete(users).where(eq(users.id, hiddenAuthor.userId));
        },
    };
}

test.describe('Public community feed page', () => {
    test.describe.configure({ mode: 'serial' });

    test('loads the public feed with the current app header and hides non-public entries', async ({ page }) => {
        const fixture = await seedCommunityFeedFixture();

        try {
            await page.goto('/community');

            await expect(page).toHaveTitle(/Comunidade/);
            await expect(page.getByRole('navigation', { name: /navega/i })).toBeVisible();
            await expect(page.getByRole('heading', { level: 1, name: /comunidade/i })).toBeVisible();
            await expect(page.getByRole('heading', { level: 2, name: fixture.expectedTitles.ace })).toBeVisible();
            await expect(page.getByRole('heading', { level: 2, name: fixture.expectedTitles.beryl })).toBeVisible();
            await expect(page.getByText(fixture.expectedTitles.hidden)).toHaveCount(0);
        } finally {
            await fixture.cleanup();
        }
    });

    test('applies the basic public feed filters via the /community form', async ({ page }) => {
        const fixture = await seedCommunityFeedFixture();

        try {
            await page.goto('/community');

            await page.getByLabel(/arma/i).selectOption('ace32');
            await page.getByLabel(/patch/i).selectOption('35.2');
            await page.getByLabel(/diagn[oó]stico/i).selectOption('vertical_control');
            await page.getByRole('button', { name: /aplicar filtros/i }).click();

            await expect(page).toHaveURL(/weaponId=ace32/);
            await expect(page).toHaveURL(/patchVersion=35\.2/);
            await expect(page).toHaveURL(/diagnosisKey=vertical_control/);
            await expect(page.getByRole('heading', { level: 2, name: fixture.expectedTitles.ace })).toBeVisible();
            await expect(page.getByRole('heading', { level: 2, name: fixture.expectedTitles.beryl })).toHaveCount(0);
        } finally {
            await fixture.cleanup();
        }
    });
});
