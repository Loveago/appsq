# Complete Beginner-Friendly Guide: Deploying Mindora Backend to Render, Configuring ModelFlare AI, Building Android APK & Mobile Testing

> **No Docker Required**: Everything uses standard native Node.js and Flutter toolchains.
> Follow this guide step-by-step from top to bottom. Every single command, click, and environment variable is written out explicitly.

---

## Table of Contents
1. [Overview & What You Need](#1-overview--what-you-need)
2. [Step 1: Get Your ModelFlare API Key](#step-1-get-your-modelflare-api-key)
3. [Step 2: Push Your Code to GitHub](#step-2-push-your-code-to-github)
4. [Step 3: Deploy Backend on Render (Click-by-Click)](#step-3-deploy-backend-on-render-click-by-click)
5. [Step 4: All Environment Variables for Render](#step-4-all-environment-variables-for-render)
6. [Step 5: Verify Your Backend is Live](#step-5-verify-your-backend-is-live)
7. [Step 6: Build the Android APK](#step-6-build-the-android-apk)
8. [Step 7: Install APK on Your Android Phone](#step-7-install-apk-on-your-android-phone)
9. [Step 8: Step-by-Step Testing on Your Phone](#step-8-step-by-step-testing-on-your-phone)
10. [Step 9: Troubleshooting Common Issues](#step-9-troubleshooting-common-issues)

---

## 1. Overview & What You Need

Before you start, make sure you have:
1. A **GitHub** account (free).
2. A **Render** account at [render.com](https://render.com) (free tier available).
3. A **ModelFlare** account and API key (ModelFlare is OpenAI-compatible).
4. An **Android phone** and USB cable (or Google Drive/WhatsApp to transfer the file).

---

## Step 1: Get Your ModelFlare API Key

1. Log in to your **ModelFlare** dashboard.
2. Go to **API Keys** and generate a new key.
3. Copy the key (it looks something like `mf-xxxxxxxxxxxxxxxxxxxxxxxxxxxx`).
4. Note down the Base URL: `https://api.modelflare.com/v1`.
5. Note down the model name you want to use (e.g. `gpt-4o-mini`, `gpt-4o`, etc.).

---

## Step 2: Push Your Code to GitHub

Open the **Terminal** app on your Mac and run these commands one by one:

```bash
# 1. Navigate to the project root folder
cd "/Users/crazy/projects/App square"

# 2. Check which files were changed
git status

# 3. Add all files to git
git add .

# 4. Commit the changes with a clear message
git commit -m "feat: ModelFlare AI, Render deployment blueprint, and mobile auth screens"

# 5. Push to GitHub (main branch)
git push origin main
```

*(If you haven't linked a GitHub remote yet, create an empty repository on github.com called `mindora`, then run:*
```bash
git remote add origin https://github.com/YOUR_USERNAME/mindora.git
git branch -M main
git push -u origin main
```
*)*

---

## Step 3: Deploy Backend on Render (Click-by-Click)

Render will host your NestJS backend and automatically manage a PostgreSQL database.

### Method A: Automatic Deployment using the Blueprint (Easiest)

1. Open your browser and go to [dashboard.render.com](https://dashboard.render.com).
2. In the top-right corner, click the blue **New +** button.
3. Select **Blueprint**.
4. If asked, connect your GitHub account and select your repository (`mindora`).
5. Render will automatically read the `render.yaml` file in your repository!
6. It will automatically detect:
   - A PostgreSQL database called `mindora-postgres` (free tier).
   - A Web Service called `mindora-backend`.
7. Scroll down to the **Environment Variables** section and fill in:
   - `MODELFLARE_API_KEY`: Paste your ModelFlare API key from Step 1.
8. Click **Apply**.
9. Render will now provision the database, install packages, generate Prisma tables, and start the backend.

---

### Method B: Manual Web Service Setup (If not using Blueprint)

If you prefer to configure manually or the blueprint is not used:

#### Part 3.1: Create Free PostgreSQL Database on Render
1. In Render Dashboard, click **New +** ➔ **PostgreSQL**.
2. **Name**: `mindora-postgres`
3. **Database**: `mindora`
4. **User**: `mindora`
5. **Region**: Choose one closest to you (e.g., `Frankfurt` or `Oregon`).
6. **Plan**: `Free`.
7. Click **Create Database**.
8. Once created, find **Internal Database URL** and copy it (you will need it below).

#### Part 3.2: Create the Web Service
1. In Render Dashboard, click **New +** ➔ **Web Service**.
2. Select your GitHub repository.
3. Configure the following fields **exactly as shown**:
   - **Name**: `mindora-backend`
   - **Language / Environment**: `Node`
   - **Root Directory**: `apps/backend`
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     npm run render:build
     ```
     *(This runs: `npm install && npx prisma generate && npx prisma db push --accept-data-loss && nest build`)*
   - **Start Command**:
     ```bash
     npm run render:start
     ```
     *(This runs: `node dist/main`)*
   - **Instance Type / Plan**: `Free`

---

## Step 4: All Environment Variables for Render

In your Web Service page on Render, click the **Environment** tab on the left menu, and add each of these:

| Key (Name) | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Tells Node to run in production mode |
| `PORT` | `10000` | Port Render listens to |
| `DATABASE_URL` | *(Paste Internal Database URL from Step 3.1)* | Format: `postgresql://mindora:...@.../mindora` |
| `JWT_SECRET` | `mindora_super_secret_jwt_key_2026_xyz` | Any long random secret for user logins |
| `MODELFLARE_API_KEY` | `mf-xxxxxxxxxxxxxxxxxxxxxxxx` | Your actual ModelFlare API key |
| `MODELFLARE_BASE_URL` | `https://api.modelflare.com/v1` | ModelFlare OpenAI-compatible endpoint |
| `MODELFLARE_MODEL` | `gpt-4o-mini` | The model you want to use |

Click **Save Changes**. Render will automatically trigger a deployment.

---

## Step 5: Verify Your Backend is Live

1. On the Render service page, find your live URL near the top (e.g., `https://mindora-backend.onrender.com`).
2. Open a new tab in your browser and visit:
   ```
   https://mindora-backend.onrender.com/api/docs
   ```
   You should see the interactive **Swagger API Documentation** for Mindora!
3. Or test it in your Terminal:
   ```bash
   curl https://mindora-backend.onrender.com/auth/me
   ```
   *(If it returns a 401 Unauthorized, that's correct—the server is active and protecting routes with JWT).*

---

## Step 6: Build the Android APK

Now we compile the Flutter Android app and connect it to your live Render backend URL.

### Step 6.1: Set your live Render URL and Build
In your Terminal on Mac, run:

```bash
# 1. Navigate to the mobile folder
cd "/Users/crazy/projects/App square/apps/mobile"

# 2. Clean previous build caches
flutter clean
flutter pub get

# 3. Build the Release APK with your Render URL baked in
# (REPLACE the URL below with YOUR actual Render URL!)
flutter build apk --release --dart-define=API_URL=https://mindora-backend.onrender.com
```

### Step 6.2: Locate Your Compiled APK
When the command finishes, Flutter will output the exact file location:
```
/Users/crazy/projects/App square/apps/mobile/build/app/outputs/flutter-apk/app-release.apk
```

To reveal it directly in **macOS Finder**, run:
```bash
open "/Users/crazy/projects/App square/apps/mobile/build/app/outputs/flutter-apk"
```

---

## Step 7: Install APK on Your Android Phone

Choose the method that is most convenient for you:

### Method 1: The Easiest Way (Send file to phone)
1. Open [WhatsApp Web](https://web.whatsapp.com), [Telegram Web](https://web.telegram.org), or [Google Drive](https://drive.google.com) on your Mac.
2. Send or upload `app-release.apk`.
3. Open WhatsApp/Telegram/Drive on your **Android phone** and download the file.
4. Tap the downloaded file.
5. If Android shows a popup saying *"For your security, your phone is not allowed to install unknown apps from this source"*:
   - Tap **Settings** in the popup.
   - Toggle **Allow from this source** to ON.
   - Press the back arrow.
6. Tap **Install** ➔ then tap **Open**.

### Method 2: Via USB Cable (ADB)
1. On your phone: Go to **Settings** ➔ **About Phone** ➔ Tap **Build Number** 7 times to enable Developer Mode.
2. Go to **Settings** ➔ **Developer Options** ➔ turn on **USB Debugging**.
3. Plug your phone into your Mac via USB.
4. In Terminal, run:
   ```bash
   adb install -r "/Users/crazy/projects/App square/apps/mobile/build/app/outputs/flutter-apk/app-release.apk"
   ```

---

## Step 8: Step-by-Step Testing on Your Phone

Follow this step-by-step checklist to test the entire application end-to-end:

### Test 1: First Launch & Authentication (Sign Up)
1. Launch **Mindora** on your phone.
2. You will see the dark-themed **MINDORA** auth screen.
3. Look at the bottom: You will see:
   `Backend Server: mindora-backend.onrender.com`
   *(If you ever need to change the server URL, tap it to open the settings popup).*
4. Tap the **Sign Up** tab.
5. Fill in:
   - **Full Name**: `Your Name`
   - **Email**: `test@example.com`
   - **Password**: `password123`
6. Tap **Create Account**.
7. The app connects to your Render backend, creates your account in the PostgreSQL database, saves your session token, and opens the main dashboard!

### Test 2: ModelFlare AI Chat ("Second Brain" Query)
1. On the floating bottom dock, tap the **AI Chat** tab (`🧠`).
2. Notice the illuminated purple gradient indicator.
3. Tap one of the suggestion chips at the top:
   - *"What did John decide on Stripe?"*
   - Or type any question into the bottom text bar: *"What are my active projects?"*
4. Tap the **Send** button (`↑`).
5. The request is sent to your Render backend, passed to ModelFlare LLM, and returns a grounded answer with accuracy ratings and citation tags!

### Test 3: Quick Capture & Note Creation
1. Tap the center `+` button in the floating dock, or tap **Write** in the Quick Capture bar.
2. Type a note title: *"Sync with Design Team"*
3. Type note content: *"Reviewed the minimalist dark UI, next step is preparing App Store submission assets."*
4. Tap **Save**.
5. Switch to the **Notes** tab (`📄`) and confirm your note appears under **Indexed Notes**.

### Test 4: Meeting Mode & Audio Synthesis
1. Tap the audio waveform icon (`🎙️`) in the top app bar.
2. Grant microphone permissions when prompted by Android.
3. Tap **Start Recording** and speak a thought:
   *"We need to verify the ModelFlare integration tomorrow with John."*
4. Tap **End Meeting / Stop**.
5. Observe the live synthesis summary extracting action items and decisions.

### Test 5: Pro Paywall Experience
1. Tap the **PRO** badge in the top-right of the app bar.
2. Toggle between **Annual** and **Monthly** billing.
3. Verify that the UI remains fast, responsive, and adheres to the dark minimalist aesthetic.

---

## Step 9: Troubleshooting Common Issues

### Issue 1: Render free tier takes 40-50 seconds to respond on first request
- **Why**: Render's free tier spins down web services after 15 minutes of inactivity.
- **Solution**: The very first request after inactivity wakes up the instance (cold start). Subsequent requests respond instantly.

### Issue 2: "Network error" when signing in from phone
- **Check**: Open Chrome on your phone and visit `https://YOUR-BACKEND.onrender.com/api/docs`.
- If it loads in Chrome on your phone, the backend is reachable.
- Tap the **Backend Server** link at the bottom of the Mindora Sign In screen to verify the URL does not have typos or trailing spaces.

### Issue 3: Want to test completely offline without deploying yet?
- Tap **Continue as Guest / Offline Demo →** at the bottom of the Sign In screen.
- The app will run in full local demo mode with built-in heuristic AI extraction.

---

## Summary of All Important Commands

```bash
# Push to GitHub
cd "/Users/crazy/projects/App square"
git add .
git commit -m "update"
git push origin main

# Run Flutter tests
cd apps/mobile
flutter test

# Build Android APK
cd apps/mobile
flutter build apk --release --dart-define=API_URL=https://YOUR-APP.onrender.com

# Open APK folder in Finder
open apps/mobile/build/app/outputs/flutter-apk
```
