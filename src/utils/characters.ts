import { Character } from '../types';

export type WorldId = Character['worldId'];

export interface World {
    id: WorldId;
    name: string;
    description: string;
    startDay: number;
    endDay?: number; // Infinite if undefined
    primaryColor: string;
}

export const WORLDS: World[] = [
    {
        id: 'brainrot',
        name: 'Brainrot World',
        description: 'The beginning of the end.',
        startDay: 1,
        endDay: 12,
        primaryColor: '#FF6B6B' // Pastel Red
    },
    {
        id: 'kick',
        name: 'Kick Arena',
        description: 'Stunts and Adrenaline.',
        startDay: 13,
        endDay: 19,
        primaryColor: '#53E09D' // Kick Green
    },
    {
        id: 'spongebob',
        name: 'Bikini Bottom',
        description: 'Nautical Nonsense.',
        startDay: 20,
        endDay: 26,
        primaryColor: '#F7D747' // Sponge Yellow
    },
    {
        id: 'onepiece',
        name: 'Grand Line',
        description: 'The Great Pirate Era.',
        startDay: 27,
        endDay: 30,
        primaryColor: '#38BDF8' // Ocean Blue
    },
    {
        id: 'gravity_falls',
        name: 'Gravity Falls',
        description: 'Trust No One.',
        startDay: 31,
        endDay: 35,
        primaryColor: '#A78BFA' // Mystery Purple
    },
    {
        id: 'powerpuff',
        name: 'Townsville',
        description: 'Sugar, Spice, and Everything Nice.',
        startDay: 36,
        endDay: 41,
        primaryColor: '#EC4899' // Pink
    }
];

