import { initializeApp } from "firebase/app";
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAJbxOMUsg8FPR48UrUZX1dW06ERVPO2XI",
  authDomain: "studystreak-188d2.firebaseapp.com",
  projectId: "studystreak-188d2",
  storageBucket: "studystreak-188d2.firebasestorage.app",
  messagingSenderId: "525017989826",
  appId: "1:525017989826:web:45c9c6023427ae2bb2715b",
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with Persistence using AsyncStorage
// We use a try-catch or check to prevent "auth/already-initialized" on hot reload
let auth: any;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (e: any) {
  if (e.code === 'auth/already-initialized') {
    // If already initialized (e.g. hot reload), use the existing instance
    // We import getAuth dynamically to avoid conflict if needed, 
    // but typically we can just assume the instance exists. 
    // However, we need to import getAuth from the same place.
    const { getAuth } = require("firebase/auth");
    auth = getAuth(app);
  } else {
    throw e;
  }
}

export { auth };

// Initialize Firestore safely (Singleton pattern for Hot Reload / Re-renders)
let db: any;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch (e: any) {
  if (e.code === 'failed-precondition') {
    // FAILED_PRECONDITION: The client has already been initialized with another setting.
    const { getFirestore } = require("firebase/firestore");
    db = getFirestore(app);
  } else {
    console.error("Firestore Initialization Error:", e);
    // If we have a critical persistence error, we might want to try to clear it.
    // For now, we will just re-throw, but in production, we might fallback.
    // Ideally, clearIndexedDbPersistence(db) could be called here if we had the instance.
    throw e;
  }
}

export { db };

const storage = getStorage(app);
export { storage };
