/**
 * /pros — Comparação com Jogadores Profissionais.
 * Design premium com cards individuais, visual bars, e insights.
 */

import type { Metadata } from 'next';
import { Header } from '@/ui/components/header';
import { PRO_PLAYERS, getProStats } from '@/game/pubg';
import styles from './pros.module.css';

export const metadata: Metadata = {
    title: 'Configs dos Pros',
    description: 'Compare suas configurações com as dos melhores jogadores profissionais de PUBG.',
};

export const dynamic = 'force-dynamic';

export default function ProsPage() {
    const stats = getProStats();

    return (
        <>
            <Header />
            <div className={styles.page}>
                {/* ─── Hero ─── */}
                <section className={styles.hero}>
                    <div className={styles.heroBg} />
                    <div className={styles.heroContent}>
                        <span className={styles.badge}>
                            <span className={styles.badgeDot} />
                            PRO CONFIGS
                        </span>
                        <h1 className={styles.title}>
                            O que os <span className={styles.gradient}>melhores do mundo</span> usam
                        </h1>
                        <p className={styles.subtitle}>
                            Configurações reais de {stats.totalPlayers} jogadores profissionais
                            de PUBG. DPI, sensibilidade, mouse, grip e mais.
                        </p>

                        {/* Quick Stats */}
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <span className={styles.statIcon}>🎯</span>
                                <div className={styles.statInfo}>
                                    <span className={styles.statNum}>{stats.avgCmPer360.toFixed(1)}</span>
                                    <span className={styles.statLabel}>cm/360° médio</span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statIcon}>🖱️</span>
                                <div className={styles.statInfo}>
                                    <span className={styles.statNum}>{stats.mostCommonDpi}</span>
                                    <span className={styles.statLabel}>DPI mais usado</span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statIcon}>✋</span>
                                <div className={styles.statInfo}>
                                    <span className={styles.statNum}>Claw</span>
                                    <span className={styles.statLabel}>grip dominante</span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statIcon}>📏</span>
                                <div className={styles.statInfo}>
                                    <span className={styles.statNum}>{stats.minCmPer360.toFixed(0)}–{stats.maxCmPer360.toFixed(0)}</span>
                                    <span className={styles.statLabel}>range cm/360°</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── Player Cards ─── */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Jogadores</h2>
                        <p className={styles.sectionSub}>{stats.totalPlayers} profissionais • Atualizado Feb 2026</p>
                    </div>

                    <div className={styles.playerGrid}>
                        {PRO_PLAYERS.map((player) => {
                            const sensPercent = Math.min((player.cmPer360 / 60) * 100, 100);
                            return (
                                <article key={player.id} className={styles.playerCard}>
                                    {/* Card Header */}
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardPlayer}>
                                            <span className={styles.cardFlag}>{player.country}</span>
                                            <div>
                                                <h3 className={styles.cardName}>{player.name}</h3>
                                                <span className={styles.cardTeam}>{player.teamLogo} {player.team}</span>
                                            </div>
                                        </div>
                                        <span className={styles.rolePill} data-role={player.role}>
                                            {player.role}
                                        </span>
                                    </div>

                                    {/* Sensitivity Visual */}
                                    <div className={styles.sensSection}>
                                        <div className={styles.sensHeader}>
                                            <span className={styles.sensLabel}>cm/360°</span>
                                            <span className={styles.sensValue}>{player.cmPer360.toFixed(1)}</span>
                                        </div>
                                        <div className={styles.sensTrack}>
                                            <div className={styles.sensFill} style={{ width: `${sensPercent}%` }} />
                                            <div className={styles.sensMarker} style={{ left: `${(stats.avgCmPer360 / 60) * 100}%` }} />
                                        </div>
                                        <div className={styles.sensRange}>
                                            <span>Rápido</span>
                                            <span className={styles.sensAvgLabel}>Média: {stats.avgCmPer360.toFixed(1)}</span>
                                            <span>Lento</span>
                                        </div>
                                    </div>

                                    {/* Config Details */}
                                    <div className={styles.configGrid}>
                                        <div className={styles.configItem}>
                                            <span className={styles.configLabel}>DPI</span>
                                            <span className={styles.configValue}>{player.dpi}</span>
                                        </div>
                                        <div className={styles.configItem}>
                                            <span className={styles.configLabel}>In-Game</span>
                                            <span className={styles.configValue}>{player.inGameSens}</span>
                                        </div>
                                        <div className={styles.configItem}>
                                            <span className={styles.configLabel}>Mouse</span>
                                            <span className={styles.configValue}>{player.mouse.split(' ').slice(-2).join(' ')}</span>
                                        </div>
                                        <div className={styles.configItem}>
                                            <span className={styles.configLabel}>Grip</span>
                                            <span className={styles.configValue}>{player.gripStyle}</span>
                                        </div>
                                    </div>

                                    {/* Scope Sens Bar Chart */}
                                    <div className={styles.scopeSection}>
                                        <span className={styles.scopeTitle}>Scope Sensitivity</span>
                                        <div className={styles.scopeBars}>
                                            {(['red-dot', '2x', '3x', '4x', '6x', '8x'] as const).map((scope) => {
                                                const val = player.scopeSens[scope] ?? 0;
                                                return (
                                                    <div key={scope} className={styles.scopeBar}>
                                                        <div
                                                            className={styles.scopeBarInner}
                                                            style={{ height: `${(val / 70) * 100}%` }}
                                                        />
                                                        <span className={styles.scopeBarLabel}>{scope}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Achievements */}
                                    {player.achievements.length > 0 && (
                                        <div className={styles.achievements}>
                                            <span className={styles.achIcon}>🏆</span>
                                            <span className={styles.achText}>{player.achievements[0]}</span>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </section>

                {/* ─── Insights Section ─── */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>💡 Insights do Cenário Pro</h2>
                    </div>

                    <div className={styles.insightGrid}>
                        <div className={styles.insightCard}>
                            <div className={styles.insightTop}>
                                <span className={styles.insightEmoji}>🖱️</span>
                                <h3>DPI</h3>
                            </div>
                            <p>
                                <strong>80% dos pros usam 800 DPI.</strong> DPIs maiores (1600+) são raríssimos.
                                O consenso é: DPI moderado + sens in-game baixa = precisão máxima.
                            </p>
                        </div>
                        <div className={styles.insightCard}>
                            <div className={styles.insightTop}>
                                <span className={styles.insightEmoji}>🎯</span>
                                <h3>Sensibilidade</h3>
                            </div>
                            <p>
                                Média: <strong>{stats.avgCmPer360.toFixed(1)} cm/360°</strong>. Entry fraggers jogam
                                mais rápido (26-33cm), snipers preferem mais lento (36-58cm) para precisão.
                            </p>
                        </div>
                        <div className={styles.insightCard}>
                            <div className={styles.insightTop}>
                                <span className={styles.insightEmoji}>✋</span>
                                <h3>Grip Style</h3>
                            </div>
                            <p>
                                <strong>Claw grip domina</strong> o cenário pro. Balanço perfeito entre controle fino
                                (fingertip) e estabilidade (palm) para sprays longos.
                            </p>
                        </div>
                        <div className={styles.insightCard}>
                            <div className={styles.insightTop}>
                                <span className={styles.insightEmoji}>🔭</span>
                                <h3>Scopes</h3>
                            </div>
                            <p>
                                Todos os pros <strong>diminuem ~40% a sens</strong> entre red-dot e 8x.
                                Isso compensa a magnificação e mantém o controle preciso.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
