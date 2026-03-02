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

// ═══ Diagnosis Icons & Labels ═══
const DIAG_META: Record<string, { icon: string; label: string; color: string }> = {
    overpull: { icon: '⬇️', label: 'OVERPULL', color: '#ff3d3d' },
    underpull: { icon: '⬆️', label: 'UNDERPULL', color: '#f59e0b' },
    late_compensation: { icon: '⏱️', label: 'LATE RESPONSE', color: '#f97316' },
    excessive_jitter: { icon: '〰️', label: 'JITTER', color: '#ef4444' },
    horizontal_drift: { icon: '↔️', label: 'H. DRIFT', color: '#a855f7' },
    inconsistency: { icon: '🎲', label: 'INCONSISTENCY', color: '#eab308' },
};

// ═══ Profile Icons ═══
const PROFILE_META: Record<string, { icon: string; subtitle: string }> = {
    low: { icon: '🎯', subtitle: 'Máx. Precisão' },
    balanced: { icon: '⚖️', subtitle: 'Equilíbrio' },
    high: { icon: '⚡', subtitle: 'Máx. Velocidade' },
};

function SeverityDots({ severity }: { severity: number }) {
    return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map(i => (
                <div
                    key={i}
                    style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: i <= severity
                            ? severity >= 4 ? '#ef4444' : severity >= 3 ? '#f59e0b' : '#22c55e'
                            : 'rgba(255,255,255,0.1)',
                        transition: 'all 0.3s ease',
                        boxShadow: i <= severity && severity >= 4 ? '0 0 6px #ef4444' : 'none',
                    }}
                />
            ))}
            <span style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: severity >= 4 ? '#ef4444' : severity >= 3 ? '#f59e0b' : '#22c55e',
                marginLeft: '4px',
                fontWeight: 700,
            }}>
                {severity}/5
            </span>
        </div>
    );
}

function MetricTooltip({ text }: { text: string }) {
    return (
        <span style={{
            fontSize: '10px',
            color: 'var(--color-text-muted)',
            cursor: 'help',
            opacity: 0.6,
        }} title={text}>ⓘ</span>
    );
}

const METRIC_TOOLTIPS: Record<string, string> = {
    'Estabilidade': 'Score geral do spray (0-100). Mede quanto seu spray ficou concentrado.',
    'Controle Vertical': 'Razão entre pulldown real vs ideal. 1.0 = perfeito. >1 = overpull. <1 = underpull.',
    'Ruído Horizontal': 'Variação lateral do spray em pixels/frame. Menor = mais estável.',
    'Tempo de Resposta': 'Tempo (ms) até iniciar compensação de recuo após o primeiro tiro.',
    'Consistência': 'Quão similar são seus sprays entre si (0-100).',
    'VSM Sugerido': 'Multiplicador Vertical de Sensibilidade recomendado baseado na sua análise.',
};

