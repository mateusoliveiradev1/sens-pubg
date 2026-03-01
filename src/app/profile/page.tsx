import { Header } from '@/ui/components/header';
import { getProfile } from '@/actions/profile';
import { auth } from '@/auth';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './profile-dashboard.module.css';

export const metadata: Metadata = {
    title: 'Identity | Sens PUBG',
    description: 'Dashboard público do seu perfil',
};

// SVG Icons for Socials
const TwitterIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.006 3.75H5.059z" />
    </svg>
);

const TwitchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
    </svg>
);

export default async function ProfilePage() {
    const session = await auth();
    const user = session?.user;

    if (!user) {
        return (
            <>
                <Header />
                <main className="page">
                    <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
                        <h1>Não logado</h1>
                        <Link href="/login" className="btn btn-primary">Fazer Login</Link>
                    </div>
                </main>
            </>
        );
    }

    const profile = await getProfile();

    return (
        <>
            <Header />
            <main className="page animate-fade-in">
                <div className="container">
                    <div className={styles.dashboard}>

                        {/* 1. Profile Identity Header (PRO CARD) */}
                        <div className={styles.identitySection}>
                            <div className={styles.avatarWrapper}>
                                {user.image ? (
                                    <Image
                                        src={user.image}
                                        alt={user.name ?? 'Avatar'}
                                        className={styles.avatar}
                                        width={120}
                                        height={120}
                                        priority
                                    />
                                ) : (
                                    <div className={styles.avatarFallback}>
                                        {(user.name ?? 'U').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className={styles.userInfo}>
                                <div className={styles.userRole}>Recruit</div>
                                <h1>{user.name}</h1>

                                {profile?.profile?.bio && (
                                    <p className={styles.bio}>{profile.profile.bio}</p>
                                )}

                                <div className={styles.socials}>
                                    {profile?.profile?.twitter && (
                                        <a href={profile.profile.twitter} target="_blank" rel="noreferrer" className={styles.socialBtn} aria-label="Twitter">
                                            <TwitterIcon />
                                        </a>
                                    )}
                                    {profile?.profile?.twitch && (
                                        <a href={profile.profile.twitch} target="_blank" rel="noreferrer" className={styles.socialBtn} aria-label="Twitch">
                                            <TwitchIcon />
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className={styles.headerActions}>
                                <Link href="/profile/settings" className="btn btn-secondary">
                                    ⚙️ Editar Setup
                                </Link>
                            </div>
                        </div>

                        {/* 2. Hardware Snapshot */}
                        <section>
                            <h2 className={styles.sectionTitle}><span>⚙️</span> Hardware & In-Game</h2>

                            {!profile?.profile ? (
                                <div className={`glass-card ${styles.emptyState}`}>
                                    <h2>Setup Desconhecido</h2>
                                    <p>O seu cartão de identidade está vazio. A IA de análise precisa dos detalhes do seu mouse e monitor para extrapolar distâncias de pixels e fricção.</p>
                                    <Link href="/profile/settings" className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>
                                        Configurar Agora
                                    </Link>
                                </div>
                            ) : (
                                <div className={styles.grid3}>
                                    <div className={`glass-card ${styles.hardwareCard}`}>
                                        <div className={styles.cardHeader}>
                                            <span>🖱️</span> Aim Setup
                                        </div>
                                        <div className={styles.cardBody}>
                                            <div className={styles.statRow}>
                                                <span className={styles.statLabel}>Mouse</span>
                                                <span className={styles.statValue}>{profile.profile.mouseModel || 'N/A'}</span>
                                            </div>
                                            <div className={styles.statRow}>
                                                <span className={styles.statLabel}>Sensor</span>
                                                <span className={styles.statValue}>{profile.profile.mouseSensor || 'N/A'}</span>
                                            </div>
                                            <div className={styles.statRow}>
                                                <span className={styles.statLabel}>DPI</span>
                                                <span className={styles.statValue}>{profile.profile.mouseDpi}</span>
                                            </div>
                                            <div className={styles.statRow}>
                                                <span className={styles.statLabel}>Polling</span>
                                                <span className={styles.statValue}>{profile.profile.mousePollingRate} Hz</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`glass-card ${styles.hardwareCard}`}>
                                        <div className={styles.cardHeader}>
                                            <span>🟫</span> Superfície & Grip
                                        </div>
                                        <div className={styles.cardBody}>
                                            <div className={styles.statRow}>
                                                <span className={styles.statLabel}>Pad</span>
                                                <span className={styles.statValue}>{profile.profile.mousepadModel || 'N/A'}</span>
                                            </div>
                                            <div className={styles.statRow}>
                                                <span className={styles.statLabel}>Fricção</span>
                                                <span className={styles.statValue} style={{ textTransform: 'capitalize' }}>{profile.profile.mousepadType || 'N/A'}</span>
                                            </div>
                                            <div className={styles.statRow}>
                                                <span className={styles.statLabel}>Grip</span>
                                                <span className={styles.statValue} style={{ textTransform: 'capitalize' }}>{profile.profile.gripStyle || 'N/A'}</span>
                                            </div>
                                            <div className={styles.statRow}>
                                                <span className={styles.statLabel}>Pivot</span>
                                                <span className={styles.statValue} style={{ textTransform: 'capitalize' }}>{profile.profile.playStyle || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`glass-card ${styles.hardwareCard}`}>
                                        <div className={styles.cardHeader}>
                                            <span>🎯</span> PUBG Core
                                        </div>
                                        <div className={styles.cardBody}>
                                            <div className={styles.statRow}>
                                                <span className={styles.statLabel}>General</span>
                                                <span className={styles.statValue}>{profile.profile.generalSens}</span>
                                            </div>
                                            <div className={styles.statRow}>
                                                <span className={styles.statLabel}>ADS</span>
                                                <span className={styles.statValue}>{profile.profile.adsSens}</span>
                                            </div>
                                            <div className={styles.statRow}>
                                                <span className={styles.statLabel}>Vert. Mult</span>
                                                <span className={styles.statValue}>{profile.profile.verticalMultiplier}x</span>
                                            </div>
                                            <div className={styles.statRow}>
                                                <span className={styles.statLabel}>FOV</span>
                                                <span className={styles.statValue}>{profile.profile.fov}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                    </div>
                </div>
            </main>
        </>
    );
}
