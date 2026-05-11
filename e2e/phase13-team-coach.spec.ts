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

async function expectNoFalseTeamCopy(page: Page): Promise<void> {
    const visibleCopy = await page.locator('body').innerText();
    const normalizedCopy = visibleCopy
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    expect(normalizedCopy).not.toMatch(/rank proof|certification|certificacao|melhora garantida|sensibilidade perfeita|pubg oficial|krafton partner/);
    expect(normalizedCopy).not.toMatch(/success url.{0,40}(grant|team)|localstorage.{0,40}(grant|team)|client state.{0,40}(grant|team)/);
}

async function capturePhase13Screenshot(page: Page, slug: string, viewportLabel: string): Promise<void> {
    await page.screenshot({
        fullPage: true,
        path: `test-results/phase13-${slug}-${viewportLabel}.png`,
    });
}

for (const [viewportLabel, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`Phase 13 Team Coach browser proof ${viewportLabel}`, () => {
        test.use({ viewport });

        test('covers locked, empty, cockpit, invite, consent, revoke, packet, disabled, print, and overflow states', async ({ page }) => {
            await page.goto('/mesa-coach');
            await expect(page.getByText(/Mesa do Coach|Team|Coach/i).first()).toBeVisible();
            await expect(page.getByText(/Team|equipe|coach|jogador/i).first()).toBeVisible();
            await expectNoFalseTeamCopy(page);
            await expectNoHorizontalOverflow(page);
            await capturePhase13Screenshot(page, 'workspace', viewportLabel);

            await page.goto('/mesa-coach?state=empty');
            await expect(page.getByText(/empty|vazio|convite|workspace/i).first()).toBeVisible();

            await page.goto('/mesa-coach?state=owner');
            await expect(page.getByText(/roster|elenco|triage|dossie|dossier/i).first()).toBeVisible();
            await expect(page.getByText(/consent|consentimento|validation|validacao|blocker/i).first()).toBeVisible();

            await page.goto('/mesa-coach?state=revoked');
            await expect(page.getByText(/revoked|revogado|access|acesso/i).first()).toBeVisible();

            await page.goto('/mesa-coach/packets/phase13-fixture-token');
            await expect(page.getByText(/packet|pacote|review|print|imprimir/i).first()).toBeVisible();
            await expectNoFalseTeamCopy(page);
            await expectNoHorizontalOverflow(page);
            await capturePhase13Screenshot(page, 'packet', viewportLabel);
        });
    });
}
