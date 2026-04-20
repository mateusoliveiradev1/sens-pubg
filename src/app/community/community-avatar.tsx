'use client';

import Image from 'next/image';
import { useState, type JSX } from 'react';

interface CommunityAvatarProps {
    readonly avatarUrl: string | null | undefined;
    readonly displayName: string;
    readonly fallbackInitials: string;
    readonly imageClassName: string | undefined;
    readonly fallbackClassName: string | undefined;
    readonly size: number;
    readonly fallbackAriaHidden?: boolean;
    readonly fallbackAriaLabel?: string;
}

function normalizeFallbackInitials(displayName: string, fallbackInitials: string): string {
    const explicitInitials = fallbackInitials.trim();

    if (explicitInitials) {
        return explicitInitials;
    }

    const generatedInitials = displayName
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

    return generatedInitials || 'OP';
}

export function CommunityAvatar({
    avatarUrl,
    displayName,
    fallbackInitials,
    imageClassName,
    fallbackClassName,
    size,
    fallbackAriaHidden = false,
    fallbackAriaLabel,
}: CommunityAvatarProps): JSX.Element {
    const [imageFailed, setImageFailed] = useState(false);

    if (avatarUrl && !imageFailed) {
        return (
            <Image
                alt=""
                className={imageClassName}
                height={size}
                src={avatarUrl}
                unoptimized
                width={size}
                onError={() => setImageFailed(true)}
            />
        );
    }

    return (
        <span
            aria-hidden={fallbackAriaHidden || undefined}
            aria-label={fallbackAriaHidden ? undefined : fallbackAriaLabel}
            className={fallbackClassName}
        >
            {normalizeFallbackInitials(displayName, fallbackInitials)}
        </span>
    );
}
