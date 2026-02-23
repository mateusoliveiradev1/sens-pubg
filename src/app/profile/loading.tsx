/**
 * Profile Loading — Skeleton para a página de perfil.
 */

import { Header } from '@/ui/components/header';

export default function ProfileLoading(): React.JSX.Element {
    return (
        <>
            <Header />
            <div className="page">
                <div className="container" style={{ maxWidth: '720px', margin: '0 auto' }}>
                    <div className="skeleton skeleton-title" style={{ width: '200px' }} />
                    <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: 'var(--space-2xl)' }} />

                    {/* Steps indicator skeleton */}
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)' }}>
                        {Array.from({ length: 6 }, (_, i) => (
                            <div key={i} className="skeleton" style={{ width: '80px', height: '36px', borderRadius: 'var(--radius-full)' }} />
                        ))}
                    </div>

                    {/* Form fields skeleton */}
                    <div className="glass-card">
                        <div className="skeleton skeleton-title" style={{ width: '150px', marginBottom: 'var(--space-xl)' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                            {Array.from({ length: 6 }, (_, i) => (
                                <div key={i}>
                                    <div className="skeleton skeleton-text" style={{ width: '80px', marginBottom: 'var(--space-xs)' }} />
                                    <div className="skeleton" style={{ height: '40px' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
