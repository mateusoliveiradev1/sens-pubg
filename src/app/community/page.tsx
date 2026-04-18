import type { Metadata } from 'next';

import {
    listPublicCommunityFeed,
    type ListPublicCommunityFeedInput,
    type PublicCommunityFeedEntry,
} from '@/core/community-feed';
import { Header } from '@/ui/components/header';

import {
    CommunityFilters,
    type CommunityFilterOption,
} from './community-filters';

export const metadata: Metadata = {
    title: 'Comunidade',
    description: 'Feed publico da comunidade com filtros basicos por arma, patch e diagnostico.',
};

export const dynamic = 'force-dynamic';

type CommunityPageSearchParams = Record<string, string | string[] | undefined>;

const pageStackStyle = {
    display: 'grid',
    gap: 'var(--space-xl)',
} as const;

const heroStyle = {
    display: 'grid',
    gap: 'var(--space-lg)',
    background:
        'linear-gradient(135deg, rgba(255, 107, 0, 0.12), rgba(0, 240, 255, 0.06))',
} as const;

const heroBadgeStyle = {
    width: 'fit-content',
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid rgba(255, 107, 0, 0.28)',
    background: 'rgba(255, 107, 0, 0.12)',
    color: 'var(--color-accent-primary-light)',
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
} as const;

const feedHeaderStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-sm)',
} as const;

const feedGridStyle = {
    display: 'grid',
    gap: 'var(--space-lg)',
} as const;

const entryMetaStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-sm)',
} as const;

const chipStyle = {
    width: 'fit-content',
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
} as const;

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

