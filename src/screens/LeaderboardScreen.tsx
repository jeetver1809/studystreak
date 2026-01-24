import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { db } from '../services/firebaseConfig';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { User } from '../types';
import { Flame, ArrowLeft } from 'lucide-react-native';
import { Skeleton } from '../components/ui/Skeleton';
import { theme } from '../theme/theme';
import { ScreenGradient } from '../components/ui/ScreenGradient';
import { differenceInDays, parseISO } from 'date-fns';
import { Avatar } from '../components/ui/Avatar';
import { getTodayStr } from '../utils/dateUtils';
import { LinearGradient } from 'expo-linear-gradient';

// Memoized Item
const LeaderboardItem = React.memo(({ item, index, navigation }: { item: User, index: number, navigation: any }) => (
    <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Profile', { userId: item.uid })}>
        <Text style={styles.rank}>#{index + 1}</Text>
        <View style={styles.info}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.stats}>{item.totalCharacters} Chars Unlocked</Text>
        </View>
        <View style={styles.streakContainer}>
            <Text style={styles.streak}>{item.longestStreak}</Text>
            <Flame size={16} color="#FF4500" fill="#FF4500" />
        </View>
    </TouchableOpacity>
));

export const LeaderboardScreen = () => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            setIsReady(true);
            fetchLeaderboard();
        });
        return () => task.cancel();
    }, [isFocused]);

    const fetchLeaderboard = async () => {
        try {
            // 1. Query by currentStreak desc, fetch more to allow filtering
            const q = query(
                collection(db, 'users'),
                orderBy('currentStreak', 'desc'),
                limit(50)
            );
            const querySnapshot = await getDocs(q);
            let fetchedUsers: User[] = [];

            const today = new Date();

            querySnapshot.forEach((doc) => {
                const data = doc.data() as User;
                const user = { ...data, uid: data.uid || doc.id };

                // 2. Filter Stale Streaks
                // If lastStudyDate is missing or older than 1 day (yesterday), effective streak is 0
                // unless frozen (though freezing usually sets current to 0 anyway in our logic, but let's be safe)
                let effectiveStreak = user.currentStreak || 0;

                if (user.lastStudyDate) {
                    const lastDate = parseISO(user.lastStudyDate);
                    const diff = differenceInDays(today, lastDate);
                    // allow today (0) and yesterday (1). If 2+, it's stale.
                    if (diff > 1) {
                        effectiveStreak = 0;
                    }
                } else {
                    effectiveStreak = 0;
                }

                // Update the object for display
                user.currentStreak = effectiveStreak;

                // Only include if streak > 0 for leaderboard? Or just include all?
                // Usually leaderboards show non-zero.
                if (effectiveStreak > 0) {
                    fetchedUsers.push(user);
                }
            });

            // 3. Sort again in memory just in case filtering changed order (e.g. some dropped to 0)
            fetchedUsers.sort((a, b) => b.currentStreak - a.currentStreak);

            // 4. Take top 20
            setUsers(fetchedUsers.slice(0, 20));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isReady || (loading && users.length === 0)) {
        return (
            <SafeAreaView style={styles.container}>
                <ScreenGradient />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
                        <ArrowLeft size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Global Leaderboard</Text>
                </View>
                <View style={styles.list}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <View key={i} style={styles.row}>
                            <Skeleton width={30} height={20} borderRadius={4} style={{ marginRight: 10 }} />
                            <View style={styles.info}>
                                <Skeleton width={120} height={20} borderRadius={4} />
                                <Skeleton width={80} height={14} borderRadius={4} style={{ marginTop: 6 }} />
                            </View>
                            <Skeleton width={40} height={24} borderRadius={4} />
                        </View>
                    ))}
                </View>
            </SafeAreaView>
        );
    }



    return (
        <SafeAreaView style={styles.container}>
            <ScreenGradient />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#333" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.title}>Global Leaderboard</Text>
                    <Text style={styles.subtitle}>Updates daily at 6:00 AM</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* PODIUM SECTION */}
            {!loading && users.length > 0 && (
                <View style={styles.podiumContainer}>
                    {/* Rank 2 (Left) */}
                    {users[1] && <PodiumItem user={users[1]} rank={2} />}

                    {/* Rank 1 (Center) */}
                    {users[0] && <PodiumItem user={users[0]} rank={1} />}

                    {/* Rank 3 (Right) */}
                    {users[2] && <PodiumItem user={users[2]} rank={3} />}
                </View>
            )}

            <FlatList
                data={users.slice(3)} // List the rest
                renderItem={({ item, index }) => <LeaderboardItem item={item} index={index + 3} navigation={navigation} />}
                keyExtractor={(item, index) => item.uid || index.toString()}
                refreshing={loading}
                onRefresh={fetchLeaderboard}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
};

