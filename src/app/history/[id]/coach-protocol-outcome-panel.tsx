'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { recordCoachProtocolOutcome } from '@/actions/history';
import type {
    CoachPlan,
    CoachProtocolOutcome,
    CoachProtocolOutcomeReasonCode,
    CoachProtocolOutcomeStatus,
} from '@/types/engine';

interface Props {
    readonly sessionId: string;
    readonly coachPlan: CoachPlan;
    readonly outcomes: readonly CoachProtocolOutcome[];
}

const OUTCOME_OPTIONS: readonly {
    readonly value: CoachProtocolOutcomeStatus;
    readonly label: string;
    readonly description: string;
}[] = [
    {
        value: 'started',
        label: 'Comecei o bloco',
        description: 'Marca que o protocolo foi iniciado e ainda precisa de fechamento.',
    },
    {
        value: 'completed',
        label: 'Completei sem medir',
        description: 'Fecha execucao neutra; ainda nao prova melhora ou piora.',
    },
    {
        value: 'improved',
        label: 'Melhorou no treino',
        description: 'Relato positivo que ainda pede validacao compativel.',
    },
    {
        value: 'unchanged',
        label: 'Ficou igual',
        description: 'Resultado neutro depois do bloco.',
    },
    {
        value: 'worse',
        label: 'Piorou no treino',
        description: 'Relato negativo; o coach deve baixar agressividade.',
    },
    {
        value: 'invalid_capture',
        label: 'Captura invalida',
        description: 'A captura ou execucao nao serve como prova tecnica.',
    },
];

const REASON_OPTIONS: readonly {
    readonly value: CoachProtocolOutcomeReasonCode;
    readonly label: string;
}[] = [
    { value: 'capture_quality', label: 'Qualidade da captura' },
    { value: 'incompatible_context', label: 'Contexto incompativel' },
    { value: 'poor_execution', label: 'Execucao ruim' },
    { value: 'variable_changed', label: 'Variavel alterada' },
    { value: 'confusing_protocol', label: 'Protocolo confuso' },
    { value: 'fatigue_or_pain', label: 'Dor/fadiga' },
    { value: 'other', label: 'Outro motivo' },
];