export function ResultsDashboard({ result }: Props): React.JSX.Element {
    const [activeSession, setActiveSession] = useState<AnalysisResult>(result);
    const [expandedDiag, setExpandedDiag] = useState<number | null>(null);
    const [showAllScopes, setShowAllScopes] = useState<Record<string, boolean>>({});
    const isAggregated = activeSession.id === result.id;

    const { metrics, diagnoses, sensitivity, coaching } = activeSession;

    const metricCards = [
        { label: 'Estabilidade', value: Number(metrics.stabilityScore).toFixed(0), unit: '/100', color: Number(metrics.stabilityScore) >= 70 ? 'var(--color-success)' : Number(metrics.stabilityScore) >= 40 ? 'var(--color-warning)' : 'var(--color-error)' },
        { label: 'Controle Vertical', value: metrics.verticalControlIndex.toFixed(2), unit: '× ideal', color: Math.abs(metrics.verticalControlIndex - 1) < 0.15 ? 'var(--color-success)' : 'var(--color-warning)' },
        { label: 'Ruído Horizontal', value: metrics.horizontalNoiseIndex.toFixed(1), unit: 'px/frame', color: metrics.horizontalNoiseIndex <= 3 ? 'var(--color-success)' : 'var(--color-error)' },
        { label: 'Tempo de Resposta', value: Number(metrics.initialRecoilResponseMs).toFixed(0), unit: 'ms', color: Number(metrics.initialRecoilResponseMs) <= 180 ? 'var(--color-success)' : 'var(--color-warning)' },
        { label: 'Consistência', value: Number(metrics.consistencyScore).toFixed(0), unit: '/100', color: Number(metrics.consistencyScore) >= 65 ? 'var(--color-success)' : Number(metrics.consistencyScore) >= 40 ? 'var(--color-warning)' : 'var(--color-error)' },
        { label: 'VSM Sugerido', value: sensitivity.suggestedVSM?.toFixed(2) ?? '1.00', unit: '', color: sensitivity.suggestedVSM && sensitivity.suggestedVSM !== 1 ? 'var(--color-warning)' : 'var(--color-primary)' },
    ];

    // Sort diagnoses by severity (most critical first)
    const sortedDiagnoses = [...diagnoses].sort((a, b) => b.severity - a.severity);

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
                                <span className="metric-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {m.label} <MetricTooltip text={METRIC_TOOLTIPS[m.label] || ''} />
                                </span>
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

            {/* ═══ Diagnoses — Improved ═══ */}
            {sortedDiagnoses.length > 0 && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>🩺 Diagnósticos da IA</h3>
                    <div className={styles.diagnosisList}>
                        {sortedDiagnoses.map((d, i) => {
                            const meta = DIAG_META[d.type] || { icon: '⚠️', label: d.type.toUpperCase(), color: '#f59e0b' };
                            const matchingCoach = coaching.find(c => c.diagnosis.type === d.type);
                            const isExpanded = expandedDiag === i;

                            return (
                                <div
                                    key={d.type + i}
                                    className={`glass-card ${styles.diagnosisCard}`}
                                    style={{ borderLeftColor: meta.color, cursor: 'pointer' }}
                                    onClick={() => setExpandedDiag(isExpanded ? null : i)}
                                >
                                    {/* Header with severity dots + icon */}
                                    <div className={styles.diagnosisHeader}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '1.4rem' }}>{meta.icon}</span>
                                            <SeverityDots severity={d.severity} />
                                        </div>
                                        <span className={styles.diagnosisType} style={{ color: meta.color }}>
                                            {meta.label}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p className={styles.diagnosisDesc}>{d.description}</p>

                                    {/* Cause & Fix — better separated */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '12px',
                                        marginTop: '8px',
                                        padding: '12px',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '8px',
                                    }}>
                                        <div>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Por que acontece
                                            </span>
                                            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: '4px' }}>
                                                {d.cause}
                                            </p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Como corrigir
                                            </span>
                                            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: '4px' }}>
                                                {d.remediation}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Expandable Drill Section */}
                                    {matchingCoach && (
                                        <div style={{
                                            marginTop: '12px',
                                            overflow: 'hidden',
                                            maxHeight: isExpanded ? '300px' : '0',
                                            opacity: isExpanded ? 1 : 0,
                                            transition: 'all 0.3s ease',
                                        }}>
                                            <div style={{
                                                padding: '12px',
                                                background: 'rgba(6, 182, 212, 0.05)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(6, 182, 212, 0.15)',
                                            }}>
                                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    🏋️ Drill Profissional
                                                </span>
                                                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: '6px' }}>
                                                    {matchingCoach.howToTest}
                                                </p>
                                                <div style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)',
                                                }}>
                                                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>⏱️ Adaptação estimada</span>
                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>
                                                        {matchingCoach.adaptationTimeDays} {matchingCoach.adaptationTimeDays === 1 ? 'dia' : 'dias'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Expand hint */}
                                    {matchingCoach && (
                                        <div style={{
                                            textAlign: 'center',
                                            marginTop: '8px',
                                            fontSize: '10px',
                                            color: 'var(--color-text-muted)',
                                            opacity: 0.6,
                                        }}>
                                            {isExpanded ? '▲ Fechar drill' : '▼ Ver drill profissional'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ═══ Sensitivity Profiles — Improved ═══ */}
            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>⚙️ Calibração de Sensibilidade</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-lg)' }}>
                    {sensitivity.reasoning}
                </p>
                <div className={styles.profilesGrid}>
                    {sensitivity.profiles.map(profile => {
                        const pmeta = PROFILE_META[profile.type] || { icon: '⚙️', subtitle: '' };
                        const isRecommended = profile.type === sensitivity.recommended;
                        const showScopes = isRecommended || showAllScopes[profile.type];

                        return (
                            <div
                                key={profile.type}
                                className={`glass-card ${styles.profileCard} ${isRecommended ? styles.profileRecommended : ''}`}
                                style={!isRecommended ? { opacity: 0.7 } : undefined}
                            >
                                {isRecommended && (
                                    <span className={`badge badge-success ${styles.recommendedBadge}`}>⭐ Match Ideal</span>
                                )}

                                {/* Icon + Title */}
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{pmeta.icon}</div>
                                <h4>{profile.label}</h4>
                                <p style={{ fontSize: '11px', color: 'var(--color-accent-primary)', marginBottom: '8px', fontWeight: 600 }}>
                                    {pmeta.subtitle}
                                </p>
                                <p className={styles.profileDesc}>{profile.description}</p>

                                {/* Stats */}
                                <div className={styles.profileStats}>
                                    <div>
                                        <span className="metric-label">Sensibilidade Geral</span>
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

                                {/* Scope Table — always available, toggle for non-recommended */}
                                {showScopes && (
                                    <div className={styles.scopeTableContainer}>
                                        <table className={styles.scopeTable}>
                                            <thead>
                                                <tr>
                                                    <th>Mira</th>
                                                    <th>Atual</th>
                                                    <th>Novo</th>
                                                    <th>Δ</th>
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

                                {/* Toggle scopes for non-recommended */}
                                {!isRecommended && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowAllScopes(prev => ({ ...prev, [profile.type]: !prev[profile.type] }));
                                        }}
                                        style={{
                                            marginTop: '12px',
                                            background: 'none',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'var(--color-text-muted)',
                                            fontSize: '11px',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            width: '100%',
                                        }}
                                    >
                                        {showScopes ? '▲ Esconder miras' : '▼ Ver miras detalhadas'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ═══ Coach Feedback — Improved ═══ */}
            {coaching.length > 0 && (
                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>🏆 Mentor Perfeito (Coach)</h3>
                    <div className={styles.coachList}>
                        {[...coaching].sort((a, b) => b.diagnosis.severity - a.diagnosis.severity).map((c, i) => {
                            const meta = DIAG_META[c.diagnosis.type] || { icon: '⚠️', label: '', color: '#f59e0b' };
                            const priorityColor = c.diagnosis.severity >= 4 ? '#ef4444' : c.diagnosis.severity >= 3 ? '#f59e0b' : '#22c55e';
                            const priorityLabel = c.diagnosis.severity >= 4 ? '🔴 CRÍTICO' : c.diagnosis.severity >= 3 ? '🟡 IMPORTANTE' : '🟢 MENOR';

                            return (
                                <div key={i} className={`glass-card ${styles.coachCard}`}>
                                    {/* Priority Header */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '1.5rem' }}>{meta.icon}</span>
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: priorityColor, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                                                {priorityLabel}
                                            </span>
                                        </div>
                                        <SeverityDots severity={c.diagnosis.severity} />
                                    </div>

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
                                        <span className={styles.coachLabel}>🏋️ Drill Profissional</span>
                                        <p>{c.howToTest}</p>
                                    </div>

                                    {/* Adaptation bar */}
                                    <div className={styles.coachAdapt}>
                                        <div style={{ flex: 1 }}>
                                            <span>⏱️ Ciclo de Adaptação Estimado</span>
                                            <div style={{
                                                height: '4px',
                                                width: '100%',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '4px',
                                                marginTop: '8px',
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${(c.adaptationTimeDays / 7) * 100}%`,
                                                    background: 'linear-gradient(90deg, #06b6d4, #0ea5e9)',
                                                    borderRadius: '4px',
                                                    transition: 'width 1s ease',
                                                }} />
                                            </div>
                                        </div>
                                        <span className={styles.coachDays} style={{ marginLeft: '16px', whiteSpace: 'nowrap' }}>
                                            {c.adaptationTimeDays} {c.adaptationTimeDays === 1 ? 'dia' : 'dias'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
