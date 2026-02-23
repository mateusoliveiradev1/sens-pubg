/**
 * /pros — Página de Comparação com Jogadores Profissionais.
 * Tabela interativa com filtros por role, DPI, e comparação visual.
 */

import type { Metadata } from 'next';
import { PRO_PLAYERS, getProStats } from '@/game/pubg';
import styles from './pros.module.css';

export const metadata: Metadata = {
    title: 'Configs dos Pros',
    description: 'Compare suas configurações de sensibilidade com as dos melhores jogadores profissionais de PUBG.',
};

export default function ProsPage() {
    const stats = getProStats();

    return (
        <div className={styles.container}>
            {/* Header */}
            <section className={styles.hero}>
                <span className={styles.badge}>📊 Database de Pros</span>
                <h1 className={styles.title}>
                    Configs dos <span className={styles.accent}>Profissionais</span>
                </h1>
                <p className={styles.subtitle}>
                    Compare suas configurações com as dos melhores jogadores do mundo.
                    Dados de {stats.totalPlayers} jogadores profissionais.
                </p>

                {/* Quick Stats */}
                <div className={styles.statsRow}>
                    <div className={styles.statBox}>
                        <span className={styles.statValue}>{stats.avgCmPer360.toFixed(1)}</span>
                        <span className={styles.statLabel}>cm/360° médio</span>
                    </div>
                    <div className={styles.divider} />
                    <div className={styles.statBox}>
                        <span className={styles.statValue}>{stats.mostCommonDpi}</span>
                        <span className={styles.statLabel}>DPI mais usado</span>
                    </div>
                    <div className={styles.divider} />
                    <div className={styles.statBox}>
                        <span className={styles.statValue}>{stats.minCmPer360.toFixed(0)}–{stats.maxCmPer360.toFixed(0)}</span>
                        <span className={styles.statLabel}>range cm/360°</span>
                    </div>
                    <div className={styles.divider} />
                    <div className={styles.statBox}>
                        <span className={styles.statValue}>Claw</span>
                        <span className={styles.statLabel}>grip dominante</span>
                    </div>
                </div>
            </section>

            {/* Pro Table */}
            <section className={styles.tableSection}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Jogador</th>
                                <th>Time</th>
                                <th>Role</th>
                                <th>DPI</th>
                                <th>Sens</th>
                                <th>cm/360°</th>
                                <th>Mouse</th>
                                <th>Grip</th>
                            </tr>
                        </thead>
                        <tbody>
                            {PRO_PLAYERS.map((player) => (
                                <tr key={player.id} className={styles.row}>
                                    <td className={styles.playerCell}>
                                        <span className={styles.flag}>{player.country}</span>
                                        <span className={styles.playerName}>{player.name}</span>
                                    </td>
                                    <td className={styles.teamCell}>{player.team}</td>
                                    <td>
                                        <span className={styles.roleBadge} data-role={player.role}>
                                            {player.role}
                                        </span>
                                    </td>
                                    <td className={styles.numCell}>{player.dpi}</td>
                                    <td className={styles.numCell}>{player.inGameSens}</td>
                                    <td className={styles.sensCell}>
                                        <div className={styles.sensBar}>
                                            <div
                                                className={styles.sensBarFill}
                                                style={{ width: `${Math.min((player.cmPer360 / 60) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span>{player.cmPer360.toFixed(1)}</span>
                                    </td>
                                    <td className={styles.mouseCell}>{player.mouse}</td>
                                    <td className={styles.gripCell}>{player.gripStyle}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Scope Sensitivity Breakdown */}
            <section className={styles.scopeSection}>
                <h2 className={styles.sectionTitle}>Sensibilidade por Scope</h2>
                <p className={styles.sectionDesc}>
                    Como os pros ajustam a sensibilidade para cada magnificação.
                </p>
                <div className={styles.scopeGrid}>
                    {PRO_PLAYERS.slice(0, 6).map((player) => (
                        <div key={player.id} className={styles.scopeCard}>
                            <div className={styles.scopeCardHeader}>
                                <span className={styles.flag}>{player.country}</span>
                                <strong>{player.name}</strong>
                                <span className={styles.scopeTeam}>{player.team}</span>
                            </div>
                            <div className={styles.scopeValues}>
                                {(['red-dot', '2x', '3x', '4x', '6x', '8x'] as const).map((scope) => (
                                    <div key={scope} className={styles.scopeRow}>
                                        <span className={styles.scopeLabel}>{scope}</span>
                                        <div className={styles.scopeBarTrack}>
                                            <div
                                                className={styles.scopeBarFill}
                                                style={{ width: `${((player.scopeSens[scope] ?? 0) / 70) * 100}%` }}
                                            />
                                        </div>
                                        <span className={styles.scopeNum}>{player.scopeSens[scope] ?? '—'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Insight */}
            <section className={styles.insightSection}>
                <h2 className={styles.sectionTitle}>💡 Insights</h2>
                <div className={styles.insightGrid}>
                    <div className={styles.insightCard}>
                        <h3>DPI</h3>
                        <p>
                            <strong>80% dos pros usam 800 DPI.</strong> DPIs mais altos (como 1600) são raros no cenário competitivo.
                            A maioria prefere precisão com DPI moderado.
                        </p>
                    </div>
                    <div className={styles.insightCard}>
                        <h3>cm/360°</h3>
                        <p>
                            A média dos pros é <strong>{stats.avgCmPer360.toFixed(1)} cm/360°</strong>.
                            Entry fraggers tendem a jogar mais rápido (26-33cm), enquanto snipers preferem mais lento (36-58cm).
                        </p>
                    </div>
                    <div className={styles.insightCard}>
                        <h3>Grip Style</h3>
                        <p>
                            <strong>Claw grip domina</strong> no cenário pro. É o balanço ideal entre controle fino (fingertip)
                            e estabilidade (palm) para sprays longos.
                        </p>
                    </div>
                    <div className={styles.insightCard}>
                        <h3>Scope Sens</h3>
                        <p>
                            Todos os pros <strong>diminuem a sens nos scopes maiores</strong>. A queda média é de ~40% entre red-dot e 8x.
                            Isso compensa a magnificação aumentada.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
