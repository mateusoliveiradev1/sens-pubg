import { expect, test, type Page } from '@playwright/test';

const VIEWPORTS = {
    mobile: { width: 390, height: 844 },
    desktop: { width: 1440, height: 960 },
} as const;

const REPORT_SCENARIOS = [
    {
        slug: 'public-report',
        href: '/community/reports/phase11-public-report',
        expectedText: /Relatorio Pro Compartilhavel|case de evolucao/i,
        honestyRequired: true,
    },
    {
        slug: 'link-private-report',
        href: '/community/reports/phase11-link-private-report?share=active',
        expectedText: /link privado|nao listado|unlisted/i,
        honestyRequired: true,
    },
    {
        slug: 'revoked-link',
        href: '/community/reports/phase11-link-private-report?share=revoked',
        expectedText: /link revogado|revoked/i,
        honestyRequired: false,
    },
    {
        slug: 'expired-link',
        href: '/community/reports/phase11-link-private-report?share=expired',
        expectedText: /link expirado|expired/i,
        honestyRequired: false,
    },
    {
        slug: 'hidden-disabled-report',
        href: '/community/reports/phase11-hidden-report',
        expectedText: /relatorio indisponivel|oculto pela moderacao|disabled/i,
        honestyRequired: false,
    },
] as const;

const SOCIAL_PRO_SURFACES = [
    {
        slug: 'free-lock',
        href: '/community?socialProState=free-lock',
        expectedText: /Free mantem|Pro organiza|biblioteca/i,
    },
    {
        slug: 'pro-hub',
        href: '/community?socialProState=pro-hub',
        expectedText: /hub pro|relatorios recentes|biblioteca pro/i,
    },
    {
        slug: 'badge-tooltip',
        href: '/community/users/phase11-pro-badge',
        expectedText: /Pro: acesso aos recursos premium do Sens PUBG|nao indica autoridade/i,
    },
    {
        slug: 'creator-analytics',
        href: '/community?socialProState=creator-analytics',
        expectedText: /impacto publico|metricas agregadas|sem leitores privados/i,
    },
    {
        slug: 'pro-library',
        href: '/community?socialProState=pro-library',
        expectedText: /biblioteca pro|colecoes privadas|contexto de treino/i,
    },
    {
        slug: 'report-controls',
        href: '/community?socialProState=report-controls',
        expectedText: /gerar relatorio|link privado|controle publico seguro/i,
    },
    {
        slug: 'contextual-handoffs',
        href: '/community?socialProState=contextual-handoffs',
        expectedText: /Ciclo Pro|Spray Lab|validacao compativel|historico/i,
    },
] as const;

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

async function expectNoAggressiveOrFalsePremiumCopy(page: Page): Promise<void> {
    await expect(page.getByText(/sensibilidade perfeita|rank garantido|melhora garantida|PUBG oficial|KRAFTON oficial/i)).toHaveCount(0);
    await expect(page.getByText(/pague para virar autoridade|Pro prova que o jogador e melhor/i)).toHaveCount(0);
    await expect(page.getByText(/API PUBG exclusiva|acesso exclusivo a API PUBG/i)).toHaveCount(0);
}

async function expectRequiredHonestyText(page: Page): Promise<void> {
    await expect(page.getByText(/confianca|confidence/i).first()).toBeVisible();
    await expect(page.getByText(/cobertura|coverage/i).first()).toBeVisible();
    await expect(page.getByText(/bloqueio|blocker|limitado|inconclusivo/i).first()).toBeVisible();
    await expect(page.getByText(/validacao compativel|sem promessa|nao garante/i).first()).toBeVisible();
}

async function expectMainContent(page: Page): Promise<void> {
    await expect(page.locator('#main-content').first()).toBeVisible();
}

async function capturePhase11Screenshot(page: Page, slug: string, viewportLabel: string): Promise<void> {
    await page.screenshot({
        fullPage: true,
        path: `test-results/phase11-${slug}-${viewportLabel}.png`,
    });
}

for (const [viewportLabel, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`Phase 11 Social Pro browser proof ${viewportLabel}`, () => {
        test.use({ viewport });

        test('keeps public community basics open without aggressive Pro banners', async ({ page }) => {
            await page.goto('/community');
            await expectMainContent(page);
            await expect(page.locator('#community-feed, [data-community-section="feed"]').first()).toBeVisible();
            await expectNoAggressiveOrFalsePremiumCopy(page);
            await expectNoHorizontalOverflow(page);
            await capturePhase11Screenshot(page, 'public-feed', viewportLabel);

            await page.goto('/community/phase11-public-post');
            await expectMainContent(page);
            await expect(page.getByText(/curtir|comentar|salvar|seguir|post publico/i).first()).toBeVisible();
            await expectNoAggressiveOrFalsePremiumCopy(page);
            await expectNoHorizontalOverflow(page);
            await capturePhase11Screenshot(page, 'public-post', viewportLabel);

            await page.goto('/community/users/phase11-public-profile');
            await expectMainContent(page);
            await expect(page.getByText(/perfil publico|analises publicas|seguir/i).first()).toBeVisible();
            await expectNoAggressiveOrFalsePremiumCopy(page);
            await expectNoHorizontalOverflow(page);
            await capturePhase11Screenshot(page, 'public-profile', viewportLabel);
        });

        test('covers public-safe report visibility and private-link lifecycle states', async ({ page }) => {
            for (const scenario of REPORT_SCENARIOS) {
                await page.goto(scenario.href);
                await expectMainContent(page);
                await expect(page.getByText(scenario.expectedText).first()).toBeVisible();
                await expectNoAggressiveOrFalsePremiumCopy(page);
                if (scenario.honestyRequired) {
                    await expectRequiredHonestyText(page);
                }
                await expectNoHorizontalOverflow(page);
                await capturePhase11Screenshot(page, scenario.slug, viewportLabel);
            }
        });

        test('covers Free lock, Pro hub, badge, analytics, library, controls, cancellation, and handoffs', async ({ page }) => {
            for (const surface of SOCIAL_PRO_SURFACES) {
                await page.goto(surface.href);
                await expectMainContent(page);
                await expect(page.getByText(surface.expectedText).first()).toBeVisible();
                await expectNoAggressiveOrFalsePremiumCopy(page);
                await expectNoHorizontalOverflow(page);
                await capturePhase11Screenshot(page, surface.slug, viewportLabel);
            }

            await page.goto('/community?socialProState=canceled');
            await expect(page.getByText(/relatorios existentes continuam legiveis|criar novo relatorio exige Pro ativo/i).first()).toBeVisible();
            await expectNoHorizontalOverflow(page);
            await capturePhase11Screenshot(page, 'cancellation-behavior', viewportLabel);
        });
    });
}
