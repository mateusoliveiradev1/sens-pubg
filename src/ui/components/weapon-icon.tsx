import type { CSSProperties, ReactNode } from 'react';

import { getWeapon, type WeaponCategory } from '@/game/pubg';

type WeaponSilhouetteId =
    | 'm416'
    | 'akm'
    | 'scar-l'
    | 'aug'
    | 'beryl-m762'
    | 'g36c'
    | 'ace32'
    | 'ump45'
    | 'vector'
    | 'mp5k'
    | 'dp28'
    | 'm249'
    | 'mini14'
    | 'sks'
    | 'slr';

export interface WeaponIconProps {
    readonly weaponId?: string | null | undefined;
    readonly weaponName?: string | null | undefined;
    readonly category?: string | null | undefined;
    readonly size?: number;
    readonly framed?: boolean;
}

const CATEGORY_THEME: Record<WeaponCategory, {
    readonly color: string;
    readonly background: string;
    readonly border: string;
}> = {
    ar: {
        color: '#79f0ff',
        background: 'linear-gradient(145deg, rgba(21, 50, 58, 0.95), rgba(8, 10, 16, 0.94))',
        border: 'rgba(121, 240, 255, 0.24)',
    },
    smg: {
        color: '#82f5b2',
        background: 'linear-gradient(145deg, rgba(19, 46, 36, 0.95), rgba(8, 10, 16, 0.94))',
        border: 'rgba(130, 245, 178, 0.24)',
    },
    dmr: {
        color: '#ffd36a',
        background: 'linear-gradient(145deg, rgba(58, 46, 17, 0.95), rgba(8, 10, 16, 0.94))',
        border: 'rgba(255, 211, 106, 0.24)',
    },
    lmg: {
        color: '#ff9a61',
        background: 'linear-gradient(145deg, rgba(58, 31, 18, 0.95), rgba(8, 10, 16, 0.94))',
        border: 'rgba(255, 154, 97, 0.24)',
    },
    sr: {
        color: '#d2c2ff',
        background: 'linear-gradient(145deg, rgba(36, 28, 55, 0.95), rgba(8, 10, 16, 0.94))',
        border: 'rgba(210, 194, 255, 0.24)',
    },
    shotgun: {
        color: '#ffd3a2',
        background: 'linear-gradient(145deg, rgba(58, 39, 21, 0.95), rgba(8, 10, 16, 0.94))',
        border: 'rgba(255, 211, 162, 0.24)',
    },
    pistol: {
        color: '#d2d6de',
        background: 'linear-gradient(145deg, rgba(35, 39, 48, 0.95), rgba(8, 10, 16, 0.94))',
        border: 'rgba(210, 214, 222, 0.24)',
    },
};

const SILHOUETTE_IDS = new Set<WeaponSilhouetteId>([
    'm416',
    'akm',
    'scar-l',
    'aug',
    'beryl-m762',
    'g36c',
    'ace32',
    'ump45',
    'vector',
    'mp5k',
    'dp28',
    'm249',
    'mini14',
    'sks',
    'slr',
]);

function isWeaponSilhouetteId(value: string): value is WeaponSilhouetteId {
    return SILHOUETTE_IDS.has(value as WeaponSilhouetteId);
}

function normalizeCategory(category: string | null | undefined): WeaponCategory | undefined {
    if (!category) {
        return undefined;
    }

    const normalized = category.trim().toLowerCase();
    switch (normalized) {
        case 'ar':
        case 'smg':
        case 'dmr':
        case 'lmg':
        case 'sr':
        case 'shotgun':
        case 'pistol':
            return normalized;
        default:
            return undefined;
    }
}

