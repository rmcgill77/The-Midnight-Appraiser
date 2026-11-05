# The Midnight Appraiser: Android build (Capacitor)

Package name: `com.ryandm96.midnightappraiser`. This is permanent once you upload to Google Play.

Everything lives in `mobile/` inside the game's repo. The app ships a copy of the game's files, so it plays fully offline.

## Build in the cloud (works from a phone browser)

1. One time: add four repository secrets (Settings, Secrets and variables, Actions): `KEYSTORE_B64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
2. Actions tab, "Build Android bundle", Run workflow. After about 5 to 10 minutes, open the run and download the `midnight-appraiser-aab` artifact. Inside the zip is `midnight-appraiser-<version>.aab`, the file Play wants.

## Build on a computer

Needs Node 20 or newer, JDK 21 and the Android SDK (`ANDROID_HOME`), with `mobile/signing/` holding `upload-keystore.jks` and `keystore.properties` (never commit it).

```
# from the repo root
mkdir _site && cp -r index.html sw.js manifest.webmanifest privacy.html src shared icons assets _site/
cd mobile
npm install
node scripts/prepare-www.mjs ../_site
npx cap add android
node scripts/patch-android.mjs
npx cap sync android
cd android && ./gradlew bundleRelease && cd ..
node scripts/sign-aab.mjs
```

The signed bundle is `mobile/dist-play/midnight-appraiser-<version>.aab`. The first full build (3.0.0) was tested end to end, including signing and verification.

## Updating the game later

The app contains a copy of the game, so every game update means a new bundle and a new Play release.

1. Merge the change to `main` (the game's version is in `src/config.js`).
2. Run the "Build Android bundle" workflow again.
3. The version code comes from the game's version (3.0.0 is 30000), so it always goes up. Upload the new `.aab` as a new release.

## What the patch step does

- Keeps the screen on while you play and hides the system bars (swipe from an edge to show them).
- Adds the VIBRATE permission. The game's haptics (`navigator.vibrate`, already in the game, with its setting) then work in the app.
- Sets the app icon (adaptive and round) and a dark splash screen.
- Sets versionName and versionCode from the game.

## Google Play Console checklist

- Create app: name "The Midnight Appraiser", Game, Free.
- Store listing: text in `store/listing.md`, icon `store/icon-512.png`, feature graphic `store/feature-graphic-1024x500.png`, screenshots in `store/screenshots/` (1920x1080, landscape; Play wants at least 2).
- Privacy policy URL: `https://rmcgill77.github.io/The-Midnight-Appraiser/privacy.html` (contact email: aredawg77@gmail.com).
- App content: Data safety (no data collected or shared; see `store/listing.md`), content rating questionnaire, target audience (not for children), ads (none).
- App signing: accept Play App Signing. The key made for you is the upload key, and Play holds the real signing key. If the upload key is ever lost, Play can reset it.
- Testing: a new personal developer account normally has to run a closed test with a minimum number of testers for 14 days before it can publish to production. The Console's dashboard shows the exact requirement.
- Target API level: the patch step prints what the Capacitor project targets. Play requires new apps to target a current Android version; the latest Capacitor tracks that.