function getSingleSearchParamValue(
    value: string | string[] | undefined,
): string | undefined {
    if (Array.isArray(value)) {
        return getSingleSearchParamValue(value[0]);
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function parseFeedFilters(searchParams: CommunityPageSearchParams): ListPublicCommunityFeedInput {
    const weaponId = getSingleSearchParamValue(searchParams.weaponId);
    const patchVersion = getSingleSearchParamValue(searchParams.patchVersion);
    const diagnosisKey = getSingleSearchParamValue(searchParams.diagnosisKey);

    return {
        ...(weaponId ? { weaponId } : {}),
        ...(patchVersion ? { patchVersion } : {}),
        ...(diagnosisKey ? { diagnosisKey } : {}),
    };
}

function formatWeaponLabel(weaponId: string): string {
    return weaponId
        .split('-')
        .map((part) => part.toUpperCase())
        .join(' ');
}

function formatDiagnosisLabel(diagnosisKey: string): string {
    return diagnosisKey
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function buildFilterOptions(
    entries: readonly PublicCommunityFeedEntry[],
    selectedValue: string | undefined,
    selector: (entry: PublicCommunityFeedEntry) => string | null,
    formatter: (value: string) => string,
): CommunityFilterOption[] {
    const options = new Map<string, CommunityFilterOption>();

    for (const entry of entries) {
        const value = selector(entry);

        if (!value || options.has(value)) {
            continue;
        }

        options.set(value, {
            value,
            label: formatter(value),
        });
    }

    if (selectedValue && !options.has(selectedValue)) {
        options.set(selectedValue, {
            value: selectedValue,
            label: formatter(selectedValue),
        });
    }

    return [...options.values()].sort((left, right) =>
        left.label.localeCompare(right.label, 'pt-BR'),
    );
}

function buildCommunityFeedSummary(
    feedEntries: readonly PublicCommunityFeedEntry[],
    filters: ListPublicCommunityFeedInput,
): string {
    const hasActiveFilters = Boolean(filters.weaponId || filters.patchVersion || filters.diagnosisKey);

    if (feedEntries.length === 0 && hasActiveFilters) {
        return 'Nenhuma publicacao corresponde aos filtros atuais.';
    }

    if (feedEntries.length === 0) {
        return 'Ainda nao existem publicacoes publicas para exibir.';
    }

    if (feedEntries.length === 1) {
        return '1 publicacao publica encontrada.';
    }

    return `${feedEntries.length} publicacoes publicas encontradas.`;
}

function renderCommunityFeedEntryMeta(entry: PublicCommunityFeedEntry) {
    const chips: CommunityFilterOption[] = [];

    if (entry.primaryWeaponId) {
        chips.push({
            value: entry.primaryWeaponId,
            label: formatWeaponLabel(entry.primaryWeaponId),
        });
    }

    if (entry.primaryPatchVersion) {
        chips.push({
            value: entry.primaryPatchVersion,
            label: `Patch ${entry.primaryPatchVersion}`,
        });
    }

    if (entry.primaryDiagnosisKey) {
        chips.push({
            value: entry.primaryDiagnosisKey,
            label: formatDiagnosisLabel(entry.primaryDiagnosisKey),
        });
    }

    return chips;
}

export default async function CommunityPage({
    searchParams,
}: {
    searchParams?: Promise<CommunityPageSearchParams>;
}): Promise<React.JSX.Element> {
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const selectedFilters = parseFeedFilters(resolvedSearchParams);

    const [feedEntries, baselineEntries] = await Promise.all([
        listPublicCommunityFeed(selectedFilters),
        listPublicCommunityFeed(),
    ]);

    const weaponOptions = buildFilterOptions(
        baselineEntries,
        selectedFilters.weaponId,
        (entry) => entry.primaryWeaponId,
        formatWeaponLabel,
    );
    const patchOptions = buildFilterOptions(
        baselineEntries,
        selectedFilters.patchVersion,
        (entry) => entry.primaryPatchVersion,
        (value) => value,
    );
    const diagnosisOptions = buildFilterOptions(
        baselineEntries,
        selectedFilters.diagnosisKey,
        (entry) => entry.primaryDiagnosisKey,
        formatDiagnosisLabel,
    );

    const feedSummary = buildCommunityFeedSummary(feedEntries, selectedFilters);

    return (
        <>
            <Header />

            <div className="page">
                <div className="container" style={pageStackStyle}>
                    <section className="glass-card" style={heroStyle}>
                        <span style={heroBadgeStyle}>Feed publico</span>
                        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                            <h1>Comunidade</h1>
                            <p style={{ fontSize: 'var(--text-lg)' }}>
                                Veja analises publicas da comunidade com o mesmo visual premium do app e
                                refine a leitura por arma, patch e diagnostico.
                            </p>
                        </div>
                    </section>

                    <CommunityFilters
                        diagnosisOptions={diagnosisOptions}
                        patchOptions={patchOptions}
                        selectedFilters={selectedFilters}
                        weaponOptions={weaponOptions}
                    />

                    <section
                        aria-label="Feed da comunidade"
                        style={{ display: 'grid', gap: 'var(--space-lg)' }}
                    >
                        <div style={feedHeaderStyle}>
                            <h2 style={{ fontSize: 'var(--text-2xl)' }}>Feed publico</h2>
                            <p style={{ color: 'var(--color-text-secondary)' }}>{feedSummary}</p>
                        </div>

                        {feedEntries.length > 0 ? (
                            <div style={feedGridStyle}>
                                {feedEntries.map((entry) => {
                                    const entryChips = renderCommunityFeedEntryMeta(entry);

                                    return (
                                        <article
                                            key={entry.id}
                                            className="glass-card"
                                            style={{ display: 'grid', gap: 'var(--space-md)' }}
                                        >
                                            <div style={entryMetaStyle}>
                                                {entryChips.map((chip) => (
                                                    <span key={`${entry.id}-${chip.value}`} style={chipStyle}>
                                                        {chip.label}
                                                    </span>
                                                ))}
                                            </div>

                                            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                                <h2 style={{ fontSize: 'var(--text-2xl)' }}>{entry.title}</h2>
                                                <p>{entry.excerpt}</p>
                                            </div>

                                            <p
                                                style={{
                                                    color: 'var(--color-text-muted)',
                                                    fontSize: 'var(--text-sm)',
                                                }}
                                            >
                                                Publicado em {dateFormatter.format(entry.publishedAt)}
                                            </p>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="glass-card" style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                <h2 style={{ fontSize: 'var(--text-2xl)' }}>Nenhum resultado no feed</h2>
                                <p>
                                    Ajuste ou limpe os filtros para voltar a explorar as publicacoes publicas
                                    disponiveis.
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}
