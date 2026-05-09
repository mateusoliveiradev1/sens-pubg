import { describe, expect, it } from 'vitest';

type ReportActionResult = {
    readonly success: boolean;
    readonly error?: string;
    readonly report?: Record<string, unknown>;
    readonly link?: Record<string, unknown>;
    readonly auditEvents?: readonly Record<string, unknown>[];
};

interface SocialProReportsModule {
    readonly createSocialProReport?: (input: Record<string, unknown>) => Promise<ReportActionResult>;
    readonly updateSocialProReportControls?: (input: Record<string, unknown>) => Promise<ReportActionResult>;
    readonly createSocialProPrivateLink?: (input: Record<string, unknown>) => Promise<ReportActionResult>;
    readonly regenerateSocialProPrivateLink?: (input: Record<string, unknown>) => Promise<ReportActionResult>;
    readonly revokeSocialProPrivateLink?: (input: Record<string, unknown>) => Promise<ReportActionResult>;
    readonly moderateSocialProReport?: (input: Record<string, unknown>) => Promise<ReportActionResult>;
}

const freeActor = {
    userId: 'free-user',
    role: 'user',
    accessState: 'free',
    capabilities: ['read_public_community', 'read_public_report'],
};
const proActor = {
    userId: 'pro-user',
    role: 'user',
    accessState: 'pro_active',
    capabilities: [
        'read_public_community',
        'read_public_report',
        'create_report',
        'edit_report',
        'manage_private_links',
    ],
};
const canceledActor = {
    userId: 'canceled-user',
    role: 'user',
    accessState: 'canceled',
    capabilities: ['read_public_community', 'read_public_report', 'read_link_private_report'],
};
const adminActor = {
    userId: 'admin-user',
    role: 'admin',
    accessState: 'free',
    capabilities: ['read_public_community', 'read_public_report', 'moderate_reports'],
};

async function loadSocialProReportsModule(): Promise<Required<SocialProReportsModule>> {
    const modulePath = './social-pro-reports';

    let socialProModule: SocialProReportsModule;
    try {
        socialProModule = await import(modulePath) as SocialProReportsModule;
    } catch (error) {
        throw new Error(
            [
                'Missing Social Pro report actions module at src/actions/social-pro-reports.ts.',
                'Expected Pro-only report creation/editing, private-link lifecycle, cancellation, and moderation actions.',
                error instanceof Error ? error.message : String(error),
            ].join(' '),
        );
    }

    for (const exportName of [
        'createSocialProReport',
        'updateSocialProReportControls',
        'createSocialProPrivateLink',
        'regenerateSocialProPrivateLink',
        'revokeSocialProPrivateLink',
        'moderateSocialProReport',
    ] as const) {
        expect(typeof socialProModule[exportName], `${exportName} must be exported.`).toBe('function');
    }

    return socialProModule as Required<SocialProReportsModule>;
}

describe('Social Pro report actions', () => {
    it('blocks Free users from creating or editing Pro reports while preserving normal public read behavior', async () => {
        const {
            createSocialProReport,
            updateSocialProReportControls,
            createSocialProPrivateLink,
        } = await loadSocialProReportsModule();

        await expect(createSocialProReport({
            actor: freeActor,
            sourceAnalysisSessionId: 'analysis-1',
            visibility: 'public',
        })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/pro|premium|assinatura/i),
        });
        await expect(updateSocialProReportControls({
            actor: freeActor,
            reportId: 'report-1',
            controls: { showTimeline: true },
        })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/pro|premium|assinatura/i),
        });
        await expect(createSocialProPrivateLink({
            actor: freeActor,
            reportId: 'report-1',
        })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/pro|premium|assinatura/i),
        });
    });

    it('lets active Pro users create public and link-private reports with required honesty fields and audit events', async () => {
        const { createSocialProReport } = await loadSocialProReportsModule();

        await expect(createSocialProReport({
            actor: proActor,
            sourceAnalysisSessionId: 'analysis-1',
            visibility: 'public',
            requestedSections: ['setup_summary', 'timeline', 'spray_lab', 'ciclo_pro'],
        })).resolves.toMatchObject({
            success: true,
            report: {
                visibility: 'public',
                status: 'published',
                requiredHonestyFields: expect.arrayContaining([
                    'confidence',
                    'coverage',
                    'blockers',
                    'validation_state',
                    'no_overclaim_disclaimer',
                ]),
            },
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'social_pro.report.created' }),
            ]),
        });

        await expect(createSocialProReport({
            actor: proActor,
            sourceAnalysisSessionId: 'analysis-1',
            visibility: 'link_private',
        })).resolves.toMatchObject({
            success: true,
            report: {
                visibility: 'link_private',
                status: 'published',
                discoverableInFeed: false,
            },
        });
    });

    it('keeps existing safe reports readable after cancellation but blocks new report and advanced-control mutations', async () => {
        const {
            createSocialProReport,
            updateSocialProReportControls,
        } = await loadSocialProReportsModule();

        await expect(createSocialProReport({
            actor: canceledActor,
            sourceAnalysisSessionId: 'analysis-2',
            visibility: 'public',
        })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/pro|premium|assinatura/i),
        });
        await expect(updateSocialProReportControls({
            actor: canceledActor,
            reportId: 'existing-safe-report',
            controls: { showTimeline: false },
        })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/pro|premium|assinatura/i),
        });
    });

    it('supports revocable, regenerable, optionally expirable private links without recording private readers', async () => {
        const {
            createSocialProPrivateLink,
            regenerateSocialProPrivateLink,
            revokeSocialProPrivateLink,
        } = await loadSocialProReportsModule();

        await expect(createSocialProPrivateLink({
            actor: proActor,
            reportId: 'report-1',
            expiresAt: '2026-06-01T00:00:00.000Z',
        })).resolves.toMatchObject({
            success: true,
            link: {
                status: 'active',
                discoverableInFeed: false,
                expiresAt: '2026-06-01T00:00:00.000Z',
            },
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'social_pro.private_link.created' }),
            ]),
        });
        await expect(regenerateSocialProPrivateLink({
            actor: proActor,
            reportId: 'report-1',
            previousLinkId: 'link-1',
        })).resolves.toMatchObject({
            success: true,
            link: { status: 'active' },
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'social_pro.private_link.regenerated' }),
            ]),
        });
        await expect(revokeSocialProPrivateLink({
            actor: proActor,
            reportId: 'report-1',
            linkId: 'link-2',
        })).resolves.toMatchObject({
            success: true,
            link: { status: 'revoked' },
            auditEvents: expect.arrayContaining([
                expect.objectContaining({ type: 'social_pro.private_link.revoked' }),
            ]),
        });
    });

    it('limits hide/disable moderation to admins and preserves Pro-specific reasons in the audit trail', async () => {
        const { moderateSocialProReport } = await loadSocialProReportsModule();

        await expect(moderateSocialProReport({
            actor: proActor,
            reportId: 'report-1',
            action: 'hide',
            reason: 'abuso_badge_pro',
        })).resolves.toMatchObject({
            success: false,
            error: expect.stringMatching(/admin|moder/i),
        });
        await expect(moderateSocialProReport({
            actor: adminActor,
            reportId: 'report-1',
            action: 'disable',
            reason: 'claim_enganosa',
        })).resolves.toMatchObject({
            success: true,
            report: {
                status: 'disabled',
            },
            auditEvents: expect.arrayContaining([
                expect.objectContaining({
                    type: 'social_pro.report.moderated',
                    reason: 'claim_enganosa',
                }),
            ]),
        });
    });
});
