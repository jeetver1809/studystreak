import { db } from './firebaseConfig';
import { doc, runTransaction, arrayUnion, arrayRemove, increment } from 'firebase/firestore';

export const SocialService = {
    /**
     * Follows a target user. 
     * Updates:
     * - Current User: adds targetId to followingIds, increments followingCount
     * - Target User: adds currentId to followersIds, increments followersCount
     */
    followUser: async (currentUserId: string, targetUserId: string) => {
        if (currentUserId === targetUserId) return false;

        const currentUserRef = doc(db, 'users', currentUserId);
        const targetUserRef = doc(db, 'users', targetUserId);

        try {
            await runTransaction(db, async (transaction) => {
                const currentUserDoc = await transaction.get(currentUserRef);
                const targetUserDoc = await transaction.get(targetUserRef);

                if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
                    throw "User does not exist!";
                }

                // Update Current User
                transaction.update(currentUserRef, {
                    followingIds: arrayUnion(targetUserId),
                    followingCount: increment(1)
                });

                // Update Target User
                transaction.update(targetUserRef, {
                    followersIds: arrayUnion(currentUserId),
                    followersCount: increment(1)
                });
            });
            return true;
        } catch (error) {
            console.error("Follow Error: ", error);
            return false;
        }
    },

    /**
     * Unfollows a target user.
     * Reverses the follow operations.
     */
    unfollowUser: async (currentUserId: string, targetUserId: string) => {
        const currentUserRef = doc(db, 'users', currentUserId);
        const targetUserRef = doc(db, 'users', targetUserId);

        try {
            await runTransaction(db, async (transaction) => {
                // Update Current User
                transaction.update(currentUserRef, {
                    followingIds: arrayRemove(targetUserId),
                    followingCount: increment(-1)
                });

                // Update Target User
                transaction.update(targetUserRef, {
                    followersIds: arrayRemove(currentUserId),
                    followersCount: increment(-1)
                });
            });
            return true;
        } catch (error) {
            console.error("Unfollow Error: ", error);
            return false;
        }
    }
};
