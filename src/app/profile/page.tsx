/**
 * Profile Wizard Page — Server Component wrapper.
 * Layout da página de perfil com header e loading.
 */

import { Header } from '@/ui/components/header';
import { ProfileWizard } from './profile-wizard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Seu Setup',
    description: 'Configure seu perfil completo de hardware para diagnósticos precisos da IA.',
};

export default function ProfilePage(): React.JSX.Element {
    return (
        <>
            <Header />
            <div className="page">
                <div className="container">
                    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                        <h1 style={{ marginBottom: 'var(--space-sm)' }}>Seu Setup</h1>
                        <p style={{ marginBottom: 'var(--space-2xl)' }}>
                            Quanto mais detalhes sobre seu hardware, mais preciso será o diagnóstico da IA.
                            Cada campo ajuda a calcular a sensibilidade ideal para o SEU setup específico.
                        </p>
                        <ProfileWizard />
                    </div>
                </div>
            </div>
        </>
    );
}