function resolveWeaponPresentation(
    weaponId?: string | null,
    weaponName?: string | null,
    category?: string | null,
): {
    readonly silhouetteId: WeaponSilhouetteId | undefined;
    readonly label: string;
    readonly category: WeaponCategory;
} {
    const staticWeapon = (weaponId ? getWeapon(weaponId) : undefined)
        ?? (weaponName ? getWeapon(weaponName) : undefined);
    const normalizedCategory = normalizeCategory(category);
    const resolvedCategory = staticWeapon?.category ?? normalizedCategory ?? 'ar';
    const label = staticWeapon?.name
        ?? weaponName?.trim()
        ?? weaponId?.trim()
        ?? 'Arma';
    const silhouetteId = staticWeapon && isWeaponSilhouetteId(staticWeapon.id)
        ? staticWeapon.id
        : undefined;

    return {
        silhouetteId,
        label,
        category: resolvedCategory,
    };
}

function IconCanvas({
    label,
    size,
    framed,
    category,
    children,
}: {
    readonly label: string;
    readonly size: number;
    readonly framed: boolean;
    readonly category: WeaponCategory;
    readonly children: ReactNode;
}) {
    const theme = CATEGORY_THEME[category];
    const frameStyle: CSSProperties = framed
        ? {
            width: size,
            height: size,
            borderRadius: Math.max(16, Math.round(size * 0.34)),
            border: `1px solid ${theme.border}`,
            background: theme.background,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 14px 24px rgba(0, 0, 0, 0.28)',
        }
        : {
            width: size,
            height: size,
        };

    return (
        <span
            aria-label={label}
            role="img"
            style={{
                ...frameStyle,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.color,
                flexShrink: 0,
            }}
        >
            <svg
                aria-hidden="true"
                fill="none"
                viewBox="0 0 128 48"
                style={{
                    width: framed ? size * 0.72 : size,
                    height: framed ? size * 0.72 : size,
                    overflow: 'visible',
                    filter: 'drop-shadow(0 6px 10px rgba(0, 0, 0, 0.24))',
                }}
            >
                <title>{label}</title>
                {children}
            </svg>
        </span>
    );
}

function FixedStock() {
    return <polygon fill="currentColor" points="6,17 22,17 31,14 31,28 20,30 9,28" />;
}

function CollapsibleStock() {
    return (
        <g fill="currentColor">
            <rect height="2" rx="1" width="12" x="11" y="22" />
            <polygon points="8,19 20,19 30,16 30,19 23,24 8,24 12,21" />
        </g>
    );
}

function SkeletonStock() {
    return (
        <g fill="currentColor">
            <polygon points="8,20 22,20 30,16 30,18 23,24 9,24" />
            <polygon points="12,21 20,21 25,18 19,24 12,24" fill="rgba(8,10,16,0.76)" />
        </g>
    );
}

function MicroSight({ x = 47 }: { readonly x?: number }) {
    return (
        <g fill="currentColor">
            <rect height="3" rx="1.5" width="12" x={x} y="13" />
            <rect height="2" rx="1" width="8" x={x + 2} y="16" />
        </g>
    );
}

function LongRail({ x = 40, width = 20 }: { readonly x?: number; readonly width?: number }) {
    return (
        <g fill="currentColor">
            <rect height="3" rx="1.5" width={width} x={x} y="13" />
            <rect height="2" rx="1" width={Math.max(10, width - 6)} x={x + 3} y="16" />
        </g>
    );
}

function StanagMag({ x = 58 }: { readonly x?: number }) {
    return <polygon fill="currentColor" points={`${x},24 ${x + 10},24 ${x + 8},40 ${x - 2},39`} />;
}

function CurvedMag({ x = 58 }: { readonly x?: number }) {
    return <path d={`M ${x} 24 L ${x + 11} 24 L ${x + 8} 29 C ${x + 6} 34 ${x + 4} 37 ${x - 1} 40 L ${x - 4} 39 L ${x} 24 Z`} fill="currentColor" />;
}

function ShortMag({ x = 58 }: { readonly x?: number }) {
    return <polygon fill="currentColor" points={`${x},24 ${x + 8},24 ${x + 6},35 ${x - 1},34`} />;
}

