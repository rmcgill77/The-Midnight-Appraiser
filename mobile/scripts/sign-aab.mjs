// Signs the release bundle with your upload key, ready to upload to Google Play.
//
//   node scripts/sign-aab.mjs
//
// Reads signing/keystore.properties:
//   storeFile=upload-keystore.jks   (relative to the signing folder, or an absolute path)
//   storePassword=...
//   keyAlias=...
//   keyPassword=...
// Takes android/app/build/outputs/bundle/release/app-release.aab and writes
// dist-play/midnight-appraiser-<version>.aab. Needs the JDK's jarsigner on the PATH.

import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = join(dirname(fileURLToPath(import.meta.url)), '..');
const propsPath = join(HERE, 'signing', 'keystore.properties');
const aab = join(HERE, 'android/app/build/outputs/bundle/release/app-release.aab');
if (!existsSync(propsPath)) { console.error('signing/keystore.properties not found. See BUILD.md.'); process.exit(1); }
if (!existsSync(aab)) { console.error(`No bundle at ${aab}. Run the bundle step first.`); process.exit(1); }

const props = Object.fromEntries(readFileSync(propsPath, 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
for (const k of ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']) if (!props[k]) { console.error(`keystore.properties is missing ${k}`); process.exit(1); }
const store = isAbsolute(props.storeFile) ? props.storeFile : join(HERE, 'signing', props.storeFile);
if (!existsSync(store)) { console.error(`Keystore not found at ${store}`); process.exit(1); }

const ver = existsSync(join(HERE, 'app-version.json')) ? JSON.parse(readFileSync(join(HERE, 'app-version.json'), 'utf8')).versionName : 'release';
mkdirSync(join(HERE, 'dist-play'), { recursive: true });
const out = join(HERE, 'dist-play', `midnight-appraiser-${ver}.aab`);
copyFileSync(aab, out);

const sign = spawnSync('jarsigner', ['-keystore', store, '-storepass', props.storePassword, '-keypass', props.keyPassword, '-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256', out, props.keyAlias], { stdio: ['ignore', 'inherit', 'inherit'] });
if (sign.status !== 0) { console.error('jarsigner failed (is the JDK installed and on the PATH?)'); process.exit(1); }
const check = spawnSync('jarsigner', ['-verify', out], { encoding: 'utf8' });
if (!/jar verified/.test(check.stdout || '')) { console.error('The signed bundle did not verify:\n' + (check.stdout || '') + (check.stderr || '')); process.exit(1); }
console.log(`Signed and verified: ${out}`);
