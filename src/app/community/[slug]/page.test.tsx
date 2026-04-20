import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const NOT_FOUND_ERROR = new Error('NEXT_NOT_FOUND');

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const leftJoin = vi.fn();
    const innerJoin = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const notFound = vi.fn();
    const listVisibleCommunityPostComments = vi.fn();

    return {
        auth,
        select,
        from,
        leftJoin,
        innerJoin,
        where,
        limit,
        notFound,
        listVisibleCommunityPostComments,
    };
});

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
    Header: () => <div>Header</div>,
}));

vi.mock('./copy-sens-button', () => ({
    CopySensButton: ({ slug }: { readonly slug: string }) => (
        <div data-copy-sens={slug}>copy-sens:{slug}</div>
    ),
}));

vi.mock('./like-button', () => ({
    LikeButton: ({
        slug,
        initialLiked,
        initialLikeCount,
    }: {
        readonly slug: string;
        readonly initialLiked: boolean;
        readonly initialLikeCount: number;
    }) => (
        <div data-like-button={slug}>
            like:{slug}:{String(initialLiked)}:{initialLikeCount}
        </div>
    ),
}));

vi.mock('./save-button', () => ({
    SaveButton: ({
        slug,
        initialSaved,
    }: {
        readonly slug: string;
        readonly initialSaved: boolean;
    }) => <div data-save-button={slug}>save:{slug}:{String(initialSaved)}</div>,
}));

vi.mock('./comment-form', () => ({
    CommentForm: ({
        slug,
        canSubmit,
        disabledReason,
    }: {
        readonly slug: string;
        readonly canSubmit: boolean;
        readonly disabledReason: string | null;
    }) => (
        <div data-comment-form={slug}>
            comment-form:{slug}:{String(canSubmit)}:{disabledReason ?? 'none'}
        </div>
    ),
}));

vi.mock('next/navigation', () => ({
    notFound: mocks.notFound,
}));

function createPersistedPostDetail(
    overrides: Partial<{
        slug: string;
        authorId: string;
        status: 'draft' | 'published' | 'hidden' | 'archived' | 'deleted';
    }> = {},
) {
    return {
        id: 'post-1',
        slug: 'beryl-control-lab',
        authorId: 'author-1',
        status: 'published' as const,
        requiredEntitlementKey: null,
        title: 'Beryl control lab',
        excerpt: 'Snapshot tecnico para controlar recoil horizontal.',
        bodyMarkdown:
            'Linha de base validada com patch recente.\nPriorize consistencia antes de subir a sens.',
        publishedAt: new Date('2026-04-19T04:00:00.000Z'),
        primaryWeaponId: 'beryl-m762',
        primaryPatchVersion: '36.1',
        primaryDiagnosisKey: 'horizontal_drift',
        authorProfileSlug: 'spray-doctor',
        authorProfileDisplayName: 'Spray Doctor',
        authorProfileVisibility: 'public' as const,
        authorCreatorProgramStatus: 'approved' as const,
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
                bias: {
                    direction: 'right',
                    magnitude: 0.42,
                },
            },
            {
                type: 'overpull',
                severity: 3,
                description: 'Compensacao vertical excedendo o necessario.',
                cause: 'Forca inicial acima da curva real do patch.',
                remediation: 'Reduzir o pull nos primeiros tiros.',
                verticalControlIndex: 1.28,
                excessPercent: 12,
            },
        ],
        ...overrides,
    };
}

async function loadPageModule() {
    return import('./page');
}

async function renderPage(slug: string) {
    const { default: CommunityPostPage } = await loadPageModule();
    const element = await CommunityPostPage({
        params: Promise.resolve({ slug }),
    });

    return renderToStaticMarkup(element);
}