function DrumMag({ x = 58 }: { readonly x?: number }) {
    return (
        <g fill="currentColor">
            <rect height="4" rx="1" width="8" x={x + 1} y="24" />
            <circle cx={x + 5} cy="33" r="7" />
        </g>
    );
}

function PistolGrip({ x = 52, y = 24, height = 14 }: { readonly x?: number; readonly y?: number; readonly height?: number }) {
    return <polygon fill="currentColor" points={`${x},${y} ${x + 8},${y} ${x + 6},${y + height} ${x - 2},${y + height - 1}`} />;
}

function FrontSight({ x = 108 }: { readonly x?: number }) {
    return <rect fill="currentColor" height="7" rx="1.5" width="2" x={x} y="18" />;
}

function MuzzleBrake({ x = 114 }: { readonly x?: number }) {
    return (
        <g fill="currentColor">
            <rect height="4" rx="1" width="4" x={x} y="20" />
            <rect height="7" rx="1" width="1.5" x={x + 1} y="18.5" />
        </g>
    );
}

function StandardRifle({
    stock,
    magazine,
    handguardWidth = 24,
    barrelWidth = 28,
    receiverWidth = 30,
    optic = 'micro',
    magazineX = 58,
    gripX = 52,
    muzzle = 'brake',
}: {
    readonly stock: 'fixed' | 'collapsed' | 'skeleton';
    readonly magazine: 'stanag' | 'curved' | 'short' | 'drum';
    readonly handguardWidth?: number;
    readonly barrelWidth?: number;
    readonly receiverWidth?: number;
    readonly optic?: 'micro' | 'rail';
    readonly magazineX?: number;
    readonly gripX?: number;
    readonly muzzle?: 'brake' | 'plain';
}) {
    const barrelStart = 36 + receiverWidth + handguardWidth - 2;
    const barrelEnd = Math.min(118, barrelStart + barrelWidth);

    return (
        <g fill="currentColor">
            {stock === 'fixed' ? <FixedStock /> : null}
            {stock === 'collapsed' ? <CollapsibleStock /> : null}
            {stock === 'skeleton' ? <SkeletonStock /> : null}
            <rect height="8" rx="2.5" width={receiverWidth} x="36" y="18" />
            <rect height="6" rx="2" width={handguardWidth} x={36 + receiverWidth - 1} y="19" />
            <rect height="2.5" rx="1.25" width={Math.max(12, barrelEnd - barrelStart)} x={barrelStart} y="21.75" />
            {optic === 'micro' ? <MicroSight /> : <LongRail />}
            <PistolGrip x={gripX} />
            {magazine === 'stanag' ? <StanagMag x={magazineX} /> : null}
            {magazine === 'curved' ? <CurvedMag x={magazineX} /> : null}
            {magazine === 'short' ? <ShortMag x={magazineX} /> : null}
            {magazine === 'drum' ? <DrumMag x={magazineX} /> : null}
            <FrontSight x={barrelEnd - 2} />
            {muzzle === 'brake' ? <MuzzleBrake x={barrelEnd} /> : <rect height="4" rx="1" width="3" x={barrelEnd} y="20" />}
        </g>
    );
}

function BullpupRifle() {
    return (
        <g fill="currentColor">
            <polygon points="8,18 67,18 90,20 94,23 90,27 67,29 8,29 15,24" />
            <rect height="2.5" rx="1.25" width="24" x="92" y="21.75" />
            <rect height="4" rx="1" width="4" x="116" y="20.5" />
            <rect height="3" rx="1.5" width="18" x="46" y="13" />
            <rect height="2" rx="1" width="10" x="50" y="16" />
            <polygon points="44,24 54,24 52,39 42,38" />
            <polygon points="61,24 70,24 68,39 58,38" />
            <FrontSight x={108} />
        </g>
    );
}

