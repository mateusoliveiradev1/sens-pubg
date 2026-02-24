import fs from 'fs';

const file = 'src/game/pubg/weapon-data.ts';
let code = fs.readFileSync(file, 'utf8');

// replace the interface:
code = code.replace(
    `    readonly supportedAttachments: {
        readonly muzzle: boolean;
        readonly grip: boolean;
        readonly stock: boolean;
    };`,
    `    readonly supportedAttachments: {
        readonly muzzle: readonly import('@/types/engine').MuzzleAttachment[];
        readonly grip: readonly import('@/types/engine').GripAttachment[];
        readonly stock: readonly import('@/types/engine').StockAttachment[];
    };`
);

const AR_MUZZLES = `['none', 'compensator', 'flash_hider', 'suppressor', 'muzzle_brake']`;
const ALL_GRIPS = `['none', 'vertical', 'angled', 'half', 'thumb', 'lightweight', 'laser', 'ergonomic']`;

// Regex to find supportedAttachments: { muzzle: true, grip: true, stock: true }
code = code.replace(/supportedAttachments:\s*\{\s*muzzle:\s*(true|false),\s*grip:\s*(true|false),\s*stock:\s*(true|false)\s*\}/g, (match, m, g, s, offset, string) => {
    // try to guess context by looking slightly before
    const prevText = string.substring(Math.max(0, offset - 250), offset);

    let muzzles = '[\'none\']';
    if (m === 'true') {
        if (prevText.includes(`category: 'shotgun'`)) {
            muzzles = `['none', 'choke', 'duckbill']`;
        } else {
            muzzles = AR_MUZZLES;
        }
    }

    let grips = '[\'none\']';
    if (g === 'true') {
        grips = ALL_GRIPS;
    }

    let stocks = '[\'none\']';
    if (s === 'true') {
        if (prevText.includes(`id: 'uzi'`)) {
            stocks = `['none', 'folding']`;
        } else if (prevText.includes(`category: 'dmr'`) || prevText.includes(`category: 'sr'`)) {
            stocks = `['none', 'cheek_pad']`;
        } else {
            stocks = `['none', 'tactical', 'heavy']`;
        }
    }

    return `supportedAttachments: { muzzle: ${muzzles}, grip: ${grips}, stock: ${stocks} }`;
});

fs.writeFileSync(file, code);
console.log('Done refactoring weapons.');
