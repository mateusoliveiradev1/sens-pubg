import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const innerJoin = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const listPublicCommunityFeed = vi.fn();
    const listVisibleCommunityPostComments = vi.fn();

    return {
        auth,
        select,
        from,
        innerJoin,
        where,
        limit,
        listPublicCommunityFeed,
        listVisibleCommunityPostComments,
    };
});

vi.mock('@/core/community-feed', () => ({
    listPublicCommunityFeed: mocks.listPublicCommunityFeed,
}));

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
    },
}));

vi.mock('@/actions/community-comments', () => ({
    listVisibleCommunityPostComments: mocks.listVisibleCommunityPostComments,
}));

vi.mock('@/ui/components/header', () => ({
    Header: () => null,
}));

vi.mock('./community-filters', () => ({
    CommunityFilters: () => null,
}));

vi.mock('./[slug]/post-detail', () => ({
    PostDetail: () => null,
}));

function createCommunityPostMetadataRow(
    overrides: Partial<{
        slug: string;
        authorId: string;
        status: 'draft' | 'published' | 'hidden' | 'archived' | 'deleted';
        requiredEntitlementKey: string | null;
        title: string;
        excerpt: string;
        snapshotPatchVersion: string;
        snapshotWeaponId: string;
        snapshotScopeId: string;
        snapshotDistance: number;
        snapshotDiagnoses: Array<{
            type: string;
            severity: number;
            description: string;
            cause: string;
            remediation: string;
        }>;
    }> = {},
) {
    return {
        slug: 'beryl-control-lab',
        authorId: 'author-1',
        status: 'published' as const,
        requiredEntitlementKey: null,
        title: 'Beryl control lab',
        excerpt: 'Snapshot tecnico para controlar recoil horizontal.',
        snapshotPatchVersion: '36.1',
        snapshotWeaponId: 'beryl-m762',
        snapshotScopeId: '4x',
        snapshotDistance: 47,
        snapshotDiagnoses: [
            {
                type: 'horizontal_drift',
                severity: 4,
                description: 'Drift lateral acumulando para a direita.',
                cause: 'Entrada corretiva atrasada no sustained spray.',
                remediation: 'Fechar o bloco com micro-ajustes mais curtos.',
            },
            {
                type: 'overpull',
                severity: 3,
                description: 'Compensacao vertical excedendo o necessario.',
                cause: 'Forca inicial acima da curva real do patch.',
                remediation: 'Reduzir o pull nos primeiros tiros.',
            },
        ],
        ...overrides,
    };
}

describe('community metadata', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.select.mockReturnValue({
            from: mocks.from,
        });

        mocks.from.mockReturnValue({
            innerJoin: mocks.innerJoin,
        });

        mocks.innerJoin.mockReturnValue({
            where: mocks.where,
        });

        mocks.where.mockReturnValue({
            limit: mocks.limit,
        });

        mocks.auth.mockResolvedValue(null);
        mocks.listVisibleCommunityPostComments.mockResolvedValue([]);
    });

    it('exposes discovery-ready metadata for the community feed page', async () => {
        const { metadata } = await import('./page');

        expect(metadata.title).toBe('Comunidade Sens PUBG');
        expect(metadata.description).toBe(
            'Veja posts publicos, setups e leituras de spray Sens PUBG por arma, patch e diagnostico.',
        );
        expect(metadata.alternates?.canonical).toBe('/community');
    });

    it('derives post detail metadata from the persisted snapshot', async () => {
        mocks.limit.mockResolvedValueOnce([createCommunityPostMetadataRow()]);

        const { generateMetadata } = await import('./[slug]/page');
        const metadata = await generateMetadata({
            params: Promise.resolve({
                slug: 'beryl-control-lab',
            }),
        });

        expect(metadata.title).toBe('Beryl control lab - Beryl M762 no Patch 36.1');
        expect(metadata.description).toBe(
            'Post publico de Beryl M762 com 4x ACOG a 47 m no patch 36.1. Diagnosticos: horizontal drift, overpull. Snapshot tecnico para controlar recoil horizontal.',
        );
        expect(metadata.alternates?.canonical).toBe('/community/beryl-control-lab');
    });
});
