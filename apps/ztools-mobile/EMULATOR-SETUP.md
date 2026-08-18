# ZTools — Android emulator setup (Windows)

Complete guide to run ZTools on a **local Android emulator** on this PC.

---

## What you need

| Piece | Purpose |
|---|---|
| Android Studio | SDK, emulator, virtual device manager |
| Android SDK | `adb`, emulator binaries |
| System image | Android OS image for the virtual phone |
| AVD | A virtual device definition |
| Next.js dev server | ZTools API backend |
| `.env` with `10.0.2.2` | Emulator reaches your PC's localhost |

---

## Part 1 — One-time Android Studio setup

### Step 1: Install Android Studio

1. Download: https://developer.android.com/studio
2. Run the installer → default options are fine.
3. On first launch, complete the setup wizard (**Standard** install).

### Step 2: Install SDK components

1. Open **Android Studio**.
2. **More Actions** → **SDK Manager** (or **Settings** → **Languages & Frameworks** → **Android SDK**).
3. **SDK Platforms** tab — check:
   - **Android 14.0 (API 34)** or **Android 15 (API 35)**
4. **SDK Tools** tab — ensure these are checked:
   - Android SDK Build-Tools
   - **Android SDK Platform-Tools**
   - **Android Emulator**
   - Android SDK Command-line Tools (latest)
5. Click **Apply** → accept licenses → wait for download.

### Step 3: Create a virtual device (AVD)

1. **More Actions** → **Virtual Device Manager** (or **Device Manager**).
2. **Create Virtual Device**.
3. Pick a phone (e.g. **Pixel 7**) → **Next**.
4. Select a **system image** (download if needed, e.g. **API 34** with Google Play) → **Next**.
5. Name it e.g. `Pixel_7_API_34` → **Finish**.

### Step 4: Set Windows environment variables

1. Press **Win + R** → type `sysdm.cpl` → Enter.
2. **Advanced** → **Environment Variables**.
3. Under **User variables** → **New**:
   - Name: `ANDROID_HOME`
   - Value: `C:\Users\iamsa\AppData\Local\Android\Sdk`
4. Edit **Path** → **New** → add:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\emulator`
5. **OK** on all dialogs.
6. **Close and reopen PowerShell** (required).

Verify:

```powershell
echo $env:ANDROID_HOME
adb version
emulator -list-avds
```

You should see your AVD name (e.g. `Pixel_7_API_34`).

Run our checker anytime:

```powershell
cd apps\ztools-mobile
powershell -ExecutionPolicy Bypass -File .\scripts\check-android.ps1
```

---

## Part 2 — Every time you develop

### Step 1: Configure `.env` for emulator

In `apps/ztools-mobile/.env` use **`10.0.2.2`** (not your Wi‑Fi IP):

```env
EXPO_PUBLIC_ZTOOLS_API_URL=http://10.0.2.2:3000
```

> `10.0.2.2` is the Android emulator's special alias for your PC's `localhost`.

### Step 2: Start the website (Terminal 1)

```powershell
cd C:\Users\iamsa\IdeaProjects\zigma-technologies
npm run dev
```

Wait until you see:

```
✓ Ready
- Local:   http://localhost:3000
```

Leave this terminal open.

### Step 3: Test API from your PC (Terminal 2)

```powershell
cd C:\Users\iamsa\IdeaProjects\zigma-technologies\apps\ztools-mobile
npm run test:api
```

Must show **All smoke checks passed**.

> **Important:** `10.0.2.2` only works **inside** the emulator. When you run `npm run test:api` on your PC, the script automatically tests `localhost:3000` instead — that is correct. Your `.env` should still say `http://10.0.2.2:3000` for the app.

### Step 4: Start the emulator

`emulator` is not on your PATH until you set `ANDROID_HOME`. Use these npm scripts instead:

```powershell
cd apps\ztools-mobile
npm run emulator:list
npm run emulator:start
```

Your AVD is named **`Pixel_7`**. If you have multiple AVDs:

```powershell
npm run emulator:start -- Pixel_7
```

Leave the emulator window open until the Android home screen appears.

Verify connection:

```powershell
npm run adb:devices
```

Expected: `emulator-5554   device`

### Step 5: Run ZTools app

```powershell
npm run android:emu
```

Or, if `ANDROID_HOME` is already set in Windows:

```powershell
npm run android
```

- Metro bundler starts.
- Expo installs/opens the app on the emulator.
- Login screen should show **Connected to http://10.0.2.2:3000** (green).

### Step 6: Sign in and test

1. Sign in with your approved ZTools account.
2. Dashboard should list your assigned tools.
3. Tap a tool → opens in WebView.

---

## Troubleshooting

### `No Android connected device found`

| Cause | Fix |
|---|---|
| Emulator not running | Start AVD from Device Manager or `emulator -avd <name>` |
| No AVD created | Device Manager → Create Virtual Device |
| No system image | SDK Manager → install API 34 system image |
| `adb devices` empty | Restart emulator; run `adb kill-server` then `adb start-server` |

### `Failed to resolve Android SDK path`

Set `ANDROID_HOME` (Part 1, Step 4) and restart PowerShell.

### Login shows "Cannot reach server"

| Cause | Fix |
|---|---|
| Wrong `.env` for emulator | Use `http://10.0.2.2:3000`, not `192.168.x.x` |
| Dev server not running | `npm run dev` in repo root |
| Firewall blocking | Allow Node.js on private networks |

### App opens but tools won't load

Run `npm run test:api -- http://10.0.2.2:3000` while dev server is up.

### Emulator is very slow

- Enable **Hardware acceleration** in BIOS (Intel VT-x / AMD-V).
- In AVD settings, use **x86_64** image (not ARM if on Intel/AMD PC).
- Allocate more RAM to AVD in Device Manager → Edit → Show Advanced Settings.

---

## Quick reference

```powershell
# Terminal 1 — API
cd C:\Users\iamsa\IdeaProjects\zigma-technologies
npm run dev

# Terminal 2 — emulator (if not started from Android Studio)
emulator -avd Pixel_7_API_34

# Terminal 3 — app
cd C:\Users\iamsa\IdeaProjects\zigma-technologies\apps\ztools-mobile
npm run test:api -- http://10.0.2.2:3000
npm run android
```
