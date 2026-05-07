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
    const pubgApiImagePath = presentation.visualEntry?.pubgApiImagePath;
    const rootStyle = {
        '--weapon-icon-size': `${size}px`,
    } as CSSProperties;

    return (
        <span
            className={cx(styles.root, showStatus && styles.rootWithStatus)}
            data-seed-weapon={presentation.visualEntry ? 'true' : 'false'}
            data-silhouette-id={renderedSilhouetteId}
            data-support-kind={presentation.supportStatus.kind}
            data-weapon-icon="premium-weapon-visual"
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
                {pubgApiImagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element -- WeaponIcon renders local catalog assets at caller-controlled icon sizes.
                    <img
                        alt=""
                        aria-hidden="true"
                        className={styles.assetImage}
                        data-art-source="pubg-api-assets"
                        data-pubg-api-asset-id={presentation.visualEntry?.pubgApiAssetId}
                        src={pubgApiImagePath}
                    />
                ) : (
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
                )}
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

const CUTOUT_FILL = 'rgba(8, 10, 16, 0.82)';

function CutoutSlot({
    height = 2,
    width,
    x,
    y,
}: {
    readonly height?: number;
    readonly width: number;
    readonly x: number;
    readonly y: number;
}) {
    return <rect fill={CUTOUT_FILL} height={height} rx={height / 2} width={width} x={x} y={y} />;
}

function DetailStroke({
    d,
    width = 1.4,
}: {
    readonly d: string;
    readonly width?: number;
}) {
    return (
        <path
            d={d}
            fill="none"
            stroke={CUTOUT_FILL}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={width}
        />
    );
}

function RealFixedStock() {
    return (
        <g>
            <path d="M 5 18 L 18 15 L 31 19 L 32 26 L 19 30 L 6 27 L 11 23 Z" fill="currentColor" />
            <path d="M 12 20 L 21 18 L 27 21 L 23 26 L 13 26 L 17 23 Z" fill={CUTOUT_FILL} />
        </g>
    );
}

function RealAdjustableStock() {
    return (
        <g>
            <rect fill="currentColor" height="3" rx="1.5" width="16" x="14" y="22" />
            <path d="M 5 19 L 18 17 L 28 20 L 28 25 L 17 28 L 5 26 L 10 23 Z" fill="currentColor" />
            <CutoutSlot width={9} x={12} y={21} />
        </g>
    );
}

function RealSkeletonStock() {
    return (
        <g>
            <path d="M 5 19 L 18 17 L 31 20 L 31 26 L 18 29 L 6 27 L 11 23 Z" fill="currentColor" />
            <path d="M 13 21 L 22 20 L 27 22 L 21 26 L 12 26 L 16 23 Z" fill={CUTOUT_FILL} />
            <rect fill="currentColor" height="2.5" rx="1.25" width="12" x="23" y="22" />
        </g>
    );
}

function RealGrip({ x = 49, y = 25, lean = 0 }: { readonly x?: number; readonly y?: number; readonly lean?: number }) {
    return (
        <path
            d={`M ${x} ${y} L ${x + 9} ${y} L ${x + 8 + lean} ${y + 14} L ${x - 1 + lean} ${y + 14} Z`}
            fill="currentColor"
        />
    );
}

function RealCurvedMag({ x = 56, y = 25, height = 17 }: { readonly x?: number; readonly y?: number; readonly height?: number }) {
    return (
        <path
            d={`M ${x} ${y} L ${x + 12} ${y} C ${x + 12} ${y + 7} ${x + 9} ${y + height - 2} ${x + 2} ${y + height} L ${x - 4} ${y + height - 2} C ${x + 1} ${y + 10} ${x + 2} ${y + 4} ${x} ${y} Z`}
            fill="currentColor"
        />
    );
}

function RealBoxMag({ x = 58, y = 25, height = 16, slant = -2 }: { readonly x?: number; readonly y?: number; readonly height?: number; readonly slant?: number }) {
    return (
        <path
            d={`M ${x} ${y} L ${x + 11} ${y} L ${x + 9 + slant} ${y + height} L ${x - 1 + slant} ${y + height} Z`}
            fill="currentColor"
        />
    );
}

