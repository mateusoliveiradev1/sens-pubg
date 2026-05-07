import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { eq } from 'drizzle-orm';

loadEnv({ path: '.env.local' });

const VIEWPORTS = {
    mobile: { width: 390, height: 844 },
    desktop: { width: 1440, height: 960 },
} as const;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const SESSION_COOKIE_NAME = 'authjs.session-token';

async function expectNoHorizontalOverflow(page: Page) {
    const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
}

async function expectPricingHeroColumnsDoNotOverlap(page: Page) {
    const viewport = page.viewportSize();
    if (!viewport || viewport.width <= 840) {
        return;
    }

    const [titleBox, pricePanelBox] = await Promise.all([
        page.getByRole('heading', { name: /Treine o proximo spray/i }).boundingBox(),
        page.locator('aside').first().boundingBox(),
    ]);

    expect(titleBox).not.toBeNull();
    expect(pricePanelBox).not.toBeNull();
    expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(pricePanelBox!.x - 8);
}

async function createSessionToken(user: { id: string; email: string; name: string }) {
    const { encode } = await import('next-auth/jwt');

    return encode({
        secret: AUTH_SECRET!,
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
}

async function seedFreeBillingUser() {
    const [{ db }, { users }] = await Promise.all([
        import('../src/db'),
        import('../src/db/schema'),
    ]);
    const suffix = randomUUID();
    const user = {
        id: randomUUID(),
        email: `phase7-paid-${suffix}@example.com`,
        name: `Phase 7 Paid ${suffix.slice(0, 8)}`,
    };

    await db.insert(users).values({
        id: user.id,
        name: user.name,
        email: user.email,
        image: '',
    });

    return {
        user,
        async cleanup() {
            await db.delete(users).where(eq(users.id, user.id));
        },
    };
}

async function signInAsSeededUser(page: Page, user: { id: string; email: string; name: string }) {
    const sessionToken = await createSessionToken(user);

    await page.context().addCookies([{
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        url: BASE_URL,
        httpOnly: true,
        sameSite: 'Lax',
        secure: false,
    }]);
}

for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`Phase 7 paid states ${label}`, () => {
        test.use({ viewport });

        test('pricing and cancel receipt are premium public surfaces', async ({ page }) => {
            await page.goto('/pricing');
            await expect(page.getByRole('heading', { name: /Treine o proximo spray/i })).toBeVisible();
            await expect(page.getByText('Free: 3 analises uteis salvas por mes')).toBeVisible();
            await expect(page.getByText('Pro: 100 analises uteis salvas por mes de assinatura')).toBeVisible();
            await expect(page.getByText(/confirmacao da Stripe/i)).toBeVisible();
            await expectPricingHeroColumnsDoNotOverlap(page);
            await expectNoHorizontalOverflow(page);
            await page.screenshot({
                fullPage: true,
                path: `test-results/phase7-paid-pricing-${label}.png`,
            });

            await page.goto('/checkout/cancel');
            await expect(page.getByRole('heading', { name: /Nada foi alterado no seu historico/i })).toBeVisible();
            await expect(page.getByText(/nao sao apagados/i)).toBeVisible();
            await expectNoHorizontalOverflow(page);
            await page.screenshot({
                fullPage: true,
                path: `test-results/phase7-paid-cancel-${label}.png`,
            });
        });

        test('billing and checkout success show server-truth pending states', async ({ page }) => {
            test.skip(!AUTH_SECRET, 'AUTH_SECRET is required to seed authenticated paid-state fixtures.');
            const fixture = await seedFreeBillingUser();

            try {
                await signInAsSeededUser(page, fixture.user);

                await page.goto('/billing');
                await expect(page.getByRole('heading', { name: /Seu acesso Sens PUBG/i })).toBeVisible();
                await expect(page.getByText(/Free ativo/i)).toBeVisible();
                await expect(page.getByText(/Quota/i).first()).toBeVisible();
                await expect(page.getByText(/success URL, estado local ou estado visual nao concedem acesso/i)).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase7-paid-billing-free-${label}.png`,
                });

                await page.goto('/checkout/success?session_id=cs_phase7_visual');
                await expect(page.getByRole('heading', { name: /Pagamento recebido, aguardando webhook/i })).toBeVisible();
                await expect(page.getByText(/A URL de sucesso nao concede Pro/i)).toBeVisible();
                await expect(page.getByText(/Sessao/)).toBeVisible();
                await expectNoHorizontalOverflow(page);
                await page.screenshot({
                    fullPage: true,
                    path: `test-results/phase7-paid-success-pending-${label}.png`,
                });
            } finally {
                await fixture.cleanup();
            }
        });
    });
}
