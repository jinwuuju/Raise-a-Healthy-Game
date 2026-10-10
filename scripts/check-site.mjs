import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const entry = path.join(root, 'index.html');
if (!existsSync(entry)) {
  console.error('Cannot validate: missing site/index.html. Do not deploy an empty placeholder.');
  process.exit(1);
}
const failures = [];
let checked = 0;
let scripts = 0;
let pages = 0;
const files = [];
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isSymbolicLink()) { failures.push(`Symbolic links are not permitted: ${full}`); continue; }
    if (e.isDirectory()) walk(full);
    else if (e.isFile()) files.push(full);
  }
}
walk(root);

function verifyRef(from, ref) {
  if (!ref || /^(?:#|\?|data:|mailto:|tel:|javascript:|https?:|\/\/)/i.test(ref)) return;
  let url;
  try { url = decodeURIComponent(ref.split(/[?#]/)[0]); }
  catch { failures.push(`${path.relative(root, from)}: malformed reference ${ref}`); return; }
  if (!url) return;
  if (url.startsWith('/')) {
    failures.push(`${path.relative(root, from)}: absolute reference ${ref} may break project Pages; use a relative path`);
    return;
  }
  const resolved = path.resolve(path.dirname(from), url);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    failures.push(`${path.relative(root, from)}: reference leaves public site: ${ref}`);
    return;
  }
  checked++;
  if (!existsSync(resolved) && !existsSync(path.join(resolved, 'index.html'))) {
    failures.push(`${path.relative(root, from)}: missing ${ref}`);
  }
}

for (const file of files) {
  if (file.endsWith('.js') || file.endsWith('.mjs')) {
    try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); scripts++; }
    catch (err) { failures.push(`JavaScript syntax failed in ${path.relative(root, file)}: ${String(err.stderr || err.message)}`); }
  }
  if (!/\.(?:html?|css)$/i.test(file)) continue;
  const source = readFileSync(file, 'utf8');
  if (/\.html?$/i.test(file)) {
    pages++;
    for (const match of source.matchAll(/\b(?:href|src|poster)\s*=\s*(["'])(.*?)\1/gi)) verifyRef(file, match[2]);
    for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      if (/\bsrc\s*=/.test(match[1])) continue;
      const body = match[2].trim();
      if (!body) continue;
      if (/\btype\s*=\s*['"](?:application\/json|application\/ld\+json|text\/template)['"]/i.test(match[1])) continue;
      try { new Script(body, { filename: path.relative(root, file) }); scripts++; }
      catch (err) { failures.push(`Inline JavaScript syntax failed in ${path.relative(root, file)}: ${err.message}`); }
    }
  }
  for (const match of source.matchAll(/url\(\s*(['"]?)([^)]+?)\1\s*\)/gi)) verifyRef(file, match[2].trim());
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  console.error(`${failures.length} problem(s); checked ${pages} HTML pages, ${scripts} JS scripts, ${checked} relative references.`);
  process.exit(1);
}
console.log(`PASS: ${pages} HTML pages, ${scripts} JS scripts, ${checked} relative links/assets.`);
console.log('Note: this is the deployment baseline check, NOT the prior 802 + 143 design-suite tests.');
