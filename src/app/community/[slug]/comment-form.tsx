'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { createCommunityPostComment } from '@/actions/community-comments';

interface CommentFormProps {
    readonly slug: string;
    readonly diagnosisOptions: readonly string[];
    readonly canSubmit: boolean;
    readonly disabledReason: string | null;
}

function resolveCommentErrorMessage(error: string): string {
    if (error === 'Nao autenticado.') {
        return 'Entre na sua conta para comentar neste post.';
    }

    if (error === 'Comentario invalido.') {
        return 'Escreva algo antes de enviar.';
    }

    return error;
}

function humanizeDiagnosisOption(option: string): string {
    return option
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function CommentForm({
    slug,
    diagnosisOptions,
    canSubmit,
    disabledReason,
}: CommentFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [bodyMarkdown, setBodyMarkdown] = useState('');
    const [diagnosisContextKey, setDiagnosisContextKey] = useState('');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!canSubmit) {
        return disabledReason ? (
            <p
                aria-live="polite"
                style={{
                    margin: 0,
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--text-sm)',
                }}
            >
                {disabledReason}
            </p>
        ) : null;
    }

    const handleSubmit = () => {
        setStatusMessage(null);
        setErrorMessage(null);

        startTransition(async () => {
            try {
                const result = await createCommunityPostComment({
                    slug,
                    bodyMarkdown,
                    diagnosisContextKey,
                });

                if (!result.success) {
                    setErrorMessage(resolveCommentErrorMessage(result.error));
                    return;
                }

                setBodyMarkdown('');
                setDiagnosisContextKey('');
                setStatusMessage('Comentario publicado.');
                router.refresh();
            } catch {
                setErrorMessage('Nao foi possivel publicar o comentario agora.');
            }
        });
    };

    return (
        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
                <label
                    htmlFor="community-comment-body"
                    style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}
                >
                    O que voce viu
                </label>
                <textarea
                    id="community-comment-body"
                    className="input"
                    value={bodyMarkdown}
                    onChange={(event) => setBodyMarkdown(event.target.value)}
                    rows={4}
                    placeholder="Conte o ajuste que voce faria, o que sentiu no spray ou o proximo teste."
                    style={{
                        resize: 'vertical',
                        minHeight: 120,
                    }}
                />
            </div>

            <div style={{ display: 'grid', gap: '0.5rem' }}>
                <label
                    htmlFor="community-comment-diagnosis"
                    style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}
                >
                    Falar de qual leitura?
                </label>
                <select
                    id="community-comment-diagnosis"
                    className="input"
                    value={diagnosisContextKey}
                    onChange={(event) => setDiagnosisContextKey(event.target.value)}
                >
                    <option value="">Sem foco tecnico</option>
                    {diagnosisOptions.map((option) => (
                        <option key={option} value={option}>
                            {humanizeDiagnosisOption(option)}
                        </option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={isPending}
                    aria-describedby={
                        statusMessage || errorMessage ? 'community-comment-form-status' : undefined
                    }
                >
                    {isPending ? 'Enviando...' : 'Comentar'}
                </button>
            </div>

            {statusMessage ? (
                <p
                    id="community-comment-form-status"
                    aria-live="polite"
                    style={{ margin: 0, color: 'var(--color-success)', fontSize: 'var(--text-xs)' }}
                >
                    {statusMessage}
                </p>
            ) : null}

            {errorMessage ? (
                <p
                    id="community-comment-form-status"
                    aria-live="polite"
                    style={{ margin: 0, color: 'var(--color-error)', fontSize: 'var(--text-xs)' }}
                >
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}
