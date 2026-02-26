import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/auth';
import styles from '@/app/admin/admin.module.css';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const user = session?.user;

    // Protection: Only admin, mod, or support
    if (!user || !['admin', 'mod', 'support'].includes(user.role)) {
        redirect('/');
    }

    return (
        <div className={styles.adminLayout}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <span className={styles.roleBadge}>
                        {user.role === 'admin' ? 'Admin' : user.role === 'mod' ? 'Mod' : 'Support'}
                    </span>
                    <h2 className={styles.sidebarTitle}>Painel de Controle</h2>
                </div>
                <nav className={styles.sidebarNav}>
                    <Link href="/admin" className={`${styles.navItem} ${styles.active}`}>
                        <span className={styles.navIcon}>🏠</span> Geral
                    </Link>
                    <Link href="/admin/users" className={styles.navItem}>
                        <span className={styles.navIcon}>👥</span> Usuários
                    </Link>
                    <Link href="/admin/bot" className={styles.navItem}>
                        <span className={styles.navIcon}>🤖</span> Bot Status
                    </Link>
                    <Link href="/admin/logs" className={styles.navItem}>
                        <span className={styles.navIcon}>📝</span> Logs de Auditoria
                    </Link>
                    <Link href="/admin/settings" className={styles.navItem}>
                        <span className={styles.navIcon}>⚙️</span> Configurações
                    </Link>
                    <Link href="/" className={`${styles.navItem} ${styles.backToSite}`}>
                        <span className={styles.navIcon}>🌐</span> Voltar ao Site
                    </Link>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userProfile}>
                        <div className={styles.userAvatar}>
                            {user.image ? (
                                <Image src={user.image} alt={user.name || ''} width={36} height={36} />
                            ) : (
                                <span>{user.name?.charAt(0) || 'A'}</span>
                            )}
                        </div>
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>{user.name}</span>
                            <span className={styles.userEmail}>{user.email}</span>
                        </div>
                    </div>
                </div>
            </aside>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
