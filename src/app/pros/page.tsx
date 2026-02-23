/**
 * /pros — Comparação com Jogadores Profissionais.
 * Premium card UI with flag images, scope values, comparison feature.
 */

import type { Metadata } from 'next';
import { Header } from '@/ui/components/header';
import { PRO_PLAYERS, getProStats } from '@/game/pubg';
import { ProsClient } from './pros-client';
import styles from './pros.module.css';

export const metadata: Metadata = {
    title: 'Configs dos Pros',
    description: 'Compare suas configurações com as dos melhores jogadores profissionais de PUBG.',
};

export const dynamic = 'force-dynamic';

export default function ProsPage() {
    const stats = getProStats();
    const players = PRO_PLAYERS.map(p => ({ ...p }));

    return (
        <>
            <Header />
            <div className={styles.page}>
                {/* Hero */}
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
                            Configurações verificadas de {stats.totalPlayers} jogadores profissionais
                            de {stats.teams} times • {stats.countries} países
                        </p>

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

                {/* Client component handles comparison + interactive cards */}
                <ProsClient players={players} stats={stats} />

                {/* Insights */}
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
                            <p><strong>80% dos pros usam 800 DPI.</strong> O consenso é: DPI moderado + sens in-game baixa = precisão máxima.</p>
                        </div>
                        <div className={styles.insightCard}>
                            <div className={styles.insightTop}>
                                <span className={styles.insightEmoji}>🎯</span>
                                <h3>Sensibilidade</h3>
                            </div>
                            <p>Média: <strong>{stats.avgCmPer360.toFixed(1)} cm/360°</strong>. Entry fraggers: 26-33cm. Snipers: 36-58cm.</p>
                        </div>
                        <div className={styles.insightCard}>
                            <div className={styles.insightTop}>
                                <span className={styles.insightEmoji}>✋</span>
                                <h3>Grip Style</h3>
                            </div>
                            <p><strong>Claw grip domina</strong> — balanço entre controle fino e estabilidade para sprays longos.</p>
                        </div>
                        <div className={styles.insightCard}>
                            <div className={styles.insightTop}>
                                <span className={styles.insightEmoji}>🔭</span>
                                <h3>Scopes</h3>
                            </div>
                            <p>Todos os pros <strong>diminuem ~40% a sens</strong> entre red-dot e 8x para manter controle preciso.</p>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
