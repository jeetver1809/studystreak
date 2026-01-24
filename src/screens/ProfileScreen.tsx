import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Edit2, Users, Trophy, Camera, Check, Star, UserCheck } from 'lucide-react-native';
import { CharacterProgressionService } from '../services/CharacterProgressionService';

import { theme } from '../theme/theme';
import { useUserStore } from '../store/userStore';
import { AuthService } from '../services/authService';
import { db } from '../services/firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { CloudinaryService } from '../services/cloudinaryService';
import { SocialService } from '../services/socialService';
import { StreakService } from '../services/streakService';
import { ContributionGraph } from '../components/ContributionGraph';
import { LinearGradient } from 'expo-linear-gradient';

import { ScreenGradient } from '../components/ui/ScreenGradient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';

// Extend AuthService or add helper here to fetch ANY user
const fetchUserProfile = async (uid: string) => {
    const d = await getDoc(doc(db, 'users', uid));
    return d.exists() ? d.data() : null;
};

export const ProfileScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user: currentUser } = useUserStore();

    // Params: userId to view. If null, view Self.
    const targetUserId = route.params?.userId || currentUser?.uid;
    const isSelf = currentUser?.uid === targetUserId;

    const [profileUser, setProfileUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // Edit Fields
    const [newBio, setNewBio] = useState("");
    const [uploading, setUploading] = useState(false);

    // Follow Logic
    const [isFollowing, setIsFollowing] = useState(false);
    const [followingLoading, setFollowingLoading] = useState(false);

    // Heatmap Data
    const [studyHistory, setStudyHistory] = useState<Record<string, number>>({});
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (currentUser?.followingIds?.includes(targetUserId)) {
            setIsFollowing(true);
        } else {
            setIsFollowing(false);
        }
    }, [currentUser?.followingIds, targetUserId]);

    useEffect(() => {
        loadProfile();
        loadHistory();
    }, [targetUserId]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([loadProfile(), loadHistory()]);
        setRefreshing(false);
    };

    const loadHistory = async () => {
        try {
            const history = await StreakService.getStudyHistory(targetUserId);
            setStudyHistory(history);
        } catch (e) {
            console.error("Failed to load history", e);
        }
    };

    const loadProfile = async () => {
        setIsLoading(true);
        if (isSelf) {
            setProfileUser(currentUser);
            setNewBio(currentUser?.bio || "");
        } else {
            const data = await fetchUserProfile(targetUserId);
            setProfileUser(data);
        }
        setIsLoading(false);
    };



    const handlePickImage = async () => {
        if (!isSelf) return;

        // Ask perm
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Needed", "We need access to your photos to upload a profile picture.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        setUploading(true);
        try {
            // Upload to Cloudinary
            const downloadUrl = await CloudinaryService.uploadImage(uri);

            if (downloadUrl) {
                // Save URL to Firestore
                await updateDoc(doc(db, 'users', currentUser!.uid), {
                    photoURL: downloadUrl
                });

                // Manually update local state
                setProfileUser({ ...profileUser, photoURL: downloadUrl });
                Alert.alert("Success", "Profile picture updated!");
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Failed to upload image.");
        } finally {
            setUploading(false);
        }
    };

    const handleSaveBio = async () => {
        try {
            await updateDoc(doc(db, 'users', currentUser!.uid), {
                bio: newBio
            });
            setProfileUser({ ...profileUser, bio: newBio });
            setIsEditing(false);
        } catch (e: any) {
            Alert.alert("Error", e.message);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </SafeAreaView>
        );
    }

    if (!profileUser) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={{ color: 'white', textAlign: 'center', marginTop: 20 }}>User not found.</Text>
            </SafeAreaView>
        );
    }

    // Default Avatar logic moved to Avatar component



    const handleToggleFollow = async () => {
        if (followingLoading) return;
        setFollowingLoading(true);
        try {
            let success;
            if (isFollowing) {
                success = await SocialService.unfollowUser(currentUser!.uid, targetUserId);
                if (success) setIsFollowing(false);
            } else {
                success = await SocialService.followUser(currentUser!.uid, targetUserId);
                if (success) setIsFollowing(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setFollowingLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScreenGradient />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                {isSelf && !isEditing && (
                    <TouchableOpacity onPress={() => setIsEditing(true)}>
                        <Edit2 size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                )}
                {isSelf && isEditing && (
                    <TouchableOpacity onPress={handleSaveBio}>
                        <Check size={24} color={theme.colors.success} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Profile Image */}
                <View style={styles.imageContainer}>
                    <Avatar source={profileUser.photoURL} size={120} style={styles.avatar} />
                    {isSelf && (
                        <TouchableOpacity style={styles.cameraButton} onPress={handlePickImage} disabled={uploading}>
                            {uploading ? <ActivityIndicator size="small" color="white" /> : <Camera size={20} color="white" />}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Name & Title */}
                <View style={styles.infoContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <Text style={styles.name}>{profileUser.username}</Text>
                        {/* Example verification or badge */}
                        {(profileUser.currentStreak > 10) && <Trophy size={16} color={theme.colors.warning} />}
                    </View>

                    {isEditing ? (
                        <TextInput
                            style={styles.bioInput}
                            value={newBio}
                            onChangeText={setNewBio}
                            placeholder="Write your bio..."
                            placeholderTextColor="#666"
                            multiline
                            maxLength={150}
                        />
                    ) : (
                        <Text style={styles.bio}>
                            {profileUser.bio || "No bio yet."}
                        </Text>
                    )}
                </View>

                {/* Stats Row */}
                {/* Stats Row */}
                <View style={styles.statsGrid}>
                    {/* Row 1: Social */}
                    <View style={styles.statsRow}>
                        <TouchableOpacity
                            style={styles.statCard}
                            onPress={() => navigation.navigate('UserList', {
                                userId: profileUser.uid,
                                type: 'followers',
                                title: 'Followers'
                            })}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                                <Users size={20} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.statValue}>{profileUser.followersIds?.length ?? profileUser.followersCount ?? 0}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.statCard}
                            onPress={() => navigation.navigate('UserList', {
                                userId: profileUser.uid,
                                type: 'following',
                                title: 'Following'
                            })}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
                                <UserCheck size={20} color={theme.colors.success} />
                            </View>
                            <Text style={styles.statValue}>
                                {profileUser.followingIds?.length || 0}
                            </Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Row 2: Progress */}
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
                                <Star size={20} color="#3B82F6" fill="#3B82F6" />
                            </View>
                            <Text style={styles.statValue}>
                                {CharacterProgressionService.calculateLevel((profileUser.totalStudyMinutes || 0) * 10)}
                            </Text>
                            <Text style={styles.statLabel}>Level</Text>
                        </View>

                        <View style={styles.statCard}>
                            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                                <Trophy size={20} color="#D97706" />
                            </View>
                            <Text style={styles.statValue}>{profileUser.longestStreak}</Text>
                            <Text style={styles.statLabel}>Highest Streak</Text>
                        </View>
                    </View>
                </View>

                {/* Heatmap Section */}
                <View style={{ marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.xs }}>
                    <ContributionGraph data={studyHistory} />
                </View>

                {/* Action Button */}
                {!isSelf && (
                    <Button
                        title={isFollowing ? "Following" : "Follow"}
                        onPress={handleToggleFollow}
                        style={styles.actionButton}
                        variant={isFollowing ? "secondary" : "gradient"}
                        loading={followingLoading}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background, // Slightly gray background for contrast with white cards
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: theme.spacing.m,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 20,
    },
    content: {
        paddingBottom: 60,
        paddingTop: 20, // Add top padding to create space
        alignItems: 'center',
    },
    imageContainer: {
        marginBottom: 16, // Remove negative margin to prevent clipping
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    avatar: {
        borderWidth: 4,
        borderColor: 'white',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.primary,
        padding: 8,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: 'white',
        elevation: 4,
    },
    infoContainer: {
        width: '100%',
        paddingHorizontal: theme.spacing.xl,
        alignItems: 'center',
        marginBottom: 24,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        textAlign: 'center',
    },
    bio: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
        maxWidth: '80%',
    },
    bioInput: {
        fontSize: 14,
        color: theme.colors.text.primary,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.primary,
        width: '80%',
        textAlign: 'center',
        marginTop: 8,
        paddingBottom: 4,
    },
    statsGrid: {
        width: '100%',
        paddingHorizontal: theme.spacing.l,
        marginBottom: 8,
        gap: 12,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: '600',
        textAlign: 'center', // Fix for multi-line text alignment
    },
    actionButton: {
        marginTop: 24,
        alignSelf: 'center',
        width: 160,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    }
});
