/**
 * Loading — Skeleton loading state para a home.
 */

export default function Loading(): React.JSX.Element {
    return (
        <div className="page" style={{ paddingTop: 'calc(var(--header-height) + var(--space-3xl))' }}>
            <div className="container" style={{ textAlign: 'center' }}>
                {/* Hero skeleton */}
                <div className="skeleton skeleton-text" style={{ width: '120px', margin: '0 auto var(--space-xl)' }} />
                <div className="skeleton skeleton-title" style={{ width: '70%', margin: '0 auto var(--space-lg)', height: '3rem' }} />
                <div className="skeleton skeleton-text" style={{ width: '50%', margin: '0 auto var(--space-2xl)' }} />

                {/* CTA skeleton */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-4xl)' }}>
                    <div className="skeleton" style={{ width: '160px', height: '48px', borderRadius: 'var(--radius-md)' }} />
                    <div className="skeleton" style={{ width: '160px', height: '48px', borderRadius: 'var(--radius-md)' }} />
                </div>

                {/* Feature cards skeleton */}
                <div className="grid grid-2" style={{ marginTop: 'var(--space-3xl)' }}>
                    <div className="skeleton skeleton-card" />
                    <div className="skeleton skeleton-card" />
                    <div className="skeleton skeleton-card" />
                    <div className="skeleton skeleton-card" />
                </div>
            </div>
        </div>
    );
}
