import { expect, test, type Page } from '@playwright/test';

const VIEWPORTS = {
    mobile: { width: 390, height: 844 },
    desktop: { width: 1440, height: 960 },
} as const;

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

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

for (const [viewportLabel, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`Phase 12 Revenue Ops browser proof ${viewportLabel}`, () => {
        test.use({ viewport });

        test('covers launch-control no-data, beta no-go, and public no-go cockpit states', async ({ page }) => {
            await page.goto('/admin/revenue-ops');
            await expect(page.getByText(/Revenue Ops|Operacoes de Receita|controle de lancamento/i).first()).toBeVisible();
            await expect(page.getByText(/Founder|Beta/i).first()).toBeVisible();
            await expect(page.getByText(/Public paid|lancamento publico/i).first()).toBeVisible();
            await expect(page.getByText(/NO-GO|BLOCKED|bloque/i).first()).toBeVisible();
            await expect(page.getByText(/blocker|impact|owner|runbook|missing evidence|next step/i).first()).toBeVisible();
            await expectNoFalseLaunchCopy(page);
            await expectNoHorizontalOverflow(page);
            await capturePhase12Screenshot(page, 'launch-control', viewportLabel);
        });

        test('covers Stripe failure, support diagnosis, cause tree, and evidence matrix detail states', async ({ page }) => {
            await page.goto('/admin/revenue-ops?state=stripe-failure');
            await expect(page.getByText(/Stripe|webhook|signed/i).first()).toBeVisible();
            await expect(page.getByText(/test mode|production|producao/i).first()).toBeVisible();
            await expect(page.getByText(/safe degradation|degradacao segura|preserve confirmed pro/i).first()).toBeVisible();

            await page.goto('/admin/revenue-ops?state=support-diagnosis');
            await expect(page.getByText(/pagamento|entitlement|auth|quota|analise|webhook|admin_grant/i).first()).toBeVisible();
            await expect(page.getByText(/first cause|primeira causa|why.*Pro|nao tem Pro/i).first()).toBeVisible();
            await expect(page.getByText(/support can read|suporte pode ler|admin-only|admin only/i).first()).toBeVisible();

            await page.goto('/admin/revenue-ops?state=evidence-matrix');
            await expect(page.getByText(/evidence matrix|matriz de evidencia/i).first()).toBeVisible();
            await expect(page.getByText(/manual paid-flow|paid-flow|readiness|deploy/i).first()).toBeVisible();
            await expectNoFalseLaunchCopy(page);
            await expectNoHorizontalOverflow(page);
            await capturePhase12Screenshot(page, 'evidence-matrix', viewportLabel);
        });
    });
}
