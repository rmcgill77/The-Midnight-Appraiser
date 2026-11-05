// Run once after `npx cap add android` (and safe to run again): makes the generated Android
// project into The Midnight Appraiser.
//
//   - MainActivity: keeps the screen on while you play, hides the system bars (swipe from an
//     edge to show them), and lets the game draw under a camera cutout (its own safe-area
//     handling takes care of the HUD).
//   - AndroidManifest: adds the VIBRATE permission (the game's haptics: bad sales, busts, haunts).
//   - build.gradle: versionName and versionCode from the game's version (app-version.json).
//   - res: the app icon (round and adaptive), and the dark splash screen.
//
// It only edits files inside android/ and reads from res/. No network.

import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = join(dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = join(HERE, 'android');
if (!existsSync(ANDROID)) { console.error('No android/ folder yet. Run `npx cap add android` first.'); process.exit(1); }

const cfg = JSON.parse(readFileSync(join(HERE, 'capacitor.config.json'), 'utf8'));
const ver = existsSync(join(HERE, 'app-version.json')) ? JSON.parse(readFileSync(join(HERE, 'app-version.json'), 'utf8')) : { versionName: '1.0.0', versionCode: 1 };
const appId = cfg.appId;
const notes = [];

// ---- MainActivity.java ----
const javaDir = join(ANDROID, 'app/src/main/java', ...appId.split('.'));
mkdirSync(javaDir, { recursive: true });
writeFileSync(join(javaDir, 'MainActivity.java'), `package ${appId};

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // A game: don't let the screen time out while it's open.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // Draw into a camera cutout (the game keeps its HUD inside the safe area itself).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
`);
notes.push('MainActivity.java: keep screen on, fullscreen, cutout');

// ---- AndroidManifest.xml ----
const manifestPath = join(ANDROID, 'app/src/main/AndroidManifest.xml');
let manifest = readFileSync(manifestPath, 'utf8');
if (!manifest.includes('android.permission.VIBRATE')) {
  manifest = manifest.replace(/<\/manifest>\s*$/, '    <uses-permission android:name="android.permission.VIBRATE" />\n</manifest>\n');
  writeFileSync(manifestPath, manifest);
  notes.push('AndroidManifest.xml: VIBRATE permission');
}

// ---- build.gradle: version ----
for (const name of ['build.gradle', 'build.gradle.kts']) {
  const p = join(ANDROID, 'app', name);
  if (!existsSync(p)) continue;
  let g = readFileSync(p, 'utf8');
  const before = g;
  g = g.replace(/versionCode\s*=?\s*\d+/, `versionCode ${ver.versionCode}`).replace(/versionName\s*=?\s*"[^"]*"/, `versionName "${ver.versionName}"`);
  if (name.endsWith('.kts')) g = g.replace(/versionCode \d+/, `versionCode = ${ver.versionCode}`).replace(/versionName "([^"]*)"/, `versionName = "$1"`);
  if (g !== before) { writeFileSync(p, g); notes.push(`${name}: versionName ${ver.versionName}, versionCode ${ver.versionCode}`); }
  else if (!/versionCode\s*=?\s*\d+/.test(g)) notes.push(`WARNING: couldn't find versionCode in ${name}. Set it by hand.`);
}

// ---- res: icons and splash ----
const resSrc = join(HERE, 'res'), resDst = join(ANDROID, 'app/src/main/res');
cpSync(resSrc, resDst, { recursive: true, filter: f => !/splash\.png$/.test(f) });
const splash = join(resSrc, 'splash.png');
let nSplash = 0;
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f === 'splash.png') { cpSync(splash, p); nSplash++; } } };
walk(resDst);
notes.push(`res: app icon and ${nSplash} splash image(s)`);

// ---- what it will target ----
const vars = join(ANDROID, 'variables.gradle');
if (existsSync(vars)) {
  const v = readFileSync(vars, 'utf8');
  const t = n => v.match(new RegExp(`${n}\\s*=\\s*(\\d+)`))?.[1] ?? '?';
  notes.push(`targets: minSdk ${t('minSdkVersion')}, compileSdk ${t('compileSdkVersion')}, targetSdk ${t('targetSdkVersion')} (Google Play needs the target to be current; check the Console's requirement)`);
}

console.log('Patched android/:\n  - ' + notes.join('\n  - '));
