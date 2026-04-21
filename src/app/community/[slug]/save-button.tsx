'use client';

import { useState, useTransition } from 'react';

import { setCommunityPostSave } from '@/actions/community-saves';

interface SaveButtonProps {
    readonly slug: string;
    readonly initialSaved: boolean;
    readonly className?: string;
}

function resolveSaveErrorMessage(error: string): string {
    if (error === 'Nao autenticado.') {
        return 'Entre na sua conta para salvar este post.';
    }

    return error;
}

export function SaveButton({
    slug,
    initialSaved,
    className,
}: SaveButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [saved, setSaved] = useState(initialSaved);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleToggle = () => {
        setErrorMessage(null);

        startTransition(async () => {
            try {
                const result = await setCommunityPostSave({
                    slug,
                    saved: !saved,
                });

                if (!result.success) {
                    setErrorMessage(resolveSaveErrorMessage(result.error));
                    return;
                }

                setSaved(result.saved);
            } catch {
                setErrorMessage('Nao foi possivel salvar agora.');
            }
        });
    };

    const activeStyle = saved
        ? {
            borderColor: 'rgba(255, 107, 0, 0.32)',
            background: 'rgba(255, 107, 0, 0.12)',
            color: 'var(--color-accent-primary-light)',
        }
        : undefined;

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
                className={className ?? 'btn btn-secondary'}
                style={activeStyle}
                onClick={handleToggle}
                disabled={isPending}
                aria-pressed={saved}
                aria-describedby={errorMessage ? 'community-save-status' : undefined}
            >
                {isPending ? 'Salvando...' : saved ? 'Salvo' : 'Salvar'}
            </button>

            {errorMessage ? (
                <p
                    id="community-save-status"
                    aria-live="polite"
                    style={{ margin: 0, color: 'var(--color-error)', fontSize: 'var(--text-xs)', maxWidth: 320 }}
                >
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}
