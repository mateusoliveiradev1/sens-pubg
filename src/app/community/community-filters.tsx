import Link from 'next/link';

import type { ListPublicCommunityFeedInput } from '@/core/community-feed';

export interface CommunityFilterOption {
    readonly value: string;
    readonly label: string;
}

interface CommunityFiltersProps {
    readonly selectedFilters: ListPublicCommunityFeedInput;
    readonly weaponOptions: readonly CommunityFilterOption[];
    readonly patchOptions: readonly CommunityFilterOption[];
    readonly diagnosisOptions: readonly CommunityFilterOption[];
}

const filterGridStyle = {
    display: 'grid',
    gap: 'var(--space-md)',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
} as const;

const fieldStyle = {
    display: 'grid',
    gap: 'var(--space-xs)',
} as const;

const labelStyle = {
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
} as const;

const sectionHeaderStyle = {
    display: 'grid',
    gap: 'var(--space-xs)',
} as const;

const actionsStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-sm)',
} as const;

function renderOptions(options: readonly CommunityFilterOption[]) {
    return options.map((option) => (
        <option key={option.value} value={option.value}>
            {option.label}
        </option>
    ));
}

function renderFilterField({
    label,
    name,
    defaultValue,
    options,
}: {
    readonly label: string;
    readonly name: 'weaponId' | 'patchVersion' | 'diagnosisKey';
    readonly defaultValue: string;
    readonly options: readonly CommunityFilterOption[];
}) {
    return (
        <label style={fieldStyle}>
            <span style={labelStyle}>{label}</span>
            <select
                aria-label={label}
                className="input"
                defaultValue={defaultValue}
                name={name}
            >
                <option value="">
                    {label === 'Arma' ? 'Todas' : 'Todos'}
                </option>
                {renderOptions(options)}
            </select>
        </label>
    );
}

export function CommunityFilters({
    selectedFilters,
    weaponOptions,
    patchOptions,
    diagnosisOptions,
}: CommunityFiltersProps): React.JSX.Element {
    const hasActiveFilters = Boolean(
        selectedFilters.weaponId || selectedFilters.patchVersion || selectedFilters.diagnosisKey,
    );

    return (
        <section
            className="glass-card"
            aria-label="Filtros da comunidade"
            style={{ display: 'grid', gap: 'var(--space-lg)' }}
        >
            <div style={sectionHeaderStyle}>
                <h2 style={{ fontSize: 'var(--text-2xl)' }}>Filtros basicos</h2>
                <p>
                    Refine o feed publico por arma, patch e diagnostico sem sair do visual atual do app.
                </p>
            </div>

            <form method="get" style={{ display: 'grid', gap: 'var(--space-md)' }}>
                <div style={filterGridStyle}>
                    {renderFilterField({
                        label: 'Arma',
                        name: 'weaponId',
                        defaultValue: selectedFilters.weaponId ?? '',
                        options: weaponOptions,
                    })}

                    {renderFilterField({
                        label: 'Patch',
                        name: 'patchVersion',
                        defaultValue: selectedFilters.patchVersion ?? '',
                        options: patchOptions,
                    })}

                    {renderFilterField({
                        label: 'Diagnostico',
                        name: 'diagnosisKey',
                        defaultValue: selectedFilters.diagnosisKey ?? '',
                        options: diagnosisOptions,
                    })}
                </div>

                <div style={actionsStyle}>
                    <button className="btn btn-primary" type="submit">
                        Aplicar filtros
                    </button>
                    {hasActiveFilters ? (
                        <Link className="btn btn-ghost" href="/community">
                            Limpar filtros
                        </Link>
                    ) : null}
                </div>
            </form>
        </section>
    );
}