function RealMuzzle({ x = 113, y = 21 }: { readonly x?: number; readonly y?: number }) {
    return (
        <g>
            <rect fill="currentColor" height="5" rx="1" width="5" x={x} y={y} />
            <rect fill={CUTOUT_FILL} height="1" rx="0.5" width="3" x={x + 1} y={y + 1.2} />
            <rect fill={CUTOUT_FILL} height="1" rx="0.5" width="3" x={x + 1} y={y + 2.8} />
        </g>
    );
}

function RealRail({ width = 24, x = 42, y = 14 }: { readonly width?: number; readonly x?: number; readonly y?: number }) {
    return (
        <g>
            <rect fill="currentColor" height="3" rx="1.5" width={width} x={x} y={y} />
            <CutoutSlot height={1} width={Math.max(7, width - 8)} x={x + 4} y={y + 3.4} />
        </g>
    );
}

function BerylM762Silhouette() {
    return (
        <g>
            <RealFixedStock />
            <path d="M 30 19 L 66 18 L 76 20 L 76 26 L 63 28 L 31 27 Z" fill="currentColor" />
            <path d="M 65 19 L 96 20 L 98 25 L 72 26 L 64 24 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="22" x="92" y="22" />
            <RealMuzzle x={114} />
            <RealRail width={25} x={42} />
            <RealGrip x={48} />
            <RealCurvedMag x={57} />
            <DetailStroke d="M 73 22 L 94 22" />
        </g>
    );
}

function M416Silhouette() {
    return (
        <g>
            <RealAdjustableStock />
            <path d="M 31 18 L 68 18 L 76 21 L 76 26 L 63 28 L 32 27 Z" fill="currentColor" />
            <path d="M 68 18 L 100 19 L 103 24 L 74 26 L 68 24 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="16" x="101" y="22" />
            <RealMuzzle x={117} />
            <RealRail width={31} x={39} y={13} />
            <RealGrip x={49} />
            <RealBoxMag x={58} />
            <DetailStroke d="M 75 21 L 99 21" />
        </g>
    );
}

function AugSilhouette() {
    return (
        <g>
            <path d="M 7 20 L 22 17 L 66 18 L 81 21 L 84 25 L 78 29 L 20 29 L 9 26 L 14 23 Z" fill="currentColor" />
            <path d="M 48 25 L 58 25 L 55 42 L 45 41 Z" fill="currentColor" />
            <RealGrip x={66} y={25} lean={-1} />
            <path d="M 40 13 L 62 13 L 67 17 L 36 17 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="30" x="84" y="22" />
            <RealMuzzle x={114} />
            <path d="M 19 21 L 36 20 L 29 27 L 16 27 Z" fill={CUTOUT_FILL} />
            <CutoutSlot width={14} x={63} y={21} />
        </g>
    );
}

function Ace32Silhouette() {
    return (
        <g>
            <RealSkeletonStock />
            <path d="M 31 18 L 68 18 L 78 21 L 76 27 L 35 28 L 31 25 Z" fill="currentColor" />
            <path d="M 67 19 L 95 20 L 99 24 L 75 26 L 67 24 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="17" x="98" y="22" />
            <RealMuzzle x={115} />
            <RealRail width={25} x={41} />
            <RealGrip x={49} />
            <RealCurvedMag x={58} />
            <CutoutSlot width={16} x={75} y={21} />
        </g>
    );
}

function AkmSilhouette() {
    return (
        <g>
            <RealFixedStock />
            <path d="M 30 19 L 64 18 L 72 21 L 71 27 L 34 28 L 30 25 Z" fill="currentColor" />
            <path d="M 65 17 L 91 19 L 96 23 L 72 25 L 65 23 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="20" x="93" y="22" />
            <RealMuzzle x={113} />
            <path d="M 42 14 L 63 14 L 68 17 L 38 17 Z" fill="currentColor" />
            <RealGrip x={47} />
            <RealCurvedMag x={55} height={18} />
            <DetailStroke d="M 72 21 L 91 21" />
        </g>
    );
}

function ScarLSilhouette() {
    return (
        <g>
            <path d="M 5 19 L 20 17 L 31 20 L 31 26 L 19 29 L 5 27 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="12" x="25" y="22" />
            <path d="M 34 18 L 72 18 L 80 20 L 80 27 L 37 28 L 34 25 Z" fill="currentColor" />
            <path d="M 72 18 L 101 19 L 105 24 L 78 27 L 72 25 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="13" x="104" y="22" />
            <rect fill="currentColor" height="3" rx="1.5" width="37" x="38" y="13" />
            <RealGrip x={50} />
            <RealBoxMag x={59} slant={0} />
            <CutoutSlot width={20} x={79} y={21} />
        </g>
    );
}