describe('community post detail page', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.select.mockReturnValue({
            from: mocks.from,
        });

        mocks.from.mockReturnValue({
            leftJoin: mocks.leftJoin,
            innerJoin: mocks.innerJoin,
            where: mocks.where,
        });

        mocks.leftJoin.mockReturnValue({
            where: mocks.where,
        });

        mocks.innerJoin.mockReturnValue({
            innerJoin: mocks.innerJoin,
            where: mocks.where,
        });

        mocks.where.mockReturnValue({
            limit: mocks.limit,
        });

        mocks.notFound.mockImplementation(() => {
            throw NOT_FOUND_ERROR;
        });

        mocks.auth.mockResolvedValue(null);
        mocks.listVisibleCommunityPostComments.mockResolvedValue([
            {
                id: 'comment-1',
                author: {
                    id: 'user-2',
                    name: 'Coach Ace',
                    image: null,
                },
                bodyMarkdown: 'Primeiro comentario visivel.',
                diagnosisContextKey: null,
                createdAt: new Date('2026-04-19T04:05:00.000Z'),
            },
            {
                id: 'comment-2',
                author: {
                    id: 'user-3',
                    name: 'Coach B',
                    image: null,
                },
                bodyMarkdown: 'Segundo comentario com contexto tecnico.',
                diagnosisContextKey: 'horizontal_drift',
                createdAt: new Date('2026-04-19T04:08:00.000Z'),
            },
        ]);
    });

    it('renders the persisted snapshot details and shows the copy sens button', async () => {
        mocks.limit
            .mockResolvedValueOnce([createPersistedPostDetail()])
            .mockResolvedValueOnce([{ count: 4 }]);

        const markup = await renderPage('beryl-control-lab');

        expect(markup).toContain('Beryl control lab');
        expect(markup).toContain('Patch 36.1');
        expect(markup).toContain('Beryl M762');
        expect(markup).toContain('4x');
        expect(markup).toContain('47 m');
        expect(markup).toContain('horizontal_drift');
        expect(markup).toContain('overpull');
        expect(markup).toContain('Drift lateral acumulando para a direita.');
        expect(markup).toContain('copy-sens:beryl-control-lab');
        expect(markup).toContain('like:beryl-control-lab:false:4');
        expect(markup).toContain('save:beryl-control-lab:false');
        expect(markup).toContain('Abrir perfil do autor');
        expect(markup).toContain('/community/users/spray-doctor');
        expect(markup).toContain('/community?weaponId=beryl-m762');
        expect(markup).toContain('/community?patchVersion=36.1');
        expect(markup).toContain('/community?diagnosisKey=horizontal_drift');
        expect(markup).toContain(
            'comment-form:beryl-control-lab:false:Entre na sua conta para comentar neste post.',
        );
        expect(markup).toContain('Primeiro comentario visivel.');
        expect(markup).toContain('Segundo comentario com contexto tecnico.');
        expect(markup).toContain('horizontal_drift');
    });

    it('allows the author to open their own draft post detail', async () => {
        mocks.auth.mockResolvedValue({
            user: { id: 'author-1' },
        });
        mocks.limit
            .mockResolvedValueOnce([
                createPersistedPostDetail({
                    status: 'draft',
                }),
            ])
            .mockResolvedValueOnce([{ count: 7 }])
            .mockResolvedValueOnce([{ postId: 'post-1' }])
            .mockResolvedValueOnce([{ postId: 'post-1' }]);

        const markup = await renderPage('beryl-control-lab');

        expect(markup).toContain('Beryl control lab');
        expect(markup).toContain('Patch 36.1');
        expect(markup).toContain('copy-sens:beryl-control-lab');
        expect(markup).toContain('like:beryl-control-lab:true:7');
        expect(markup).toContain('save:beryl-control-lab:true');
        expect(markup).toContain(
            'comment-form:beryl-control-lab:false:Comentarios liberados apenas quando o post estiver publicado.',
        );
    });

    it('returns notFound when the current visibility policy denies public access', async () => {
        mocks.limit.mockResolvedValueOnce([
            createPersistedPostDetail({
                status: 'draft',
            }),
        ]);

        await expect(renderPage('beryl-control-lab')).rejects.toBe(NOT_FOUND_ERROR);
        expect(mocks.notFound).toHaveBeenCalledTimes(1);
    });
});
