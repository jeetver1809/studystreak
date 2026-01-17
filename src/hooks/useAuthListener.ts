import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { useUserStore } from '../store/userStore';
import { AuthService } from '../services/authService';
import { StreakService } from '../services/streakService';

export const useAuthListener = () => {
    const { setUser, setLoading, user } = useUserStore();
    const [isNewUser, setIsNewUser] = useState(false); // To trigger Username Setup

    useEffect(() => {
        let unsubscribeDoc: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Real-time listener for user profile
                const userRef = doc(db, 'users', firebaseUser.uid);

                unsubscribeDoc = onSnapshot(userRef, async (docSnap: any) => {
                    // Force check email verification on every snapshot (in case they verified while using app)
                    await firebaseUser.reload();

                    if (docSnap.exists()) {
                        let data = docSnap.data();

                        // Update local user with verified status
                        setUser({
                            ...data,
                            uid: firebaseUser.uid,
                            isEmailVerified: firebaseUser.emailVerified
                        });

                        StreakService.validateStreak({ ...data, uid: firebaseUser.uid })
                            .catch(e => console.error("Validation error", e));
                    } else {
                        setIsNewUser(true);
                    }
                    setLoading(false);
                }, (error: any) => {
                    console.error("Snapshot Error:", error);
                    setLoading(false);
                });

            } else {
                if (unsubscribeDoc) unsubscribeDoc();
                setUser(null);
                setIsNewUser(false);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
        };
    }, []);

    return { isNewUser };
};
