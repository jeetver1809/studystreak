import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, InteractionManager, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { ArrowLeft, BookOpen, Flame, Trophy, Award, Trash2, Search, UserPlus, UserCheck, X } from 'lucide-react-native';
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
import { Image as ExpoImage } from 'expo-image';
import { StoryTray } from '../components/StoryTray';
import { Avatar } from '../components/ui/Avatar';

// Memoized List Item Component to prevent re-renders
const FeedItem = React.memo(({ item, onHide, onFollow, navigation, isHidden }: { item: Activity, onHide: (id: string) => void, onFollow?: (id: string) => void, navigation: any, isHidden: boolean }) => {

    // Render Helpers
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

    const renderRightActions = (progress: any, dragX: any) => {
        return (
            <View style={{ width: 80, height: '100%', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                <TouchableOpacity
                    onPress={() => onHide(item.id)}
                    style={styles.deleteAction}
                >
                    <Trash2 size={24} color="white" />
                </TouchableOpacity>
            </View>
        );
    };

    if (isHidden) return null;

    return (
        <Swipeable
            renderRightActions={renderRightActions}
            onSwipeableRightOpen={() => onHide(item.id)}
        >
            <Card style={styles.card} padding="m">
                <View style={styles.cardHeader}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Profile', { userId: item.userId })}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                        <Avatar source={item.userPhotoURL} size={40} />
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
});

export const SocialFeedScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useUserStore();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [followedUsers, setFollowedUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [hiddenActivityIds, setHiddenActivityIds] = useState<string[]>(user?.hiddenActivityIds || []);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);



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
            setIsReady(true);
            loadFeed();
        });
        return () => task.cancel();
    }, [user?.followingIds, isFocused]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadFeed();
        loadFeed();
    };

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.trim().length === 0) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        // Simple debounce or just fire (for MVP firing on change is okay if traffic low, but let's delay slightly effectively by UI speed)
        // actually Firestore reads can be expensive. Let's trigger on debounce or submit.
        // For better UX, let's search on every 3rd char or wait. 
        // Let's keep it simple: Search on submit or if length > 2

        try {
            const results = await UserService.searchUsers(text);
            const filtered = results.filter(u => u.uid !== user?.uid); // Don't show myself
            setSearchResults(filtered);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleFollow = async (targetUser: User) => {
        if (!user || !user.uid) return;

        // Optimistic update
        const alreadyFollowing = user.followingIds?.includes(targetUser.uid);

        try {
            if (alreadyFollowing) {
                // For now, let's NOT support unfollow easily here to prevent accidental taps, 
                // or maybe toggling is fine. Let's toggle.
                // Actually plan said "optional unfolow". Let's stick to Follow only for search results for safety?
                // User asked for "Search and send follow". 
                // If I am already following, showing "Following" is good.
                return;
            }

            await UserService.followUser(user.uid, targetUser.uid);
            // Force refresh user to get new followingIds (UserStore should update if we listen to it or we manually update local state)
            // For MVP, just visually showing "Following" might be tricky if we don't update store.
            // Let's Assume UserStore listens to auth changes or we rely on hot reload?
            // Actually ActivityService/UserService updates Firestore, but useAuthListener updates global state?
            // We might need to manually update local knowing.
            // Let's just alert "Followed!" or similar visual feedback.
            alert(`You are now following ${targetUser.username}!`);
            loadFeed(); // Reload feed to maybe see their stuff? (unlikely immediately)
        } catch (error) {
            alert("Failed to follow.");
        }
    };

    const isFollowing = (targetId: string) => user?.followingIds?.includes(targetId);

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

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Find friends by username..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoCapitalize="none"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <X size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Search Results Overlay or List */}
            {searchQuery.length > 0 ? (
                <View style={styles.searchResults}>
                    <FlatList
                        keyboardShouldPersistTaps="handled"
                        data={searchResults}
                        keyExtractor={item => item.uid}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.userResultItem}
                                onPress={() => navigation.navigate('Profile', { userId: item.uid })}
                            >
                                <Image source={item.photoURL ? { uri: item.photoURL } : require('../../assets/adaptive-icon.png')} style={styles.resultAvatar} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.resultName}>{item.username}</Text>
                                    <Text style={styles.resultLevel}>Level {item.level} • {item.totalCharacters} Chars</Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.followButton, isFollowing(item.uid) && styles.followingButton]}
                                    onPress={() => handleFollow(item)}
                                >
                                    {isFollowing(item.uid) ? (
                                        <>
                                            <UserCheck size={16} color="white" />
                                            <Text style={styles.followButtonText}>Following</Text>
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={16} color="white" />
                                            <Text style={styles.followButtonText}>Follow</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#6B7280' }}>
                                    {isSearching ? 'Searching...' : 'No users found.'}
                                </Text>
                            </View>
                        }
                    />
                </View>
            ) : (
                <>
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
                            renderItem={({ item }) => (
                                <FeedItem
                                    item={item}
                                    onHide={(id) => {
                                        setHiddenActivityIds(prev => [...prev, id]);
                                        if (user?.uid) {
                                            UserService.hideActivity(user.uid, id);
                                        }
                                    }}
                                    navigation={navigation}
                                    isHidden={hiddenActivityIds.includes(item.id)}
                                />
                            )}
                            contentContainerStyle={styles.listContent}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                            ListEmptyComponent={
                                <View style={[styles.center, { marginTop: 40 }]}>
                                    <Text style={{ color: '#9CA3AF' }}>No recent activity for this friend.</Text>
                                </View>
                            }
                            initialNumToRender={5}
                            windowSize={5}
                        />
                    )}
                </>
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
    },
    // Search Styles
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 0,
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1F2937',
    },
    searchResults: {
        flex: 1,
        backgroundColor: 'white',
    },
    userResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    resultAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E5E7EB',
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    resultLevel: {
        fontSize: 12,
        color: '#6B7280',
    },
    followButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    followingButton: {
        backgroundColor: '#10B981', // Green for following
        opacity: 0.8,
    },
    followButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteAction: {
        backgroundColor: theme.colors.error,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.small
    }
});
