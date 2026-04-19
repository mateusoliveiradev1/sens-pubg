'use client';

import { useId, useState, useTransition } from 'react';

import { createCommunityReport } from '@/actions/community-reports';
import type { CommunityReportEntityType } from '@/db/schema';

interface ReportButtonProps {
    readonly entityType: CommunityReportEntityType;
    readonly entityId: string;
    readonly subjectLabel?: string;
    readonly className?: string;
}

const reportReasonOptions = [
    {
        value: 'spam',
        label: 'Spam ou repeticao',
    },
    {
        value: 'abuse',
        label: 'Assedio ou abuso',
    },
    {
        value: 'misleading',
        label: 'Informacao enganosa',
    },
    {
        value: 'other',
        label: 'Outro motivo',
    },
] as const;

function resolveReportErrorMessage(error: string, subjectLabel: string): string {
    if (error === 'Nao autenticado.') {
        return `Entre na sua conta para reportar ${subjectLabel}.`;
    }

    if (error === 'Report invalido.') {
        return 'Selecione um motivo valido antes de enviar o report.';
    }

    return error;
}

export function ReportButton({
    entityType,
    entityId,
    subjectLabel = 'este conteudo',
    className,
}: ReportButtonProps) {
    const panelId = useId();
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [reasonKey, setReasonKey] = useState<string>(reportReasonOptions[0].value);
    const [details, setDetails] = useState('');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = () => {
        setStatusMessage(null);
        setErrorMessage(null);

        startTransition(async () => {
            try {
                const result = await createCommunityReport({
                    entityType,
                    entityId,
                    reasonKey,
                    details,
                });

                if (!result.success) {
                    setErrorMessage(resolveReportErrorMessage(result.error, subjectLabel));
                    return;
                }

                setReasonKey(reportReasonOptions[0].value);
                setDetails('');
                setIsOpen(false);
                setStatusMessage('Report enviado. O item foi registrado para revisao.');
            } catch {
                setErrorMessage('Nao foi possivel enviar o report agora.');
            }
        });
    };

    return (
        <div
            style={{
                display: 'grid',
                gap: '8px',
                alignItems: 'flex-start',
            }}
        >
            <button
                type="button"
                className={className ?? 'btn btn-secondary'}
                onClick={() => {
                    setStatusMessage(null);
                    setErrorMessage(null);
                    setIsOpen((currentValue) => !currentValue);
                }}
                disabled={isPending}
                aria-expanded={isOpen}
                aria-controls={panelId}
            >
                {isOpen ? 'Cancelar report' : 'Reportar'}
            </button>

            {isOpen ? (
                <div
                    id={panelId}
                    className="glass-card"
                    style={{
                        display: 'grid',
                        gap: 'var(--space-md)',
                        maxWidth: 420,
                    }}
                >
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <label
                            htmlFor={`${panelId}-reason`}
                            style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}
                        >
                            Motivo
                        </label>
                        <select
                            id={`${panelId}-reason`}
                            className="input"
                            value={reasonKey}
                            onChange={(event) => setReasonKey(event.target.value)}
                        >
                            {reportReasonOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <label
                            htmlFor={`${panelId}-details`}
                            style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}
                        >
                            Detalhes
                        </label>
                        <textarea
                            id={`${panelId}-details`}
                            className="input"
                            value={details}
                            onChange={(event) => setDetails(event.target.value)}
                            rows={4}
                            placeholder="Explique rapidamente o contexto do report."
                            style={{
                                resize: 'vertical',
                                minHeight: 110,
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={isPending}
                        >
                            {isPending ? 'Enviando report...' : 'Enviar report'}
                        </button>
                    </div>
                </div>
            ) : null}

            {statusMessage ? (
                <p
                    aria-live="polite"
                    style={{ margin: 0, color: 'var(--color-success)', fontSize: 'var(--text-xs)' }}
                >
                    {statusMessage}
                </p>
            ) : null}

            {errorMessage ? (
                <p
                    aria-live="polite"
                    style={{ margin: 0, color: 'var(--color-error)', fontSize: 'var(--text-xs)', maxWidth: 320 }}
                >
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}
