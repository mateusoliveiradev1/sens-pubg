import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import styles from './admin.module.css';

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
                </nav>
            </aside>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
