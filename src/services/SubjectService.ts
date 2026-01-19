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

export const SubjectService = {
    // Subjects
    async getSubjects(userId: string): Promise<Subject[]> {
        const CACHE_KEY = `subjects_${userId}`;

        try {
            if (!userId) throw new Error("UserId is required");

            const subjectsRef = collection(db, 'users', userId, 'subjects');

            // Try Network First
            const snapshot = await getDocs(subjectsRef);
            console.log(`[SubjectService] Fetched ${snapshot.size} subjects from network`);

            const subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));

            // Save to Cache
            try {
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(subjects));
            } catch (e) {
                console.warn("Failed to save subjects cache", e);
            }
            return subjects;
        } catch (error) {
            console.warn("[SubjectService] Network/Ref failed, trying manual cache...", error);
            try {
                // Fallback to manual cache
                const cachedData = await AsyncStorage.getItem(CACHE_KEY);
                if (cachedData) {
                    const subjects = JSON.parse(cachedData) as Subject[];
                    console.log(`[SubjectService] Loaded ${subjects.length} subjects from manual cache`);
                    return subjects;
                }
                // If no cache and new user (network error or just empty), return empty array if it was a permission/network error but we simply have no data?
                // Actually if new user and offline, cache is null. We should prob return [] instead of throwing if we suspect it's just "no data yet".
                // But error might be genuine. Let's return [] if valid fallback? 
                // No, better to let UI know it failed so it can show "Offline" vs "Empty".
                throw error;
            } catch (cacheError) {
                console.error("[SubjectService] Manual cache failed", cacheError);
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
        return newSubject;
    },

    async updateSubject(userId: string, subjectId: string, updates: Partial<Subject>) {
        const subjectRef = doc(db, 'users', userId, 'subjects', subjectId);
        await updateDoc(subjectRef, updates);
    },

    async deleteSubject(userId: string, subjectId: string) {
        const subjectRef = doc(db, 'users', userId, 'subjects', subjectId);
        await deleteDoc(subjectRef);
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
