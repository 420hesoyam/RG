#!/usr/bin/env node
/**
 * Concatenates src/* into a single-file userscript for local testing.
 * Usage: node tools/bundle.mjs [outfile]
 *   default out: dist/redgifs.local.user.js
 *
 * @require-based loading is the shipping path; this bundle is a dev aid
 * (no network fetch, no CORS surprises while iterating).
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const outFile = resolve(root, process.argv[2] || 'dist/redgifs.local.user.js');

const files = (await readdir(srcDir)).filter(f => f.endsWith('.js')).sort();
if (!files.length) throw new Error('no modules found in src/');

const header = `// RedGifs Auto Production - LOCAL BUNDLE (generated, do not edit)
// built from ${files.length} modules: ${files.join(', ')}
`;
const body = (await Promise.all(files.map(async f => {
    const code = await readFile(join(srcDir, f), 'utf8');
    return `/* ===== ${f} ===== */\n${code}`;
}))).join('\n');

const entryMeta = `/* Bootstrap */\nRG.start();\n`;

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, header + body + '\n' + entryMeta, 'utf8');

console.log(`built ${files.length} modules -> ${outFile}`);
