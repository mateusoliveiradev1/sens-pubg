import Image from 'next/image';
import { db } from '@/db';
import { users, analysisSessions } from '@/db/schema';
import { count, desc, sql } from 'drizzle-orm';
import { env } from '@/env';
import styles from './admin.module.css';

async function getBotStatus() {
    try {
        const status = await db.query.botHeartbeat.findFirst({
            where: (heartbeat, { eq }) => eq(heartbeat.id, 'main_bot'),
        });

        if (!status) return false;

        // Define "online" as seen in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return status.lastSeen > fiveMinutesAgo;
    } catch {
        return false;
    }
}

export default async function AdminDashboard() {
    // Fetch basic stats
    const [totalUsers] = await db.select({ value: count() }).from(users);
    const [totalAnalyses] = await db.select({ value: count() }).from(analysisSessions);

    // Fetch analyses in last 24h
    const [analysesLast24h] = await db.select({ value: count() })
        .from(analysisSessions)
        .where(sql`${analysisSessions.createdAt} > NOW() - INTERVAL '24 hours'`);

    // Fetch recent analyses
    const recentAnalyses = await db.query.analysisSessions.findMany({
        limit: 5,
        orderBy: [desc(analysisSessions.createdAt)],
        with: {
            user: true,
        },
    });

    const isBotOnline = await getBotStatus();

    return (
        <div className={styles.dashboard}>
            <header className={styles.pageHeader}>
                <h1>Visão Geral</h1>
                <p>Métricas em tempo real do sistema.</p>
            </header>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>👥</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Total de Usuários</span>
                        <h2 className={styles.statValue}>{totalUsers?.value || 0}</h2>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>📊</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Total de Análises</span>
                        <h2 className={styles.statValue}>{totalAnalyses?.value || 0}</h2>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>🔥</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Últimas 24h</span>
                        <h2 className={styles.statValue}>{analysesLast24h?.value || 0}</h2>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon}>🤖</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Status do Bot</span>
                        <h2 className={styles.statValue} style={{ color: isBotOnline ? '#10b981' : '#ef4444' }}>
                            {isBotOnline ? 'ONLINE' : 'OFFLINE'}
                        </h2>
                    </div>
                </div>
            </div>

            <section className={styles.recentActivity}>
                <div className={styles.sectionHeader}>
                    <h2>Atividades Recentes</h2>
                    <button className={styles.viewAll} type="button">Ver tudo</button>
                </div>

                <div className={styles.activityList}>
                    {recentAnalyses.length > 0 ? (
                        recentAnalyses.map((analysis) => (
                            <div key={analysis.id} className={styles.activityItem}>
                                <div className={styles.activityUser}>
                                    <div className={styles.smallAvatar}>
                                        {analysis.user?.image ? (
                                            <Image
                                                src={analysis.user.image}
                                                alt={analysis.user.name ?? ''}
                                                width={40}
                                                height={40}
                                            />
                                        ) : (
                                            <span>{analysis.user?.name?.charAt(0) || 'U'}</span>
                                        )}
                                    </div>
                                    <div>
                                        <strong>{analysis.user?.name || 'Desconhecido'}</strong>
                                        <p>Analisou {analysis.weaponId}</p>
                                    </div>
                                </div>
                                <span className={styles.activityTime}>
                                    {new Date(analysis.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className={styles.empty}>Nenhuma atividade recente encontrada.</p>
                    )}
                </div>
            </section>
        </div>
    );
}
