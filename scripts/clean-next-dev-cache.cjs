const { rmSync } = require('node:fs');
const { join } = require('node:path');

rmSync(join(process.cwd(), '.next-dev'), { recursive: true, force: true });
