const fs = require('fs');
const file = 'src/game/pubg/weapon-data.ts';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(/\{\s*dx:\s*(-?[\d.]+),\s*dy:\s*(-?[\d.]+)\s*\}/g, (match, dx, dy) => {
    const yaw = parseFloat(dx) * 0.045;
    const pitch = parseFloat(dy) * 0.045;
    return `{ yaw: ${yaw.toFixed(2)}, pitch: ${pitch.toFixed(2)} }`;
});

fs.writeFileSync(file, content);
console.log('Conversion successful!');