function G36CSilhouette() {
    return (
        <g>
            <RealSkeletonStock />
            <path d="M 31 18 L 65 18 L 76 21 L 75 27 L 35 28 L 31 25 Z" fill="currentColor" />
            <path d="M 65 19 L 91 20 L 95 24 L 74 26 L 65 24 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="17" x="94" y="22" />
            <RealMuzzle x={111} />
            <path d="M 39 12 L 67 12 L 75 17 L 35 17 Z" fill="currentColor" />
            <RealGrip x={49} />
            <RealBoxMag x={57} height={17} slant={2} />
            <CutoutSlot width={22} x={44} y={14} />
        </g>
    );
}

function QbzSilhouette() {
    return (
        <g>
            <path d="M 8 19 L 23 17 L 67 18 L 82 21 L 84 25 L 78 29 L 18 29 L 8 26 L 13 23 Z" fill="currentColor" />
            <path d="M 42 25 L 53 25 L 52 41 L 42 40 Z" fill="currentColor" />
            <RealGrip x={64} y={25} />
            <path d="M 38 13 L 66 13 L 72 17 L 34 17 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="31" x="83" y="22" />
            <RealMuzzle x={114} />
            <CutoutSlot width={18} x={47} y={15} />
            <CutoutSlot width={18} x={18} y={21} />
        </g>
    );
}

function K2Silhouette() {
    return (
        <g>
            <RealFixedStock />
            <path d="M 30 18 L 67 18 L 76 21 L 75 27 L 34 28 L 30 25 Z" fill="currentColor" />
            <path d="M 67 19 L 98 20 L 102 24 L 75 26 L 67 24 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="15" x="101" y="22" />
            <RealMuzzle x={116} />
            <RealRail width={24} x={42} />
            <RealGrip x={49} />
            <RealBoxMag x={58} />
            <DetailStroke d="M 75 21 L 97 21" />
        </g>
    );
}

function GrozaSilhouette() {
    return (
        <g>
            <path d="M 10 19 L 24 17 L 66 18 L 79 21 L 81 25 L 75 29 L 18 29 L 10 26 L 15 23 Z" fill="currentColor" />
            <RealCurvedMag x={38} y={25} height={16} />
            <RealGrip x={58} y={25} />
            <RealRail width={20} x={42} />
            <rect fill="currentColor" height="5" rx="2.5" width="34" x="80" y="21" />
            <RealMuzzle x={114} />
            <CutoutSlot width={13} x={20} y={21} />
        </g>
    );
}

function FamasSilhouette() {
    return (
        <g>
            <path d="M 8 20 L 23 17 L 65 18 L 82 21 L 84 25 L 77 29 L 17 29 L 8 26 L 14 23 Z" fill="currentColor" />
            <path d="M 30 13 C 40 10 57 10 70 14 L 70 18 L 31 18 Z" fill="currentColor" />
            <path d="M 39 15 L 58 15" fill="none" stroke={CUTOUT_FILL} strokeLinecap="round" strokeWidth="2" />
            <RealBoxMag x={40} y={25} height={17} />
            <RealGrip x={62} y={25} />
            <rect fill="currentColor" height="3" rx="1.5" width="31" x="83" y="22" />
            <RealMuzzle x={114} />
        </g>
    );
}

function M16A4Silhouette() {
    return (
        <g>
            <RealFixedStock />
            <path d="M 31 18 L 66 18 L 75 21 L 75 27 L 35 28 L 31 25 Z" fill="currentColor" />
            <path d="M 66 18 L 101 19 L 106 24 L 74 27 L 66 24 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="12" x="106" y="22" />
            <path d="M 39 12 L 62 12 L 67 17 L 35 17 Z" fill="currentColor" />
            <RealGrip x={49} />
            <RealBoxMag x={58} />
            <DetailStroke d="M 76 21 L 101 21" />
        </g>
    );
}

function Mk47Silhouette() {
    return (
        <g>
            <RealSkeletonStock />
            <path d="M 31 18 L 69 18 L 78 21 L 77 27 L 35 28 L 31 25 Z" fill="currentColor" />
            <path d="M 68 19 L 99 20 L 103 24 L 77 27 L 68 24 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="12" x="102" y="22" />
            <RealMuzzle x={114} />
            <RealRail width={27} x={41} />
            <RealGrip x={50} />
            <RealCurvedMag x={59} />
            <DetailStroke d="M 78 22 L 98 22" />
        </g>
    );
}

