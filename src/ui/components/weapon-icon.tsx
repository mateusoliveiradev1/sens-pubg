import type { CSSProperties, ReactNode } from 'react';
import React from 'react';

import { getWeapon, type WeaponCategory } from '@/game/pubg';

import { resolveWeaponSupportStatus, type WeaponSupportStatus } from './weapon-support-status';
import {
    resolveWeaponVisualEntry,
    type WeaponSilhouetteId,
    type WeaponVisualRegistryEntry,
} from './weapon-visual-registry';
import styles from './weapon-icon.module.css';

type RenderableSilhouetteId = WeaponSilhouetteId | 'dp28' | 'm249';
type FallbackSilhouetteId = `fallback-${WeaponCategory}`;

export interface WeaponIconProps {
    readonly weaponId?: string | null | undefined;
    readonly weaponName?: string | null | undefined;
    readonly category?: string | null | undefined;
    readonly size?: number;
    readonly framed?: boolean;
    readonly showStatus?: boolean;
}

interface WeaponPresentation {
    readonly silhouetteId?: RenderableSilhouetteId;
    readonly fallbackId: FallbackSilhouetteId;
    readonly visualEntry?: WeaponVisualRegistryEntry;
    readonly label: string;
    readonly category: WeaponCategory;
    readonly supportStatus: WeaponSupportStatus;
}

const CATEGORY_CLASS: Record<WeaponCategory, string> = {
    ar: styles.categoryAr ?? '',
    smg: styles.categorySmg ?? '',
    dmr: styles.categoryDmr ?? '',
    lmg: styles.categoryLmg ?? '',
    sr: styles.categorySr ?? '',
    shotgun: styles.categoryOther ?? '',
    pistol: styles.categoryOther ?? '',
};

function cx(...values: Array<string | false | null | undefined>): string {
    return values.filter(Boolean).join(' ');
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
): WeaponPresentation {
    const visualEntry = resolveWeaponVisualEntry({ weaponId, weaponName });
    const staticWeapon = getWeapon(weaponId ?? '')
        ?? getWeapon(weaponName ?? '')
        ?? (visualEntry ? getWeapon(visualEntry.displayName) : undefined);
    const resolvedCategory = staticWeapon?.category
        ?? normalizeCategory(category)
        ?? (visualEntry?.category.toLowerCase() as 'ar' | 'smg' | 'dmr' | undefined)
        ?? 'ar';
    const label = visualEntry?.displayName
        ?? staticWeapon?.name
        ?? weaponName?.trim()
        ?? weaponId?.trim()
        ?? 'Arma';
    const supportStatus = resolveWeaponSupportStatus({
        weaponId,
        weaponName: label,
        category: resolvedCategory,
    });
    const silhouetteId = visualEntry?.silhouetteId
        ?? (staticWeapon?.id === 'dp28' || staticWeapon?.id === 'm249' ? staticWeapon.id : undefined);

    return {
        ...(silhouetteId ? { silhouetteId } : {}),
        fallbackId: `fallback-${resolvedCategory}`,
        ...(visualEntry ? { visualEntry } : {}),
        label,
        category: resolvedCategory,
        supportStatus,
    };
}

