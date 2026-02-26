export const dynamic = 'force-dynamic';

import styles from '@/app/admin/admin.module.css';
import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { MaintenanceToggle } from '@/app/admin/settings/maintenance-toggle';

export default async function SettingsPage() {
    const [maintenanceSetting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, 'maintenance_mode'));

    const isMaintenance = (maintenanceSetting?.value as { enabled: boolean })?.enabled ?? false;

    return (
        <div className={styles.dashboard}>
            <header className={styles.pageHeader}>
                <h1>Configurações Globais</h1>
                <p>Manutenção e variáveis críticas do sistema.</p>
            </header>

            <div className={styles.mainGrid}>
                <div className={styles.leftCol}>
                    <section className={styles.settingsSection}>
                        <div className={styles.sectionHeader}>
                            <h2>Modo Manutenção</h2>
                        </div>
                        <div className={styles.settingsCard}>
                            <div className={styles.settingsInfo}>
                                <p>Quando ativado, usuários normais não poderão realizar análises ou acessar o histórico.</p>
                                <span className={styles.dim}>Administradores ainda terão acesso total.</span>
                            </div>
                            <MaintenanceToggle initialValue={isMaintenance} />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
