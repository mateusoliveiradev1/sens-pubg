'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { publishAnalysisSessionToCommunity } from '@/actions/community-posts';
import { buildCommunityPublishPayload } from './publish-analysis-button.payload';

interface Props {
    readonly analysisSessionId: string;
    readonly weaponName: string;
    readonly scopeName: string;
    readonly patchVersion: string;
    readonly createdAtIso: string;
}

export function PublishAnalysisButton(props: Props) {
    const [isPending, startTransition] = useTransition();
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [hasPublishedPost, setHasPublishedPost] = useState(false);
    const [createdSlug, setCreatedSlug] = useState<string | null>(null);

    const handlePublish = () => {
        setStatusMessage(null);
        setErrorMessage(null);

        startTransition(async () => {
            try {
                const result = await publishAnalysisSessionToCommunity(
                    buildCommunityPublishPayload(props),
                );

                if (!result.success) {
                    setErrorMessage(result.error);
                    return;
                }

                setHasPublishedPost(true);
                setCreatedSlug(result.slug);
                setStatusMessage('Publicado na comunidade.');
            } catch {
                setErrorMessage('Nao foi possivel publicar na comunidade agora.');
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
                className={hasPublishedPost ? 'btn btn-secondary' : 'btn btn-primary'}
                onClick={handlePublish}
                disabled={isPending || hasPublishedPost}
                aria-describedby={statusMessage || errorMessage ? 'publish-analysis-entry-status' : undefined}
            >
                {isPending ? 'Publicando...' : hasPublishedPost ? 'Publicado' : 'Publicar na comunidade'}
            </button>

            <Link
                className="btn btn-ghost"
                href="/community"
                style={{ paddingInline: '0.75rem' }}
            >
                Ir para comunidade
            </Link>

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
                    Abrir publicacao
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