function IconCanvas({
    presentation,
    size,
    framed,
    showStatus,
    children,
}: {
    readonly presentation: WeaponPresentation;
    readonly size: number;
    readonly framed: boolean;
    readonly showStatus: boolean;
    readonly children: ReactNode;
}) {
    const renderedSilhouetteId = presentation.silhouetteId ?? presentation.fallbackId;
    const accessibleLabel = `${presentation.label} - ${presentation.supportStatus.label}`;
    const rootStyle = {
        '--weapon-icon-size': `${size}px`,
    } as CSSProperties;

    return (
        <span
            className={cx(styles.root, showStatus && styles.rootWithStatus)}
            data-seed-weapon={presentation.visualEntry ? 'true' : 'false'}
            data-silhouette-id={renderedSilhouetteId}
            data-support-kind={presentation.supportStatus.kind}
            data-weapon-icon="premium-authored"
            style={rootStyle}
        >
            <span
                aria-label={accessibleLabel}
                className={cx(
                    styles.frame,
                    framed ? styles.framed : styles.unframed,
                    CATEGORY_CLASS[presentation.category],
                )}
                role="img"
            >
                <svg
                    aria-hidden="true"
                    className={styles.svg}
                    data-art-source="authored-sens-pubg"
                    fill="none"
                    viewBox="0 0 128 48"
                >
                    <title>{accessibleLabel}</title>
                    {children}
                </svg>
            </span>
            {showStatus ? (
                <span className={styles.statusLabel}>
                    {presentation.supportStatus.label}
                </span>
            ) : null}
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
            <polygon fill="rgba(8,10,16,0.76)" points="12,21 20,21 25,18 19,24 12,24" />
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

function StanagMag({ x = 58, height = 16 }: { readonly x?: number; readonly height?: number }) {
    return <polygon fill="currentColor" points={`${x},24 ${x + 10},24 ${x + 8},${24 + height} ${x - 2},${23 + height}`} />;
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

function Suppressor({ x = 103, width = 16 }: { readonly x?: number; readonly width?: number }) {
    return <rect fill="currentColor" height="5" rx="2.5" width={width} x={x} y="19.5" />;
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
    readonly muzzle?: 'brake' | 'plain' | 'suppressor';
}) {
    const barrelStart = 36 + receiverWidth + handguardWidth - 2;
    const barrelEnd = Math.min(116, barrelStart + barrelWidth);

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
            {muzzle === 'brake' ? <MuzzleBrake x={barrelEnd} /> : null}
            {muzzle === 'plain' ? <rect height="4" rx="1" width="3" x={barrelEnd} y="20" /> : null}
            {muzzle === 'suppressor' ? <Suppressor x={barrelEnd} width={12} /> : null}
        </g>
    );
}

function BullpupRifle({
    receiverWidth = 60,
    barrelWidth = 24,
    magazineX = 44,
    railX = 46,
}: {
    readonly receiverWidth?: number;
    readonly barrelWidth?: number;
    readonly magazineX?: number;
    readonly railX?: number;
}) {
    return (
        <g fill="currentColor">
            <polygon points={`8,18 ${receiverWidth + 9},18 ${receiverWidth + 32},20 ${receiverWidth + 36},23 ${receiverWidth + 32},27 ${receiverWidth + 8},29 8,29 15,24`} />
            <rect height="2.5" rx="1.25" width={barrelWidth} x={receiverWidth + 34} y="21.75" />
            <rect height="4" rx="1" width="4" x={receiverWidth + 34 + barrelWidth} y="20.5" />
            <rect height="3" rx="1.5" width="18" x={railX} y="13" />
            <rect height="2" rx="1" width="10" x={railX + 4} y="16" />
            <polygon points={`${magazineX},24 ${magazineX + 10},24 ${magazineX + 8},39 ${magazineX - 2},38`} />
            <polygon points={`${magazineX + 17},24 ${magazineX + 26},24 ${magazineX + 24},39 ${magazineX + 14},38`} />
            <FrontSight x={receiverWidth + barrelWidth + 24} />
        </g>
    );
}

function GrozaRifle() {
    return (
        <g fill="currentColor">
            <polygon points="10,18 66,18 79,20 82,24 78,28 12,28 18,24" />
            <rect height="2.5" rx="1.25" width="28" x="80" y="21.75" />
            <Suppressor x={106} width={12} />
            <MicroSight x={43} />
            <CurvedMag x={40} />
            <PistolGrip x={57} y={25} height={12} />
            <FrontSight x={101} />
        </g>
    );
}

function FamasRifle() {
    return (
        <g fill="currentColor">
            <polygon points="9,19 62,17 82,20 87,24 82,28 62,30 10,29 18,24" />
            <rect height="2.25" rx="1.125" width="24" x="86" y="21.875" />
            <MuzzleBrake x={110} />
            <LongRail x={39} width={26} />
            <StanagMag x={39} height={15} />
            <PistolGrip x={61} y={24} height={13} />
            <FrontSight x={102} />
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
    readonly magazine?: 'short' | 'stanag' | 'drum';
    readonly barrelWidth?: number;
    readonly receiverWidth?: number;
    readonly optic?: boolean;
    readonly magazineX?: number;
}) {
    const barrelStart = 36 + receiverWidth + 12;

    return (
        <g fill="currentColor">
            {stock === 'skeleton' ? <SkeletonStock /> : <CollapsibleStock />}
            <rect height="8" rx="2.5" width={receiverWidth} x="36" y="18" />
            <rect height="6" rx="2" width="14" x={34 + receiverWidth} y="19" />
            <rect height="2.5" rx="1.25" width={barrelWidth} x={barrelStart} y="21.75" />
            {optic ? <MicroSight x={45} /> : <rect height="2.5" rx="1.25" width="10" x="45" y="15" />}
            <PistolGrip x={48} />
            {magazine === 'short' ? <ShortMag x={magazineX} /> : null}
            {magazine === 'stanag' ? <StanagMag x={magazineX} /> : null}
            {magazine === 'drum' ? <DrumMag x={magazineX} /> : null}
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

function MicroUziSmg() {
    return (
        <g fill="currentColor">
            <rect height="7" rx="2" width="26" x="34" y="19" />
            <rect height="5" rx="1.5" width="16" x="59" y="20" />
            <rect height="2.25" rx="1.125" width="18" x="73" y="21.85" />
            <rect height="6" rx="1.5" width="7" x="91" y="20" />
            <PistolGrip x={42} y={24} height={13} />
            <ShortMag x={55} />
            <rect height="2" rx="1" width="14" x="20" y="22" />
            <polygon points="15,19 25,19 34,21 34,24 14,24" />
        </g>
    );
}

function BizonSmg() {
    return (
        <g fill="currentColor">
            <CollapsibleStock />
            <rect height="8" rx="2.5" width="38" x="36" y="18" />
            <rect height="3.5" rx="1.75" width="34" x="50" y="27" />
            <rect height="2.5" rx="1.25" width="20" x="74" y="21.75" />
            <MuzzleBrake x={94} />
            <MicroSight x={48} />
            <PistolGrip x={49} />
        </g>
    );
}

function TommyGunSmg() {
    return (
        <g fill="currentColor">
            <FixedStock />
            <rect height="8" rx="2.5" width="32" x="36" y="18" />
            <rect height="5" rx="2" width="26" x="66" y="19.5" />
            <rect height="2.5" rx="1.25" width="24" x="90" y="21.75" />
            <DrumMag x={54} />
            <PistolGrip x={45} y={24} height={12} />
            <rect height="2" rx="1" width="24" x="45" y="14" />
            <rect height="4" rx="1" width="4" x="114" y="20.5" />
        </g>
    );
}

function P90Smg() {
    return (
        <g fill="currentColor">
            <polygon points="18,19 78,17 91,20 94,24 89,28 18,29 25,24" />
            <rect height="3" rx="1.5" width="44" x="35" y="13" />
            <rect height="2.5" rx="1.25" width="22" x="92" y="21.75" />
            <MuzzleBrake x={114} />
            <PistolGrip x={53} y={24} height={12} />
            <polygon points="68,24 78,24 76,35 67,34" />
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
    suppressed = false,
}: {
    readonly stock?: 'fixed' | 'skeleton';
    readonly magazine?: 'short' | 'stanag' | 'curved';
    readonly barrelWidth?: number;
    readonly optic?: 'micro' | 'rail';
    readonly receiverWidth?: number;
    readonly withGrip?: boolean;
    readonly suppressed?: boolean;
}) {
    const barrelStart = 36 + receiverWidth + 18;
    const barrelEnd = barrelStart + barrelWidth;

    return (
        <g fill="currentColor">
            {stock === 'skeleton' ? <SkeletonStock /> : <FixedStock />}
            <rect height="7" rx="2.5" width={receiverWidth} x="36" y="18.5" />
            <rect height="4" rx="1.5" width="18" x={34 + receiverWidth} y="20" />
            <rect height="2.25" rx="1.125" width={barrelWidth} x={barrelStart} y="21.875" />
            {optic === 'micro' ? <MicroSight x={43} /> : <LongRail x={40} width={24} />}
            {withGrip ? <PistolGrip x={52} y={24} height={13} /> : null}
            {magazine === 'short' ? <ShortMag x={59} /> : null}
            {magazine === 'stanag' ? <StanagMag x={58} /> : null}
            {magazine === 'curved' ? <CurvedMag x={58} /> : null}
            <FrontSight x={barrelEnd - 3} />
            {suppressed ? <Suppressor x={barrelEnd} width={13} /> : <rect height="4" rx="1" width="4" x={barrelEnd} y="20.5" />}
        </g>
    );
}

function DragunovDmr() {
    return (
        <g fill="currentColor">
            <SkeletonStock />
            <rect height="7" rx="2.5" width="28" x="36" y="18.5" />
            <rect height="4" rx="1.5" width="22" x="62" y="20" />
            <rect height="2.25" rx="1.125" width="34" x="82" y="21.875" />
            <LongRail x={41} width={26} />
            <CurvedMag x={56} />
            <FrontSight x={110} />
            <MuzzleBrake x={116} />
        </g>
    );
}

function QbuDmr() {
    return (
        <g fill="currentColor">
            <polygon points="10,18 63,18 82,20 86,24 82,28 62,29 10,29 17,24" />
            <rect height="2.25" rx="1.125" width="32" x="84" y="21.875" />
            <LongRail x={41} width={22} />
            <StanagMag x={42} height={15} />
            <PistolGrip x={62} y={24} height={13} />
            <FrontSight x={108} />
            <rect height="4" rx="1" width="4" x="116" y="20.5" />
        </g>
    );
}

function VssDmr() {
    return (
        <g fill="currentColor">
            <FixedStock />
            <rect height="7" rx="2.5" width="26" x="36" y="18.5" />
            <rect height="4" rx="1.5" width="18" x="60" y="20" />
            <Suppressor x={77} width={38} />
            <LongRail x={42} width={22} />
            <ShortMag x={56} />
            <PistolGrip x={48} y={24} height={12} />
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

function renderFallback(category: WeaponCategory) {
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

function renderWeaponSilhouette(
    silhouetteId: RenderableSilhouetteId | undefined,
    category: WeaponCategory,
) {
    switch (silhouetteId) {
        case 'beryl-m762':
            return <StandardRifle barrelWidth={24} handguardWidth={18} magazine="curved" stock="fixed" />;
        case 'm416':
            return <StandardRifle magazine="stanag" stock="collapsed" />;
        case 'aug':
            return <BullpupRifle />;
        case 'ace32':
            return <StandardRifle barrelWidth={22} handguardWidth={22} magazine="curved" stock="skeleton" />;
        case 'akm':
            return <StandardRifle handguardWidth={20} magazine="curved" optic="rail" stock="fixed" />;
        case 'scar-l':
            return <StandardRifle handguardWidth={28} magazine="stanag" muzzle="plain" optic="rail" stock="fixed" />;
        case 'g36c':
            return <StandardRifle barrelWidth={20} handguardWidth={18} magazine="stanag" optic="rail" stock="skeleton" />;
        case 'qbz':
            return <BullpupRifle barrelWidth={28} magazineX={42} receiverWidth={56} />;
        case 'k2':
            return <StandardRifle barrelWidth={25} handguardWidth={24} magazine="stanag" optic="rail" stock="fixed" />;
        case 'groza':
            return <GrozaRifle />;
        case 'famas':
            return <FamasRifle />;
        case 'm16a4':
            return <StandardRifle barrelWidth={32} handguardWidth={26} magazine="stanag" optic="rail" stock="fixed" />;
        case 'mk47-mutant':
            return <StandardRifle barrelWidth={28} handguardWidth={24} magazine="curved" optic="rail" stock="skeleton" />;
        case 'ump45':
            return <CompactSmg barrelWidth={16} magazine="stanag" optic={true} receiverWidth={20} stock="skeleton" />;
        case 'vector':
            return <VectorSmg />;
        case 'micro-uzi':
            return <MicroUziSmg />;
        case 'mp5k':
            return <CompactSmg barrelWidth={18} magazine="short" optic={true} receiverWidth={22} stock="collapsed" />;
        case 'pp-19-bizon':
            return <BizonSmg />;
        case 'tommy-gun':
            return <TommyGunSmg />;
        case 'js9':
            return <CompactSmg barrelWidth={20} magazine="short" optic={true} receiverWidth={24} stock="skeleton" />;
        case 'p90':
            return <P90Smg />;
        case 'mini14':
            return <MarksmanRifle barrelWidth={42} magazine="short" optic="rail" receiverWidth={22} />;
        case 'mk12':
            return <MarksmanRifle barrelWidth={38} magazine="stanag" optic="rail" receiverWidth={24} stock="skeleton" withGrip={true} />;
        case 'sks':
            return <MarksmanRifle barrelWidth={34} magazine="curved" optic="rail" receiverWidth={24} withGrip={true} />;
        case 'slr':
            return <MarksmanRifle barrelWidth={36} magazine="stanag" optic="rail" receiverWidth={26} stock="skeleton" withGrip={true} />;
        case 'dragunov':
            return <DragunovDmr />;
        case 'qbu':
            return <QbuDmr />;
        case 'vss':
            return <VssDmr />;
        case 'mk14':
            return <MarksmanRifle barrelWidth={40} magazine="curved" optic="rail" receiverWidth={28} stock="skeleton" withGrip={true} />;
        case 'dp28':
            return <Dp28Lmg />;
        case 'm249':
            return <M249Lmg />;
        default:
            return renderFallback(category);
    }
}

export function WeaponIcon({
    weaponId,
    weaponName,
    category,
    size = 48,
    framed = true,
    showStatus = false,
}: WeaponIconProps) {
    const presentation = resolveWeaponPresentation(weaponId, weaponName, category);

    return (
        <IconCanvas
            framed={framed}
            presentation={presentation}
            showStatus={showStatus}
            size={size}
        >
            {renderWeaponSilhouette(presentation.silhouetteId, presentation.category)}
        </IconCanvas>
    );
}
