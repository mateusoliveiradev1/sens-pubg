import Link from 'next/link';

import type {
    CicloProActionModel,
    CicloProMissionModel,
    CicloProViewModel,
} from './ciclo-pro-view-model';
import styles from './ciclo-pro.module.css';

interface CicloProProgramMapProps {
    readonly model: CicloProViewModel;
}

function ActionLink({
    action,
    variant = 'secondary',
}: {
    readonly action: CicloProActionModel;
    readonly variant?: 'primary' | 'secondary';
}): React.JSX.Element {
    return (
        <Link className={variant === 'primary' ? styles.primaryLink : styles.secondaryLink} href={action.href}>
            {action.label}
        </Link>
    );
}

function MissionCard({ mission }: { readonly mission: CicloProMissionModel }): React.JSX.Element {
    return (
        <article className={styles.missionCard}>
            <div className={styles.missionTopline}>
                <span>{mission.slotLabel}</span>
                <span>{mission.categoryLabel}</span>
                <span>{mission.statusLabel}</span>
            </div>
            <h3>{mission.title}</h3>
            <dl className={styles.missionAnatomy}>
                <div>
                    <dt>Agora</dt>
                    <dd>{mission.agora}</dd>
                </div>
                <div>
                    <dt>Por que importa</dt>
                    <dd>{mission.porQueImporta}</dd>
                </div>
                <div>
                    <dt>O que invalida</dt>
                    <dd>{mission.oQueInvalida}</dd>
                </div>
                <div>
                    <dt>Evidencia gerada</dt>
                    <dd>{mission.evidenciaGerada}</dd>
                </div>
            </dl>
            {mission.reasonLabels.length > 0 ? (
                <div className={styles.reasonList} aria-label="Razoes da missao">
                    {mission.reasonLabels.map((reason) => (
                        <span key={reason}>{reason}</span>
                    ))}
                </div>
            ) : null}
            <div className={styles.missionEvidence}>
                {mission.evidenceLabels.map((label) => (
                    <span key={label}>{label}</span>
                ))}
            </div>
            <ActionLink action={mission.proximoCta} variant="primary" />
        </article>
    );
}

function EmptyState({ model }: { readonly model: CicloProViewModel }): React.JSX.Element {
    return (
        <section className={styles.emptyState} aria-label="Entrada Ciclo Pro">
            <div>
                <span className={styles.kicker}>Entrada honesta</span>
                <h2>Crie uma base antes do mapa</h2>
                <p>{model.body}</p>
            </div>
            <div className={styles.emptyActions}>
                {model.emptySteps.map((action, index) => (
                    <ActionLink action={action} key={action.href} variant={index === 0 ? 'primary' : 'secondary'} />
                ))}
            </div>
        </section>
    );
}

function LockPanel({ model }: { readonly model: CicloProViewModel }): React.JSX.Element | null {
    if (!model.lock) {
        return null;
    }

    return (
        <section className={styles.lockPanel} aria-label="Bloqueio Ciclo Pro">
            <div>
                <span className={styles.kicker}>Free util, Pro completo</span>
                <h2>{model.lock.title}</h2>
                <p>{model.lock.body}</p>
            </div>
            <div className={styles.lockActions}>
                <ActionLink action={model.lock.cta} variant="primary" />
                <ActionLink action={{ label: 'Voltar ao dashboard', href: '/dashboard' }} />
            </div>
        </section>
    );
}

function FreeMission({ mission }: { readonly mission: CicloProMissionModel | null }): React.JSX.Element | null {
    if (!mission) {
        return null;
    }

    return (
        <section className={styles.freeMission} aria-label="Missao Free do Ciclo Pro">
            <div className={styles.sectionHeader}>
                <span className={styles.kicker}>Proximo passo Free</span>
                <h2>Uma missao real do ciclo</h2>
                <p>
                    O Free mostra uma missao basica com contexto, blocker, evidencia e CTA.
                    O mapa completo continua no Pro.
                </p>
            </div>
            <div className={styles.singleMission}>
                <MissionCard mission={mission} />
            </div>
        </section>
    );
}

