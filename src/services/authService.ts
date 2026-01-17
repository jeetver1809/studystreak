import { auth, db } from './firebaseConfig';
import {
    GoogleAuthProvider,
    signInWithCredential,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { User } from '../types';

export const AuthService = {
    async loginWithCredential(idToken: string) {
        console.log("[AuthService] loginWithCredential called with token.");
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        console.log(`[AuthService] Google Sign-In Success. User: ${userCredential.user.uid}`);
        return userCredential.user;
    },

    async logout() {
        try {
            console.log("[AuthService] Logging out...");
            await signOut(auth);
            console.log("[AuthService] Logout successful.");
        } catch (error) {
            console.error("[AuthService] Logout Error:", error);
        }
    },

    async checkUsernameAvailability(username: string): Promise<boolean> {
        // Returns true if available
        const { collection, query, where, getDocs } = require('firebase/firestore');
        const q = query(collection(db, 'users'), where('username', '==', username));
        const snapshot = await getDocs(q);
        return snapshot.empty;
    },

    async registerWithEmail(email: string, pass: string, username: string) {
        console.log(`[AuthService] Attempting to register email: ${email}, username: ${username}`);
        try {
            const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, pass);
            console.log(`[AuthService] Firebase Auth User Created. UID: ${firebaseUser.uid}`);

            const newUser: User = {
                uid: firebaseUser.uid,
                username,
                email: email,
                createdAt: Timestamp.now(),
                lastLoginAt: Timestamp.now(),
                notificationTime: 9, // 9 AM
                targetDurationMinutes: 25,
                isDarkMode: false,
                currentStreak: 0,
                longestStreak: 0,
                totalCharacters: 0,
                lastStudyDate: '',
                unlockedCharacterIds: [],
                characterXP: {}, // Initialize empty XP map
                coins: 0
            };

            console.log("[AuthService] Saving User Profile to Firestore:", JSON.stringify(newUser, null, 2));
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            console.log("[AuthService] User Profile Saved Successfully.");
            return newUser;
        } catch (error: any) {
            console.error("[AuthService] Registration Error:", error);
            throw error;
        }
    },

    async loginWithEmail(email: string, pass: string) {
        console.log(`[AuthService] Attempting to login email: ${email}`);
        try {
            const { user } = await signInWithEmailAndPassword(auth, email, pass);
            console.log(`[AuthService] Login Success. UID: ${user.uid}`);
            await this.updateLastLogin(user.uid);
        } catch (error: any) {
            console.error("[AuthService] Login Error:", error);
            console.error("[AuthService] Error Code:", error.code);
            throw error;
        }
    },

    async getUserProfile(uid: string): Promise<User | null> {
        console.log(`[AuthService] Fetching profile for: ${uid}`);
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log(`[AuthService] Profile found.`);
            return docSnap.data() as User;
        }
        console.warn(`[AuthService] No profile found for ${uid}`);
        return null;
    },

    async createUserProfile(uid: string, email: string, username: string, photoURL?: string) {
        console.log(`[AuthService] Creating fallback profile for: ${uid}`);
        const newUser: User = {
            uid,
            username,
            email,
            photoURL,
            createdAt: Timestamp.now(),
            lastLoginAt: Timestamp.now(),
            notificationTime: 9, // Default 9 AM
            targetDurationMinutes: 25,
            isDarkMode: false,
            currentStreak: 0,
            longestStreak: 0,
            totalCharacters: 0,
            lastStudyDate: '',
            unlockedCharacterIds: [],
            coins: 0,
        };

        await setDoc(doc(db, 'users', uid), newUser);
        console.log("[AuthService] Fallback Profile Created.");
        return newUser;
    },

    async updateLastLogin(uid: string) {
        console.log(`[AuthService] Updating lastLoginAt for: ${uid}`);
        const docRef = doc(db, 'users', uid);
        await setDoc(docRef, { lastLoginAt: Timestamp.now() }, { merge: true });
        console.log(`[AuthService] lastLoginAt updated.`);
    },

    async updateUsername(uid: string, newUsername: string) {
        console.log(`[AuthService] Updating username for ${uid} to ${newUsername}`);
        try {
            const docRef = doc(db, 'users', uid);
            await setDoc(docRef, { username: newUsername }, { merge: true });
            console.log("[AuthService] Username updated successfully.");
        } catch (error) {
            console.error("[AuthService] Failed to update username:", error);
            throw error;
        }
    },

    async sendVerificationEmail(user: any) {
        console.log(`[AuthService] Sending verification email to ${user.email}`);
        try {
            await sendEmailVerification(user);
            console.log("[AuthService] Verification email sent.");
        } catch (error) {
            console.error("[AuthService] Failed to send verification email:", error);
            throw error;
        }
    },

    async sendPasswordReset(email: string) {
        console.log(`[AuthService] Sending password reset to ${email}`);
        try {
            await sendPasswordResetEmail(auth, email);
            console.log("[AuthService] Password reset email sent.");
        } catch (error) {
            console.error("[AuthService] Failed to send password reset:", error);
            throw error;
        }
    }
};
