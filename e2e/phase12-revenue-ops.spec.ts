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

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

if (!AUTH_SECRET) {
    throw new Error('AUTH_SECRET is required to run Phase 12 Revenue Ops e2e tests.');
}

interface StaffUser {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly role: 'admin';
}

function createStaffUser(): StaffUser {
    const id = randomUUID();

    return {
        id,
        email: `phase12-revenue-ops-admin-${id}@example.com`,
        name: `Phase 12 Revenue Ops ${id.slice(0, 8)}`,
        role: 'admin',
    };
}

async function createSessionToken(user: StaffUser): Promise<string> {
    const { encode } = await import('next-auth/jwt');

    return encode({
        secret: AUTH_SECRET!,
        salt: SESSION_COOKIE_NAME,
        token: {
            sub: user.id,
            id: user.id,
            role: user.role,
            name: user.name,
            email: user.email,
            picture: null,
        },
    });
}

async function signInAsRevenueOpsStaff(page: Page): Promise<void> {
    const sessionToken = await createSessionToken(createStaffUser());

    await page.context().addCookies([{
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        url: BASE_URL,
        httpOnly: true,
        sameSite: 'Lax',
        secure: false,
    }]);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
    const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        offenders: Array.from(document.querySelectorAll<HTMLElement>('body *'))
            .map((element) => {
                const rect = element.getBoundingClientRect();

                return {
                    tag: element.tagName.toLowerCase(),
                    text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
                    className: typeof element.className === 'string' ? element.className : '',
                    left: Math.round(rect.left),
                    right: Math.round(rect.right),
                    width: Math.round(rect.width),
                };
            })
            .filter((item) => item.right > document.documentElement.clientWidth + 2 || item.left < -2)
            .slice(0, 8),
    }));

    expect(
        dimensions.scrollWidth,
        JSON.stringify(dimensions.offenders, null, 2),
    ).toBeLessThanOrEqual(dimensions.clientWidth + 2);
}

async function expectNoFalseLaunchCopy(page: Page): Promise<void> {
    const visibleCopy = await page.locator('body').innerText();
    const normalizedCopy = visibleCopy
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    expect(normalizedCopy).not.toMatch(/(ready|pronto).{0,30}(public launch|lancamento publico).{0,40}(sem evidencia|without evidence)/);
    expect(normalizedCopy).not.toMatch(/success url.{0,40}(grant|pro)|localstorage.{0,40}(grant|pro)|client state.{0,40}(grant|pro)/);
    expect(normalizedCopy).not.toMatch(/sensibilidade perfeita|rank garantido|melhora garantida|pubg oficial|krafton partner/);
}

async function capturePhase12Screenshot(page: Page, slug: string, viewportLabel: string): Promise<void> {
    await page.screenshot({
        fullPage: true,
        path: `test-results/phase12-${slug}-${viewportLabel}.png`,
    });
}

async function gotoRevenueOps(page: Page, query = ''): Promise<void> {
    await signInAsRevenueOpsStaff(page);
    await page.goto(`/admin/revenue-ops${query}`);
    await expect(page).toHaveURL(/\/admin\/revenue-ops/);
}

function revenueOpsContent(page: Page) {
    return page.locator('main').last();
}

for (const [viewportLabel, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`Phase 12 Revenue Ops browser proof ${viewportLabel}`, () => {
        test.use({ viewport });

        test('covers launch-control no-data, beta no-go, and public no-go cockpit states', async ({ page }) => {
            await gotoRevenueOps(page);
            const content = revenueOpsContent(page);

            await expect(content.getByRole('heading', { name: /controle de lancamento Revenue Ops/i })).toBeVisible();
            await expect(content.getByText(/Founder|Beta/i).first()).toBeVisible();
            await expect(content.getByText(/Public paid|lancamento publico/i).first()).toBeVisible();
            await expect(content.getByText(/NO-GO|BLOCKED|bloque/i).first()).toBeVisible();
            await expect(content.getByText(/blocker|impact|owner|runbook|missing evidence|next step/i).first()).toBeVisible();
            await expect(content.getByText(/First usable analysis|Upgrade intent|Checkout started|Checkout confirmed/i).first()).toBeVisible();
            await expectNoFalseLaunchCopy(page);
            await expectNoHorizontalOverflow(page);
            await capturePhase12Screenshot(page, 'launch-control', viewportLabel);
        });

        test('covers Stripe failure, support diagnosis, cause tree, and evidence matrix detail states', async ({ page }) => {
            await gotoRevenueOps(page, '?state=stripe-failure');
            let content = revenueOpsContent(page);

            await expect(content.getByText(/Stripe|webhook|signed/i).first()).toBeVisible();
            await expect(content.getByText(/test mode|production|producao/i).first()).toBeVisible();
            await expect(content.getByText(/safe degradation|degradacao segura|preserve confirmed pro/i).first()).toBeVisible();
            await expect(content.getByText(/production.*separate|production.*must not inherit|nao substitui production/i).first()).toBeVisible();
            await expect(content.getByText(/checkout|risky paid actions|paid-flow blocker|missing evidence/i).first()).toBeVisible();

            await gotoRevenueOps(page, '?state=support-diagnosis');
            content = revenueOpsContent(page);
            await expect(content.getByText(/pagamento|entitlement|auth|quota|analise|webhook|admin_grant/i).first()).toBeVisible();
            await expect(content.getByText(/first cause|primeira causa|why.*Pro|nao tem Pro/i).first()).toBeVisible();
            await expect(content.getByText(/support can read|suporte pode ler|admin-only|admin only/i).first()).toBeVisible();
            await expect(content.getByText(/Abrir suporte de billing|Abrir billing/i).first()).toBeVisible();

            await gotoRevenueOps(page, '?state=evidence-matrix');
            content = revenueOpsContent(page);
            await expect(content.getByText(/evidence matrix|matriz de evidencia/i).first()).toBeVisible();
            await expect(content.getByText(/manual paid-flow|paid-flow|readiness|deploy/i).first()).toBeVisible();
            await expect(content.getByText(/Stripe test/i).first()).toBeVisible();
            await expect(content.getByText(/Stripe production/i).first()).toBeVisible();
            await expectNoFalseLaunchCopy(page);
            await expectNoHorizontalOverflow(page);
            await capturePhase12Screenshot(page, 'evidence-matrix', viewportLabel);
        });
    });
}