export function CicloProProgramMap({ model }: CicloProProgramMapProps): React.JSX.Element {
    if (model.routeState === 'empty') {
        return <EmptyState model={model} />;
    }

    const map = model.programMap;

    return (
        <div className={styles.programStack}>
            <LockPanel model={model} />
            <FreeMission mission={model.freeMission} />

            {map ? (
                <>
                    <section className={styles.overviewGrid} aria-label="Resumo do Ciclo Pro">
                        <div>
                            <span className={styles.kicker}>Contexto</span>
                            <strong>{map.contextLabel}</strong>
                            <p>{map.activeLineLabel}</p>
                        </div>
                        <div>
                            <span className={styles.kicker}>Estado</span>
                            <strong>{map.stateLabel}</strong>
                            <p>{model.blockerLabel}</p>
                        </div>
                        <div>
                            <span className={styles.kicker}>Linha ativa</span>
                            <strong>{map.currentWeekLabel}</strong>
                            <p>{map.archivedLineCount} linhas arquivadas mantidas para auditoria.</p>
                        </div>
                    </section>

                    <section className={styles.weekMap} aria-label="Mapa de 30 dias do Ciclo Pro">
                        <div className={styles.sectionHeader}>
                            <span className={styles.kicker}>30 dias / quatro semanas</span>
                            <h2>Mapa adaptativo</h2>
                            <p>
                                Cada semana preserva cinco missoes principais e dois slots flexiveis para reparo,
                                consolidacao, validacao, transferencia ou reencaixe.
                            </p>
                        </div>

                        {map.weeks.map((week) => (
                            <section className={styles.weekBlock} data-active={week.active ? 'true' : 'false'} key={week.id}>
                                <div className={styles.weekHeader}>
                                    <div>
                                        <span className={styles.kicker}>{`Semana ${week.weekNumber} de 4`}</span>
                                        <h3>{week.label}</h3>
                                    </div>
                                    <div className={styles.weekMeta}>
                                        <span>{week.stateLabel}</span>
                                        <span>{week.canIncreaseDifficulty ? 'Pode subir com prova' : 'Mantem cautela'}</span>
                                        <span>{week.checkpointCount} checkpoints</span>
                                        {week.recoveryLabel ? <span>{week.recoveryLabel}</span> : null}
                                    </div>
                                </div>
                                {week.reasonLabels.length > 0 ? (
                                    <div className={styles.reasonList}>
                                        {week.reasonLabels.map((reason) => (
                                            <span key={reason}>{reason}</span>
                                        ))}
                                    </div>
                                ) : null}
                                <div className={styles.missionGrid}>
                                    {week.missions.map((mission) => (
                                        <MissionCard key={mission.id} mission={mission} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </section>

                    <section className={styles.checkpointRail} aria-label="Checkpoints do Ciclo Pro">
                        <div className={styles.sectionHeader}>
                            <span className={styles.kicker}>Camadas de checkpoint</span>
                            <h2>Operacional, tecnico e mensal</h2>
                            <p>
                                O checkpoint semanal fecha ritmo. O tecnico depende de validacao compativel.
                                O mensal resume a linha sem nota global.
                            </p>
                        </div>
                        <div className={styles.checkpointGrid}>
                            {map.checkpoints.length > 0 ? map.checkpoints.map((checkpoint) => (
                                <article className={styles.checkpointCard} key={checkpoint.id}>
                                    <span>{checkpoint.layerLabel}</span>
                                    <h3>{checkpoint.outcomeLabel}</h3>
                                    <p>{checkpoint.summary}</p>
                                    <div className={styles.checkpointMeta}>
                                        <span>{checkpoint.stateLabel}</span>
                                        <span>{checkpoint.canIncreaseDifficulty ? 'Dificuldade liberada' : 'Sem subida automatica'}</span>
                                    </div>
                                </article>
                            )) : (
                                <article className={styles.checkpointCard}>
                                    <span>Checkpoint</span>
                                    <h3>Aguardando evidencia</h3>
                                    <p>Feche uma semana, anexe Lab ou grave validacao compativel para abrir o trilho de checkpoint.</p>
                                    <div className={styles.checkpointMeta}>
                                        <span>Sem prova compativel</span>
                                        <span>Sem nota global</span>
                                    </div>
                                </article>
                            )}
                        </div>
                    </section>

                    <section className={styles.activeLinePanel} aria-label="Linha ativa e reencaixe">
                        <div>
                            <span className={styles.kicker}>Linha ativa</span>
                            <h2>{map.activeLineLabel}</h2>
                            <p>
                                Contexto: {map.contextLabel}. Reinicios arquivam a linha antiga e mantem a auditoria
                                sem misturar arma, mira, distancia ou sensibilidade diferente.
                            </p>
                        </div>
                        <div className={styles.lineActions}>
                            <ActionLink action={{ label: 'Abrir Spray Lab', href: '/spray-lab' }} />
                            <ActionLink action={{ label: 'Abrir historico', href: '/history' }} />
                            <ActionLink action={{ label: 'Gravar validacao compativel', href: '/analyze?mode=validation' }} variant="primary" />
                        </div>
                    </section>

                    {map.repairPanels.length > 0 ? (
                        <section className={styles.repairGrid} aria-label="Reparo e consolidacao do Ciclo Pro">
                            {map.repairPanels.map((panel) => (
                                <article className={styles.repairPanel} key={`${panel.action}:${panel.title}`}>
                                    <span className={styles.kicker}>Adaptacao visivel</span>
                                    <h3>{panel.title}</h3>
                                    <p>{panel.body}</p>
                                    <div className={styles.reasonList}>
                                        {panel.reasonLabels.map((reason) => (
                                            <span key={reason}>{reason}</span>
                                        ))}
                                    </div>
                                </article>
                            ))}
                        </section>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
