import type { Metadata } from 'next';

import { PRO_PLAYERS, getProStats } from '@/game/pubg';
import { Header } from '@/ui/components/header';

import { ProsClient } from './pros-client';
import styles from './pros.module.css';

export const metadata: Metadata = {
    title: 'Sens dos Pros',
    description: 'Referencia publica de configuracoes de jogadores profissionais de PUBG, separada da assinatura Pro.',
};

export const dynamic = 'force-dynamic';

export default function ProsPage(): React.JSX.Element {
    const stats = getProStats();
    const players = PRO_PLAYERS.map((player) => ({ ...player }));

    return (
        <>
            <Header />
            <div className={styles.page}>
                <section className={styles.hero}>
                    <div className={styles.heroBg} />
                    <div className={styles.heroContent}>
                        <span className={styles.badge}>
                            <span className={styles.badgeDot} />
                            SENS DOS PROS
                        </span>
                        <h1 className={styles.title}>
                            Referencia de sensibilidade profissional
                        </h1>
                        <p className={styles.subtitle}>
                            Configuracoes publicas de {stats.totalPlayers} jogadores profissionais
                            de {stats.teams} times em {stats.countries} paises. Esta rota e referencia
                            tecnica; Planos e Assinatura cuidam do Pro pago.
                        </p>

                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <span className={styles.statIcon}>SENS</span>
                                <div className={styles.statInfo}>
                                    <span className={styles.statNum}>{stats.avgCmPer360.toFixed(1)}</span>
                                    <span className={styles.statLabel}>cm/360 medio</span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statIcon}>DPI</span>
                                <div className={styles.statInfo}>
                                    <span className={styles.statNum}>{stats.mostCommonDpi}</span>
                                    <span className={styles.statLabel}>DPI mais usado</span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statIcon}>GRIP</span>
                                <div className={styles.statInfo}>
                                    <span className={styles.statNum}>Claw</span>
                                    <span className={styles.statLabel}>grip dominante</span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statIcon}>RNG</span>
                                <div className={styles.statInfo}>
                                    <span className={styles.statNum}>{stats.minCmPer360.toFixed(0)}-{stats.maxCmPer360.toFixed(0)}</span>
                                    <span className={styles.statLabel}>range cm/360</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <ProsClient players={players} stats={stats} />

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2 className={styles.sectionTitle}>Leituras do cenario profissional</h2>
                            <p className={styles.sectionSub}>
                                Use como referencia externa, nao como regra final para sua sens.
                            </p>
                        </div>
                    </div>
                    <div className={styles.insightGrid}>
                        <div className={styles.insightCard}>
                            <div className={styles.insightTop}>
                                <span className={styles.insightEmoji}>DPI</span>
                                <h3>DPI</h3>
                            </div>
                            <p><strong>80% dos pros usam 800 DPI.</strong> O padrao sugere DPI moderado com sens in-game baixa como base comum para controle fino.</p>
                        </div>
                        <div className={styles.insightCard}>
                            <div className={styles.insightTop}>
                                <span className={styles.insightEmoji}>CM</span>
                                <h3>Sensibilidade</h3>
                            </div>
                            <p>Media: <strong>{stats.avgCmPer360.toFixed(1)} cm/360</strong>. Entry fraggers: 26-33cm. Snipers: 36-58cm.</p>
                        </div>
                        <div className={styles.insightCard}>
                            <div className={styles.insightTop}>
                                <span className={styles.insightEmoji}>GR</span>
                                <h3>Grip Style</h3>
                            </div>
                            <p><strong>Claw grip aparece mais</strong> por equilibrar controle fino e estabilidade para sprays longos.</p>
                        </div>
                        <div className={styles.insightCard}>
                            <div className={styles.insightTop}>
                                <span className={styles.insightEmoji}>SCP</span>
                                <h3>Scopes</h3>
                            </div>
                            <p>Referencias profissionais costumam reduzir a sens entre red-dot e 8x para preservar controle em mira ampliada.</p>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
