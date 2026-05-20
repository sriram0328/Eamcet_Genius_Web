# EamcetGenius — Firebase + Vercel Setup Guide

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: Firebase Firestore (NoSQL)
- **Auth**: Firebase Authentication
- **Hosting**: Vercel (Free)
- **Mobile**: PWA — installable on any phone

---

## ══════════════════════════════════════
## STEP 1 — Install Prerequisites
## ══════════════════════════════════════

1. Install **Node.js** → https://nodejs.org (download LTS version)
2. Install **VS Code** → https://code.visualstudio.com
3. Install **Git** → https://git-scm.com

Open VS Code → Terminal → New Terminal, verify:
```
node --version   ✅ v18+ or v20+
npm --version    ✅ 9+
```

---

## ══════════════════════════════════════
## STEP 2 — Set Up Firebase Project
## ══════════════════════════════════════

### 2a. Create Firebase Project
1. Go to → https://console.firebase.google.com
2. Click **"Add project"**
3. Project name: `eamcetgenius`
4. Disable Google Analytics (not needed) → **Create project**
5. Wait ~30 seconds

### 2b. Enable Authentication
1. Left sidebar → **Build** → **Authentication**
2. Click **"Get started"**
3. Click **"Email/Password"** provider
4. Toggle **Enable** → **Save**

### 2c. Create Firestore Database
1. Left sidebar → **Build** → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** → **Next**
4. Select region: `asia-south1 (Mumbai)` → **Enable**
5. Wait ~1 minute for database to be created

### 2d. Set Firestore Security Rules
1. In Firestore → click **"Rules"** tab
2. Replace everything with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // All authenticated users can read topics, questions, mock tests
    match /topics/{id} {
      allow read: if request.auth != null;
      allow write: if false; // Only admin via server
    }
    match /questions/{id} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /mockTests/{id} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /mockTestQuestions/{id} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // Users manage their own progress, tasks, results
    match /progress/{id} {
      allow read, write: if request.auth != null;
    }
    match /dailyTasks/{id} {
      allow read, write: if request.auth != null;
    }
    match /mockTestResults/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

