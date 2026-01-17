import { db } from './firebaseConfig';
import { collection, query, where, getDocs, documentId, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { User } from '../types';

export const UserService = {
    /**
     * Hides an activity for the current user.
     */
    hideActivity: async (userId: string, activityId: string) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                hiddenActivityIds: arrayUnion(activityId)
            });
            console.log(`[UserService] Hidden activity ${activityId} for user ${userId}`);
            return true;
        } catch (error) {
            console.error("[UserService] Failed to hide activity:", error);
            return false;
        }
    },

    /**
     * Fetches multiple user profiles by their IDs.
     * Helpful for populating lists like "Following" or "Story Tray".
     * NOTE: Firestore 'in' query is limited to 10 items.
     * This method handles slicing or you should call it with small batches.
     */
    getUsersByIds: async (userIds: string[]): Promise<User[]> => {
        if (!userIds || userIds.length === 0) return [];

        // Simple slice for MVP to avoid error. Can be expanded to promise.all for batches later.
        const safeIds = userIds.slice(0, 10);

        try {
            const q = query(
                collection(db, 'users'),
                where(documentId(), 'in', safeIds)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as User);
        } catch (error) {
            console.error("[UserService] Failed to fetch users:", error);
            return [];
        }
    }
};
