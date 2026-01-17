import { db } from './firebaseConfig';
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { getTodayStr } from '../utils/dateUtils';

export interface DailyStats {
    date: string; // YYYY-MM-DD
    totalSeconds: number;
    hours: number;
    sessions: number;
}

export const StatsService = {
    /**
     * Fetches study sessions for the last 7 days and aggregates them by date.
     */
    async getWeeklyStats(userId: string): Promise<DailyStats[]> {
        if (!userId) return [];

        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 6); // Last 7 days including today

        // Reset to start of day for query
        start.setHours(0, 0, 0, 0);

        const sessionsRef = collection(db, 'study_sessions');
        const q = query(
            sessionsRef,
            where('userId', '==', userId),
            where('startTime', '>=', Timestamp.fromDate(start)),
            orderBy('startTime', 'asc')
        );

        const querySnapshot = await getDocs(q);

        // Initialize map with last 7 days (fill gaps with 0)
        // Initialize map with last 7 days (fill gaps with 0)
        const statsMap = new Map<string, DailyStats>();
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            // Construct YYYY-MM-DD in Local Time
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            statsMap.set(dateStr, { date: dateStr, totalSeconds: 0, hours: 0, sessions: 0 });
        }

        querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            // Safety check for date format or timestamp
            let dateStr = data.date;
            if (!dateStr && data.startTime) {
                // Fallback to timestamp, but ensure Local Time
                const d = (data.startTime as Timestamp).toDate();
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                dateStr = `${year}-${month}-${day}`;
            }

            if (statsMap.has(dateStr)) {
                const stat = statsMap.get(dateStr)!;
                stat.totalSeconds += (data.durationSeconds || 0);
                stat.sessions += 1;
                stat.hours = parseFloat((stat.totalSeconds / 3600).toFixed(1));
            }
        });

        // Convert map to sorted array (oldest to newest for chart)
        return Array.from(statsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    },

    /**
     * Get total study seconds for today
     */
    async getTodaySeconds(userId: string): Promise<number> {
        const todayStr = getTodayStr();
        const stats = await this.getWeeklyStats(userId);
        const todayStat = stats.find(s => s.date === todayStr);
        return todayStat ? todayStat.totalSeconds : 0;
    },

    /**
     * Aggregates stats by subject for a given range.
     * range: 'today' | 'week' | 'all'
     */
    async getSubjectStats(userId: string, range: 'today' | 'week' | 'all'): Promise<Record<string, number>> {
        const sessionsRef = collection(db, 'study_sessions');
        let q;
        const now = new Date();
        const endDay = new Date();
        endDay.setHours(23, 59, 59, 999);

        // Define Start Time
        let start: Date;

        if (range === 'today') {
            start = new Date();
            start.setHours(0, 0, 0, 0);
        } else if (range === 'week') {
            start = new Date();
            start.setDate(now.getDate() - 6);
            start.setHours(0, 0, 0, 0);
        } else {
            // 'all' - simplistic filter, maybe last year?
            start = new Date(0); // Epoch
        }

        if (range === 'all') {
            q = query(
                sessionsRef,
                where('userId', '==', userId)
            );
        } else {
            q = query(
                sessionsRef,
                where('userId', '==', userId),
                where('startTime', '>=', Timestamp.fromDate(start))
            );
        }

        const snapshot = await getDocs(q);
        const subjectTotals: Record<string, number> = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            // Filter locally for end date if needed (usually just start date is efficient enough for week/today)
            // But if range is 'today', we want strictly today. 
            // Firestore condition >= StartTime usually covers it for "today onwards".

            const subjectId = data.subjectId || 'uncategorized';
            const duration = data.durationSeconds || 0;

            // Only count if it's strictly within range (Firestore query is >= start, so it includes future? No, session logs are past).
            // However, for 'today', we rely on local time. 
            // The query uses Timestamp.fromDate(start), which corresponds to 00:00 local time IF start is constructed correctly in device time.

            // Double check strict date string match for 'today' due to timezone potential variance
            if (range === 'today') {
                const todayStr = getTodayStr();
                // Safe check: data.date might be missing
                let sessionDate = data.date;
                if (!sessionDate && data.startTime) {
                    const d = (data.startTime as Timestamp).toDate();
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    sessionDate = `${year}-${month}-${day}`;
                }

                if (sessionDate !== todayStr) return;
            }

            subjectTotals[subjectId] = (subjectTotals[subjectId] || 0) + duration;
        });

        return subjectTotals;
    }
};
