export const dynamic = 'force-dynamic';

import styles from '../admin.module.css';
import { db } from '@/db';
import { MaintenanceToggle } from './maintenance-toggle';

export default async function SettingsPage() {
    const maintenanceSetting = await db.query.systemSettings.findFirst({
        where: (fields, { eq }) => eq(fields.key, 'maintenance_mode'),
    }) as { value: { enabled: boolean } } | undefined;

    const isMaintenance = maintenanceSetting?.value?.enabled ?? false;

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
