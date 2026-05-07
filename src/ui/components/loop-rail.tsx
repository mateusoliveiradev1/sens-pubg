import React from 'react';
import styles from './premium-ui.module.css';

export type LoopStageKey =
    | 'clip'
    | 'evidence'
    | 'coach'
    | 'block'
    | 'outcome'
    | 'validation'
    | 'checkpoint';

interface LoopStage {
    readonly key: LoopStageKey;
    readonly label: string;
}

export const SENS_LOOP_STAGES: readonly LoopStage[] = [
    { key: 'clip', label: 'Clip' },
    { key: 'evidence', label: 'Evidencia' },
    { key: 'coach', label: 'Coach' },
    { key: 'block', label: 'Bloco' },
    { key: 'outcome', label: 'Resultado' },
    { key: 'validation', label: 'Validacao' },
    { key: 'checkpoint', label: 'Checkpoint' },
] as const;

interface LoopRailProps {
    readonly currentStage: LoopStageKey;
    readonly evidenceLabel: string;
    readonly nextActionLabel: string;
    readonly blocked?: boolean;
    readonly className?: string;
}

export function LoopRail({
    currentStage,
    evidenceLabel,
    nextActionLabel,
    blocked = false,
    className,
}: LoopRailProps): React.JSX.Element {
    return (
        <section
            aria-label="Loop Sens PUBG"
            className={[styles.loopRail, blocked ? styles.loopRailBlocked : null, className].filter(Boolean).join(' ')}
            data-current-stage={currentStage}
        >
            <ol className={styles.loopList}>
                {SENS_LOOP_STAGES.map((stage, index) => {
                    const active = stage.key === currentStage;

                    return (
                        <li
                            aria-current={active ? 'step' : undefined}
                            className={[
                                styles.loopStep,
                                active ? styles.loopStepCurrent : null,
                                blocked && active ? styles.loopStepBlocked : null,
                            ].filter(Boolean).join(' ')}
                            key={stage.key}
                        >
                            <span className={styles.loopIndex}>{String(index + 1).padStart(2, '0')}</span>
                            <span className={styles.loopLabel}>{stage.label}</span>
                        </li>
                    );
                })}
            </ol>
            <div className={styles.loopMeta}>
                <span>
                    Evidencia: <strong>{evidenceLabel}</strong>
                </span>
                <span>
                    Proxima acao: <strong>{nextActionLabel}</strong>
                </span>
            </div>
        </section>
    );
}