const PodiumItem = ({ user, rank }: { user: User, rank: number }) => {
    const isFirst = rank === 1;
    const size = isFirst ? 140 : 100;
    const avatarSize = isFirst ? 80 : 60;

    let boxColor = '#E2E8F0'; // Default
    let badgeColor = '#94A3B8';
    if (rank === 1) { boxColor = '#FEF9C3'; badgeColor = '#F59E0B'; } // Gold
    if (rank === 2) { boxColor = '#F1F5F9'; badgeColor = '#64748B'; } // Silver
    if (rank === 3) { boxColor = '#FFF7ED'; badgeColor = '#EA580C'; } // Bronze

    const navigation = useNavigation<any>();

    return (
        <TouchableOpacity
            style={[styles.podiumItem, { marginTop: isFirst ? 0 : 40 }]}
            onPress={() => navigation.navigate('Profile', { userId: user.uid })}
        >
            <View style={[styles.avatarContainer, { borderColor: badgeColor }]}>
                <Avatar source={user.photoURL} size={avatarSize} />
                <View style={[styles.rankBadge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.rankBadgeText}>{rank}</Text>
                </View>
            </View>

            <Text numberOfLines={1} style={[styles.podiumName, isFirst && styles.podiumNameBig]}>
                {user.username || 'User'}
            </Text>

            <View style={styles.streakPill}>
                <Flame size={12} color="#EF4444" fill="#EF4444" />
                <Text style={styles.streakPillText}>{user.currentStreak}</Text>
            </View>

            {/* Podium Box Visual */}
            <LinearGradient
                colors={[boxColor, '#FFFFFF']}
                style={[styles.podiumBox, { height: isFirst ? 140 : 100 }]}
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10
    },
    backButton: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20
    },
    title: { fontSize: 20, fontWeight: '800', color: theme.colors.text.primary },
    subtitle: { fontSize: 12, color: theme.colors.text.secondary, marginTop: 2 },

    // Podium
    podiumContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        marginBottom: 24,
        gap: 12,
    },
    podiumItem: {
        alignItems: 'center',
        width: '30%',
    },
    avatarContainer: {
        marginBottom: 8,
        borderWidth: 3,
        borderRadius: 999,
        padding: 2,
        backgroundColor: 'white',
        position: 'relative'
    },
    rankBadge: {
        position: 'absolute',
        bottom: -8,
        alignSelf: 'center',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white'
    },
    rankBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    podiumName: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 4 },
    podiumNameBig: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
    streakPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'white',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
        marginBottom: -10, // Overlap box
        zIndex: 2,
    },
    streakPillText: { fontSize: 12, fontWeight: 'bold', color: '#334155' },
    podiumBox: {
        width: '100%',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        opacity: 0.8
    },

    list: { padding: 20, paddingTop: 10 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 16,
        ...theme.shadows.small
    },
    rank: { fontSize: 16, fontWeight: '700', width: 30, color: '#94A3B8', textAlign: 'center' },
    info: { flex: 1, marginLeft: 8 },
    username: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
    stats: { fontSize: 11, color: '#64748B' },
    streakContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12
    },
    streak: { fontSize: 14, fontWeight: '700', color: '#EF4444' }
});
