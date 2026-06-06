# 🍔 QuickBites — Production Setup Guide

## What You Get
- Real OTP verification via Firebase Phone Auth
- Real-time order sync (Firestore — updates in <1 second)
- Persistent order history per customer
- All your existing features: promo codes, outlet dashboard, QB-Bito AI, audio alerts

---

## Step 1 — Install Node.js
Download from https://nodejs.org (choose LTS version). Install it.

---

## Step 2 — Create Firebase Project (FREE)

1. Go to https://console.firebase.google.com
2. Click **"Add Project"** → name it `quickbites` → Continue
3. Disable Google Analytics (optional) → **Create Project**

### Enable Phone Authentication
4. Left sidebar → **Build → Authentication** → Get Started
5. Sign-in method → **Phone** → Enable → Save
6. Settings tab → **Authorized domains** → Add your Vercel URL later

### Create Firestore Database
7. Left sidebar → **Build → Firestore Database** → Create database
8. Choose **"Start in test mode"** → Next → Select region (asia-south1 for India) → Done

### Get Your Config
9. Project Settings (gear icon) → **General** tab → scroll to "Your apps"
10. Click **</>** (Web app) → Register → copy the `firebaseConfig` object

---

## Step 3 — Add Your Firebase Config

Open `src/firebase.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",          // ← paste your values
  authDomain:        "quickbites-xxx.firebaseapp.com",
  projectId:         "quickbites-xxx",
  storageBucket:     "quickbites-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
};
```

---

## Step 4 — Add Your WhatsApp Phone Numbers for Outlet Login

Open `src/App.jsx` and find this line (around line 20):

```js
const OUTLET_PHONES = ["7225023451","9131146975","7898230733"];
```

Add or change the numbers as needed.

---

## Step 5 — Run Locally

Open a terminal in the `quickbites` folder:

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser. Test the full flow!

**For OTP to work locally:** Firebase Phone Auth needs a real domain OR you can add a test phone number:
- Firebase Console → Authentication → Phone → **Phone numbers for testing**
- Add your number + a test code (e.g. +91 9876543210 → 123456)

---

## Step 6 — Deploy to Vercel (FREE, takes 2 minutes)

1. Push your project to GitHub:
   ```bash
   git init
   git add .
   git commit -m "QuickBites v1"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/quickbites.git
   git push -u origin main
   ```

2. Go to https://vercel.com → Sign up with GitHub → **"New Project"**
3. Import your `quickbites` repo → click **Deploy**
4. Done! You get a URL like `quickbites-xxx.vercel.app`

5. **Add your Vercel URL to Firebase:**
   Firebase Console → Authentication → Settings → Authorized domains → Add `quickbites-xxx.vercel.app`

---

## Step 7 — Firestore Security Rules (Important for Production!)

In Firebase Console → Firestore → Rules, replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Shared data (orders, menu, inventory, promos) — any authenticated user
    match /quickbites_shared/{document} {
      allow read, write: if request.auth != null;
    }
    // Private per-user data — only that user
    match /users/{phone}/{document}/data {
      allow read, write: if request.auth != null && request.auth.token.phone_number == "+91" + phone;
    }
  }
}
```

---

## Optional Enhancements

### Real Push Notifications (Firebase Cloud Messaging)
- Free, delivers to Android & iOS
- Guide: https://firebase.google.com/docs/cloud-messaging

### Custom Domain
- Vercel → your project → Settings → Domains → Add your domain

### Backup SMS Provider (if Firebase OTP limit hit)
- MSG91 India: https://msg91.com (₹0.18/SMS)

---

## Troubleshooting

| Problem | Fix |
|---|---|
| OTP not received | Add phone to Firebase test numbers, or wait (Firebase has rate limits) |
| "auth/unauthorized-domain" | Add your URL to Firebase Authorized domains |
| Firestore permission denied | Set rules to test mode OR apply rules above |
| White screen | Check browser console for errors |

---

## App Features Summary
- ✅ Real OTP via Firebase Phone Auth
- ✅ Real-time orders (<1 second sync via Firestore)
- ✅ Persistent customer order history
- ✅ Outlet phone whitelist
- ✅ Promo codes with usage tracking
- ✅ QB-Bito AI chatbot (Claude API)
- ✅ Audio notifications
- ✅ WhatsApp order alerts
- ✅ Edit/add/remove menu items
- ✅ Inventory management
- ✅ Invoice generation

---

*Built with React + Firebase + Claude API*
*QuickBites — 100% Hygienic and Fresh 🌿*
