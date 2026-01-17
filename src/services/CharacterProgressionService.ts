import { CHARACTERS, WORLDS, World } from '../utils/characters';
import { Character, User } from '../types';
import { useUserStore } from '../store/userStore';
import { db } from './firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

export class CharacterProgressionService {

    /**
     * Re-evaluates what characters the user should have unlocked based on their current streak.
     * Use this to sync state if data desyncs or on app load.
     */
    static getUnlockedCharacters(currentStreak: number): Character[] {
        return CHARACTERS.filter(c => c.unlockDay <= currentStreak);
    }

    /**
     * Returns the "Active" character (the one from the highest unlocked day).
     */
    static getActiveCharacter(currentStreak: number): Character {
        const unlocked = this.getUnlockedCharacters(currentStreak);
        return unlocked.length > 0 ? unlocked[unlocked.length - 1] : CHARACTERS[0];
    }

    /**
     * Returns the next character to be unlocked and how many days remaining.
     */
    static getNextUnlock(currentStreak: number): { character: Character, daysRemaining: number } | null {
        const nextChar = CHARACTERS.find(c => c.unlockDay > currentStreak);
        if (!nextChar) return null; // Logic for "Maxed Out" could go here

        return {
            character: nextChar,
            daysRemaining: nextChar.unlockDay - currentStreak
        };
    }

    /**
     * Group all characters by World for the Collection Screen.
     */
    static getCollectionData(currentStreak: number) {
        return WORLDS.map(world => {
            const worldChars = CHARACTERS.filter(c => c.worldId === world.id);
            return {
                world,
                characters: worldChars.map(char => ({
                    ...char,
                    isUnlocked: char.unlockDay <= currentStreak,
                    isNext: char.unlockDay === currentStreak + 1
                }))
            };
        });
    }


    /**
     * Calculates the Character Level based on XP.
     * Formula: Level = floor(sqrt(XP / 100)) + 1
     * 0 XP = Lvl 1
     * 100 XP = Lvl 2 (10 mins)
     * 400 XP = Lvl 3 (40 mins)
     * 900 XP = Lvl 4 (90 mins)
     */
    static calculateLevel(xp: number): number {
        if (!xp || xp < 0) return 1;
        return Math.floor(Math.sqrt(xp / 100)) + 1;
    }

    /**
     * Calculates detailed progress towards the next level.
     */
    static getLevelProgress(xp: number) {
        const currentLevel = this.calculateLevel(xp);
        const nextLevel = currentLevel + 1;

        // Formula: XP = (Level - 1)^2 * 100
        const xpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 100;
        const xpForNextLevel = Math.pow(nextLevel - 1, 2) * 100;

        const xpGainedInLevel = Math.max(0, xp - xpForCurrentLevel);
        const xpRequiredForLevel = xpForNextLevel - xpForCurrentLevel;
        const progressPercent = Math.min(100, Math.floor((xpGainedInLevel / xpRequiredForLevel) * 100));

        return {
            currentLevel,
            nextLevel,
            currentXP: xp,
            xpForNextLevel,
            xpGainedInLevel,
            xpRequiredForLevel,
            progressPercent
        };
    }
    /**
     * Syncs the user's Total XP with their Total Study Minutes.
     * If there is a discrepancy (e.g. they studied before XP was added),
     * it awards the missing XP to the active character.
     */
    static async syncXPWithHistory(user: User): Promise<Partial<User> | null> {
        if (!user || !user.uid) return null;

        const totalMinutes = user.totalStudyMinutes || 0;
        const TARGET_XP_PER_MIN = 10;
        const targetTotalXP = Math.floor(totalMinutes * TARGET_XP_PER_MIN);

        // Sum current XP across all characters
        const currentTotalXP = Object.values(user.characterXP || {}).reduce((sum: number, xp: number) => sum + xp, 0);

        // If we are missing XP, we need to add it
        if (targetTotalXP > currentTotalXP) {
            const missingXP = targetTotalXP - currentTotalXP;
            console.log(`[XP Sync] User missing ${missingXP} XP. Syncing...`);

            // Apply to active character
            const activeCharId = this.getActiveCharacter(user.currentStreak || 0).id;
            const currentCharXP = user.characterXP?.[activeCharId] || 0;
            const newCharXP = currentCharXP + missingXP;

            // Prepare update
            const xpUpdate = {
                [`characterXP.${activeCharId}`]: newCharXP
            };

            try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, xpUpdate);

                // Return the partial update for local state
                return {
                    characterXP: {
                        ...(user.characterXP || {}),
                        [activeCharId]: newCharXP
                    }
                };
            } catch (e) {
                console.error("[XP Sync] Failed to sync XP:", e);
                return null;
            }
        }

        return null;
    }
}