function Ump45Silhouette() {
    return (
        <g>
            <RealSkeletonStock />
            <path d="M 33 18 L 67 18 L 75 21 L 73 28 L 36 28 L 33 25 Z" fill="currentColor" />
            <path d="M 68 20 L 91 20 L 94 24 L 72 26 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="12" x="93" y="22" />
            <RealMuzzle x={105} />
            <rect fill="currentColor" height="3" rx="1.5" width="23" x="42" y="13" />
            <RealGrip x={48} />
            <RealBoxMag x={58} height={18} slant={0} />
            <CutoutSlot width={17} x={73} y={22} />
        </g>
    );
}

function VectorSilhouette() {
    return (
        <g>
            <RealAdjustableStock />
            <path d="M 35 19 L 58 19 L 66 15 L 79 16 L 80 22 L 70 24 L 67 29 L 45 29 L 35 24 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="19" x="79" y="22" />
            <RealMuzzle x={98} />
            <rect fill="currentColor" height="3" rx="1.5" width="15" x="48" y="13" />
            <RealBoxMag x={52} height={19} slant={0} />
            <RealGrip x={65} y={24} />
            <CutoutSlot width={12} x={47} y={21} />
        </g>
    );
}

function MicroUziSilhouette() {
    return (
        <g>
            <path d="M 13 21 L 31 21" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
            <path d="M 30 18 L 59 18 L 68 21 L 68 27 L 32 27 Z" fill="currentColor" />
            <rect fill="currentColor" height="4" rx="1.2" width="17" x="67" y="21" />
            <rect fill="currentColor" height="6" rx="1.5" width="7" x="84" y="20" />
            <path d="M 40 25 L 50 25 L 52 41 L 42 41 Z" fill="currentColor" />
            <RealGrip x={32} y={25} lean={2} />
            <CutoutSlot width={16} x={41} y={20} />
        </g>
    );
}

function Mp5kSilhouette() {
    return (
        <g>
            <path d="M 18 21 L 33 21" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
            <path d="M 32 18 C 45 16 64 17 73 21 L 72 27 C 57 29 43 29 33 27 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="22" x="72" y="22" />
            <RealMuzzle x={94} />
            <path d="M 43 14 L 62 14 L 66 17 L 39 17 Z" fill="currentColor" />
            <RealBoxMag x={53} height={17} slant={1} />
            <RealGrip x={42} y={25} />
            <CutoutSlot width={16} x={48} y={20} />
        </g>
    );
}

function BizonSilhouette() {
    return (
        <g>
            <RealAdjustableStock />
            <path d="M 33 18 L 72 18 L 82 21 L 81 27 L 36 28 L 33 25 Z" fill="currentColor" />
            <rect fill="currentColor" height="6" rx="3" width="48" x="42" y="29" />
            <rect fill="currentColor" height="3" rx="1.5" width="20" x="82" y="22" />
            <RealMuzzle x={102} />
            <RealRail width={23} x={43} />
            <RealGrip x={49} />
            <DetailStroke d="M 48 32 L 84 32" width={1.2} />
        </g>
    );
}

function TommyGunSilhouette() {
    return (
        <g>
            <RealFixedStock />
            <path d="M 32 18 L 66 18 L 76 21 L 74 27 L 35 28 L 32 25 Z" fill="currentColor" />
            <rect fill="currentColor" height="5" rx="2.5" width="33" x="74" y="21" />
            <rect fill="currentColor" height="3" rx="1.5" width="11" x="106" y="22" />
            <circle cx="58" cy="33" fill="currentColor" r="10" />
            <circle cx="58" cy="33" fill={CUTOUT_FILL} r="4.5" />
            <RealGrip x={45} y={25} lean={2} />
            <rect fill="currentColor" height="3" rx="1.5" width="27" x="43" y="13" />
        </g>
    );
}

