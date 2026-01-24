import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import {
    collection,
    doc,
    setDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    increment,
    getDoc,
    addDoc,
    Timestamp
} from 'firebase/firestore';
import { Subject, Chapter } from '../types';
import { Logger } from '../utils/logger';

// Module-level cache for request deduplication
let activeRequest: { userId: string, promise: Promise<Subject[]> } | null = null;
let memoryCache: { userId: string, data: Subject[], timestamp: number } | null = null;

export const SubjectService = {
    // Subjects
    async getSubjects(userId: string): Promise<Subject[]> {
        const CACHE_KEY = `subjects_${userId}`;
        const NOW = Date.now();
        const CACHE_TTL = 60000; // 60 Seconds (Increased from 5s to reduce redundancy)

        // 1. Return Active Deduplicated Promise
        if (activeRequest && activeRequest.userId === userId) {
            Logger.log("[SubjectService] Returning active request (Deduplicated)");
            return activeRequest.promise;
        }

        // 2. Return In-Memory Cache if fresh
        if (memoryCache && memoryCache.userId === userId) {
            if (NOW - memoryCache.timestamp < CACHE_TTL) {
                Logger.log("[SubjectService] Returning in-memory cache (Instant)");
                return memoryCache.data;
            } else {
                Logger.log("[SubjectService] Memory cache expired. Fetching fresh...");
            }
        } else {
            Logger.log("[SubjectService] No memory cache found. Fetching...");
        }

        try {
            if (!userId) throw new Error("UserId is required");

            const subjectsRef = collection(db, 'users', userId, 'subjects');

            const fetchPromise = (async () => {
                try {
                    // Try Network First
                    const snapshot = await getDocs(subjectsRef);
                    Logger.log(`[SubjectService] Fetched ${snapshot.size} subjects from network`);

                    const subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));

                    // Update Memory Cache
                    memoryCache = { userId, data: subjects, timestamp: Date.now() };

                    // Save to Persistence Cache
                    try {
                        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(subjects));
                    } catch (e) {
                        Logger.warn("Failed to save subjects cache", e);
                    }
                    return subjects;
                } finally {
                    activeRequest = null; // Clear request on completion
                }
            })();

            activeRequest = { userId, promise: fetchPromise };
            return fetchPromise;
        } catch (error) {
            Logger.warn("[SubjectService] Network/Ref failed, trying manual cache...", error);
            try {
                // Fallback to manual cache
                const cachedData = await AsyncStorage.getItem(CACHE_KEY);
                if (cachedData) {
                    const subjects = JSON.parse(cachedData) as Subject[];
                    Logger.log(`[SubjectService] Loaded ${subjects.length} subjects from manual cache`);
                    return subjects;
                }
                throw error;
            } catch (cacheError) {
                Logger.error("[SubjectService] Manual cache failed", cacheError);
                throw error;
            }
        }
    },

    async addSubject(userId: string, name: string, color: string): Promise<Subject> {
        const subjectsRef = collection(db, 'users', userId, 'subjects');
        const newSubjectRef = doc(subjectsRef); // Generate ID
        const newSubject: Subject = {
            id: newSubjectRef.id,
            name,
            color,
            totalSeconds: 0,
            chapters: []
        };
        await setDoc(newSubjectRef, newSubject);

        // Update Memory Cache immediately so UI reflects it
        try {
            if (memoryCache && memoryCache.userId === userId) {
                const updatedData = [...memoryCache.data, newSubject];
                memoryCache = { ...memoryCache, data: updatedData };
                AsyncStorage.setItem(`subjects_${userId}`, JSON.stringify(updatedData)).catch(err =>
                    Logger.warn("[SubjectService] Failed to update cache on add", err)
                );
            }
        } catch (error) {
            Logger.warn("[SubjectService] Cache update error", error);
        }

        return newSubject;
    },

    async updateSubject(userId: string, subjectId: string, updates: Partial<Subject>) {
        const subjectRef = doc(db, 'users', userId, 'subjects', subjectId);
        await updateDoc(subjectRef, updates);

        // Update Memory Cache
        try {
            if (memoryCache && memoryCache.userId === userId) {
                const updatedData = memoryCache.data.map(s =>
                    s.id === subjectId ? { ...s, ...updates } : s
                );
                memoryCache = { ...memoryCache, data: updatedData };
                AsyncStorage.setItem(`subjects_${userId}`, JSON.stringify(updatedData)).catch(err =>
                    Logger.warn("[SubjectService] Failed to update cache on update", err)
                );
            }
        } catch (error) {
            Logger.warn("[SubjectService] Cache update error", error);
        }
    },

    async deleteSubject(userId: string, subjectId: string) {
        const subjectRef = doc(db, 'users', userId, 'subjects', subjectId);
        await deleteDoc(subjectRef);

        // Update Memory Cache
        try {
            if (memoryCache && memoryCache.userId === userId) {
                const updatedData = memoryCache.data.filter(s => s.id !== subjectId);
                memoryCache = { ...memoryCache, data: updatedData };
                AsyncStorage.setItem(`subjects_${userId}`, JSON.stringify(updatedData)).catch(err =>
                    Logger.warn("[SubjectService] Failed to update cache on delete", err)
                );
            }
        } catch (error) {
            Logger.warn("[SubjectService] Cache update error", error);
        }
    },

    // Chapters
    async addChapter(userId: string, subjectId: string, name: string, description?: string): Promise<Chapter> {
        const subjectRef = doc(db, 'users', userId, 'subjects', subjectId);

        const subjectSnap = await getDoc(subjectRef);
        if (!subjectSnap.exists()) throw new Error("Subject not found");

        const subjectData = subjectSnap.data() as Subject;
        const newChapter: Chapter = {
            id: Math.random().toString(36).substring(7),
            name,
            description: description || '',
            isCompleted: false
        };

        const currentChapters = subjectData.chapters || [];
        await updateDoc(subjectRef, {
            chapters: [...currentChapters, newChapter]
        });

        return newChapter;
    },

    async updateChapter(userId: string, subjectId: string, chapter: Chapter) {
        const subjectRef = doc(db, 'users', userId, 'subjects', subjectId);
        const subjectSnap = await getDoc(subjectRef);

        if (subjectSnap.exists()) {
            const subjectData = subjectSnap.data() as Subject;
            const updatedChapters = (subjectData.chapters || []).map(c =>
                c.id === chapter.id ? chapter : c
            );

            await updateDoc(subjectRef, {
                chapters: updatedChapters
            });
        }
    },

    async deleteChapter(userId: string, subjectId: string, chapterId: string) {
        const subjectRef = doc(db, 'users', userId, 'subjects', subjectId);
        const subjectSnap = await getDoc(subjectRef);

        if (subjectSnap.exists()) {
            const subjectData = subjectSnap.data() as Subject;
            const updatedChapters = (subjectData.chapters || []).filter(c => c.id !== chapterId);

            await updateDoc(subjectRef, {
                chapters: updatedChapters
            });
        }
    },

    // Study Time
    async updateStudyTime(userId: string, subjectId: string, durationSeconds: number, chapterId?: string) {
        const subjectRef = doc(db, 'users', userId, 'subjects', subjectId);
        await updateDoc(subjectRef, {
            totalSeconds: increment(durationSeconds)
        });

        if (chapterId) {
            // If we were using subcollections, we'd update the chapter doc here.
            // Since it's an array, we might want to mark it as worked on or completed if that's the logic.
            // For now, tracking time on subject level is the primary requirement.
        }
    }
};
