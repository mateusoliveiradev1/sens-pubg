'use client';

/**
 * ProsClient — Interactive client component for pro player comparison.
 * Features: your sens comparator, player cards with real flags, scope numbers.
 */

import { useState } from 'react';
import type { ProPlayer } from '@/game/pubg';
import styles from './pros.module.css';

interface ProsClientProps {
    players: ProPlayer[];
    stats: {
        totalPlayers: number;
        avgCmPer360: number;
        minCmPer360: number;
        maxCmPer360: number;
    };
}

const SCOPES = ['red-dot', '2x', '3x', '4x', '6x', '8x'] as const;

const FLAG_URL = (code: string) =>
    `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;

export function ProsClient({ players, stats }: ProsClientProps) {
    const [userDpi, setUserDpi] = useState('');
    const [userSens, setUserSens] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

    const userCm360 = userDpi && userSens
        ? (2.54 * 360) / (Number(userDpi) * (Number(userSens) / 100))
        : null;

    const filteredPlayers = roleFilter === 'all'
        ? players
        : players.filter(p => p.role === roleFilter);

    const toggleSelect = (id: string) => {
        setSelectedPlayers(prev =>
            prev.includes(id)
                ? prev.filter(p => p !== id)
                : prev.length < 2
                    ? [...prev, id]
                    : [prev[1]!, id]
        );
    };

    const compareMode = selectedPlayers.length === 2;
    const compPlayers = compareMode
        ? selectedPlayers.map(id => players.find(p => p.id === id)!).filter(Boolean)
        : [];

    return (
        <>
            {/* ─── Your Sens Comparator ─── */}
            <section className={styles.comparator}>
                <div className={styles.comparatorInner}>
                    <div className={styles.comparatorLeft}>
                        <h2 className={styles.comparatorTitle}>Compare sua Sensibilidade</h2>
                        <p className={styles.comparatorDesc}>
                            Digite seu DPI e sensibilidade in-game para ver como você se compara com os pros.
                        </p>
                    </div>
                    <div className={styles.comparatorInputs}>
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>DPI</label>
                            <input
                                type="number"
                                className={styles.input}
                                placeholder="800"
                                value={userDpi}
                                onChange={e => setUserDpi(e.target.value)}
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>In-Game Sens</label>
                            <input
                                type="number"
                                className={styles.input}
                                placeholder="45"
                                value={userSens}
                                onChange={e => setUserSens(e.target.value)}
                            />
                        </div>
                        {userCm360 !== null && (
                            <div className={styles.userResult}>
                                <span className={styles.userResultLabel}>Seu cm/360°</span>
                                <span className={styles.userResultValue}>{userCm360.toFixed(1)}</span>
                                <span className={styles.userResultCompare}>
                                    {userCm360 < stats.avgCmPer360
                                        ? `${(stats.avgCmPer360 - userCm360).toFixed(1)}cm mais rápido que a média`
                                        : userCm360 > stats.avgCmPer360
                                            ? `${(userCm360 - stats.avgCmPer360).toFixed(1)}cm mais lento que a média`
                                            : 'Exatamente na média dos pros!'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ─── Compare 2 Players Side by Side ─── */}
            {compareMode && (
                <section className={styles.compareSection}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>⚔️ Comparação</h2>
                        <button className={styles.clearBtn} onClick={() => setSelectedPlayers([])}>
                            Limpar
                        </button>
                    </div>
                    <div className={styles.compareGrid}>
                        {compPlayers.map(player => (
                            <div key={player.id} className={styles.compareCard}>
                                <div className={styles.compareHeader}>
                                    <img src={FLAG_URL(player.countryCode)} alt={player.countryCode} className={styles.flagImg} />
                                    <strong>{player.name}</strong>
                                    <span className={styles.compareTeam}>{player.team}</span>
                                </div>
                                <div className={styles.compareStats}>
                                    <div className={styles.compareStat}>
                                        <span className={styles.compareStatLabel}>cm/360°</span>
                                        <span className={styles.compareStatVal}>{player.cmPer360.toFixed(1)}</span>
                                    </div>
                                    <div className={styles.compareStat}>
                                        <span className={styles.compareStatLabel}>DPI</span>
                                        <span className={styles.compareStatVal}>{player.dpi}</span>
                                    </div>
                                    <div className={styles.compareStat}>
                                        <span className={styles.compareStatLabel}>Sens</span>
                                        <span className={styles.compareStatVal}>{player.inGameSens}</span>
                                    </div>
                                    <div className={styles.compareStat}>
                                        <span className={styles.compareStatLabel}>Mouse</span>
                                        <span className={styles.compareStatVal}>{player.mouse}</span>
                                    </div>
                                    <div className={styles.compareStat}>
                                        <span className={styles.compareStatLabel}>Grip</span>
                                        <span className={styles.compareStatVal}>{player.gripStyle}</span>
                                    </div>
                                </div>
                                <div className={styles.compareScopeTitle}>Scope Sensitivity</div>
                                {SCOPES.map(scope => (
                                    <div key={scope} className={styles.compareScopeRow}>
                                        <span className={styles.compareScopeLabel}>{scope}</span>
                                        <div className={styles.compareScopeBar}>
                                            <div
                                                className={styles.compareScopeBarFill}
                                                style={{ width: `${((player.scopeSens[scope] ?? 0) / 70) * 100}%` }}
                                            />
                                        </div>
                                        <span className={styles.compareScopeVal}>{player.scopeSens[scope] ?? '—'}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ─── Filter + Player Grid ─── */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Jogadores</h2>
                    <div className={styles.filters}>
                        <span className={styles.filterHint}>Clique em 2 cards para comparar</span>
                        {['all', 'Entry Fragger', 'IGL', 'Support', 'Sniper', 'Flex'].map(role => (
                            <button
                                key={role}
                                className={`${styles.filterBtn} ${roleFilter === role ? styles.filterActive : ''}`}
                                onClick={() => setRoleFilter(role)}
                            >
                                {role === 'all' ? 'Todos' : role}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.playerGrid}>
                    {filteredPlayers.map(player => {
                        const sensPercent = Math.min((player.cmPer360 / 60) * 100, 100);
                        const isSelected = selectedPlayers.includes(player.id);

                        return (
                            <article
                                key={player.id}
                                className={`${styles.playerCard} ${isSelected ? styles.playerCardSelected : ''}`}
                                onClick={() => toggleSelect(player.id)}
                            >
                                {/* Header */}
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardPlayer}>
                                        <img
                                            src={FLAG_URL(player.countryCode)}
                                            alt={player.countryCode}
                                            className={styles.flagImg}
                                            width={24}
                                            height={18}
                                        />
                                        <div>
                                            <h3 className={styles.cardName}>{player.name}</h3>
                                            <span className={styles.cardTeam}>{player.teamLogo} {player.team}</span>
                                        </div>
                                    </div>
                                    <span className={styles.rolePill} data-role={player.role}>
                                        {player.role}
                                    </span>
                                </div>

                                {/* Sensitivity */}
                                <div className={styles.sensSection}>
                                    <div className={styles.sensHeader}>
                                        <span className={styles.sensLabel}>cm/360°</span>
                                        <span className={styles.sensValue}>{player.cmPer360.toFixed(1)}</span>
                                    </div>
                                    <div className={styles.sensTrack}>
                                        <div className={styles.sensFill} style={{ width: `${sensPercent}%` }} />
                                        <div className={styles.sensMarker} style={{ left: `${(stats.avgCmPer360 / 60) * 100}%` }} />
                                        {userCm360 !== null && (
                                            <div
                                                className={styles.sensUserMarker}
                                                style={{ left: `${Math.min((userCm360 / 60) * 100, 100)}%` }}
                                                title={`Você: ${userCm360.toFixed(1)} cm/360°`}
                                            />
                                        )}
                                    </div>
                                    <div className={styles.sensRange}>
                                        <span>Rápido</span>
                                        <span>Lento</span>
                                    </div>
                                </div>

                                {/* Config */}
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

                                {/* Scope Sensitivity with Values */}
                                <div className={styles.scopeSection}>
                                    <span className={styles.scopeTitle}>Scope Sensitivity</span>
                                    <div className={styles.scopeRows}>
                                        {SCOPES.map(scope => {
                                            const val = player.scopeSens[scope] ?? 0;
                                            return (
                                                <div key={scope} className={styles.scopeRow}>
                                                    <span className={styles.scopeRowLabel}>{scope}</span>
                                                    <div className={styles.scopeRowTrack}>
                                                        <div
                                                            className={styles.scopeRowFill}
                                                            style={{ width: `${(val / 70) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className={styles.scopeRowVal}>{val}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Achievement */}
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
        </>
    );
}