function Js9Silhouette() {
    return (
        <g>
            <path d="M 12 20 L 25 18 L 61 18 L 75 21 L 77 25 L 70 28 L 20 28 L 12 25 L 17 23 Z" fill="currentColor" />
            <RealGrip x={57} y={25} />
            <RealBoxMag x={43} y={25} height={16} slant={0} />
            <rect fill="currentColor" height="3" rx="1.5" width="25" x="77" y="22" />
            <RealMuzzle x={102} />
            <RealRail width={20} x={37} />
            <CutoutSlot width={15} x={21} y={21} />
        </g>
    );
}

function P90Silhouette() {
    return (
        <g>
            <path d="M 16 19 L 78 17 L 94 20 L 97 24 L 91 28 L 18 29 L 10 26 Z" fill="currentColor" />
            <rect fill="currentColor" height="5" rx="2.5" width="54" x="30" y="12" />
            <path d="M 54 25 L 65 25 L 66 37 L 55 36 Z" fill="currentColor" />
            <RealGrip x={72} y={25} lean={-2} />
            <rect fill="currentColor" height="3" rx="1.5" width="19" x="95" y="22" />
            <RealMuzzle x={114} />
            <CutoutSlot width={38} x={38} y={14} />
            <CutoutSlot width={22} x={25} y={21} />
        </g>
    );
}

function Mini14Silhouette() {
    return (
        <g>
            <path d="M 6 20 L 24 17 L 49 19 L 65 21 L 64 27 L 26 29 L 7 27 L 13 23 Z" fill="currentColor" />
            <rect fill="currentColor" height="2.5" rx="1.25" width="50" x="64" y="22" />
            <rect fill="currentColor" height="4" rx="1" width="5" x="114" y="21" />
            <path d="M 53 25 L 62 25 L 61 37 L 52 37 Z" fill="currentColor" />
            <RealRail width={19} x={43} y={14} />
            <DetailStroke d="M 20 22 C 31 21 43 22 58 24" />
        </g>
    );
}

function Mk12Silhouette() {
    return (
        <g>
            <RealSkeletonStock />
            <path d="M 31 18 L 67 18 L 76 21 L 75 27 L 35 28 L 31 25 Z" fill="currentColor" />
            <path d="M 67 18 L 102 19 L 106 24 L 75 27 L 67 24 Z" fill="currentColor" />
            <rect fill="currentColor" height="3" rx="1.5" width="12" x="106" y="22" />
            <RealMuzzle x={118} />
            <RealRail width={37} x={39} y={13} />
            <RealGrip x={49} />
            <RealBoxMag x={58} height={15} />
            <path d="M 86 26 L 82 39 M 94 26 L 98 39" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </g>
    );
}

function SksSilhouette() {
    return (
        <g>
            <path d="M 6 20 L 25 17 L 61 19 L 73 22 L 72 28 L 26 30 L 7 27 L 13 23 Z" fill="currentColor" />
            <rect fill="currentColor" height="2.5" rx="1.25" width="42" x="72" y="22" />
            <rect fill="currentColor" height="4" rx="1" width="5" x="114" y="21" />
            <RealCurvedMag x={55} y={25} height={14} />
            <RealRail width={22} x={42} y={14} />
            <DetailStroke d="M 20 22 C 35 21 52 23 69 24" />
        </g>
    );
}

function SlrSilhouette() {
    return (
        <g>
            <RealSkeletonStock />
            <path d="M 31 18 L 68 18 L 79 21 L 78 27 L 35 28 L 31 25 Z" fill="currentColor" />
            <path d="M 68 19 L 102 20 L 106 24 L 78 27 L 68 24 Z" fill="currentColor" />
            <rect fill="currentColor" height="2.5" rx="1.25" width="11" x="106" y="22" />
            <rect fill="currentColor" height="4" rx="1" width="4" x="117" y="21" />
            <RealRail width={29} x={41} />
            <RealGrip x={49} />
            <RealBoxMag x={59} height={16} slant={0} />
            <DetailStroke d="M 79 22 L 101 22" />
        </g>
    );
}

function DragunovSilhouette() {
    return (
        <g>
            <path d="M 6 18 L 22 16 L 34 20 L 34 27 L 20 31 L 7 28 L 12 24 Z" fill="currentColor" />
            <path d="M 14 21 L 23 20 L 28 23 L 22 28 L 13 27 L 17 24 Z" fill={CUTOUT_FILL} />
            <path d="M 34 18 L 68 18 L 78 21 L 76 27 L 36 28 Z" fill="currentColor" />
            <rect fill="currentColor" height="2.5" rx="1.25" width="43" x="76" y="22" />
            <RealMuzzle x={119} />
            <path d="M 42 12 L 67 12 L 73 17 L 37 17 Z" fill="currentColor" />
            <RealCurvedMag x={56} y={25} height={16} />
            <DetailStroke d="M 79 22 L 113 22" />
        </g>
    );
}

