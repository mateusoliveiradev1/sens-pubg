'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { recordSensitivityAcceptance } from '@/actions/history';
import type {
    AnalysisResult,
    SensitivityAcceptanceFeedback,
    SensitivityAcceptanceOutcome,
} from '@/types/engine';

interface Props {
    readonly sessionId: string;
    readonly sensitivity: AnalysisResult['sensitivity'];
}

const OUTCOME_OPTIONS: readonly {
    readonly value: SensitivityAcceptanceOutcome;
    readonly label: string;
    readonly description: string;
}[] = [
    {
        value: 'improved',
        label: 'Melhorou',
        description: 'O teste real ficou mais controlado ou mais consistente.',
    },
    {
        value: 'same',
        label: 'Ficou igual',
        description: 'Nao mudou o bastante para justificar ajuste forte ainda.',
    },
    {
        value: 'worse',
        label: 'Piorou',
        description: 'O resultado em jogo real ficou menos estavel do que antes.',
    },
];

function formatOutcome(outcome: SensitivityAcceptanceOutcome): string {
    if (outcome === 'improved') {
        return 'melhorou';
    }

    if (outcome === 'worse') {
        return 'piorou';
    }

    return 'ficou igual';
}

export function SensitivityAcceptancePanel({ sessionId, sensitivity }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<SensitivityAcceptanceFeedback | undefined>(sensitivity.acceptanceFeedback);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const recommendedProfile = sensitivity.profiles.find((profile) => profile.type === sensitivity.recommended);

    const handleRecord = (outcome: SensitivityAcceptanceOutcome) => {
        setError(null);
        setStatus(null);

        startTransition(async () => {
            const result = await recordSensitivityAcceptance(sessionId, outcome);

            if (!result.success) {
                setError(result.error);
                return;
            }

            setFeedback(result.acceptanceFeedback);
            setStatus('Teste salvo. O historico e a leitura desta analise foram atualizados.');
            router.refresh();
        });
    };

    return (
        <section className="glass-card" style={{ padding: 'var(--space-xl)', display: 'grid', gap: 'var(--space-md)' }}>
            <div style={{ display: 'grid', gap: 'var(--space-xs)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>Loop de aceitacao</h3>
                    <span className="badge badge-info">
                        Perfil em teste {recommendedProfile?.label ?? sensitivity.recommended}
                    </span>
                </div>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                    Quando voce testar a recomendacao em jogo real, marque aqui se ela melhorou, ficou igual ou piorou.
                    Esse retorno passa a organizar o historico com muito mais honestidade.
                </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                {OUTCOME_OPTIONS.map((option) => {
                    const isSelected = feedback?.outcome === option.value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            disabled={isPending}
                            onClick={() => handleRecord(option.value)}
                            title={option.description}
                        >
                            {isPending && isSelected ? 'Salvando...' : option.label}
                        </button>
                    );
                })}
            </div>

            {feedback ? (
                <div style={{ display: 'grid', gap: '6px' }}>
                    <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                        Ultimo teste salvo: o perfil {recommendedProfile?.label ?? feedback.testedProfile} {formatOutcome(feedback.outcome)} em {new Date(feedback.recordedAt).toLocaleString('pt-BR')}.
                    </p>
                    <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                        Esse retorno entra na leitura de campo do historico. Se ainda existir pouca amostra compativel, a linha pode continuar como &quot;Validando&quot; ate juntar mais testes reais.
                    </p>
                </div>
            ) : (
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                    Nenhum retorno real salvo ainda para esta recomendacao.
                </p>
            )}

            {status ? (
                <p style={{ margin: 0, color: 'var(--color-success)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                    {status}
                </p>
            ) : null}

            {error ? (
                <p style={{ margin: 0, color: 'var(--color-error)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
                    {error}
                </p>
            ) : null}
        </section>
    );
}
