import { describe, expect, it } from 'vitest';

async function loadCommunityModerationModule() {
    return import('./community-moderation');
}

describe('community moderation policy', () => {
    it('maps hidden, archived and deleted posts to non-destructive moderation states', async () => {
        const { getCommunityPostModerationState } = await loadCommunityModerationModule();

        expect([
            getCommunityPostModerationState('hidden'),
            getCommunityPostModerationState('archived'),
            getCommunityPostModerationState('deleted'),
        ]).toEqual([
            {
                status: 'hidden',
                publicCanRead: false,
                authorCanRead: true,
                preservesEntityRecord: true,
                isModerated: true,
            },
            {
                status: 'archived',
                publicCanRead: false,
                authorCanRead: true,
                preservesEntityRecord: true,
                isModerated: true,
            },
            {
                status: 'deleted',
                publicCanRead: false,
                authorCanRead: false,
                preservesEntityRecord: true,
                isModerated: true,
            },
        ]);
    });

    it('keeps draft and published posts outside the moderated-read branch', async () => {
        const { getCommunityPostModerationState } = await loadCommunityModerationModule();

        expect(getCommunityPostModerationState('draft')).toEqual({
            status: 'draft',
            publicCanRead: false,
            authorCanRead: true,
            preservesEntityRecord: true,
            isModerated: false,
        });

        expect(getCommunityPostModerationState('published')).toEqual({
            status: 'published',
            publicCanRead: true,
            authorCanRead: true,
            preservesEntityRecord: true,
            isModerated: false,
        });
    });

    it('hides moderator_hidden comments from the public without erasing the moderation trail', async () => {
        const {
            getCommunityCommentModerationState,
            isCommunityCommentPubliclyVisible,
        } = await loadCommunityModerationModule();

        expect(getCommunityCommentModerationState('visible')).toEqual({
            status: 'visible',
            publicCanRead: true,
            preservesEntityRecord: true,
            isModerated: false,
        });

        expect(getCommunityCommentModerationState('author_deleted')).toEqual({
            status: 'author_deleted',
            publicCanRead: false,
            preservesEntityRecord: true,
            isModerated: false,
        });

        expect(getCommunityCommentModerationState('moderator_hidden')).toEqual({
            status: 'moderator_hidden',
            publicCanRead: false,
            preservesEntityRecord: true,
            isModerated: true,
        });

        expect(isCommunityCommentPubliclyVisible('visible')).toBe(true);
        expect(isCommunityCommentPubliclyVisible('moderator_hidden')).toBe(false);
    });
});
