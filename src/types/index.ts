import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  username: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  isEmailVerified?: boolean; // Auth provider state

  // Settings
  notificationTime: number; // Hour of day (0-23)
  targetDurationMinutes: number; // Default 25
  isDarkMode: boolean;

  // Aggregate Stats
  currentStreak: number;
  longestStreak: number;
  totalCharacters: number;
  totalStudyMinutes?: number;
  todayStudyMinutes?: number; // Track precise daily progress
  lastStudyDate: string; // "YYYY-MM-DD"
  unlockedCharacterIds: string[];
  characterXP?: Record<string, number>; // Maps characterId -> XP points

  // Economy & Retention
  coins: number;
  frozenStreak?: number | null; // The streak count they lost
  streakBreakDate?: string | null; // "YYYY-MM-DD" when it broke
  bankedSeconds?: number; // Seconds that haven't converted to a full coin yet

  // Profile
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  followingIds?: string[];
  followersIds?: string[]; // Optional, for future use

  // Content Preferences
  hiddenActivityIds?: string[];
}

export interface Chapter {
  id: string;
  name: string;
  isCompleted: boolean;
  description?: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  totalSeconds: number;
  chapters?: Chapter[];
}

export interface StudySession {
  id: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  startTime: Timestamp;
  endTime: Timestamp;
  durationSeconds: number;
  subjectId?: string;
  chapterId?: string;
}

import { ImageSourcePropType } from 'react-native';

export interface Character {
  id: string;
  name: string;
  worldId: 'brainrot' | 'kick' | 'spongebob' | 'onepiece' | 'gravity_falls' | 'powerpuff';
  unlockDay: number;
  image: ImageSourcePropType;
  description?: string;
}

export interface Activity {
  id: string;
  userId: string;
  username: string;
  userPhotoURL?: string | null;
  type: 'session_completed' | 'streak_repaired' | 'level_up' | 'badge_earned';
  data: {
    durationMinutes?: number; // for session
    durationSeconds?: number; // for session (more precise)
    characterName?: string; // for level_up
    streakCount?: number; // for repair
  };
  createdAt: Timestamp;
}