**NOTE**: The rules above lock topics/questions/mockTests to read-only for students.
The admin writes directly using Firebase Admin SDK credentials (your admin panel
bypasses these rules because it uses the same Firebase config — for a production app
you'd set up Cloud Functions, but for now the app works fine with test mode initially).

**For initial setup — keep test mode** (allows all reads/writes) until everything works,
then switch to the rules above.

### 2e. Get Firebase Config Keys
1. In Firebase Console → click the **gear icon** → **Project settings**
2. Scroll down to **"Your apps"** section
3. Click **"</>"** (Web app) icon
4. App nickname: `eamcetgenius-web` → **Register app**
5. You'll see a config object like:

```js
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXX",
  authDomain: "eamcetgenius.firebaseapp.com",
  projectId: "eamcetgenius",
  storageBucket: "eamcetgenius.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

**Copy these values** — you'll need them in the next step.

---

## ══════════════════════════════════════
## STEP 3 — Set Up Project in VS Code
## ══════════════════════════════════════

```bash
# 1. Extract the ZIP to your Desktop
# 2. Open VS Code → File → Open Folder → select the eamcetgenius folder
# 3. Open Terminal in VS Code (Ctrl + `)

# Go into the project (if there's a nested folder)
cd eamcetgenius   # run this only if package.json isn't visible

# Install all packages
npm install
```

### Create your .env file
```bash
# In VS Code terminal:
copy .env.example .env
```

Now open the `.env` file and fill in your Firebase values:
```
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=eamcetgenius.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=eamcetgenius
VITE_FIREBASE_STORAGE_BUCKET=eamcetgenius.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

VITE_ADMIN_USER=admin
VITE_ADMIN_PASS=yourpassword123
```

---

## ══════════════════════════════════════
## STEP 4 — Run Locally
## ══════════════════════════════════════

```bash
npm run dev
```

Open browser → **http://localhost:5173** ✅

Test these:
- Register a student account
- Go to `/admin/login` with your admin credentials
- In admin → Topics tab → click **"Seed All Default Topics"** (adds 33 EAMCET topics)
- In admin → Subscriptions tab → activate the student you registered

---

## ══════════════════════════════════════
## STEP 5 — Deploy to Vercel
## ══════════════════════════════════════

### 5a. Push to GitHub

1. Go to → https://github.com → Sign up / Login
2. Click **"+"** → **"New repository"**
3. Name: `eamcetgenius` → Private → **Create repository**
4. In VS Code terminal:

```bash
git init
git add .
git commit -m "EamcetGenius - Firebase version"
git remote add origin https://github.com/YOUR_USERNAME/eamcetgenius.git
git branch -M main
git push -u origin main
```

(GitHub will ask you to login — use your GitHub username and password)

### 5b. Deploy on Vercel

1. Go to → https://vercel.com → Sign up with GitHub
2. Click **"Add New Project"**
3. Find and click **"Import"** next to `eamcetgenius`
4. In **"Environment Variables"** section, add ALL 8 variables:

| Name | Value |
|------|-------|
| VITE_FIREBASE_API_KEY | your value |
| VITE_FIREBASE_AUTH_DOMAIN | your value |
| VITE_FIREBASE_PROJECT_ID | your value |
| VITE_FIREBASE_STORAGE_BUCKET | your value |
| VITE_FIREBASE_MESSAGING_SENDER_ID | your value |
| VITE_FIREBASE_APP_ID | your value |
| VITE_ADMIN_USER | admin |
| VITE_ADMIN_PASS | yourpassword123 |

5. Click **"Deploy"**
6. Wait ~1 minute
7. You get a live URL: `https://eamcetgenius-xxxx.vercel.app` 🎉

### 5c. Add Vercel domain to Firebase (important!)

1. Copy your Vercel URL (e.g. `eamcetgenius-xxxx.vercel.app`)
2. Go to Firebase Console → **Authentication** → **Settings** → **Authorized domains**
3. Click **"Add domain"** → paste your Vercel URL → **Add**

This allows Firebase Auth to work on your deployed URL.

---

## ══════════════════════════════════════
## STEP 6 — View on Mobile
## ══════════════════════════════════════

### Option A — Browser (instant, no install)
Open your Vercel URL on mobile browser — works immediately!

### Option B — Install as App (PWA)

**Android (Chrome)**:
1. Open Vercel URL in Chrome
2. Tap **3-dot menu** → **"Add to Home screen"**
3. App appears on home screen like a native app!

**iPhone (Safari)**:
1. Open Vercel URL in Safari
2. Tap **Share button** (box with arrow pointing up)
3. Scroll → **"Add to Home Screen"** → **Add**

---

## ══════════════════════════════════════
## STEP 7 — First Time Admin Setup
## ══════════════════════════════════════

1. Go to `yourapp.vercel.app/admin/login`
2. Login with your admin credentials
3. **Topics tab** → Click **"Seed All Default Topics"** — this adds all 33 EAMCET topics
4. **Questions tab** → Upload your question JSON files
5. **Mock Tests tab** → Create tests and add questions
6. **Subscriptions tab** → Activate student subscriptions

---

## ══════════════════════════════════════
## FIRESTORE COLLECTIONS REFERENCE
## ══════════════════════════════════════

| Collection | Purpose |
|------------|---------|
| `users` | Student profiles, subscription status |
| `topics` | Subject topics (Mathematics → Integration) |
| `questions` | Practice questions with options & answers |
| `mockTests` | Mock test metadata |
| `mockTestQuestions` | Links questions to mock tests |
| `mockTestResults` | Student test scores |
| `progress` | Per-question attempt records |
| `dailyTasks` | Daily subject task completion |

---

## ══════════════════════════════════════
## QUESTION JSON FORMAT
## ══════════════════════════════════════

```json
[
  {
    "topic_name": "Atomic Structure",
    "subject": "Chemistry",
    "difficulty": "Easy",
    "question_text": "What is the maximum number of electrons in the 3rd shell?",
    "option_a": "8",
    "option_b": "18",
    "option_c": "32",
    "option_d": "2",
    "correct_answer": "18",
    "explanation": "Max electrons in nth shell = 2n². For n=3: 2×9 = 18."
  },
  {
    "topic_name": "Laws of Motion",
    "subject": "Physics",
    "difficulty": "Medium",
    "question_text": "A 5kg body acted upon by 20N force. Acceleration = ?",
    "option_a": "2 m/s²",
    "option_b": "4 m/s²",
    "option_c": "100 m/s²",
    "option_d": "0.25 m/s²",
    "correct_answer": "4 m/s²",
    "explanation": "F = ma → a = F/m = 20/5 = 4 m/s²"
  }
]
```

---

## ══════════════════════════════════════
## UPDATING THE APP
## ══════════════════════════════════════

After any code changes:
```bash
git add .
git commit -m "your change description"
git push
```
Vercel auto-deploys in ~1 minute ✅

---

## ══════════════════════════════════════
## COST BREAKDOWN
## ══════════════════════════════════════

| Service | Free Tier | Cost |
|---------|-----------|------|
| Firebase Firestore | 1GB storage, 50K reads/day, 20K writes/day | FREE |
| Firebase Auth | Unlimited users | FREE |
| Vercel Hosting | Unlimited deployments | FREE |
| Custom domain (optional) | — | ~₹800/year |

**Total: ₹0/month** for hundreds of students!

---

## ══════════════════════════════════════
## COMMON ISSUES
## ══════════════════════════════════════

| Problem | Solution |
|---------|----------|
| "Firebase: Error (auth/invalid-api-key)" | Check .env file has correct API key, restart `npm run dev` |
| Login not working after deploy | Add Vercel domain to Firebase Auth → Authorized Domains |
| Questions not showing | Run "Seed Default Topics" in admin first, then upload questions |
| Admin login fails | Check VITE_ADMIN_USER and VITE_ADMIN_PASS in .env |
| `npm install` fails | Make sure you're in the folder that has package.json |
| Topics tab shows empty | Click "Seed All Default Topics" button in admin |
#   E a m c e t _ G e n i u s _ W e b  
 