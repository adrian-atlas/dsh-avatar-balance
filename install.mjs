#!/usr/bin/env node
/**
 * Wire this package into a dsh profile.
 *
 * The Electron desktop app owns the `desktop` profile, so `dsh plugin add` refuses
 * to touch it. This script performs the same writes the in-app installer performs
 * and is safe to re-run:
 *
 *   1. link the package into `<profile>/node_modules`;
 *   2. record the dependency (`link:`) in `<profile>/package.json`;
 *   3. select the package as a profile bundle, so the app composes the row from
 *      the package's own `cordis.patch.yml`.
 *
 * Re-running it also migrates older local installs (the pre-release package name
 * and the hand-written user-layer row) without leaving a duplicate row behind.
 *
 * The row must come from the bundle layer, not from a hand-written entry in
 * `<profile>/cordis.patch.yml`: Plugin Manager writes its on/off override into
 * that user layer, and a second hand-written insert would leave the plugin
 * running no matter what the switch says.
 *
 * Usage: node install.mjs [--profile-dir DIR] [--uninstall]
 */
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
const NAME = manifest.name;

const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const profileDir = resolve(flag('--profile-dir') ?? process.env.DSH_PROFILE_DIR ?? join(homedir(), '.dsh', 'profiles', 'desktop'));
const profileManifestPath = join(profileDir, 'package.json');
const patchPath = join(profileDir, 'cordis.patch.yml');
const linkPath = join(profileDir, 'node_modules', NAME);

/** Package name this plugin shipped under before its public release. */
const LEGACY_PACKAGE = 'dsh-deepseek-balance';
/** Marker block written by install.mjs 1.x, which put the row in the user layer. */
const LEGACY_BEGIN = '# >>> dsh-deepseek-balance >>>';
const LEGACY_END = '# <<< dsh-deepseek-balance <<<';

if (!existsSync(profileManifestPath)) {
  console.error(`No profile manifest at ${profileManifestPath}`);
  console.error('Pass --profile-dir <dir> or launch this from a dsh session.');
  process.exit(1);
}

function backup(path) {
  const copy = `${path}.dsb-backup`;
  if (!existsSync(copy) && existsSync(path)) copyFileSync(path, copy);
}

function isLink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

function readProfile() {
  return JSON.parse(readFileSync(profileManifestPath, 'utf8'));
}

function writeProfile(profile) {
  backup(profileManifestPath);
  writeFileSync(profileManifestPath, `${JSON.stringify(profile, undefined, 2)}\n`);
}

/** Drop the 1.x hand-written insert so the bundle layer owns the only row. */
function stripLegacyBlock() {
  if (!existsSync(patchPath)) return false;
  const text = readFileSync(patchPath, 'utf8');
  const start = text.indexOf(LEGACY_BEGIN);
  if (start < 0) return false;
  const end = text.indexOf(LEGACY_END, start);
  const stop = end < 0 ? text.length : end + LEGACY_END.length;
  const stripped = `${text.slice(0, start)}${text.slice(stop)}`.replace(/\n{3,}$/, '\n');
  copyFileSync(patchPath, `${patchPath}.dsb-backup`);
  writeFileSync(patchPath, stripped);
  return true;
}

function dropLegacyPackage(profile) {
  let dropped = false;
  if (profile.dependencies && LEGACY_PACKAGE in profile.dependencies) {
    delete profile.dependencies[LEGACY_PACKAGE];
    dropped = true;
  }
  const bundles = profile.dsh?.profile?.bundles;
  if (Array.isArray(bundles)) {
    const at = bundles.indexOf(LEGACY_PACKAGE);
    if (at >= 0) {
      bundles.splice(at, 1);
      dropped = true;
    }
  }
  const legacyLink = join(profileDir, 'node_modules', LEGACY_PACKAGE);
  if (isLink(legacyLink)) unlinkSync(legacyLink);
  return dropped;
}

function install() {
  if (!existsSync(join(here, 'client.js'))) throw new Error(`missing client.js beside ${here}`);

  mkdirSync(join(profileDir, 'node_modules'), { recursive: true });
  if (existsSync(linkPath) || isLink(linkPath)) {
    if (!isLink(linkPath)) throw new Error(`${linkPath} exists and is not a symlink; remove it first`);
    unlinkSync(linkPath);
  }
  symlinkSync(relative(join(profileDir, 'node_modules'), here), linkPath, 'dir');

  const profile = readProfile();
  const droppedLegacy = dropLegacyPackage(profile);
  profile.dependencies = { ...(profile.dependencies ?? {}), [NAME]: `link:${relative(profileDir, here)}` };
  const bundles = profile.dsh?.profile?.bundles;
  if (!Array.isArray(bundles)) throw new Error('profile package.json has no dsh.profile.bundles list');
  if (!bundles.includes(NAME)) bundles.push(NAME);
  writeProfile(profile);

  const stripped = stripLegacyBlock();

  console.log(`Linked     ${linkPath} -> ${relative(join(profileDir, 'node_modules'), here)}`);
  console.log(`Recorded   ${NAME} in ${profileManifestPath}`);
  console.log(`Selected   ${NAME} in dsh.profile.bundles`);
  if (stripped) console.log(`Removed    the legacy hand-written row from ${patchPath}`);
  if (droppedLegacy) console.log(`Migrated   from ${LEGACY_PACKAGE} to ${NAME}`);
  console.log('The running app recomposes the profile; if the row does not change, restart DeepSeek Harness.');
}

function uninstall() {
  if (isLink(linkPath)) unlinkSync(linkPath);

  const profile = readProfile();
  let changed = false;
  if (profile.dependencies && NAME in profile.dependencies) {
    delete profile.dependencies[NAME];
    changed = true;
  }
  const bundles = profile.dsh?.profile?.bundles;
  if (Array.isArray(bundles)) {
    const at = bundles.indexOf(NAME);
    if (at >= 0) {
      bundles.splice(at, 1);
      changed = true;
    }
  }
  if (changed) writeProfile(profile);
  stripLegacyBlock();

  console.log(`Removed ${NAME} from ${profileDir}`);
}

if (args.includes('--uninstall')) uninstall();
else install();
