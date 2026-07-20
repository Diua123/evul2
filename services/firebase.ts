
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAjnSIuRv1yhJji2tScvH66-bbpfra8qUA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "evul-aba6a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "evul-aba6a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "evul-aba6a.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "476516495268",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:476516495268:web:a2efec5ca0e64d84c1db31"
};

// Check if Firebase is configured
export const isFirebaseConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined";

let app;
let db: any;
let auth: any;
let storageFB: any;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    // Initialize Firestore with offline persistence to reduce data consumption
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
    auth = getAuth(app);
    storageFB = getStorage(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.warn("Firebase API Key is missing. Please set VITE_FIREBASE_API_KEY in your environment variables.");
}

export { db, auth, storageFB };