function CompactSmg({
    stock = 'collapsed',
    magazine = 'short',
    barrelWidth = 18,
    receiverWidth = 22,
    optic = false,
    magazineX = 50,
}: {
    readonly stock?: 'collapsed' | 'skeleton';
    readonly magazine?: 'short' | 'stanag';
    readonly barrelWidth?: number;
    readonly receiverWidth?: number;
    readonly optic?: boolean;
    readonly magazineX?: number;
}) {
    const stockNode = stock === 'skeleton' ? <SkeletonStock /> : <CollapsibleStock />;
    const barrelStart = 36 + receiverWidth + 12;

    return (
        <g fill="currentColor">
            {stockNode}
            <rect height="8" rx="2.5" width={receiverWidth} x="36" y="18" />
            <rect height="6" rx="2" width="14" x={34 + receiverWidth} y="19" />
            <rect height="2.5" rx="1.25" width={barrelWidth} x={barrelStart} y="21.75" />
            {optic ? <MicroSight x={45} /> : <rect height="2.5" rx="1.25" width="10" x="45" y="15" />}
            <PistolGrip x={48} />
            {magazine === 'short' ? <ShortMag x={magazineX} /> : <StanagMag x={magazineX} />}
            <MuzzleBrake x={barrelStart + barrelWidth} />
        </g>
    );
}

function VectorSmg() {
    return (
        <g fill="currentColor">
            <CollapsibleStock />
            <polygon points="38,19 58,19 66,16 75,16 75,20 64,22 64,28 45,28 38,24" />
            <rect height="2.5" rx="1.25" width="16" x="75" y="21.75" />
            <rect height="4" rx="1" width="4" x="91" y="20.5" />
            <rect height="3" rx="1.5" width="10" x="49" y="13" />
            <polygon points="52,24 60,24 58,39 50,38" />
            <polygon points="64,23 71,23 69,36 61,35" />
            <FrontSight x={85} />
        </g>
    );
}

function MarksmanRifle({
    stock = 'fixed',
    magazine = 'short',
    barrelWidth = 36,
    optic = 'rail',
    receiverWidth = 26,
    withGrip = false,
}: {
    readonly stock?: 'fixed' | 'skeleton';
    readonly magazine?: 'short' | 'stanag' | 'curved';
    readonly barrelWidth?: number;
    readonly optic?: 'micro' | 'rail';
    readonly receiverWidth?: number;
    readonly withGrip?: boolean;
}) {
    const stockNode = stock === 'skeleton' ? <SkeletonStock /> : <FixedStock />;
    const barrelStart = 36 + receiverWidth + 18;
    const barrelEnd = barrelStart + barrelWidth;

    return (
        <g fill="currentColor">
            {stockNode}
            <rect height="7" rx="2.5" width={receiverWidth} x="36" y="18.5" />
            <rect height="4" rx="1.5" width="18" x={34 + receiverWidth} y="20" />
            <rect height="2.25" rx="1.125" width={barrelWidth} x={barrelStart} y="21.875" />
            {optic === 'micro' ? <MicroSight x={43} /> : <LongRail x={40} width={24} />}
            {withGrip ? <PistolGrip x={52} y={24} height={13} /> : null}
            {magazine === 'short' ? <ShortMag x={59} /> : null}
            {magazine === 'stanag' ? <StanagMag x={58} /> : null}
            {magazine === 'curved' ? <CurvedMag x={58} /> : null}
            <FrontSight x={barrelEnd - 3} />
            <rect height="4" rx="1" width="4" x={barrelEnd} y="20.5" />
        </g>
    );
}

