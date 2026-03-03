/**
 * /pros/[id] — Pro Player Profile Page (specs.gg style)
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/ui/components/header';
import { PRO_PLAYERS, getProPlayer } from '@/game/pubg';
import { ProProfileClient } from './pro-profile-client';

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const player = getProPlayer(id);
    if (!player) return { title: 'Jogador não encontrado' };
    return {
        title: `${player.name} – Configurações PUBG`,
        description: `Configurações de ${player.name} (${player.team}): DPI ${player.dpi}, Sens ${player.inGameSens}, ${player.mouse}.`,
    };
}

export function generateStaticParams() {
    return PRO_PLAYERS.map(p => ({ id: p.id }));
}

export default async function ProProfilePage({ params }: Props) {
    const { id } = await params;
    const player = getProPlayer(id);
    if (!player) notFound();

    const allPlayers = [...PRO_PLAYERS];

    return (
        <>
            <Header />
            <ProProfileClient player={player} allPlayers={allPlayers} />
        </>
    );
}
