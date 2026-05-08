import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';

import { chromium } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { eq } from 'drizzle-orm';
import { encode } from 'next-auth/jwt';

loadEnv({ path: '.env.local' });

const SESSION_COOKIE_NAME = 'authjs.session-token';

function resolveBaseUrl(): string {
    const cliBaseUrl = process.argv
        .find((arg) => arg.startsWith('--base-url='))
        ?.slice('--base-url='.length)
        .trim();

    return cliBaseUrl || process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
}

async function main() {
    const [{ db }, { playerProfiles, users }] = await Promise.all([
        import('../src/db'),
        import('../src/db/schema'),
    ]);
    const baseUrl = resolveBaseUrl();
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
        console.log(JSON.stringify({ skipped: true, reason: 'AUTH_SECRET missing' }));
        return;
    }

    await mkdir('test-results', { recursive: true });

    const user = {
        id: randomUUID(),
        email: `setup-onboarding-${randomUUID()}@example.com`,
        name: 'Setup Onboarding Verify',
    };

    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });

    const token = await encode({
        secret,
        salt: SESSION_COOKIE_NAME,
        token: {
            sub: user.id,
            id: user.id,
            role: 'user',
            name: user.name,
            email: user.email,
            picture: null,
        },
    });

    await db.insert(users).values({
        id: user.id,
        name: user.name,
        email: user.email,
        image: '',
    });

    try {
        await context.addCookies([{
            name: SESSION_COOKIE_NAME,
            value: token,
            url: baseUrl,
            httpOnly: true,
            sameSite: 'Lax',
            secure: false,
        }]);

        const page = await context.newPage();
        await page.goto(`${baseUrl}/setup`, { waitUntil: 'networkidle' });
        await page.screenshot({ path: 'test-results/setup-onboarding-desktop.png', fullPage: true });

        for (const text of ['Setup do jogador', 'Modelo do mousepad', 'Pegada', 'Multiplicador vertical', 'Red Dot']) {
            const count = await page.getByText(text, { exact: false }).count();
            if (count === 0) {
                throw new Error(`Missing onboarding text: ${text}`);
            }
        }

        await page.setViewportSize({ width: 390, height: 920 });
        await page.goto(`${baseUrl}/setup`, { waitUntil: 'networkidle' });
        await page.screenshot({ path: 'test-results/setup-onboarding-mobile.png', fullPage: true });

        const hasHorizontalOverflow = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        );
        if (hasHorizontalOverflow) {
            throw new Error('Setup onboarding has horizontal overflow on mobile');
        }

        await page.setViewportSize({ width: 1440, height: 1100 });
        await page.goto(`${baseUrl}/setup`, { waitUntil: 'networkidle' });
        await page.locator('#mouse-model').fill('Verification Mouse');
        await page.locator('#mouse-sensor').fill('PixArt PAW3395');
        await page.locator('#mouse-dpi').fill('1600');
        await page.locator('#mouse-polling').selectOption('4000');
        await page.locator('#mouse-weight').fill('58');
        await page.locator('#mouse-lod').fill('0.8');
        await page.locator('#monitor-resolution').selectOption('1728x1080');
        await page.locator('#monitor-refresh').fill('240');
        await page.locator('#monitor-panel').selectOption('ips');
        await page.locator('#mousepad-model').fill('Verification Pad');
        await page.locator('#mousepad-width').fill('49');
        await page.locator('#mousepad-height').fill('42');
        await page.locator('#mousepad-type').selectOption('hybrid');
        await page.locator('#mousepad-material').selectOption('cloth');
        await page.locator('#desk-space').fill('72');
        await page.getByRole('button', { name: 'Fingertip' }).click();
        await page.getByRole('button', { name: 'Braco' }).click();
        await page.getByRole('button', { name: 'Longo' }).click();
        await page.locator('#general-sens').fill('43');
        await page.locator('#ads-sens').fill('39');
        await page.locator('#fov').fill('97');
        await page.locator('#vertical-multiplier').fill('1.12');
        await page.locator('#scope-red-dot').fill('42');
        await page.locator('#scope-2x').fill('41');
        await page.locator('#scope-3x').fill('40');
        await page.locator('#scope-4x').fill('39');
        await page.locator('#scope-6x').fill('38');
        await page.locator('#scope-8x').fill('37');
        await page.locator('#scope-15x').fill('36');
        await page.getByRole('button', { name: 'Salvar setup e analisar' }).click();
        await page.waitForURL('**/analyze', { timeout: 15000 });

        const [profile] = await db
            .select()
            .from(playerProfiles)
            .where(eq(playerProfiles.userId, user.id))
            .limit(1);

        if (!profile) throw new Error('Player profile was not created');
        if (profile.mousepadModel !== 'Verification Pad') throw new Error('Mousepad was not persisted');
        if (profile.gripStyle !== 'fingertip') throw new Error('Grip style was not persisted');
        if (profile.playStyle !== 'arm') throw new Error('Play style was not persisted');
        if (Math.abs(profile.verticalMultiplier - 1.12) > 0.001) {
            throw new Error('Vertical multiplier was not persisted');
        }
        if ((profile.scopeSens as Record<string, number>)['15x'] !== 36) {
            throw new Error('15x scope sensitivity was not persisted');
        }

        const [legacyUser] = await db
            .select({
                resolution: users.resolution,
                mouseDpi: users.mouseDpi,
                sens1x: users.sens1x,
                sens3x: users.sens3x,
                sens4x: users.sens4x,
            })
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);

        if (
            !legacyUser
            || legacyUser.resolution !== '1728x1080'
            || legacyUser.mouseDpi !== 1600
            || legacyUser.sens1x !== 42
            || legacyUser.sens3x !== 40
            || legacyUser.sens4x !== 39
        ) {
            throw new Error('Legacy user setup fields were not synchronized');
        }

        console.log(JSON.stringify({
            passed: true,
            desktopScreenshot: 'test-results/setup-onboarding-desktop.png',
            mobileScreenshot: 'test-results/setup-onboarding-mobile.png',
            savedProfile: {
                mousepadModel: profile.mousepadModel,
                gripStyle: profile.gripStyle,
                playStyle: profile.playStyle,
                verticalMultiplier: profile.verticalMultiplier,
                scope15x: (profile.scopeSens as Record<string, number>)['15x'],
            },
        }, null, 2));
    } finally {
        await browser.close();
        await db.delete(playerProfiles).where(eq(playerProfiles.userId, user.id));
        await db.delete(users).where(eq(users.id, user.id));
    }
}

await main();
