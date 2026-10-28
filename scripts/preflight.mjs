#!/usr/bin/env node
/**
 * Release preflight: fail before a release ships a broken bundle.
 *
 * Checks the manifest a DSH host reads, the files `files` promises, the syntax
 * of both halves, and the locale/icon display resources. Repository metadata is
 * only a warning so a first release can go out before the repo exists.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const problems = [];
const warnings = [];
const read = (name) => readFileSync(join(root, name), 'utf8');
const fail = (message) => problems.push(message);
const warn = (message) => warnings.push(message);

let pkg;
try {
  pkg = JSON.parse(read('package.json'));
} catch (error) {
  console.error(`package.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

for (const field of ['name', 'version', 'description', 'license']) {
  if (typeof pkg[field] !== 'string' || pkg[field].trim() === '') fail(`package.json is missing "${field}"`);
}
if (!Array.isArray(pkg.keywords) || pkg.keywords.length === 0) fail('package.json is missing "keywords"');
if (pkg.dsh?.bundle?.patch === undefined) fail('package.json has no dsh.bundle.patch');
if (pkg.dsh?.client?.platform !== 'web') fail('package.json has no dsh.client.platform = "web"');
if (typeof pkg.engines?.dsh !== 'string') warn('package.json declares no engines.dsh, so hosts cannot report a version requirement');
if (pkg.repository === undefined) warn('package.json has no "repository"; add it before announcing the plugin');
if (pkg.private === true) fail('package.json is private');

const required = [
  'index.js',
  'client.js',
  'cordis.patch.yml',
  'install.mjs',
  'scripts/preflight.mjs',
  'LICENSE',
  'README.md',
  'README.zh.md',
  'locale/zh.json',
  'locale/en.json',
  'icon.svg',
];
for (const name of required) {
  if (!existsSync(join(root, name))) fail(`missing ${name}`);
}
for (const name of required) {
  if (!pkg.files?.some((entry) => entry === name || (entry.endsWith('/*.json') && name.startsWith('locale/')))) {
    fail(`"files" does not ship ${name}`);
  }
}

for (const name of ['index.js', 'client.js', 'install.mjs', 'scripts/preflight.mjs']) {
  const file = join(root, name);
  if (!existsSync(file)) continue;
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) fail(`${name} does not parse: ${check.stderr.split('\n')[0]}`);
}

for (const locale of ['zh', 'en']) {
  const file = join(root, 'locale', `${locale}.json`);
  if (!existsSync(file)) continue;
  try {
    const meta = JSON.parse(readFileSync(file, 'utf8')).meta ?? {};
    if (typeof meta.title !== 'string' || meta.title === '') fail(`locale/${locale}.json has no meta.title`);
    if (typeof meta.description !== 'string' || meta.description === '') fail(`locale/${locale}.json has no meta.description`);
  } catch (error) {
    fail(`locale/${locale}.json is not valid JSON: ${error.message}`);
  }
}

const icon = join(root, 'icon.svg');
if (existsSync(icon)) {
  const size = statSync(icon).size;
  if (size > 256 * 1024) fail(`icon.svg is ${size} bytes; the host accepts at most 256 KiB`);
  if (!readFileSync(icon, 'utf8').includes('<svg')) fail('icon.svg is not an SVG document');
}

const entry = pkg.cordis?.patch ?? pkg.dsh?.bundle?.patch;
if (entry !== undefined) {
  const patch = read(pkg.dsh.bundle.patch);
  if (!patch.includes(`name: '${pkg.name}'`)) fail(`cordis.patch.yml does not insert "${pkg.name}"`);
  if (!patch.includes('- insert:')) fail('cordis.patch.yml declares no insert');
}
if (!read('client.js').includes(`id: '${pkg.name}'`)) fail(`client.js does not register the module id "${pkg.name}"`);

for (const message of warnings) console.warn(`warning: ${message}`);
if (problems.length > 0) {
  for (const message of problems) console.error(`error: ${message}`);
  process.exit(1);
}
console.log(`preflight ok: ${pkg.name}@${pkg.version}`);
