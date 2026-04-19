import { beforeEach, describe, expect, it, vi } from 'vitest';

import { communityReports } from '@/db/schema';

const mocks = vi.hoisted(() => {
    const auth = vi.fn();
    const select = vi.fn();
    const from = vi.fn();
    const where = vi.fn();
    const limit = vi.fn();
    const insert = vi.fn();
    const reportValues = vi.fn();

    return {
        auth,
        select,
        from,
        where,
        limit,
        insert,
        reportValues,
    };
});

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/db', () => ({
    db: {
        select: mocks.select,
        insert: mocks.insert,
    },
}));

import { createCommunityReport } from './community-reports';

describe('createCommunityReport', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.auth.mockResolvedValue({
            user: { id: 'user-1' },
        });

        mocks.select.mockReturnValue({
            from: mocks.from,
        });
        mocks.from.mockReturnValue({
            where: mocks.where,
        });
        mocks.where.mockReturnValue({
            limit: mocks.limit,
        });

        mocks.insert.mockImplementation((table) => {
            if (table === communityReports) {
                return {
                    values: mocks.reportValues,
                };
            }

            throw new Error('Unexpected table');
        });

        mocks.reportValues.mockResolvedValue(undefined);
    });

    it('requires auth before creating a community report', async () => {
        mocks.auth.mockResolvedValue(null);

        const result = await createCommunityReport({
            entityType: 'post',
            entityId: 'post-1',
            reasonKey: 'spam',
            details: 'Post repetido.',
        });

        expect(result).toEqual({
            success: false,
            error: 'Nao autenticado.',
        });
        expect(mocks.select).not.toHaveBeenCalled();
        expect(mocks.insert).not.toHaveBeenCalled();
    });

    it('creates an open post report and persists trimmed reason and details', async () => {
        mocks.limit.mockResolvedValueOnce([{ id: 'post-1' }]);

        const result = await createCommunityReport({
            entityType: 'post',
            entityId: 'post-1',
            reasonKey: ' spam ',
            details: ' Conteudo duplicado no feed. ',
        });

        expect(result).toEqual({
            success: true,
            status: 'open',
        });
        expect(mocks.reportValues).toHaveBeenCalledWith({
            entityType: 'post',
            entityId: 'post-1',
            reportedByUserId: 'user-1',
            reasonKey: 'spam',
            details: 'Conteudo duplicado no feed.',
            status: 'open',
        });
    });

    it.each([
        {
            label: 'comment',
            entityType: 'comment' as const,
            entityId: 'comment-1',
        },
        {
            label: 'profile',
            entityType: 'profile' as const,
            entityId: 'profile-1',
        },
    ])('supports %s reports while keeping empty details nullable', async ({ entityType, entityId }) => {
        mocks.limit.mockResolvedValueOnce([{ id: entityId }]);

        const result = await createCommunityReport({
            entityType,
            entityId,
            reasonKey: 'abuse',
            details: '   ',
        });

        expect(result).toEqual({
            success: true,
            status: 'open',
        });
        expect(mocks.reportValues).toHaveBeenCalledWith({
            entityType,
            entityId,
            reportedByUserId: 'user-1',
            reasonKey: 'abuse',
            details: null,
            status: 'open',
        });
    });

    it('rejects the report when the target entity cannot be resolved', async () => {
        mocks.limit.mockResolvedValueOnce([]);

        const result = await createCommunityReport({
            entityType: 'comment',
            entityId: 'missing-comment',
            reasonKey: 'spam',
            details: 'Sem alvo valido.',
        });

        expect(result).toEqual({
            success: false,
            error: 'Entidade nao encontrada.',
        });
        expect(mocks.insert).not.toHaveBeenCalled();
    });
});
