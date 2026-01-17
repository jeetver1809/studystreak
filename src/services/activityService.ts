import { db } from './firebaseConfig';
import { collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp, startAfter } from 'firebase/firestore';
import { Activity } from '../types';

export const ActivityService = {
    /**
     * Logs a new activity to the global 'activities' collection.
     */
    logActivity: async (activity: Omit<Activity, 'id' | 'createdAt'>) => {
        try {
            await addDoc(collection(db, 'activities'), {
                ...activity,
                createdAt: Timestamp.now()
            });
            console.log(`[ActivityService] Logged ${activity.type} for ${activity.username}`);
        } catch (error) {
            console.error("[ActivityService] Failed to log activity:", error);
        }
    },

    /**
     * Fetches the feed for a list of followed user IDs.
     * Note: Firestore 'in' queries are limited to 10 items. 
     * For production with many followers, we'd need a different approach (fan-out).
     * For this MVP, we will fetch recent activities and filter locally or slice the ID list.
     */
    getFeed: async (followingIds: string[]) => {
        if (!followingIds || followingIds.length === 0) return [];

        // Limitation: 'in' query max 10. We'll take top 10 for now or chunk it.
        // Let's just take the first 10 for MVP simplicity.
        const safeIds = followingIds.slice(0, 10);

        try {
            // REMOVED orderBy('createdAt', 'desc') to avoid needing a composite index for now.
            // We will sort client-side.
            const q = query(
                collection(db, 'activities'),
                where('userId', 'in', safeIds),
                limit(50) // Increased limit since we filter/sort locally
            );

            const snapshot = await getDocs(q);
            const activities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Activity));

            // Client-side sort
            return activities.sort((a, b) => {
                const tA = a.createdAt?.seconds || 0;
                const tB = b.createdAt?.seconds || 0;
                return tB - tA; // Descending
            });
        } catch (error: any) {
            console.error("[ActivityService] Failed to fetch feed:", error);
            if (error?.code === 'failed-precondition') {
                console.error("This is likely a missing index issue. Please check the Firebase console link in the error message above.");
            }
            return [];
        }
    }
};
