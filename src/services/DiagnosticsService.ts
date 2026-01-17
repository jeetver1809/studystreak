import { db, auth } from './firebaseConfig';
import { doc, getDoc, collection, getDocs, limit, query, enableNetwork } from 'firebase/firestore';
import { User } from '../types';

export const DiagnosticsService = {
    /**
     * Run a full suite of non-destructive checks.
     */
    async runStartupChecks() {
        console.log("==========================================");
        console.log("   [Diagnostics] STARTING SYSTEM CHECKS   ");
        console.log("==========================================");

        const hasInternet = await this.checkInternetConnection();
        if (!hasInternet) {
            console.error("[Diagnostics] ❌ NO INTERNET CONNECTION DETECTED. App cannot reach server.");
            return;
        }

        await this.checkAuthState();

        // Network is usually enabled by default. 
        // Explicitly calling enableNetwork here can cause "Target ID exists" errors on hot reload.
        // We will skip it.

        await this.testFirestoreConnection();

        if (auth.currentUser) {
            await this.inspectUserData(auth.currentUser.uid);
        } else {
            console.log("[Diagnostics] No logged-in user to inspect.");
        }

        console.log("==========================================");
        console.log("   [Diagnostics] CHECKS COMPLETED         ");
        console.log("==========================================");
    },

    async checkInternetConnection() {
        try {
            console.log("[Diagnostics] Pinging Google to check internet...");
            const response = await fetch('https://www.google.com', { method: 'HEAD' });
            console.log(`[Diagnostics] Internet Check: ${response.ok ? 'ONLINE' : 'UNSTABLE'} (${response.status})`);
            return response.ok;
        } catch (e) {
            console.error("[Diagnostics] Internet Check: OFFLINE (Fetch failed)");
            return false;
        }
    },

    /**
     * 1. Check Auth State
     */
    async checkAuthState() {
        const user = auth.currentUser;
        console.log(`[Diagnostics] Auth Check: ${user ? 'LOGGED IN' : 'LOGGED OUT'}`);
        if (user) {
            console.log(`[Diagnostics] User UID: ${user.uid}`);
            console.log(`[Diagnostics] User Email: ${user.email}`);
            console.log(`[Diagnostics] Email Verified: ${user.emailVerified}`);
        }
    },

    /**
     * 2. Test Firestore Connection by reading a known collection or just checking network
     */
    async testFirestoreConnection() {
        try {
            console.log("[Diagnostics] Testing Firestore Connection (Server Fetch)...");
            // Force a server fetch to prove connectivity (bypass cache)
            const { getDocsFromServer } = require("firebase/firestore");
            const q = query(collection(db, 'users'), limit(1));
            const snapshot = await getDocsFromServer(q);

            console.log(`[Diagnostics] Firestore Connection: OK. Retrieved ${snapshot.size} docs from SERVER.`);
        } catch (error: any) {
            console.error("[Diagnostics] Firestore Connection: FAILED");

            if (error.code === 'permission-denied') {
                console.error("==========================================");
                console.error(" 🚨 CRITICAL ERROR: API NOT ENABLED");
                console.error(" It looks like the Firestore API is still disabled.");
                console.error(" 1. Go to Google Cloud Console.");
                console.error(" 2. Enable 'Cloud Firestore API'.");
                console.error(" 3. Wait 5 minutes for changes to propagate.");
                console.error("==========================================");
            } else if (error.code === 'not-found') {
                console.error("==========================================");
                console.error(" 🚨 CRITICAL ERROR: DATABASE NOT CREATED");
                console.error(" The Firestore database instance does not exist.");
                console.error(" 1. Go to Firebase Console -> Build -> Firestore Database.");
                console.error(" 2. Click 'Create Database'.");
                console.error(" 3. Choose a location and mode (Test Mode is easiest for now).");
                console.error("==========================================");
            } else if (error.code === 'unavailable') {
                console.error("[Diagnostics] Hint: Check your internet connection or Firestore rules.");
                console.error(`[Diagnostics] Raw Error: ${error.message}`);
            } else {
                console.error(`[Diagnostics] Error: ${error.message}`);
            }
        }
    },

    /**
     * 3. Inspect detailed User Data for consistency (Streak, Username, etc)
     */
    async inspectUserData(uid: string) {
        console.log(`[Diagnostics] Inspecting Data for User: ${uid}`);
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as User;
                console.log("[Diagnostics] --- USER PROFILE DUMP ---");
                console.log(`[Diagnostics] Username: ${data.username}`);
                console.log(`[Diagnostics] Current Streak: ${data.currentStreak}`);
                console.log(`[Diagnostics] Longest Streak: ${data.longestStreak}`);
                console.log(`[Diagnostics] Total Chars: ${data.totalCharacters}`);
                console.log(`[Diagnostics] Last Study Date: ${data.lastStudyDate}`);
                console.log(`[Diagnostics] Unlocked Chars Count: ${data.unlockedCharacterIds?.length || 0}`);
                console.log("[Diagnostics] -------------------------");
            } else {
                console.warn(`[Diagnostics] USER DOC MISSING for uid: ${uid}`);
            }
        } catch (error) {
            console.error("[Diagnostics] Failed to inspect user data", error);
        }
    }
};
