import { describe, expect, it } from 'vitest';

import { buildCommunityPublishPayload } from './publish-analysis-button.payload';

describe('buildCommunityPublishPayload', () => {
    it('creates a published community payload from the history detail context', () => {
        const payload = buildCommunityPublishPayload({
            analysisSessionId: 'session-1',
            weaponName: 'AUG',
            scopeName: '2x Scope',
            patchVersion: '41.1',
            createdAtIso: '2026-04-19T18:45:00.000Z',
        });

        expect(payload).toEqual({
            analysisSessionId: 'session-1',
            title: 'AUG - analise de spray',
            excerpt: 'Analise de AUG com 2x Scope no patch 41.1.',
            bodyMarkdown: [
                'Analise publicada a partir do historico do jogador.',
                '',
                '- Arma: AUG',
                '- Mira: 2x Scope',
                '- Patch: 41.1',
                '- Sessao original: 19/04/2026',
            ].join('\n'),
            status: 'published',
        });
    });
});
