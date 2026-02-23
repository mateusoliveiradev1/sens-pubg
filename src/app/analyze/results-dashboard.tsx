/**
 * Results Dashboard — Metrics, Diagnoses, Sensitivity, Coach.
 */

'use client';

import type { AnalysisResult } from '@/types/engine';
import styles from './analysis.module.css';

interface Props {
    readonly result: AnalysisResult;
}

export function ResultsDashboard({ result }: Props): React.JSX.Element {
    const { metrics, diagnoses, sensitivity, coaching } = result;

    const metricCards = [
        { label: 'Estabilidade', value: Number(metrics.stabilityScore).toFixed(0), unit: '/100', color: Number(metrics.stabilityScore) >= 70 ? 'var(--color-success)' : Number(metrics.stabilityScore) >= 40 ? 'var(--color-warning)' : 'var(--color-error)' },
        { label: 'Controle Vertical', value: metrics.verticalControlIndex.toFixed(2), unit: '× ideal', color: Math.abs(metrics.verticalControlIndex - 1) < 0.15 ? 'var(--color-success)' : 'var(--color-warning)' },
        { label: 'Ruído Horizontal', value: metrics.horizontalNoiseIndex.toFixed(1), unit: 'px/frame', color: metrics.horizontalNoiseIndex <= 3 ? 'var(--color-success)' : 'var(--color-error)' },
        { label: 'Tempo de Resposta', value: Number(metrics.initialRecoilResponseMs).toFixed(0), unit: 'ms', color: Number(metrics.initialRecoilResponseMs) <= 180 ? 'var(--color-success)' : 'var(--color-warning)' },
        { label: 'Desvio Direcional', value: metrics.driftDirectionBias.direction === 'neutral' ? '—' : metrics.driftDirectionBias.magnitude.toFixed(1), unit: metrics.driftDirectionBias.direction === 'neutral' ? 'neutro' : metrics.driftDirectionBias.direction === 'left' ? '← esq' : 'dir →', color: metrics.driftDirectionBias.direction === 'neutral' ? 'var(--color-success)' : 'var(--color-warning)' },
        { label: 'Consistência', value: Number(metrics.consistencyScore).toFixed(0), unit: '/100', color: Number(metrics.consistencyScore) >= 65 ? 'var(--color-success)' : Number(metrics.consistencyScore) >= 40 ? 'var(--color-warning)' : 'var(--color-error)' },
    ];

    return (
        <div className={styles.dashboard}>
            {/* ═══ Metrics Grid ═══ */}
            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>📊 Métricas do Spray</h3>
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
            </section>

            {/* ═══ Diagnoses ═══ */}
            {diagnoses.length > 0 && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>🩺 Diagnósticos</h3>
                    <div className={styles.diagnosisList}>
                        {diagnoses.map((d, i) => (
                            <div key={d.type} className={`glass-card ${styles.diagnosisCard}`}>
                                <div className={styles.diagnosisHeader}>
                                    <span className={`badge ${d.severity >= 4 ? 'badge-error' : d.severity >= 2 ? 'badge-warning' : 'badge-success'}`}>
                                        Severidade {d.severity}/5
                                    </span>
                                    <span className={styles.diagnosisType}>
                                        {d.type.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                                <p className={styles.diagnosisDesc}>{d.description}</p>
                                <p className={styles.diagnosisCause}><strong>Causa:</strong> {d.cause}</p>
                                <p className={styles.diagnosisFix}><strong>Correção:</strong> {d.remediation}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ═══ Sensitivity Profiles ═══ */}
            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>🎯 Sensibilidade Recomendada</h3>
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
                                <span className={`badge badge-success ${styles.recommendedBadge}`}>⭐ Recomendado</span>
                            )}
                            <h4>{profile.label}</h4>
                            <p className={styles.profileDesc}>{profile.description}</p>
                            <div className={styles.profileStats}>
                                <div>
                                    <span className="metric-label">Geral</span>
                                    <span className={styles.profileValue}>{Number(profile.general).toFixed(1)}</span>
                                </div>
                                <div>
                                    <span className="metric-label">ADS</span>
                                    <span className={styles.profileValue}>{Number(profile.ads).toFixed(1)}</span>
                                </div>
                                <div>
                                    <span className="metric-label">cm/360°</span>
                                    <span className={styles.profileValue}>{Number(profile.cmPer360).toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══ Coach Feedback ═══ */}
            {coaching.length > 0 && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>🧠 Coach IA</h3>
                    <div className={styles.coachList}>
                        {coaching.map((c, i) => (
                            <div key={i} className={`glass-card ${styles.coachCard}`}>
                                <div className={styles.coachRow}>
                                    <span className={styles.coachLabel}>❌ O que está errado</span>
                                    <p>{c.whatIsWrong}</p>
                                </div>
                                <div className={styles.coachRow}>
                                    <span className={styles.coachLabel}>💡 Por que acontece</span>
                                    <p>{c.whyItHappens}</p>
                                </div>
                                <div className={styles.coachRow}>
                                    <span className={styles.coachLabel}>🔧 O que ajustar</span>
                                    <p>{c.whatToAdjust}</p>
                                </div>
                                <div className={styles.coachRow}>
                                    <span className={styles.coachLabel}>🧪 Como testar</span>
                                    <p>{c.howToTest}</p>
                                </div>
                                <div className={styles.coachAdapt}>
                                    <span>⏱️ Tempo para adaptar:</span>
                                    <span className={styles.coachDays}>{c.adaptationTimeDays} dias</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
