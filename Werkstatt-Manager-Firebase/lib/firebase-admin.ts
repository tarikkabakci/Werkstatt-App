import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const app =
  getApps()[0] ??
  initializeApp();

const firestore = getFirestore(app);
firestore.settings({ ignoreUndefinedProperties: true });

export const adminAuth = getAuth(app);
export const adminDb = firestore;
export const adminBucket = () =>
  getStorage(app).bucket(process.env.FIREBASE_STORAGE_BUCKET || undefined);
