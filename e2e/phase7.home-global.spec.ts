import { randomUUID } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

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

async function createStaffSessionToken() {
    const { encode } = await import('next-auth/jwt');
    const id = randomUUID();

    return encode({
        secret: AUTH_SECRET!,
        salt: SESSION_COOKIE_NAME,
        token: {
            sub: id,
            id,
            role: 'admin',
            name: 'Phase 7 Admin',
            email: `phase7-admin-${id}@example.com`,
            picture: null,
        },
    });
}

async function signInAsStaff(page: Page) {
    const sessionToken = await createStaffSessionToken();

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
    test.describe(`Phase 7 home/global ${label}`, () => {
        test.use({ viewport });

        test('home entry shows the Sens PUBG loop without horizontal overflow', async ({ page }) => {
            await page.goto('/');

            await expect(page.getByRole('heading', { level: 1, name: 'Sens PUBG' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Analisar meu spray' }).first()).toBeVisible();
            await expect(page.getByLabel('Preview do loop Sens PUBG')).toBeVisible();
            await expect(page.getByLabel('Loop Sens PUBG').first()).toBeVisible();
            await expect(page.getByText(/confianca/i).first()).toBeVisible();
            await expect(page.getByText(/cobertura/i).first()).toBeVisible();
            await expect(page.getByText(/blockers/i).first()).toBeVisible();
            await expect(page.getByText(/Proximo: loop solo/i)).toBeVisible();
            await expectNoHorizontalOverflow(page);

            await page.screenshot({
                fullPage: true,
                path: `test-results/phase7-home-${label}.png`,
            });
        });

        test('community keeps shared Sens PUBG shell without horizontal overflow', async ({ page }) => {
            await page.goto('/community');

            await expect(page.getByRole('heading', { level: 1, name: 'Comunidade' })).toBeVisible();
            await expect(page.getByText(/Comunidade Sens PUBG/i)).toBeVisible();
            await expectNoHorizontalOverflow(page);

            await page.screenshot({
                fullPage: true,
                path: `test-results/phase7-community-${label}.png`,
            });
        });

        test('admin billing remains an operational support surface', async ({ page }) => {
            test.skip(!AUTH_SECRET, 'AUTH_SECRET is required to render authenticated admin billing.');

            await signInAsStaff(page);
            await page.goto('/admin/billing');

            await expect(page.getByRole('heading', { name: /Assinaturas e entitlements/i })).toBeVisible();
            await expect(page.getByLabel('Escopo operacional de billing')).toBeVisible();
            await expect(page.getByText(/nao e dashboard de receita/i)).toBeVisible();
            await expect(page.getByText(/Nenhum usuario selecionado/i)).toBeVisible();
            await expectNoHorizontalOverflow(page);

            await page.screenshot({
                fullPage: true,
                path: `test-results/phase7-admin-billing-${label}.png`,
            });
        });
    });
}