function QbuSilhouette() {
    return (
        <g>
            <path d="M 9 19 L 25 17 L 67 18 L 82 21 L 85 25 L 78 29 L 19 29 L 9 26 L 14 23 Z" fill="currentColor" />
            <path d="M 41 25 L 52 25 L 51 41 L 41 40 Z" fill="currentColor" />
            <RealGrip x={63} y={25} />
            <path d="M 38 13 L 66 13 L 73 17 L 34 17 Z" fill="currentColor" />
            <rect fill="currentColor" height="2.5" rx="1.25" width="34" x="84" y="22" />
            <rect fill="currentColor" height="4" rx="1" width="4" x="118" y="21" />
            <CutoutSlot width={19} x={47} y={15} />
            <DetailStroke d="M 86 22 L 113 22" />
        </g>
    );
}

function VssSilhouette() {
    return (
        <g>
            <path d="M 7 18 L 22 16 L 34 20 L 34 27 L 21 30 L 8 28 L 13 24 Z" fill="currentColor" />
            <path d="M 14 21 L 23 20 L 28 23 L 22 27 L 14 27 L 18 24 Z" fill={CUTOUT_FILL} />
            <path d="M 34 18 L 61 18 L 70 21 L 68 27 L 36 28 Z" fill="currentColor" />
            <rect fill="currentColor" height="8" rx="4" width="46" x="68" y="19" />
            <rect fill="currentColor" height="3" rx="1.5" width="22" x="41" y="13" />
            <RealBoxMag x={54} y={25} height={14} />
            <RealGrip x={47} y={25} />
            <DetailStroke d="M 74 23 L 108 23" />
        </g>
    );
}

function Mk14Silhouette() {
    return (
        <g>
            <RealSkeletonStock />
            <path d="M 31 18 L 69 18 L 80 21 L 78 27 L 35 28 L 31 25 Z" fill="currentColor" />
            <path d="M 69 18 L 104 19 L 108 24 L 78 27 L 69 24 Z" fill="currentColor" />
            <rect fill="currentColor" height="2.5" rx="1.25" width="10" x="108" y="22" />
            <RealMuzzle x={118} />
            <RealRail width={34} x={40} />
            <RealGrip x={49} />
            <RealCurvedMag x={58} height={16} />
            <path d="M 86 26 L 82 38 M 94 26 L 98 38" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
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
            return <BerylM762Silhouette />;
        case 'm416':
            return <M416Silhouette />;
        case 'aug':
            return <AugSilhouette />;
        case 'ace32':
            return <Ace32Silhouette />;
        case 'akm':
            return <AkmSilhouette />;
        case 'scar-l':
            return <ScarLSilhouette />;
        case 'g36c':
            return <G36CSilhouette />;
        case 'qbz':
            return <QbzSilhouette />;
        case 'k2':
            return <K2Silhouette />;
        case 'groza':
            return <GrozaSilhouette />;
        case 'famas':
            return <FamasSilhouette />;
        case 'm16a4':
            return <M16A4Silhouette />;
        case 'mk47-mutant':
            return <Mk47Silhouette />;
        case 'ump45':
            return <Ump45Silhouette />;
        case 'vector':
            return <VectorSilhouette />;
        case 'micro-uzi':
            return <MicroUziSilhouette />;
        case 'mp5k':
            return <Mp5kSilhouette />;
        case 'pp-19-bizon':
            return <BizonSilhouette />;
        case 'tommy-gun':
            return <TommyGunSilhouette />;
        case 'js9':
            return <Js9Silhouette />;
        case 'p90':
            return <P90Silhouette />;
        case 'mini14':
            return <Mini14Silhouette />;
        case 'mk12':
            return <Mk12Silhouette />;
        case 'sks':
            return <SksSilhouette />;
        case 'slr':
            return <SlrSilhouette />;
        case 'dragunov':
            return <DragunovSilhouette />;
        case 'qbu':
            return <QbuSilhouette />;
        case 'vss':
            return <VssSilhouette />;
        case 'mk14':
            return <Mk14Silhouette />;
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