// Deterministic Order
export const CHARACTERS: Character[] = [
    // BRAINROT (Day 1-12)
    { id: 'br_1', unlockDay: 1, worldId: 'brainrot', name: 'Ballerina Capuchina', image: require('../characters/brainrot_world/Ballerina-Capuchina.png') },
    { id: 'br_2', unlockDay: 2, worldId: 'brainrot', name: 'Bombardino Crocodillo', image: require('../characters/brainrot_world/Bombardino-Crocodillo.png') },
    { id: 'br_3', unlockDay: 3, worldId: 'brainrot', name: 'Bombini Gusini', image: require('../characters/brainrot_world/Bombini-Gusini.png') },
    { id: 'br_4', unlockDay: 4, worldId: 'brainrot', name: 'Broccoli Assassinini', image: require('../characters/brainrot_world/Broccoli-Assassini.png') },
    { id: 'br_5', unlockDay: 5, worldId: 'brainrot', name: 'Brr Brr Patapim', image: require('../characters/brainrot_world/Brr-Brr-Patapim.png') },
    { id: 'br_6', unlockDay: 6, worldId: 'brainrot', name: 'Cappuccino Assassinino', image: require('../characters/brainrot_world/Cappuccino-Assassino.png') },
    { id: 'br_7', unlockDay: 7, worldId: 'brainrot', name: 'Cocofanto elefanto', image: require('../characters/brainrot_world/Cocofanto-Elefanto.png') },
    { id: 'br_8', unlockDay: 8, worldId: 'brainrot', name: 'Lirili-lalila', image: require('../characters/brainrot_world/Lirili-Larila.png') },
    { id: 'br_9', unlockDay: 9, worldId: 'brainrot', name: 'Trulimero-trulichina', image: require('../characters/brainrot_world/Trulimero-Trulichina.png') },
    { id: 'br_10', unlockDay: 10, worldId: 'brainrot', name: 'Tung Tung TungSahur', image: require('../characters/brainrot_world/Tung-Tung-Tung-Sahur.png') },
    { id: 'br_11', unlockDay: 11, worldId: 'brainrot', name: 'Udin Din-Din-Dun', image: require('../characters/brainrot_world/Udin-Din-Din-Dun.png') },
    { id: 'br_12', unlockDay: 12, worldId: 'brainrot', name: 'Tralalero-tralala', image: require('../characters/brainrot_world/tralalero-tralala.png') },

    // KICK (Day 13-19)
    { id: 'kick_1', unlockDay: 13, worldId: 'kick', name: 'Kick Buttowski', image: require('../characters/kick/Kick-Buttowski.png') },
    { id: 'kick_2', unlockDay: 14, worldId: 'kick', name: 'Gunther Magnuson', image: require('../characters/kick/Gunther.png') },
    { id: 'kick_3', unlockDay: 15, worldId: 'kick', name: 'Brad Buttowski', image: require('../characters/kick/Brad_Buttowski.png') },
    { id: 'kick_4', unlockDay: 16, worldId: 'kick', name: 'Honey Buttowski', image: require('../characters/kick/Honey Buttowski.png') },
    { id: 'kick_5', unlockDay: 17, worldId: 'kick', name: 'Magnus Magnuson', image: require('../characters/kick/Magnus.png') },
    { id: 'kick_6', unlockDay: 18, worldId: 'kick', name: 'Kendall Perkins', image: require('../characters/kick/pngwing.com.png') },
    { id: 'kick_7', unlockDay: 19, worldId: 'kick', name: 'Wade', image: require('../characters/kick/pngwing.com(5).png') },

    // SPONGEBOB (Day 20-26)
    { id: 'sb_1', unlockDay: 20, worldId: 'spongebob', name: 'SpongeBob', image: require('../characters/spongebob_world/SpongeBob.png') },
    { id: 'sb_2', unlockDay: 21, worldId: 'spongebob', name: 'Patrick Star', image: require('../characters/spongebob_world/Patrick.png') },
    { id: 'sb_3', unlockDay: 22, worldId: 'spongebob', name: 'Squidward Tentacles', image: require('../characters/spongebob_world/pngwing.com.png') },
    { id: 'sb_4', unlockDay: 23, worldId: 'spongebob', name: 'Mr. Krabs', image: require('../characters/spongebob_world/pngwing.com(1).png') },
    { id: 'sb_5', unlockDay: 24, worldId: 'spongebob', name: 'Sandy Cheeks', image: require('../characters/spongebob_world/pngwing.com(2).png') },
    { id: 'sb_6', unlockDay: 25, worldId: 'spongebob', name: 'Plankton', image: require('../characters/spongebob_world/pngwing.com(3).png') },
    { id: 'sb_7', unlockDay: 26, worldId: 'spongebob', name: 'Gary', image: require('../characters/spongebob_world/pngwing.com(4).png') },

    // ONE PIECE (Day 27-30)
    { id: 'op_1', unlockDay: 27, worldId: 'onepiece', name: 'Luffy', image: require('../characters/onepiece/Luffy-Joy-Boy.png') },
    { id: 'op_2', unlockDay: 28, worldId: 'onepiece', name: 'Zoro', image: require('../characters/onepiece/Roronoa-Zoro.png') },
    { id: 'op_3', unlockDay: 29, worldId: 'onepiece', name: 'Sanji', image: require('../characters/onepiece/Sanji.png') },
    { id: 'op_4', unlockDay: 30, worldId: 'onepiece', name: 'Chopper', image: require('../characters/onepiece/Tony-Tony-Chopper.png') },

    // GRAVITY FALLS (Day 31-35)
    { id: 'gf_1', unlockDay: 31, worldId: 'gravity_falls', name: 'Dipper Pines', image: require('../characters/gravity_falls/pngwing.com.png') },
    { id: 'gf_2', unlockDay: 32, worldId: 'gravity_falls', name: 'Mabel Pines', image: require('../characters/gravity_falls/pngwing.com(1).png') },
    { id: 'gf_3', unlockDay: 33, worldId: 'gravity_falls', name: 'Grunkle Stan', image: require('../characters/gravity_falls/pngwing.com(2).png') },
    { id: 'gf_4', unlockDay: 34, worldId: 'gravity_falls', name: 'Soos', image: require('../characters/gravity_falls/pngwing.com(3).png') },
    { id: 'gf_5', unlockDay: 35, worldId: 'gravity_falls', name: 'Wendy', image: require('../characters/gravity_falls/pngwing.com(4).png') },

    // POWERPUFF GIRLS (Day 36-41)
    { id: 'ppg_1', unlockDay: 36, worldId: 'powerpuff', name: 'Blossom', image: require('../characters/powerpuff_girls/pngwing.com(5).png') },
    { id: 'ppg_2', unlockDay: 37, worldId: 'powerpuff', name: 'Bubbles', image: require('../characters/powerpuff_girls/pngwing.com(6).png') },
    { id: 'ppg_3', unlockDay: 38, worldId: 'powerpuff', name: 'Buttercup', image: require('../characters/powerpuff_girls/pngwing.com(7).png') },
    { id: 'ppg_4', unlockDay: 39, worldId: 'powerpuff', name: 'Mojo Jojo', image: require('../characters/powerpuff_girls/pngwing.com(8).png') },
    { id: 'ppg_5', unlockDay: 40, worldId: 'powerpuff', name: 'Professor Utonium', image: require('../characters/powerpuff_girls/pngwing.com(9).png') },
    { id: 'ppg_6', unlockDay: 41, worldId: 'powerpuff', name: 'HIM', image: require('../characters/powerpuff_girls/pngwing.com(10).png') },
];

export const getCharacterForStreak = (streak: number): Character | undefined => {
    return CHARACTERS.find(c => c.unlockDay === streak);
};

export const getCurrentWorld = (streak: number): World => {
    // If exact match by range
    const exact = WORLDS.find(w => streak >= w.startDay && (!w.endDay || streak <= w.endDay));
    if (exact) return exact;

    // Fallback: If streak > last world, return last world
    return WORLDS[WORLDS.length - 1];
};

export const getUnlockedCharacters = (currentStreak: number) => {
    return CHARACTERS.filter(c => c.unlockDay <= currentStreak);
};
