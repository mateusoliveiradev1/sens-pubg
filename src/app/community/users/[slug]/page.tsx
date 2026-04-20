import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getCommunityProfileFollowState } from '@/actions/community-follows';
import { getPublicCommunityProfileBySlug } from '@/actions/community-profiles';
import { auth } from '@/auth';
import { getWeapon } from '@/game/pubg';
import { Header } from '@/ui/components/header';

import { FollowButton } from './follow-button';
import { ReportButton } from '../../report-button';

export const dynamic = 'force-dynamic';

interface CommunityUserProfilePageProps {
    readonly params: Promise<{
        readonly slug: string;
    }>;
}

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

const heroMetaStyle = {
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
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
} as const;

const linksStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-sm)',
} as const;

const postsGridStyle = {
    display: 'grid',
    gap: 'var(--space-lg)',
} as const;

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

function humanizeCreatorProgramStatus(status: string): string {
    switch (status) {
        case 'waitlist':
            return 'Creator Program: Waitlist';
        case 'approved':
            return 'Creator Program: Approved';
        case 'suspended':
            return 'Creator Program: Suspended';
        case 'none':
        default:
            return 'Creator Program: None';
    }
}

function formatWeaponLabel(weaponId: string): string {
    return getWeapon(weaponId)?.name
        ?? weaponId
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

export default async function CommunityUserProfilePage({
    params,
}: CommunityUserProfilePageProps): Promise<React.JSX.Element> {
    const session = await auth();
    const { slug } = await params;
    const profile = await getPublicCommunityProfileBySlug({ slug });

    if (!profile) {
        notFound();
    }

    const followState = await getCommunityProfileFollowState({
        slug: profile.slug,
        viewerUserId: session?.user?.id ?? null,
    });

    return (
        <>
            <Header />

            <div className="page">
                <div className="container" style={pageStackStyle}>
                    <section className="glass-card" style={heroStyle}>
                        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                            <h1>{profile.displayName}</h1>
                            {profile.headline ? (
                                <p style={{ fontSize: 'var(--text-lg)' }}>{profile.headline}</p>
                            ) : null}
                            {profile.bio ? <p>{profile.bio}</p> : null}
                        </div>

                        <div style={heroMetaStyle}>
                            <span style={chipStyle}>@{profile.slug}</span>
                            <span style={chipStyle}>
                                {humanizeCreatorProgramStatus(profile.creatorProgramStatus)}
                            </span>
                        </div>

                        <p
                            style={{
                                margin: 0,
                                color: 'var(--color-text-muted)',
                                fontSize: 'var(--text-sm)',
                            }}
                        >
                            O status do creator program aparece aqui apenas como dado informativo.
                        </p>

                        {followState?.canFollow || profile.links.length > 0 ? (
                            <div style={linksStyle}>
                                {followState?.canFollow ? (
                                    <FollowButton
                                        slug={profile.slug}
                                        initialFollowing={followState.viewerIsFollowing}
                                        initialFollowerCount={followState.followerCount}
                                    />
                                ) : null}

                                {profile.links.map((link) => (
                                    <a
                                        key={`${profile.id}-${link.url}`}
                                        className="btn btn-secondary"
                                        href={link.url}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                        ) : null}

                        <div style={linksStyle}>
                            <ReportButton
                                entityType="profile"
                                entityId={profile.id}
                                subjectLabel="este perfil"
                            />
                        </div>

                        {session?.user?.id && followState && !followState.canFollow ? (
                            <p
                                style={{
                                    margin: 0,
                                    color: 'var(--color-text-secondary)',
                                    fontSize: 'var(--text-sm)',
                                }}
                            >
                                Este e o seu perfil publico na comunidade.
                            </p>
                        ) : null}
                    </section>

                    <section
                        aria-label="Posts publicados do autor"
                        style={{ display: 'grid', gap: 'var(--space-lg)' }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 'var(--space-sm)',
                            }}
                        >
                            <h2 style={{ fontSize: 'var(--text-2xl)' }}>Posts publicados</h2>
                            <p style={{ color: 'var(--color-text-secondary)' }}>
                                {profile.posts.length === 1
                                    ? '1 post publico'
                                    : `${profile.posts.length} posts publicos`}
                            </p>
                        </div>

                        {profile.posts.length > 0 ? (
                            <div style={postsGridStyle}>
                                {profile.posts.map((post) => (
                                    <article
                                        key={post.id}
                                        className="glass-card"
                                        style={{ display: 'grid', gap: 'var(--space-md)' }}
                                    >
                                        <div style={heroMetaStyle}>
                                            <span style={chipStyle}>{formatWeaponLabel(post.primaryWeaponId)}</span>
                                            <span style={chipStyle}>Patch {post.primaryPatchVersion}</span>
                                            <span style={chipStyle}>
                                                {formatDiagnosisLabel(post.primaryDiagnosisKey)}
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                            <h3 style={{ fontSize: 'var(--text-2xl)' }}>{post.title}</h3>
                                            <p>{post.excerpt}</p>
                                        </div>

                                        <div
                                            style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 'var(--space-sm)',
                                            }}
                                        >
                                            <p
                                                style={{
                                                    margin: 0,
                                                    color: 'var(--color-text-muted)',
                                                    fontSize: 'var(--text-sm)',
                                                }}
                                            >
                                                Publicado em {dateFormatter.format(post.publishedAt)}
                                            </p>

                                            <Link className="btn btn-primary" href={`/community/${post.slug}`}>
                                                Abrir post
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-card" style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                <h2 style={{ fontSize: 'var(--text-2xl)' }}>Sem posts publicados</h2>
                                <p>
                                    Este perfil publico ainda nao possui posts publicados para exibir na
                                    comunidade.
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}
