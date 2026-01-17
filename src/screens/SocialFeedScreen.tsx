import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { ArrowLeft, BookOpen, Flame, Trophy, Award, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { theme } from '../theme/theme';
import { useUserStore } from '../store/userStore';
import { ActivityService } from '../services/activityService';
import { Activity } from '../types';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';

import { UserService } from '../services/userService';
import { User } from '../types';
import { StoryTray } from '../components/StoryTray';

export const SocialFeedScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useUserStore();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [followedUsers, setFollowedUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hiddenActivityIds, setHiddenActivityIds] = useState<string[]>(user?.hiddenActivityIds || []);



    const [isReady, setIsReady] = useState(false);
    const isFocused = useIsFocused();

    const loadFeed = async () => {
        if (!user?.followingIds || user.followingIds.length === 0) {
            setActivities([]);
            setFollowedUsers([]);
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            // Parallel fetch: Activities + User profiles for tray
            const [feedData, usersData] = await Promise.all([
                ActivityService.getFeed(user.followingIds),
                UserService.getUsersByIds(user.followingIds)
            ]);

            setActivities(feedData);
            setFollowedUsers(usersData);
        } catch (error: any) {
            console.error("Feed Load Error:", error);
            if (error?.code === 'failed-precondition') {
                console.warn("MISSING INDEX: Check console logic");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            // Tiny delay for smooth transition
            setTimeout(() => {
                setIsReady(true);
                loadFeed();
            }, 50);
        });
        return () => task.cancel();
    }, [user?.followingIds, isFocused]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadFeed();
    };

    if (!isReady || (loading && !refreshing)) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={['#FFFFFF', '#F3F4F6']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Social Feed</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Skeleton Story Tray */}
                <View style={[styles.trayContainer, { padding: 16, flexDirection: 'row', gap: 12 }]}>
                    <Skeleton width={56} height={56} borderRadius={28} />
                    <Skeleton width={56} height={56} borderRadius={28} />
                    <Skeleton width={56} height={56} borderRadius={28} />
                    <Skeleton width={56} height={56} borderRadius={28} />
                </View>

                {/* Skeleton Feed List */}
                <View style={styles.listContent}>
                    {[1, 2, 3].map(i => (
                        <View key={i} style={[styles.card, { padding: 16, backgroundColor: 'white', borderRadius: 16, marginBottom: 12 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <Skeleton width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
                                <View style={{ gap: 6 }}>
                                    <Skeleton width={120} height={16} />
                                    <Skeleton width={80} height={12} />
                                </View>
                            </View>
                            <Skeleton width="100%" height={24} style={{ marginLeft: 50 }} />
                        </View>
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    const handleSelectUser = (id: string | null) => {
        setSelectedUserId(id);
    };

    const filteredActivities = (selectedUserId
        ? activities.filter(a => a.userId === selectedUserId)
        : activities).filter(a => !hiddenActivityIds.includes(a.id));

    const renderActivityIcon = (type: Activity['type']) => {
        switch (type) {
            case 'session_completed': return <BookOpen size={20} color={theme.colors.success} />;
            case 'streak_repaired': return <Flame size={20} color={theme.colors.error} />;
            case 'level_up': return <Trophy size={20} color={theme.colors.primary} />;
            default: return <Award size={20} color={theme.colors.warning} />;
        }
    };

    const renderActivityText = (item: Activity) => {
        switch (item.type) {
            case 'session_completed':
                if (item.data.durationSeconds && item.data.durationSeconds < 60) {
                    return `studied for ${Math.floor(item.data.durationSeconds)} seconds! ⚡`;
                }
                const mins = item.data.durationMinutes || 0;
                if (mins === 0 && !item.data.durationSeconds) {
                    return `studied for less than a minute! ⚡`;
                }
                return `studied for ${mins} minutes! 📚`;
            case 'streak_repaired':
                return `repaired their ${item.data.streakCount} day streak! 🔥`;
            case 'level_up':
                return `unlocked ${item.data.characterName}! 🥚`;
            default:
                return 'did something cool!';
        }
    };

    const renderRightActions = (progress: any, dragX: any, itemId: string) => {
        return (
            <View style={{ width: 80, height: '100%', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                <TouchableOpacity
                    onPress={() => {
                        setHiddenActivityIds(prev => [...prev, itemId]);
                        if (user?.uid) {
                            UserService.hideActivity(user.uid, itemId);
                        }
                    }}
                    style={{
                        backgroundColor: theme.colors.error,
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        justifyContent: 'center',
                        alignItems: 'center',
                        ...theme.shadows.small
                    }}
                >
                    <Trash2 size={24} color="white" />
                </TouchableOpacity>
            </View>
        );
    };

    const renderItem = ({ item }: { item: Activity }) => (
        <Swipeable
            renderRightActions={(p, d) => renderRightActions(p, d, item.id)}
            onSwipeableRightOpen={() => {
                setHiddenActivityIds(prev => [...prev, item.id]);
                if (user?.uid) {
                    UserService.hideActivity(user.uid, item.id);
                }
            }}
        >
            <Card style={styles.card} padding="m">
                <View style={styles.cardHeader}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Profile', { userId: item.userId })}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                        <Image
                            source={item.userPhotoURL ? { uri: item.userPhotoURL } : require('../../assets/adaptive-icon.png')}
                            style={styles.avatar}
                        />
                        <View>
                            <Text style={styles.username}>{item.username}</Text>
                            <Text style={styles.timestamp}>{item.createdAt.toDate().toLocaleDateString()}</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.background }]}>
                        {renderActivityIcon(item.type)}
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.activityText}>
                        {renderActivityText(item)}
                    </Text>
                </View>
            </Card>
        </Swipeable>
    );

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#FFFFFF', '#F3F4F6']}
                style={StyleSheet.absoluteFill}
            />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Social Feed</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Story Tray */}
            {!loading && followedUsers.length > 0 && (
                <View style={styles.trayContainer}>
                    <StoryTray
                        users={followedUsers}
                        selectedId={selectedUserId}
                        onSelect={handleSelectUser}
                    />
                </View>
            )}

            {/* Content */}
            {activities.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>No activity yet.</Text>
                    <Text style={styles.emptySubText}>Follow more people to see their updates!</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredActivities}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                    ListEmptyComponent={
                        <View style={[styles.center, { marginTop: 40 }]}>
                            <Text style={{ color: '#9CA3AF' }}>No recent activity for this friend.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    backButton: {
        padding: 4,
    },
    title: {
        ...theme.text.h2,
        color: theme.colors.text.primary,
    },
    trayContainer: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    listContent: {
        padding: theme.spacing.m,
        gap: theme.spacing.m,
    },
    card: {
        marginBottom: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.s,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eee',
    },
    username: {
        ...theme.text.h3,
        fontSize: 16,
        color: theme.colors.text.primary,
    },
    timestamp: {
        ...theme.text.caption,
        color: theme.colors.text.secondary,
    },
    iconContainer: {
        padding: 8,
        borderRadius: 20,
    },
    cardBody: {
        marginTop: 4,
        paddingLeft: 50, // Align with text
    },
    activityText: {
        ...theme.text.body,
        color: theme.colors.text.primary,
        fontSize: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    emptyText: {
        ...theme.text.h2,
        color: theme.colors.text.secondary,
        textAlign: 'center',
    },
    emptySubText: {
        ...theme.text.body,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginTop: 8,
    }
});
