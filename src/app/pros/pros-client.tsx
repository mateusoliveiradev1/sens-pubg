/* eslint-disable @next/next/no-img-element */
'use client';

/**
 * ProsClient — Interactive client component for pro player listing.
 * Simple photo cards — click to open full profile. Filter by role.
 */

import { useState } from 'react';
import Link from 'next/link';
import type { ProPlayer } from '@/game/pubg';
import { getPlayerImageUrl as PLAYER_IMG, getTeamLogoUrl as TEAM_LOGO } from '@/game/pubg';
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

const FLAG_URL = (code: string) =>
    `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;

const COUNTRY_NAMES: Record<string, string> = {
    au: 'Australia', us: 'United States', kr: 'South Korea', cn: 'China',
    fi: 'Finland', dk: 'Denmark', no: 'Norway', gb: 'United Kingdom',
    ru: 'Russia', ua: 'Ukraine', br: 'Brazil', th: 'Thailand', tr: 'Turkey',
    lv: 'Latvia', de: 'Germany', fr: 'France', jp: 'Japan', pl: 'Poland',
    se: 'Sweden', ca: 'Canada', nl: 'Netherlands', sa: 'Saudi Arabia',
};

export function ProsClient({ players, stats }: ProsClientProps) {
    const [roleFilter, setRoleFilter] = useState<string>('all');

    const filteredPlayers = roleFilter === 'all'
        ? players
        : players.filter(p => p.role === roleFilter);

    return (
        <>
            {/* ─── Filter + Player Grid ─── */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Jogadores</h2>
                    <div className={styles.filters}>
                        {(['all', 'Entry Fragger', 'IGL', 'Support', 'Sniper', 'Flex'] as const).map(role => (
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
                    {filteredPlayers.map(player => (
                        <Link
                            key={player.id}
                            href={`/pros/${player.id}`}
                            className={styles.playerCard}
                        >
                            {/* Photo */}
                            <div className={styles.cardPhotoWrapper}>
                                <img
                                    src={PLAYER_IMG(player.name)}
                                    alt={player.name}
                                    className={styles.cardPhoto}
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    referrerPolicy="no-referrer"
                                />
                                {/* Role pill */}
                                <span className={styles.rolePill} data-role={player.role}>
                                    {player.role}
                                </span>
                                {/* Team logo overlay */}
                                <div className={styles.cardTeamBadge}>
                                    <img
                                        src={TEAM_LOGO(player.team)}
                                        alt={player.team}
                                        className={styles.cardTeamLogo}
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                            </div>

                            {/* Info footer */}
                            <div className={styles.cardFooter}>
                                <span className={styles.cardName}>{player.name}</span>
                                <span className={styles.cardCountry}>
                                    <img
                                        src={FLAG_URL(player.countryCode)}
                                        alt={player.countryCode}
                                        className={styles.flagImg}
                                        width={20}
                                        height={15}
                                    />
                                    {COUNTRY_NAMES[player.countryCode] ?? player.countryCode.toUpperCase()}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Stats summary strip */}
            <div className={styles.statsSummary}>
                <span>
                    <strong>{stats.totalPlayers}</strong> jogadores catalogados
                </span>
                <span>
                    Média cm/360°: <strong>{stats.avgCmPer360.toFixed(1)}</strong>
                </span>
            </div>
        </>
    );
}
