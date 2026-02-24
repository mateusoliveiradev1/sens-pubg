import { Header } from '@/ui/components/header';
import { SettingsForm } from './settings-form';
import { getProfile } from '@/actions/profile';
import styles from './settings-form.module.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Configurações de Hardware',
    description: 'Edite seu perfil de hardware e sensibilidade.',
};

export default async function SettingsPage() {
    const profile = await getProfile();

    return (
        <>
            <Header />
            <main className="page animate-fade-in">
                <div className="container">
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <h1 className={styles.pageTitle} style={{ marginBottom: 'var(--space-xs)' }}>Editar Setup</h1>
                        <p className={styles.pageDesc} style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-2xl)' }}>
                            Atualize seu hardware. Isso impactará o simulador matemático de física em análises futuras.
                        </p>

                        <SettingsForm initialData={profile} />
                    </div>
                </div>
            </main>
        </>
    );
}
