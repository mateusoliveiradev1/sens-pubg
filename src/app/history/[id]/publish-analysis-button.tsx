'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { publishAnalysisSessionToCommunity } from '@/actions/community-posts';

interface Props {
    readonly analysisSessionId: string;
    readonly weaponName: string;
    readonly scopeName: string;
    readonly patchVersion: string;
    readonly createdAtIso: string;
}

function buildDraftPayload(input: Props) {
    const createdAtLabel = new Date(input.createdAtIso).toLocaleDateString('pt-BR');

    return {
        analysisSessionId: input.analysisSessionId,
        title: `${input.weaponName} - analise de spray`,
        excerpt: `Analise de ${input.weaponName} com ${input.scopeName} no patch ${input.patchVersion}.`,
        bodyMarkdown: [
            'Analise publicada a partir do historico do jogador.',
            '',
            `- Arma: ${input.weaponName}`,
            `- Mira: ${input.scopeName}`,
            `- Patch: ${input.patchVersion}`,
            `- Sessao original: ${createdAtLabel}`,
        ].join('\n'),
        status: 'draft' as const,
    };
}

export function PublishAnalysisButton(props: Props) {
    const [isPending, startTransition] = useTransition();
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [hasPublishedDraft, setHasPublishedDraft] = useState(false);
    const [createdSlug, setCreatedSlug] = useState<string | null>(null);

    const handlePublish = () => {
        setStatusMessage(null);
        setErrorMessage(null);

        startTransition(async () => {
            try {
                const result = await publishAnalysisSessionToCommunity(buildDraftPayload(props));

                if (!result.success) {
                    setErrorMessage(result.error);
                    return;
                }

                setHasPublishedDraft(true);
                setCreatedSlug(result.slug);
                setStatusMessage('Rascunho criado na comunidade.');
            } catch {
                setErrorMessage('Nao foi possivel criar o rascunho da comunidade agora.');
            }
        });
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px',
            }}
        >
            <button
                type="button"
                className={hasPublishedDraft ? 'btn btn-secondary' : 'btn btn-primary'}
                onClick={handlePublish}
                disabled={isPending || hasPublishedDraft}
                aria-describedby={statusMessage || errorMessage ? 'publish-analysis-entry-status' : undefined}
            >
                {isPending ? 'Criando rascunho...' : hasPublishedDraft ? 'Rascunho criado' : 'Publicar na comunidade'}
            </button>

            {statusMessage ? (
                <p
                    id="publish-analysis-entry-status"
                    aria-live="polite"
                    style={{ margin: 0, color: 'var(--color-success)', fontSize: 'var(--text-xs)' }}
                >
                    {statusMessage}
                </p>
            ) : null}

            {createdSlug ? (
                <Link
                    className="btn btn-ghost"
                    href={`/community/${createdSlug}`}
                    style={{ paddingInline: '0.75rem' }}
                >
                    Abrir rascunho
                </Link>
            ) : null}

            {errorMessage ? (
                <p
                    id="publish-analysis-entry-status"
                    aria-live="polite"
                    style={{ margin: 0, color: 'var(--color-error)', fontSize: 'var(--text-xs)', maxWidth: 320 }}
                >
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}
