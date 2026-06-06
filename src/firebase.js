// ─── firebase.js ─────────────────────────────────────────────────────────────
// STEP 1: Replace the values below with your Firebase project config.
// Get them from: Firebase Console → Project Settings → Your Apps → Web App
//
// STEP 2: In Firebase Console enable:
//   • Authentication → Sign-in method → Phone
//   • Firestore Database → Create database (start in test mode)
//
// STEP 3: Add your domain to Firebase Console:
//   Authentication → Settings → Authorized domains → Add domain

import { initializeApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  serverTimestamp,
} from "firebase/firestore";

// ── PASTE YOUR FIREBASE CONFIG HERE ──────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
// ─────────────────────────────────────────────────────────────────────────────

const app        = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// ── Phone Auth helpers ────────────────────────────────────────────────────────

/** Call once on app load — sets up invisible reCAPTCHA */
export function initRecaptcha(buttonId = "recaptcha-container") {
  if (window._recaptchaVerifier) return window._recaptchaVerifier;
  window._recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
    size: "invisible",
    callback: () => {},
  });
  return window._recaptchaVerifier;
}

/** Send OTP to +91XXXXXXXXXX — returns confirmationResult */
export async function sendOTPToPhone(phone) {
  const verifier = initRecaptcha();
  const confirmation = await signInWithPhoneNumber(auth, `+91${phone}`, verifier);
  window._confirmationResult = confirmation;
  return confirmation;
}

/** Verify OTP entered by user — returns Firebase user */
export async function verifyOTP(otp) {
  if (!window._confirmationResult) throw new Error("No OTP sent yet");
  const result = await window._confirmationResult.confirm(otp);
  return result.user;
}

// ── Firestore helpers ─────────────────────────────────────────────────────────
const SHARED = "quickbites_shared";

/** Write any shared document */
export async function writeShared(docId, data) {
  await setDoc(doc(db, SHARED, docId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/** Read a shared document once */
export async function readShared(docId) {
  const snap = await getDoc(doc(db, SHARED, docId));
  return snap.exists() ? snap.data() : null;
}

/** Subscribe to a shared document in real time — returns unsubscribe fn */
export function subscribeShared(docId, callback) {
  return onSnapshot(doc(db, SHARED, docId), (snap) => {
    if (snap.exists()) callback(snap.data());
  });
}

/** Write a private per-user document */
export async function writeUserDoc(phone, docId, data) {
  await setDoc(doc(db, `users/${phone}/${docId}`, "data"), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/** Read a private per-user document */
export async function readUserDoc(phone, docId) {
  const snap = await getDoc(doc(db, `users/${phone}/${docId}`, "data"));
  return snap.exists() ? snap.data() : null;
}

/** Subscribe to a private per-user document */
export function subscribeUserDoc(phone, docId, callback) {
  return onSnapshot(doc(db, `users/${phone}/${docId}`, "data"), (snap) => {
    if (snap.exists()) callback(snap.data());
  });
}
