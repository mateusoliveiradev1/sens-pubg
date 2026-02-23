import fs from 'fs';
import path from 'path';
import https from 'https';

// Node.js script to download images and proxy them locally to avoid 403 hotlink issues on Vercel.
const PROS = ['TGLTN', 'Shrimzy', 'Kickstart', 'hwinn', 'Pio', 'Aixleft', 'EeND', 'Salute', 'Taemin', 'Mxey', 'xmpl', 'Fludd', 'Inonix', 'God', 'Gustav'];
const TEAMS = ['falcons', 'baegopa', 'petrichor-road', 'gen-g', 't1', 'faze-clan', 'twisted-minds', 'danawa-esports', 'natus-vincere', '17-gaming', 'the-expendables', 'four-angry-men', 'nh-esports', 'virtus-pro', 'betboom'];

const DIR_PROS = path.join(process.cwd(), 'public', 'images', 'pros');
const DIR_TEAMS = path.join(process.cwd(), 'public', 'images', 'teams');

fs.mkdirSync(DIR_PROS, { recursive: true });
fs.mkdirSync(DIR_TEAMS, { recursive: true });

function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
                return download(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode === 404) {
                console.log(`Not found: ${url}`);
                resolve();
                return;
            }
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function run() {
    console.log('Downloading pro players...');
    for (const p of PROS) {
        await download(`https://specs.gg/api/players/${encodeURIComponent(p)}/image`, path.join(DIR_PROS, `${p.toLowerCase()}.png`));
        console.log(`Downloaded ${p}`);
    }

    console.log('Downloading teams...');
    for (const t of TEAMS) {
        await download(`https://specs.gg/api/teams/${t}/logo`, path.join(DIR_TEAMS, `${t}.png`));
        console.log(`Downloaded ${t}`);
    }
    console.log('Done.');
}

run();
