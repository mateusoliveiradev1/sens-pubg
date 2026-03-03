/* eslint-disable @next/next/no-img-element */
'use client';

/**
 * ProProfileClient — specs.gg-style profile page for a pro player.
 * Sidebar (photo, name, country, team) + main content (mouse, video, keyboard, monitor, teammates).
 */

import Link from 'next/link';
import type { ProPlayer } from '@/game/pubg';
import { getPlayerImageUrl as PLAYER_IMG, getTeamLogoUrl as TEAM_LOGO, PUBG_ICON } from '@/game/pubg';
import styles from './pro-profile.module.css';

interface Props {
    player: ProPlayer;
    allPlayers: ProPlayer[];
}

const FLAG_URL = (code: string) => `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;

const COUNTRY_NAMES: Record<string, string> = {
    au: 'Australia', us: 'United States', kr: 'South Korea', cn: 'China',
    fi: 'Finland', dk: 'Denmark', no: 'Norway', gb: 'United Kingdom',
    ru: 'Russia', ua: 'Ukraine', br: 'Brazil', th: 'Thailand', tr: 'Turkey',
    lv: 'Latvia', de: 'Germany', fr: 'France', jp: 'Japan', pl: 'Poland',
    se: 'Sweden', ca: 'Canada', nl: 'Netherlands', sa: 'Saudi Arabia',
};

// Derive polling rate from mouse name
function getPollingRate(player: ProPlayer): string {
    if (player.pollingRate) return `${player.pollingRate}Hz`;
    if (player.mouse.toLowerCase().includes('superlight 2') || player.mouse.toLowerCase().includes('superlight white')) return '2000Hz';
    if (player.mouse.toLowerCase().includes('viper v3')) return '8000Hz';
    return '1000Hz';
}

function amazonSearch(query: string) {
    return `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
}

// ─────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: string; title: string }) {
    return (
        <div className={styles.sectionTitle}>
            <img src={PUBG_ICON} alt="PUBG" className={styles.pubgBadgeImg} />
            <span className={styles.sectionIcon}>{icon}</span>
            <h2>{title}</h2>
        </div>
    );
}

function EquipCard({ name, href }: { name: string; href: string }) {
    return (
        <div className={styles.equipCard}>
            <div className={styles.equipIcon}>🖱️</div>
            <span className={styles.equipName}>{name}</span>
            <a href={href} target="_blank" rel="noopener noreferrer" className={styles.checkPriceBtn}>
                <span>🛒</span> Check price
            </a>
        </div>
    );
}

