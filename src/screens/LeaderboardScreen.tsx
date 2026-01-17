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

export const LeaderboardScreen = () => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            // Tiny delay for smooth transition
            setTimeout(() => {
                setIsReady(true);
                fetchLeaderboard();
            }, 50);
        });
        return () => task.cancel();
    }, [isFocused]);

    const fetchLeaderboard = async () => {
        try {
            const q = query(
                collection(db, 'users'),
                orderBy('longestStreak', 'desc'),
                limit(20)
            );
            const querySnapshot = await getDocs(q);
            const fetchedUsers: User[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as User;
                // Ensure UID is present using the document ID if missing in data
                fetchedUsers.push({ ...data, uid: data.uid || doc.id });
            });
            setUsers(fetchedUsers);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isReady || (loading && users.length === 0)) {
        return (
            <SafeAreaView style={styles.container}>
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

    const renderItem = ({ item, index }: { item: User, index: number }) => (
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
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
                    <ArrowLeft size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Global Leaderboard</Text>
            </View>
            <FlatList
                data={users}
                renderItem={renderItem}
                keyExtractor={(item, index) => item.uid || index.toString()}
                refreshing={loading}
                onRefresh={fetchLeaderboard}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold' },
    list: { padding: 20 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    rank: { fontSize: 18, fontWeight: 'bold', width: 40, color: '#888' },
    info: { flex: 1 },
    username: { fontSize: 16, fontWeight: '600' },
    stats: { fontSize: 12, color: '#888' },
    streakContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    streak: { fontSize: 18, fontWeight: 'bold', color: '#333' }
});
