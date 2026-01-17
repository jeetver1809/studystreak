import { db, auth } from './firebaseConfig';
import { doc, updateDoc, addDoc, collection, Timestamp, increment, getDoc, getDocFromServer, arrayUnion, setDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { User, Character } from '../types';
import { getTodayStr, isStudyCompletedToday } from '../utils/dateUtils';
import { getCharacterForStreak } from '../utils/characters';
import { ActivityService } from './activityService';
import { CharacterProgressionService } from './CharacterProgressionService';

export const StreakService = {
    async completeSession(userId: string, durationSeconds: number, subjectId?: string, chapterId?: string): Promise<{ unlockedCharacter?: Character }> {
        console.log("[StreakService] Step 0: Start Session Completion");
        console.log(`[StreakService] Params: userId=${userId}, duration=${durationSeconds}s, subject=${subjectId}`);

        const currentUser = auth.currentUser;
        if (!userId) {
            console.error("[StreakService] ERROR: No userId provided.");
            throw new Error("Invalid User ID: Cannot save session.");
        }

        if (currentUser?.uid !== userId) {
            console.warn(`[StreakService] AUTH WARNING: CurrentUser (${currentUser?.uid}) != TargetUser (${userId})`);
        }

        const today = getTodayStr();
        console.log(`[StreakService] Today's Date String: ${today}`);

        const userRef = doc(db, 'users', userId);

        // 1. Fetch current user state (READ FIRST)
        console.log("[StreakService] Step 1: Fetching User State...");
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            console.error("[StreakService] ERROR: User document missing from DB!");
            throw new Error("User profile not found in database.");
        }
        const userData = userSnap.data() as User;
        console.log("[StreakService] Step 1: User fetched successfully.");
        console.log(`[StreakService] Current DB State -> Streak: ${userData.currentStreak}, LastStudy: ${userData.lastStudyDate}`);

        // 3. Calculate Coins & Time
        const currentBanked = userData.bankedSeconds || 0;
        const totalSeconds = currentBanked + durationSeconds;
        const earnedCoins = Math.floor(totalSeconds / 60);
        const newBankedSeconds = totalSeconds % 60;
        const sessionMinutes = durationSeconds / 60; // Precise minutes for tracking

        console.log(`[StreakService] Result: +${earnedCoins} Coins, +${sessionMinutes.toFixed(2)} mins`);

        // 4. Update Streak
        const alreadyStudied = isStudyCompletedToday(userData.lastStudyDate);

        if (alreadyStudied) {
            console.log("[StreakService] Already studied today. Accumulating time.");

            // Log Session (Fire & Forget)
            addDoc(collection(db, 'study_sessions'), {
                userId, date: today, startTime: Timestamp.now(), endTime: Timestamp.now(), durationSeconds,
                subjectId: subjectId || null, chapterId: chapterId || null
            }).catch(e => console.error("Session Log Error:", e));

            // Update User Stats (using setDoc with merge to ensure characterXP map is created if missing)
            setDoc(userRef, {
                coins: increment(earnedCoins),
                bankedSeconds: newBankedSeconds,
                totalStudyMinutes: increment(sessionMinutes),
                todayStudyMinutes: increment(sessionMinutes), // Accumulate for today
                [`characterXP.${CharacterProgressionService.getActiveCharacter(userData.currentStreak).id}`]: increment(Math.floor(sessionMinutes * 10))
            }, { merge: true }).catch(e => console.error(e));

            // Return empty unlocks
            return { unlockedCharacter: undefined };
        }

        console.log("[StreakService] First session of the day.");
        const unlockedIds = Array.isArray(userData.unlockedCharacterIds) ? userData.unlockedCharacterIds : [];
        const currentStreak = userData.currentStreak || 0;
        const longestStreak = userData.longestStreak || 0;

        // Streak Break Logic...
        const d1 = new Date(userData.lastStudyDate);
        const d2 = new Date(today);
        const diffDays = (d2.getTime() - d1.getTime()) / (1000 * 3600 * 24);

        let effectiveStreak = diffDays > 1 ? 0 : currentStreak;
        const newStreak = effectiveStreak + 1;

        // Check Unlocks...
        const unlock = getCharacterForStreak(newStreak);
        let unlockedCharacter: Character | undefined;
        let finalUnlockedIds = [...unlockedIds];
        let finalTotalChars = (userData.totalCharacters || 0);

        if (unlock && !unlockedIds.includes(unlock.id)) {
            finalUnlockedIds.push(unlock.id);
            finalTotalChars += 1;
            unlockedCharacter = unlock;
        }

        const updates: any = {
            currentStreak: newStreak,
            lastStudyDate: today,
            longestStreak: Math.max(longestStreak, newStreak),
            unlockedCharacterIds: finalUnlockedIds,
            totalCharacters: finalTotalChars,
            coins: (userData.coins || 0) + earnedCoins,
            bankedSeconds: newBankedSeconds,
            totalStudyMinutes: increment(sessionMinutes),
            todayStudyMinutes: sessionMinutes, // Reset for new day
            characterXP: {
                ...(userData.characterXP || {}),
                [CharacterProgressionService.getActiveCharacter(newStreak).id]: ((userData.characterXP?.[CharacterProgressionService.getActiveCharacter(newStreak).id] || 0) + Math.floor(sessionMinutes * 10))
            }
        };

        console.log("[StreakService] Preparing Updates:", JSON.stringify(updates, null, 2));

        // ---------------------------------------------------------
        // NON-BLOCKING WRITES (Fire & Forget)
        // ---------------------------------------------------------

        // 1. Update User Profile
        console.log("[StreakService] Dispatching User Update (Background)...");
        setDoc(userRef, updates, { merge: true })
            .then(() => console.log("[StreakService] User Update WRITE SUCCESS."))
            .catch((e) => console.error("[StreakService] User Update WRITES FAILED:", e));

        // 2. Log Session
        console.log("[StreakService] Dispatching Session Log (Background)...");
        addDoc(collection(db, 'study_sessions'), {
            userId,
            date: today,
            startTime: Timestamp.now(),
            endTime: Timestamp.now(),
            durationSeconds,
            subjectId: subjectId || null,
            chapterId: chapterId || null
        })
            .then(() => console.log("[StreakService] Session Log WRITE SUCCESS."))
            .catch((e) => console.error("[StreakService] Session Log WRITES FAILED:", e));

        // 3. Log Social Activity (Session)
        ActivityService.logActivity({
            userId,
            username: userData.username || "Study Streak User",
            userPhotoURL: userData.photoURL || null,
            type: 'session_completed',
            data: {
                durationMinutes: Math.floor(durationSeconds / 60),
                durationSeconds: durationSeconds
            }
        });

        // 4. Log Social Activity (Level Up)
        if (unlockedCharacter) {
            ActivityService.logActivity({
                userId,
                username: userData.username,
                userPhotoURL: userData.photoURL || null,
                type: 'level_up',
                data: { characterName: unlockedCharacter.name }
            });
        }

        // Return IMMEDIATELY so UI can transition
        return { unlockedCharacter };
    },

    async validateStreak(user: User): Promise<User> {
        const today = getTodayStr();
        const lastStudy = user.lastStudyDate;
        const oneDay = 24 * 60 * 60 * 1000;

        if (!lastStudy) return user;

        // Parse YYYY-MM-DD
        const d1 = new Date(lastStudy);
        const d2 = new Date(today);
        const diffTime = d2.getTime() - d1.getTime();
        const diffDays = diffTime / oneDay;

        // If diffDays > 1 (e.g. 2 days gap), Streak breaks.
        if (diffDays > 1) {
            console.log(`[StreakService] Streak BROKEN. Last study: ${lastStudy}, Today: ${today}, Diff: ${diffDays}`);
            const userRef = doc(db, 'users', user.uid);

            // Freeze logic: Check if we should save it
            // Only freeze if they HAD a streak (> 0) and it isn't already frozen
            let updates: any = { currentStreak: 0 };

            if (user.currentStreak > 0 && !user.frozenStreak) {
                updates.frozenStreak = user.currentStreak;
                updates.streakBreakDate = today;
                console.log(`[StreakService] Freezing streak of ${user.currentStreak}`);
            }

            // If streak is already frozen, check if expired (Example: 24 hours logic handled by UI or here)
            // For simplicity, we keep the frozen streak until they repair it or ignore it for too long.
            // But strict 24h check requires timestamp comparison. 
            // Here we just save the break state.

            await updateDoc(userRef, updates);
            return { ...user, ...updates };
        }
        return user;
    },

    async repairStreak(userId: string): Promise<boolean> {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return false;

        const data = userSnap.data() as User;
        const COST = 400;

        if ((data.coins || 0) < COST) {
            throw new Error("Insufficient coins");
        }
        if (!data.frozenStreak) {
            throw new Error("No streak to repair");
        }

        // Repair!
        await updateDoc(userRef, {
            coins: increment(-COST),
            currentStreak: data.frozenStreak,
            frozenStreak: null,
            streakBreakDate: null,
            lastStudyDate: getTodayStr() // Mark today as studied so it doesn't break again immediately
        });

        // Log Social Activity (Repair)
        ActivityService.logActivity({
            userId,
            username: data.username,
            userPhotoURL: data.photoURL || null,
            type: 'streak_repaired',
            data: { streakCount: data.frozenStreak || 0 }
        });

        return true;
    },

    async getStudyHistory(userId: string, days: number = 365): Promise<Record<string, number>> {
        // Fetch sessions for the last N days
        // Note: For large datasets, this should be paginated or aggregated on backend.
        // For MVP, we query simple index.
        const history: Record<string, number> = {};

        // Simple query: All sessions for user, ordered by date desc, limit 500
        // We will process client side to aggregate by date.
        // Ideally we filter by date range, but string date "YYYY-MM-DD" makes range queries tricky without ISO string or Timestamp.
        // However, we used "date" string field "YYYY-MM-DD". String comparison works for "2024..." > "2023..."

        // Let's just fetch all and filter client side for now to avoid complex composite index creation right now.
        // Or better: Use the standard query we know works.
        const sessionsRef = collection(db, 'study_sessions');
        // We need a query.

        // NOTE: This might require an index: userId + date DESC
        // q = query(sessionsRef, where('userId', '==', userId), orderBy('date', 'desc'), limit(1000));

        // For now, let's try a safe approach that might not need a new index if one doesn't exist, 
        // or effectively we will ask user to create it if it fails.
        // Actually, we can just grab recent sessions.

        try {
            console.log(`[StreakService] Fetching history for ${userId}`);
            const q = query(
                sessionsRef,
                where('userId', '==', userId),
                orderBy('date', 'desc'),
                limit(500)
            );

            const snapshot = await getDocs(q);
            console.log(`[StreakService] Found ${snapshot.size} sessions.`);


            snapshot.forEach(doc => {
                const data = doc.data();
                const d = data.date; // YYYY-MM-DD
                const mins = Math.ceil((data.durationSeconds || 0) / 60);

                if (history[d]) {
                    history[d] += mins;
                } else {
                    history[d] = mins;
                }
            });
        } catch (e) {
            console.error("Failed to fetch study history", e);
            // Fallback for missing index: return empty
        }

        return history;
    },

    async syncTodayProgress(userId: string): Promise<{ today: number, total: number }> {
        const today = getTodayStr();
        const sessionsRef = collection(db, 'study_sessions');
        const userRef = doc(db, 'users', userId);

        try {
            // 1. Get current user state
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) return { today: 0, total: 0 };
            const userData = userSnap.data() as User;
            const storedTodayMins = userData.todayStudyMinutes || 0;
            const storedTotalMins = userData.totalStudyMinutes || 0;

            // 2. Calculate actual today progress from logs
            const q = query(
                sessionsRef,
                where('userId', '==', userId),
                where('date', '==', today)
            );

            const snapshot = await getDocs(q);
            let totalSeconds = 0;
            snapshot.forEach(doc => {
                totalSeconds += (doc.data().durationSeconds || 0);
            });

            const calculatedTodayMins = totalSeconds / 60;

            // 3. Determine adjustments
            const diff = calculatedTodayMins - storedTodayMins;

            let newTotalMins = storedTotalMins + diff;
            // Sanity check: Total cannot be less than Today
            if (newTotalMins < calculatedTodayMins) {
                newTotalMins = calculatedTodayMins;
            }

            const todayNeedsUpdate = Math.abs(diff) > 0.01;
            const totalNeedsUpdate = Math.abs(newTotalMins - storedTotalMins) > 0.01;

            if (!todayNeedsUpdate && !totalNeedsUpdate) {
                console.log("[StreakService] Sync: Everything up to date.");
                return { today: storedTodayMins, total: storedTotalMins };
            }

            console.log(`[StreakService] Syncing: Today=${calculatedTodayMins} (was ${storedTodayMins}), Total=${newTotalMins} (was ${storedTotalMins})`);

            // 4. Update
            await updateDoc(userRef, {
                todayStudyMinutes: calculatedTodayMins,
                totalStudyMinutes: newTotalMins
            });

            return { today: calculatedTodayMins, total: newTotalMins };
        } catch (e) {
            console.error("[StreakService] Sync failed", e);
            return { today: 0, total: 0 };
        }
    }
};
