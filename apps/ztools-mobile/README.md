# ZTools Android App

Native Android client for the ZTools engineering workspace. Built with [Expo](https://expo.dev/) and React Native.

## Features

- Sign in with your approved ZTools account
- View assigned tools on a mobile dashboard
- Open each tool in an authenticated in-app WebView
- **Offline caching** — last-synced tools list available without internet
- **Push notifications** — alerts when admin approves access or assigns new tools
- **Zigma-branded icons** — generated from `public/assets/images/zigma.png`
- Secure session storage via `expo-secure-store`

## Prerequisites

- Node.js 20+
- **Option A (easiest):** Android phone + [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) from Play Store — **no Android Studio required**
- **Option B (emulator):** [Android Studio](https://developer.android.com/studio) + Android SDK + `ANDROID_HOME` configured

## Setup

```bash
cd apps/ztools-mobile
cp .env.example .env
npm install
npm run icons
```

Edit `.env` and set `EXPO_PUBLIC_ZTOOLS_API_URL` to your Zigma site:

| Environment | URL |
|---|---|
| Production | `https://zigma-technologies.com` |
| Android emulator + local Next.js | `http://10.0.2.2:3000` |
| Physical phone + local Next.js | `http://<your-pc-lan-ip>:3000` |

### Database migration (push tokens)

Run once on your MySQL database:

```bash
mysql -u zigmatech -p zigmatech < scripts/migrate-ztools-push.sql
```

(from the repo root)

## Run in development

Start the Next.js site (from repo root):

```bash
npm run dev
```

### Option A — Physical phone + Expo Go (recommended, no SDK)

```bash
cd apps/ztools-mobile
npm run lan-ip      # copy IP into .env
npm run test:api    # must pass
npm start           # NOT npm run android
```

Scan the QR code with **Expo Go** on your phone (same Wi‑Fi as PC).

### Option B — Android emulator (`npm run android`)

Requires Android Studio. If you see `Failed to resolve the Android SDK path` or `'adb' is not recognized`, see **Android SDK setup** below.

```bash
cd apps/ztools-mobile
npm run android
```

> **Push notifications** do not work in Expo Go. Use `eas build` for a real APK to test push.

### Android SDK setup (emulator only)

1. Install [Android Studio](https://developer.android.com/studio).
2. SDK Manager → install **Android SDK Platform** (API 34+) and **Platform-Tools**.
3. Set Windows environment variables (restart PowerShell after):

| Variable | Value |
|---|---|
| `ANDROID_HOME` | `C:\Users\<you>\AppData\Local\Android\Sdk` |
| `Path` | add `%ANDROID_HOME%\platform-tools` |
| `Path` | add `%ANDROID_HOME%\emulator` |

4. Verify: `adb version`
5. Device Manager → create a virtual device → `npm run android`

## Regenerate app icons

After updating the Zigma mark at `public/assets/images/zigma.png`:

```bash
cd apps/ztools-mobile
npm run icons
```

## Build a release APK / AAB (Play Store)

1. Install EAS CLI: `npm i -g eas-cli`
2. Log in: `eas login`
3. Link the Expo project: `eas init` (updates `app.json` `extra.eas.projectId`)
4. Build Android:

```bash
cd apps/ztools-mobile
eas build -p android --profile preview      # APK for testing
eas build -p android --profile production   # AAB for Play Store
```

## API integration

| Endpoint | Purpose |
|---|---|
| `POST /api/ztools/auth` | Login — returns `{ token, user }` |
| `GET /api/ztools/auth` | Session check — `Authorization: Bearer <token>` |
| `GET /api/ztools/tools` | Tool catalog |
| `POST /api/ztools/mobile/bridge` | One-time WebView session URL |
| `POST /api/ztools/mobile/push-token` | Register Expo push token |
| `DELETE /api/ztools/mobile/push-token` | Unregister on sign-out |
| `GET /ztools/app-bridge?token=…` | Sets cookie and redirects into tool |

### Push notification triggers

- Admin **approves** a ZTools user → “ZTools access approved”
- Admin **assigns new tools** to an approved user → “New tools assigned”

## Project structure

```
apps/ztools-mobile/
  App.tsx
  scripts/generate-icons.mjs
  src/
    api/client.ts
    context/AuthContext.tsx
    lib/cache.ts
    services/notifications.ts
    screens/
    components/
```

## Notes

- Registration is web-only (`/ztools/register`) — users must be approved by an admin before signing in on mobile.
- Opening tools requires an internet connection; the dashboard can show cached tools offline.
- For local HTTP dev, the Next.js site must be reachable from the phone/emulator.

## Troubleshooting

### Expo Go shows blue “Something went wrong”

Metro failed to bundle JavaScript (the app never loads). Common causes:

1. **Stale `node_modules` after a dependency fix** — reinstall:
   ```bash
   cd apps/ztools-mobile
   npm install
   npx expo start --android --clear
   ```

2. **`image-size` override** — do **not** add `"image-size": "^2.x"` to `package.json` `overrides`. Metro requires `image-size` v1; v2 breaks PNG bundling with:
   `The "list" argument must be an instance of SharedArrayBuffer...`

3. **Verify bundling works** (should finish without errors):
   ```bash
   npx expo export --platform android
   ```

4. **Expo Go version** — SDK 57 needs a recent Expo Go. On emulator, install from https://expo.dev/go (pick SDK 57, Android).

### App cannot connect / login times out

1. **Start the website** (repo root): `npm run dev`  
   Next.js should show `Network: http://<your-ip>:3000`

2. **Get the correct IP** (mobile app folder):
   ```bash
   npm run lan-ip
   ```
   Copy the line into `.env` — do **not** guess an IP like `192.168.1.10` if your network uses `192.168.0.x`.

3. **Verify API** before opening the app:
   ```bash
   npm run test:api
   ```

4. **Android emulator** uses `http://10.0.2.2:3000` (not your LAN IP).

5. **Physical phone** must be on the **same Wi‑Fi** as your PC. Windows Firewall may block port 3000 — allow Node.js if prompted.

### `'adb' is not recognized` / Android SDK path not found

`npm run android` launches an **emulator** and needs the Android SDK. You do **not** have Android Studio installed.

**Quick fix:** use Expo Go instead → `npm start` and scan the QR code on your phone.

**Full fix:** install Android Studio and set `ANDROID_HOME` (see **Android SDK setup** above).


| Target | `.env` value |
|---|---|
| Android emulator | `http://10.0.2.2:3000` |
| Physical phone | `http://<pc-wifi-ip>:3000` from `npm run lan-ip` |
| Production | `https://zigma-technologies.com` |

## npm audit / security

**Do not run `npm audit fix --force`.** It tries to downgrade Expo (e.g. to SDK 53) and will break the app.

What we do instead:

| Issue | Status |
|---|---|
| `uuid` (moderate) | **Fixed** via `package.json` `overrides` → `^11.1.1` |
| `image-size` (high) | **Do not override to v2** — breaks Metro PNG bundling; leave Metro’s v1 transitive dependency |
| `react-native` drift | **Fixed** — pinned to `0.86.2` (Expo SDK 57 expected version) |

The `image-size` audit findings come from **Metro** at dev/build time. Overriding to v2 “fixes” the audit but breaks the app. They do not ship inside your production APK.

Re-check after Expo SDK updates:

```bash
npm audit
npx expo install --check
```
