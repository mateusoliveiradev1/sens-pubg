import Link from 'next/link';

import type {
    CommunityDiscoveryFilterOption,
    CommunityDiscoveryViewModel,
} from '@/core/community-discovery-view-model';

import styles from './community-hub.module.css';

interface CommunityFiltersProps {
    readonly filters: CommunityDiscoveryViewModel['filters'];
    readonly clearHref: string;
}

function renderOptions(options: readonly CommunityDiscoveryFilterOption[]) {
    return options.map((option) => (
        <option key={`${option.key}-${option.value}`} value={option.value}>
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
    readonly options: readonly CommunityDiscoveryFilterOption[];
}) {
    return (
        <label className={styles.filterField}>
            <span className={styles.filterLabel}>{label}</span>
            <select
                aria-label={label}
                className={`input select ${styles.filterSelect}`}
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
    filters,
    clearHref,
}: CommunityFiltersProps): React.JSX.Element {
    return (
        <section
            aria-label="Filtros da comunidade"
            className={`glass-card ${styles.filterPanel}`}
        >
            <div className={styles.filterTopline}>
                <div>
                    <span className={styles.sectionKicker}>Recorte rapido</span>
                    <h2>Filtre o que quer ver</h2>
                    <p>
                        Corte os posts por arma, patch e diagnostico sem perder o caminho de volta
                        para toda a comunidade.
                    </p>
                </div>

                {filters.hasActiveFilters ? (
                    <div className={styles.activeFilters} aria-label="Filtros aplicados">
                        {filters.activeFilters.map((filter) => (
                            <span
                                className={styles.activeFilter}
                                key={`${filter.key}-${filter.value}`}
                            >
                                {filter.label}
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className={styles.activeFilter}>Tudo aberto</span>
                )}
            </div>

            <form className={styles.filterForm} method="get">
                <div className={styles.filterGrid}>
                    {renderFilterField({
                        label: 'Arma',
                        name: 'weaponId',
                        defaultValue: filters.selected.weaponId ?? '',
                        options: filters.weaponOptions,
                    })}

                    {renderFilterField({
                        label: 'Patch',
                        name: 'patchVersion',
                        defaultValue: filters.selected.patchVersion ?? '',
                        options: filters.patchOptions,
                    })}

                    {renderFilterField({
                        label: 'Diagnostico',
                        name: 'diagnosisKey',
                        defaultValue: filters.selected.diagnosisKey ?? '',
                        options: filters.diagnosisOptions,
                    })}
                </div>

                <div className={styles.filterActions}>
                    <button className="btn btn-primary" type="submit">
                        Aplicar filtros
                    </button>
                    {filters.hasActiveFilters ? (
                        <Link className="btn btn-ghost" href={clearHref}>
                            Limpar filtros
                        </Link>
                    ) : null}
                </div>
            </form>
        </section>
    );
}