function StatGrid({ stats }: { stats: { label: string; value: string | number }[] }) {
    return (
        <div className={styles.statGrid}>
            {stats.map(({ label, value }) => (
                <div key={label} className={styles.statItem}>
                    <span className={styles.statLabel}>{label}</span>
                    <span className={styles.statValue}>{value}</span>
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────
// Main component
// ─────────────────────────────────────────

export function ProProfileClient({ player, allPlayers }: Props) {
    const teammates = allPlayers
        .filter(p => p.team === player.team && p.id !== player.id)
        .slice(0, 3);

    const countryName = COUNTRY_NAMES[player.countryCode] ?? player.countryCode.toUpperCase();

    return (
        <div className={styles.page}>
            <div className={styles.container}>

                {/* ─── Sidebar ─── */}
                <aside className={styles.sidebar}>
                    {/* Player photo */}
                    <div className={styles.photoWrapper}>
                        <img
                            src={PLAYER_IMG(player.name)}
                            alt={player.name}
                            className={styles.photo}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            referrerPolicy="no-referrer"
                        />
                    </div>

                    {/* Name */}
                    <div className={styles.playerName}>
                        <span>{player.name}</span>
                        {player.achievements.length > 0 && (
                            <span className={styles.verifiedBadge} title="Verificado">✓</span>
                        )}
                    </div>

                    {/* Country */}
                    <div className={styles.playerCountry}>
                        <img src={FLAG_URL(player.countryCode)} alt={countryName} width={22} height={16} />
                        <span>{countryName}</span>
                    </div>

                    {/* Team */}
                    <div className={styles.playerTeam}>
                        <img
                            src={TEAM_LOGO(player.team)}
                            alt={player.team}
                            className={styles.teamLogo}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            referrerPolicy="no-referrer"
                        />
                        <span>{player.team}</span>
                    </div>

                    {/* PUBG badge */}
                    <div className={styles.gameBadge}>
                        <img src={PUBG_ICON} alt="PUBG" className={styles.pubgBadgeImgSidebar} />
                        PUBG
                    </div>

                    {/* Spotted an update */}
                    <a
                        href={player.specsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.spottedBtn}
                    >
                        <strong>Spotted an Update?</strong>
                        <span>Help keep this profile accurate</span>
                    </a>

                    {/* Social icons (decorative) */}
                    <div className={styles.socials}>
                        {['🐦', '📺', '▶️', '🎮'].map((icon, i) => (
                            <a key={i} href="#" className={styles.socialIcon}>{icon}</a>
                        ))}
                    </div>
                </aside>

                {/* ─── Main Content ─── */}
                <main className={styles.main}>

                    {/* ══ Mouse Settings ══ */}
                    <section className={styles.section}>
                        <SectionTitle icon="🖱️" title="CONFIGURAÇÕES DE MOUSE" />
                        <EquipCard name={player.mouse} href={amazonSearch(player.mouse)} />
                        <StatGrid stats={[
                            { label: 'DPI', value: player.dpi },
                            { label: 'Taxa de Polling', value: getPollingRate(player) },
                            { label: 'Sensibilidade Geral', value: player.inGameSens },
                            { label: 'Sensibilidade Vertical', value: player.verticalSensMultiplier.toFixed(2) },
                            { label: 'Sensibilidade de Mira', value: player.scopeSens['red-dot'] ?? player.adsSens },
                            { label: 'Sensibilidade ADS', value: player.adsSens },
                            { label: 'Mira 2x', value: player.scopeSens['2x'] ?? '—' },
                            { label: 'Mira 3x', value: player.scopeSens['3x'] ?? '—' },
                            { label: 'Mira 4x', value: player.scopeSens['4x'] ?? '—' },
                            { label: 'Mira 6x', value: player.scopeSens['6x'] ?? '—' },
                            { label: 'Mira 8x', value: player.scopeSens['8x'] ?? '—' },
                            { label: 'Grip Style', value: player.gripStyle },
                        ]} />
                    </section>

                    {/* ══ Mousepad ══ */}
                    <section className={styles.section}>
                        <SectionTitle icon="🖱️" title="MOUSEPAD" />
                        <EquipCard name={player.mousepad} href={amazonSearch(player.mousepad)} />
                    </section>

                    {/* ══ Video Settings ══ */}
                    <section className={styles.section}>
                        <SectionTitle icon="📹" title="CONFIGURAÇÕES DE VÍDEO" />
                        <StatGrid stats={[
                            { label: 'Resolução', value: player.resolution ?? '1920 x 1080' },
                            { label: 'Proporção', value: player.aspectRatio ?? '16:9' },
                            { label: 'Modo de Exibição', value: 'TELA CHEIA' },
                            { label: 'Taxa de Atualização', value: `${player.refreshRate ?? 144}Hz` },
                            { label: 'Vibrância Digital', value: `${player.digitalVibrance ?? 70}%` },
                            { label: 'Brilho', value: 80 },
                            { label: 'Campo de Visão', value: player.fov ?? 90 },
                            { label: 'Escala de Renderização', value: '100' },
                            { label: 'Tipo de Daltonismo', value: player.aimingStyle ?? 'Normal' },
                            { label: 'Cor da Mira', value: player.aimColor ?? 'Verde' },
                            { label: 'Anti-Aliasing', value: 'Muito Baixo' },
                            { label: 'Folhagem', value: 'Muito Baixo' },
                            { label: 'Sombras', value: 'Muito Baixo' },
                            { label: 'Texturas', value: 'Muito Baixo' },
                            { label: 'Efeitos', value: 'Muito Baixo' },
                            { label: 'Pós-Processamento', value: 'Muito Baixo' },
                        ]} />
                    </section>

                    {/* ══ Keyboard Settings ══ */}
                    <section className={styles.section}>
                        <SectionTitle icon="⌨️" title="CONFIGURAÇÕES DE TECLAS" />
                        <EquipCard name={player.keyboard ?? 'Teclado Mecânico'} href={amazonSearch(player.keyboard ?? 'mechanical keyboard gaming')} />
                        <StatGrid stats={[
                            { label: 'Método de Mira', value: 'Segurar' },
                            { label: 'Mira', value: 'CTRL' },
                            { label: 'ADS', value: 'Right Click' },
                            { label: 'Marcador Rápido', value: 'Caps Lock' },
                            { label: 'Escalar', value: 'V' },
                            { label: 'Pular', value: 'Space' },
                            { label: 'Agachar', value: 'C' },
                            { label: 'Deitar', value: 'Z' },
                            { label: 'Recarregar', value: 'R' },
                            { label: 'Alternar Modo de Fogo', value: 'B' },
                            { label: 'Corrida Automática', value: '=' },
                            { label: 'Guardar Arma', value: 'T' },
                        ]} />
                    </section>

                    {/* ══ Monitor Settings ══ */}
                    <section className={styles.section}>
                        <SectionTitle icon="🖥️" title="CONFIGURAÇÕES DE MONITOR" />
                        <EquipCard name={player.monitor ?? 'Monitor Gaming'} href={amazonSearch(player.monitor ?? 'gaming monitor 240hz')} />
                        <StatGrid stats={[
                            { label: 'Brilho', value: 60 },
                            { label: 'Contraste', value: 60 },
                            { label: 'Nitidez', value: 10 },
                            { label: 'Gama', value: 'GAMMA 2' },
                            { label: 'Temperatura de Cor', value: 'R100-G100-B100' },
                            { label: 'Vibrância de Cor', value: 20 },
                            { label: 'Equalizador de Preto', value: 15 },
                            { label: 'Modo de Imagem', value: 'GAMER 2' },
                        ]} />
                    </section>

                    {/* ══ GPU Settings (if available) ══ */}
                    {player.gpu && (
                        <section className={styles.section}>
                            <SectionTitle icon="🎮" title="CONFIGURAÇÕES DA PLACA DE VÍDEO" />
                            <EquipCard name={player.gpu} href={amazonSearch(player.gpu)} />
                            <StatGrid stats={[
                                { label: 'Brilho', value: '50%' },
                                { label: 'Contraste', value: '50%' },
                                { label: 'Gama', value: '1' },
                                { label: 'Vibrância Digital', value: `${player.digitalVibrance ?? 70}%` },
                            ]} />
                        </section>
                    )}

                    {/* ══ Achievements ══ */}
                    {player.achievements.length > 0 && (
                        <section className={styles.section}>
                            <SectionTitle icon="🏆" title="CONQUISTAS" />
                            <div className={styles.achievementsList}>
                                {player.achievements.map((ach) => (
                                    <div key={ach} className={styles.achievementItem}>
                                        🏆 {ach}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ══ Teammates ══ */}
                    {teammates.length > 0 && (
                        <section className={styles.section}>
                            <div className={styles.teammatesHeader}>
                                <SectionTitle icon="👥" title={`${player.team.toUpperCase()} – PUBG`} />
                                <Link href="/pros" className={styles.viewAll}>view all</Link>
                            </div>
                            <div className={styles.teammatesGrid}>
                                {teammates.map(tm => (
                                    <Link key={tm.id} href={`/pros/${tm.id}`} className={styles.teammateCard}>
                                        <div className={styles.teammatePhoto}>
                                            <img
                                                src={PLAYER_IMG(tm.name)}
                                                alt={tm.name}
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>
                                        <span className={styles.teammateName}>{tm.name}</span>
                                        <span className={styles.teammateCountry}>
                                            <img src={FLAG_URL(tm.countryCode)} alt={tm.countryCode} width={16} height={12} />
                                            {COUNTRY_NAMES[tm.countryCode] ?? tm.countryCode.toUpperCase()}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                </main>
            </div>
        </div>
    );
}
