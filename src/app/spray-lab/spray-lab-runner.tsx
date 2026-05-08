'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
    completeSprayLabSessionAction,
    recordSprayLabSessionEventAction,
} from '@/actions/spray-lab';
import type { SprayLabRunnerActionModel, SprayLabStepModel, SprayLabViewModel } from './spray-lab-view-model';
import styles from './spray-lab.module.css';

interface SprayLabRunnerProps {
    readonly model: SprayLabViewModel;
}

function formatTimer(seconds: number): string {
    const safe = Math.max(0, seconds);
    const minutes = Math.floor(safe / 60);
    const remainder = safe % 60;

    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function actionTitle(action: SprayLabRunnerActionModel): string {
    switch (action.id) {
        case 'pause':
            return 'Pausar sem descartar a sessao';
        case 'resume':
            return 'Retomar a sessao pausada';
        case 'repeat':
            return 'Repetir a rep atual';
        case 'skip':
            return 'Pular rep e registrar downgrade';
        case 'problem':
            return 'Registrar problema de execucao';
        case 'variables_changed':
            return 'Marcar variavel alterada';
        case 'end_early':
            return 'Encerrar cedo com downgrade';
        default:
            return action.label;
    }
}

function StepTimer({ step }: { readonly step: SprayLabStepModel }): React.JSX.Element {
    const [remainingSeconds, setRemainingSeconds] = useState(step.timerSeconds);

    useEffect(() => {
        if (step.timerSeconds <= 0 || (step.state !== 'spray_em_andamento' && step.state !== 'descanso')) {
            return undefined;
        }

        const id = window.setInterval(() => {
            setRemainingSeconds((current) => Math.max(0, current - 1));
        }, 1000);

        return () => window.clearInterval(id);
    }, [step]);

    return (
        <div className={styles.timer} aria-label="Timer assistido">
            {formatTimer(remainingSeconds)}
        </div>
    );
}

export function SprayLabRunner({ model }: SprayLabRunnerProps): React.JSX.Element {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const session = model.session;
    const step = session?.step;

    const secondaryActions = useMemo(() => (
        step ? step.secondaryActions : []
    ), [step]);

    const runAction = (action: SprayLabRunnerActionModel): void => {
        if (!session) {
            return;
        }

        if (action.kind === 'href') {
            router.push(action.href ?? '/analyze');
            return;
        }

        setError(null);
        startTransition(async () => {
            const result = action.kind === 'complete'
                ? await completeSprayLabSessionAction({ labSessionId: session.id })
                : await recordSprayLabSessionEventAction({
                    labSessionId: session.id,
                    event: {
                        id: crypto.randomUUID(),
                        type: action.eventType!,
                        occurredAt: new Date().toISOString(),
                        ...(action.eventType === 'spray_end' ? { completedSprays: 1 } : {}),
                        ...(action.reasonCodes ? { reasonCodes: action.reasonCodes } : {}),
                        ...(action.variablesChanged ? { variablesChanged: true } : {}),
                    },
                });

            if (!result.success) {
                setError(result.error);
                return;
            }

            router.refresh();
        });
    };

    if (model.routeState === 'empty') {
        return (
            <section className={styles.emptyState} aria-label="Spray Lab sem sessao">
                <div className={styles.emptyIntro}>
                    <span className={styles.eyebrow}>{model.title}</span>
                    <h1>Abrir pelo resultado salvo</h1>
                    <p>{model.body}</p>
                </div>

                <div className={styles.emptyGuide} aria-label="Entradas do Spray Lab">
                    <div>
                        <strong>01</strong>
                        <span>Analise e salve um clip com protocolo completo.</span>
                    </div>
                    <div>
                        <strong>02</strong>
                        <span>Entre pelo historico ou pelo botao Abrir Spray Lab no resultado salvo.</span>
                    </div>
                    <div>
                        <strong>03</strong>
                        <span>Execute o bloco e volte ao Analyze para validacao compativel.</span>
                    </div>
                </div>

                <div className={styles.emptyActions}>
                    <Link className="btn btn-primary" href={model.primaryAction.href}>Ver historico</Link>
                    <Link className="btn btn-secondary" href="/analyze">Analisar clip</Link>
                </div>
            </section>
        );
    }

    if (model.routeState === 'repair' || !session || !step) {
        return (
            <section className={styles.repairPanel} aria-label="Reparo do Spray Lab">
                <span className={styles.eyebrow}>Reparo</span>
                <h2>{model.repair?.title ?? 'Sessao indisponivel'}</h2>
                <p>{model.repair?.whatHappened ?? model.body}</p>
                <p>{model.repair?.whyItMatters ?? 'Abra o Lab por uma analise salva com protocolo completo.'}</p>
                <ul>
                    {(model.repair?.ctas ?? ['Voltar ao Analyze']).map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
                <Link className="btn btn-primary" href="/analyze">Voltar ao Analyze</Link>
            </section>
        );
    }

    return (
        <section id="spray-lab-runner" className={styles.runner} aria-label="Cockpit Spray Lab">
            <div className={styles.cockpit}>
                <div className={styles.statePanel}>
                    <span className={styles.eyebrow}>{step.actLabel}</span>
                    <h2>{step.title}</h2>
                    <p>{step.body}</p>
                    <StepTimer key={`${session.id}:${step.state}:${step.timerSeconds}`} step={step} />
                    <button
                        className={styles.primaryButton}
                        disabled={isPending}
                        onClick={() => runAction(step.primaryAction)}
                        type="button"
                    >
                        {isPending ? 'Salvando estado' : step.primaryAction.label}
                    </button>
                    {error ? <p className={styles.errorText}>{error}</p> : null}
                </div>

                <div className={styles.sessionPanel}>
                    <div className={styles.progressHeader}>
                        <div>
                            <span className={styles.eyebrow}>Linha ativa</span>
                            <h3>{session.laneLabel}</h3>
                        </div>
                        <span className={styles.progressValue}>{session.progressLabel}</span>
                    </div>
                    <div className={styles.progressTrack} aria-label="Progresso da sessao">
                        <span style={{ width: `${session.progressPercent}%` }} />
                    </div>
                    <div className={styles.metaGrid}>
                        <span><strong>Contexto</strong>{session.contextLabel}</span>
                        <span><strong>Alvo</strong>{session.target}</span>
                        <span><strong>Fidelidade</strong>{session.fidelityLabel}</span>
                        <span><strong>Indice</strong>{session.indexLabel}</span>
                    </div>
                    <p className={styles.laneObjective}>{session.laneObjective}</p>
                </div>
            </div>

            <div className={styles.controls} aria-label="Controles manuais auditaveis">
                {secondaryActions.map((action) => (
                    <button
                        key={action.id}
                        className={action.primary ? styles.controlPrimary : styles.controlButton}
                        disabled={isPending}
                        onClick={() => runAction(action)}
                        title={actionTitle(action)}
                        type="button"
                    >
                        {action.label}
                    </button>
                ))}
            </div>

            {session.repair ? (
                <div className={styles.repairPanel} role="status">
                    <span className={styles.eyebrow}>Impacto de fidelidade</span>
                    <h3>{session.repair.title}</h3>
                    <p>{session.repair.whatHappened}</p>
                    <p>{session.repair.whyItMatters}</p>
                    <ul>
                        {session.repair.ctas.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <div className={styles.protocolGrid} aria-label="Protocolo da sessao">
                <div>
                    <span className={styles.eyebrow}>Preparar</span>
                    <ul>
                        {session.preparation.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
                <div>
                    <span className={styles.eyebrow}>Executar</span>
                    <ol>
                        {session.executionSteps.map((item) => <li key={item}>{item}</li>)}
                    </ol>
                </div>
                <div>
                    <span className={styles.eyebrow}>Validar clip</span>
                    <ul>
                        {session.validationChecklist.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
            </div>

            {session.audit ? (
                <details className={styles.auditPanel}>
                    <summary>Auditoria da sessao</summary>
                    <div className={styles.auditGrid}>
                        <span><strong>Protocolo</strong>{session.audit.protocolTitle}</span>
                        <span><strong>Eventos</strong>{session.audit.eventIds.length}</span>
                        {session.audit.fidelityComponents.map((component) => (
                            <span key={component.key}>
                                <strong>{component.label}</strong>{component.score}/100
                            </span>
                        ))}
                    </div>
                </details>
            ) : session.lockCopy ? (
                <div className={styles.lockPanel}>
                    <strong>Profundidade Pro</strong>
                    <p>{session.lockCopy}</p>
                </div>
            ) : null}

            <div className={styles.valueStrip}>
                <span>{session.freeValueCopy}</span>
                <span>{session.proValueCopy}</span>
            </div>
        </section>
    );
}
