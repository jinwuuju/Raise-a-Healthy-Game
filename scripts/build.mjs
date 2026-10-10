import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'site');
const entry = path.join(source, 'index.html');
const dist = path.join(root, 'dist');
if (!existsSync(entry)) {
  console.error('Missing site/index.html. Add the original design-studio files before deployment.');
  process.exit(1);
}
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(source, dist, { recursive: true });
writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('Built static website from site/ to dist/.');