function Dp28Lmg() {
    return (
        <g fill="currentColor">
            <FixedStock />
            <rect height="8" rx="2.5" width="34" x="36" y="18" />
            <rect height="6" rx="2" width="18" x="68" y="19" />
            <rect height="2.5" rx="1.25" width="28" x="84" y="21.75" />
            <rect height="3" rx="1.5" width="14" x="47" y="12" />
            <circle cx="62" cy="13.5" r="12" />
            <circle cx="62" cy="13.5" fill="rgba(8,10,16,0.76)" r="5" />
            <polygon points="50,24 58,24 55,37 47,36" />
            <path d="M 92 25 L 100 35 L 103 35 L 96 24 Z" />
            <path d="M 96 24 L 104 35 L 107 35 L 100 24 Z" />
            <MuzzleBrake x={112} />
        </g>
    );
}

function M249Lmg() {
    return (
        <g fill="currentColor">
            <FixedStock />
            <rect height="8" rx="2.5" width="36" x="36" y="18" />
            <rect height="6" rx="2" width="22" x="70" y="19" />
            <rect height="2.5" rx="1.25" width="24" x="90" y="21.75" />
            <LongRail x={44} width={20} />
            <PistolGrip x={54} />
            <polygon points="60,24 72,24 74,34 60,34" />
            <path d="M 92 25 L 100 35 L 103 35 L 96 24 Z" />
            <path d="M 96 24 L 104 35 L 107 35 L 100 24 Z" />
            <MuzzleBrake x={114} />
        </g>
    );
}

function renderWeaponSilhouette(
    silhouetteId: WeaponSilhouetteId | undefined,
    category: WeaponCategory,
) {
    switch (silhouetteId) {
        case 'm416':
            return <StandardRifle magazine="stanag" stock="collapsed" />;
        case 'akm':
            return <StandardRifle magazine="curved" stock="fixed" handguardWidth={20} optic="rail" />;
        case 'scar-l':
            return <StandardRifle magazine="stanag" stock="fixed" handguardWidth={28} optic="rail" muzzle="plain" />;
        case 'aug':
            return <BullpupRifle />;
        case 'beryl-m762':
            return <StandardRifle magazine="curved" stock="fixed" handguardWidth={18} barrelWidth={24} />;
        case 'g36c':
            return <StandardRifle magazine="stanag" stock="skeleton" handguardWidth={18} barrelWidth={20} optic="rail" />;
        case 'ace32':
            return <StandardRifle magazine="curved" stock="skeleton" handguardWidth={22} barrelWidth={22} />;
        case 'ump45':
            return <CompactSmg magazine="stanag" stock="skeleton" barrelWidth={16} receiverWidth={20} optic={true} />;
        case 'vector':
            return <VectorSmg />;
        case 'mp5k':
            return <CompactSmg magazine="short" stock="collapsed" barrelWidth={18} receiverWidth={22} optic={true} />;
        case 'dp28':
            return <Dp28Lmg />;
        case 'm249':
            return <M249Lmg />;
        case 'mini14':
            return <MarksmanRifle magazine="short" barrelWidth={42} optic="rail" receiverWidth={22} />;
        case 'sks':
            return <MarksmanRifle magazine="curved" barrelWidth={34} optic="rail" receiverWidth={24} withGrip={true} />;
        case 'slr':
            return <MarksmanRifle magazine="stanag" barrelWidth={36} optic="rail" receiverWidth={26} withGrip={true} stock="skeleton" />;
        default:
            switch (category) {
                case 'smg':
                    return <CompactSmg />;
                case 'dmr':
                case 'sr':
                    return <MarksmanRifle />;
                case 'lmg':
                    return <M249Lmg />;
                default:
                    return <StandardRifle magazine="stanag" stock="collapsed" />;
            }
    }
}

export function WeaponIcon({
    weaponId,
    weaponName,
    category,
    size = 48,
    framed = true,
}: WeaponIconProps) {
    const presentation = resolveWeaponPresentation(weaponId, weaponName, category);

    return (
        <IconCanvas
            category={presentation.category}
            framed={framed}
            label={presentation.label}
            size={size}
        >
            {renderWeaponSilhouette(presentation.silhouetteId, presentation.category)}
        </IconCanvas>
    );
}
