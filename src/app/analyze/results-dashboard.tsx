/**
 * Results Dashboard — Metrics, Diagnoses, Sensitivity, Coach.
 * Fully supports multi-spray aggregation and sub-session deep-dives.
 */

'use client';

import { useState } from 'react';
import type { AnalysisResult } from '@/types/engine';
import { SprayVisualization } from './spray-visualization';
import styles from './analysis.module.css';

interface Props {
    readonly result: AnalysisResult;
}

export function ResultsDashboard({ result }: Props): React.JSX.Element {
    const [activeSession, setActiveSession] = useState<AnalysisResult>(result);
    const isAggregated = activeSession.id === result.id;

    const { metrics, diagnoses, sensitivity, coaching } = activeSession;

    const metricCards = [
        { label: 'Estabilidade', value: Number(metrics.stabilityScore).toFixed(0), unit: '/100', color: Number(metrics.stabilityScore) >= 70 ? 'var(--color-success)' : Number(metrics.stabilityScore) >= 40 ? 'var(--color-warning)' : 'var(--color-error)' },
        { label: 'Controle Vertical', value: metrics.verticalControlIndex.toFixed(2), unit: '× ideal', color: Math.abs(metrics.verticalControlIndex - 1) < 0.15 ? 'var(--color-success)' : 'var(--color-warning)' },
        { label: 'Ruído Horizontal', value: metrics.horizontalNoiseIndex.toFixed(1), unit: 'px/frame', color: metrics.horizontalNoiseIndex <= 3 ? 'var(--color-success)' : 'var(--color-error)' },
        { label: 'Tempo de Resposta', value: Number(metrics.initialRecoilResponseMs).toFixed(0), unit: 'ms', color: Number(metrics.initialRecoilResponseMs) <= 180 ? 'var(--color-success)' : 'var(--color-warning)' },
        { label: 'Consistência', value: Number(metrics.consistencyScore).toFixed(0), unit: '/100', color: Number(metrics.consistencyScore) >= 65 ? 'var(--color-success)' : Number(metrics.consistencyScore) >= 40 ? 'var(--color-warning)' : 'var(--color-error)' },
        { label: 'VSM Sugerido', value: sensitivity.suggestedVSM?.toFixed(2) ?? '1.00', unit: '', color: 'var(--color-primary)' },
    ];

    return (
        <div className={styles.dashboard}>
            {/* ═══ Sub-Sessions Selector ═══ */}
            {result.subSessions && result.subSessions.length > 0 && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>🎯 Segmentação de Sprays</h3>
                    <div className={styles.subSessionsGrid}>
                        <div
                            className={`${styles.subSessionCard} glass-card ${isAggregated ? styles.subSessionCardActive : ''}`}
                            onClick={() => setActiveSession(result)}
                        >
                            <strong>📊 Média Geral</strong>
                            <p style={{ fontSize: 'var(--text-xs)', marginTop: '4px' }}>{result.subSessions.length} sprays</p>
                        </div>
                        {result.subSessions.map((sub, idx) => (
                            <div
                                key={sub.id}
                                className={`${styles.subSessionCard} glass-card ${activeSession.id === sub.id ? styles.subSessionCardActive : ''}`}
                                onClick={() => setActiveSession(sub)}
                            >
                                <strong>Spray #{idx + 1}</strong>
                                <p style={{ fontSize: 'var(--text-xs)', marginTop: '4px' }}>
                                    {(sub.trajectory.durationMs / 1000).toFixed(1)}s
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ═══ Metrics & Visualization ═══ */}
            <div className={styles.vizGrid}>
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>📊 Métricas {isAggregated ? '(Médias)' : ''}</h3>
                    <div className={styles.metricsGrid}>
                        {metricCards.map((m, i) => (
                            <div key={m.label} className={`glass-card ${styles.metricCard} animate-fade-in-up stagger-${i + 1}`}>
                                <span className="metric-label">{m.label}</span>
                                <span className="metric-value" style={{ color: m.color, WebkitTextFillColor: m.color, background: 'none' }}>
                                    {m.value}
                                </span>
                                <span className={styles.metricUnit}>{m.unit}</span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.phasesContainer} style={{ marginTop: 'var(--space-md)' }}>
                        <div className={styles.phaseBar}>
                            <div className={styles.phaseSegment} style={{ flex: 1 }}>
                                <span>Burst (1-10)</span>
                                <strong>VCI {metrics.burstVCI.toFixed(2)}</strong>
                            </div>
                            <div className={styles.phaseSegment} style={{ flex: 1, borderLeft: '1px solid var(--color-white-10)' }}>
                                <span>Meio (11-20)</span>
                                <strong>VCI {metrics.sustainedVCI.toFixed(2)}</strong>
                            </div>
                            <div className={styles.phaseSegment} style={{ flex: 1, borderLeft: '1px solid var(--color-white-10)' }}>
                                <span>Fadiga (21+)</span>
                                <strong>VCI {metrics.fatigueVCI.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>🎯 Trajetória do Recuo</h3>
                    <div className={`${styles.vizCard} glass-card`}>
                        <div className={styles.canvasContainer}>
                            <SprayVisualization trajectory={activeSession.trajectory} />
                        </div>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '12px', textAlign: 'center' }}>
                            Linha Laranja = Seu Movimento Real | Alvo = Centro Ideal
                        </p>
                    </div>
                </section>
            </div>

            {/* ═══ Diagnoses ═══ */}
            {diagnoses.length > 0 && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>🩺 Diagnósticos da IA</h3>
                    <div className={styles.diagnosisList}>
                        {diagnoses.map((d, i) => (
                            <div key={d.type + i} className={`glass-card ${styles.diagnosisCard}`}>
                                <div className={styles.diagnosisHeader}>
                                    <span className={`badge ${d.severity >= 4 ? 'badge-error' : d.severity >= 2 ? 'badge-warning' : 'badge-success'}`}>
                                        Intensidade {d.severity}/5
                                    </span>
                                    <span className={styles.diagnosisType}>
                                        {d.type.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                                <p className={styles.diagnosisDesc}>{d.description}</p>
                                <p className={styles.diagnosisCause}><strong>Por que:</strong> {d.cause}</p>
                                <p className={styles.diagnosisFix}><strong>Fix:</strong> {d.remediation}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ═══ Sensitivity Profiles ═══ */}
            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>⚙️ Calibração de Sensibilidade</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-lg)' }}>
                    {sensitivity.reasoning}
                </p>
                <div className={styles.profilesGrid}>
                    {sensitivity.profiles.map(profile => (
                        <div
                            key={profile.type}
                            className={`glass-card ${styles.profileCard} ${profile.type === sensitivity.recommended ? styles.profileRecommended : ''}`}
                        >
                            {profile.type === sensitivity.recommended && (
                                <span className={`badge badge-success ${styles.recommendedBadge}`}>⭐ Match Ideal</span>
                            )}
                            <h4>{profile.label}</h4>
                            <p className={styles.profileDesc}>{profile.description}</p>
                            <div className={styles.profileStats}>
                                <div>
                                    <span className="metric-label">Geral (Slider)</span>
                                    <span className={styles.profileValue}>{profile.general}</span>
                                </div>
                                <div>
                                    <span className="metric-label">ADS</span>
                                    <span className={styles.profileValue}>{profile.ads}</span>
                                </div>
                                <div>
                                    <span className="metric-label">cm/360°</span>
                                    <span className={styles.profileValue}>{profile.cmPer360}</span>
                                </div>
                            </div>

                            {/* Per-Scope Breakdown for the recommended profile or when expanded */}
                            {profile.type === sensitivity.recommended && (
                                <div className={styles.scopeTableContainer}>
                                    <table className={styles.scopeTable}>
                                        <thead>
                                            <tr>
                                                <th>Mira</th>
                                                <th>Atual</th>
                                                <th>Novo</th>
                                                <th>Ref</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {profile.scopes.map((s, idx) => (
                                                <tr key={idx}>
                                                    <td className={styles.scopeName}>{s.scopeName}</td>
                                                    <td style={{ opacity: 0.6, fontSize: '0.8rem' }}>{s.current}</td>
                                                    <td className={styles.scopeValue}>{s.recommended}</td>
                                                    <td className={`${styles.scopeChange} ${s.changePercent > 0 ? styles.scopeChangePos : s.changePercent < 0 ? styles.scopeChangeNeg : styles.scopeChangeNeut}`}>
                                                        {s.changePercent > 0 ? '+' : ''}{s.changePercent}%
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══ Coach Feedback ═══ */}
            {coaching.length > 0 && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>🏆 Mentor Perfeito (Coach)</h3>
                    <div className={styles.coachList}>
                        {coaching.map((c, i) => (
                            <div key={i} className={`glass-card ${styles.coachCard}`}>
                                <div className={styles.coachRow}>
                                    <span className={styles.coachLabel}>O que está falhando</span>
                                    <p>{c.whatIsWrong}</p>
                                </div>
                                <div className={styles.coachRow}>
                                    <span className={styles.coachLabel}>Mecânica do Erro</span>
                                    <p>{c.whyItHappens}</p>
                                </div>
                                <div className={styles.coachRow}>
                                    <span className={styles.coachLabel}>Protocolo de Ajuste</span>
                                    <p>{c.whatToAdjust}</p>
                                </div>
                                <div className={styles.coachRow}>
                                    <span className={styles.coachLabel}>Drill Profissional</span>
                                    <p>{c.howToTest}</p>
                                </div>
                                <div className={styles.coachAdapt}>
                                    <span>⏱️ Ciclo de Adaptação Estimado:</span>
                                    <span className={styles.coachDays}>{c.adaptationTimeDays} {c.adaptationTimeDays === 1 ? 'dia' : 'dias'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