function formatOutcomeStatus(status: CoachProtocolOutcomeStatus): string {
    return OUTCOME_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function getLatestOutcome(outcomes: readonly CoachProtocolOutcome[]): CoachProtocolOutcome | null {
    return outcomes[outcomes.length - 1] ?? null;
}

export function CoachProtocolOutcomePanel({ sessionId, coachPlan, outcomes }: Props) {
    const router = useRouter();
    const receiptRef = useRef<HTMLDivElement>(null);
    const [isPending, startTransition] = useTransition();
    const [localOutcomes, setLocalOutcomes] = useState<readonly CoachProtocolOutcome[]>(outcomes);
    const [selectedStatus, setSelectedStatus] = useState<CoachProtocolOutcomeStatus>('started');
    const [reasonCodes, setReasonCodes] = useState<readonly CoachProtocolOutcomeReasonCode[]>([]);
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [isCorrecting, setIsCorrecting] = useState(false);

    const latestOutcome = getLatestOutcome(localOutcomes);
    const protocol = coachPlan.actionProtocols[0] ?? null;
    const shouldShowForm = !latestOutcome || isCorrecting;
    const requiresReason = selectedStatus === 'invalid_capture';
    const canSubmit = Boolean(protocol) && (!requiresReason || reasonCodes.length > 0);
    const coachPlanId = latestOutcome?.coachPlanId ?? `${sessionId}:coach-plan:${coachPlan.tier}`;

    useEffect(() => {
        if (status && !shouldShowForm) {
            receiptRef.current?.focus();
        }
    }, [shouldShowForm, status]);

    const reasonSummary = useMemo(() => (
        latestOutcome?.reasonCodes
            .map((reason) => REASON_OPTIONS.find((option) => option.value === reason)?.label ?? reason)
            .join(', ') ?? ''
    ), [latestOutcome]);

    const toggleReason = (reason: CoachProtocolOutcomeReasonCode) => {
        setReasonCodes((current) => (
            current.includes(reason)
                ? current.filter((item) => item !== reason)
                : [...current, reason]
        ));
    };

    const resetForm = () => {
        setSelectedStatus('started');
        setReasonCodes([]);
        setNote('');
        setIsCorrecting(false);
    };

    const handleSubmit = () => {
        setError(null);
        setStatus(null);

        if (!protocol) {
            setError('Sessao sem protocolo de coach valido para registrar.');
            return;
        }

        if (selectedStatus === 'invalid_capture' && reasonCodes.length === 0) {
            setError('Escolha ao menos um motivo para captura invalida.');
            return;
        }

        startTransition(async () => {
            const result = await recordCoachProtocolOutcome({
                sessionId,
                coachPlanId,
                protocolId: protocol.id,
                focusArea: coachPlan.primaryFocus.area,
                status: selectedStatus,
                reasonCodes,
                note,
                ...(isCorrecting && latestOutcome ? { revisionOfOutcomeId: latestOutcome.id } : {}),
            });

            if (!result.success) {
                setError(result.error);
                return;
            }

            setLocalOutcomes((current) => [...current, result.outcome]);
            resetForm();
            setStatus('Resultado registrado. Grave uma validacao compativel para fechar a leitura do coach.');
            router.refresh();
        });
    };

    return (
        <section className="glass-card" style={{ padding: 'var(--space-xl)', display: 'grid', gap: 'var(--space-md)' }}>
            <div style={{ display: 'grid', gap: 'var(--space-xs)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>Resultado do protocolo</h3>
                    <span className="badge badge-info">{coachPlan.primaryFocus.title}</span>
                    <span className="badge badge-info">{protocol?.id ?? 'sem protocolo'}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                    Feche o bloco com um resultado rapido. O coach usa isso como memoria, mas validacao tecnica ainda depende de clip compativel.
                </p>
            </div>

            {!shouldShowForm && latestOutcome ? (
                <div
                    ref={receiptRef}
                    tabIndex={-1}
                    aria-live="polite"
                    style={{
                        display: 'grid',
                        gap: 'var(--space-sm)',
                        padding: 'var(--space-md)',
                        border: '1px solid rgba(0, 240, 255, 0.2)',
                        borderRadius: '8px',
                        background: 'rgba(0, 240, 255, 0.06)',
                    }}
                >
                    <strong style={{ color: 'var(--color-text)' }}>
                        Resultado salvo: {formatOutcomeStatus(latestOutcome.status)}
                    </strong>
                    <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                        Evidencia: {latestOutcome.evidenceStrength}. {reasonSummary ? `Motivos: ${reasonSummary}. ` : ''}
                        {latestOutcome.conflict ? latestOutcome.conflict.nextValidationCopy : 'Gravar validacao compativel antes de avancar.'}
                    </p>
                    {latestOutcome.revisionOfOutcomeId ? (
                        <span className="badge badge-warning">
                            Revisao auditavel de {latestOutcome.revisionOfOutcomeId}
                        </span>
                    ) : null}
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        <a href="/analyze" className="btn btn-primary">
                            Gravar validacao compativel
                        </a>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                setIsCorrecting(true);
                                setStatus(null);
                                setError(null);
                            }}
                        >
                            Corrigir resultado e manter revisao auditavel
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div role="group" aria-label="Resultado do bloco" style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        {OUTCOME_OPTIONS.map((option) => {
                            const isSelected = selectedStatus === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                                    aria-pressed={isSelected}
                                    disabled={isPending}
                                    title={option.description}
                                    onClick={() => {
                                        setSelectedStatus(option.value);
                                        setError(null);
                                        if (option.value !== 'invalid_capture') {
                                            setReasonCodes([]);
                                        }
                                    }}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>

                    {requiresReason ? (
                        <fieldset style={{ display: 'grid', gap: 'var(--space-sm)', border: 0, padding: 0, margin: 0 }}>
                            <legend style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-xs)' }}>
                                Motivo obrigatorio para captura invalida
                            </legend>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                {REASON_OPTIONS.map((reason) => (
                                    <label
                                        key={reason.value}
                                        style={{
                                            minHeight: 40,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 10px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            color: 'var(--color-text-secondary)',
                                            fontSize: 'var(--text-xs)',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={reasonCodes.includes(reason.value)}
                                            disabled={isPending}
                                            onChange={() => toggleReason(reason.value)}
                                        />
                                        {reason.label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    ) : null}

                    <label style={{ display: 'grid', gap: 'var(--space-xs)' }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>Nota opcional</span>
                        <textarea
                            value={note}
                            maxLength={500}
                            rows={2}
                            disabled={isPending}
                            onChange={(event) => setNote(event.target.value)}
                            style={{
                                width: '100%',
                                resize: 'vertical',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.12)',
                                background: 'rgba(0,0,0,0.2)',
                                color: 'var(--color-text)',
                                padding: '10px 12px',
                            }}
                        />
                    </label>

                    <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={isPending || !canSubmit}
                            onClick={handleSubmit}
                        >
                            {isPending ? 'Registrando resultado...' : 'Registrar resultado do bloco'}
                        </button>
                        {isCorrecting ? (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                disabled={isPending}
                                onClick={() => {
                                    resetForm();
                                    setError(null);
                                }}
                            >
                                Cancelar correcao
                            </button>
                        ) : null}
                    </div>
                </>
            )}

            {status ? (
                <p aria-live="polite" style={{ margin: 0, color: 'var(--color-success)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                    {status}
                </p>
            ) : null}

            {error ? (
                <p aria-live="polite" style={{ margin: 0, color: 'var(--color-error)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                    {error}
                </p>
            ) : null}
        </section>
    );
}
