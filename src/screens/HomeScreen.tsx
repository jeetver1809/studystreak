import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image, Platform, TextInput, LayoutAnimation, UIManager, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur'; // Glass Effect
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing, runOnJS, interpolate, Extrapolation } from 'react-native-reanimated';
import { GestureDetector, Gesture, TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler'; // Use GH Touchable for Drawer
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Users, Trophy, Menu, X, BarChart2, Book, Sword, Flame, ChevronRight, Play, Edit2, Star, Zap } from 'lucide-react-native';
import { useUserStore } from '../store/userStore';
import { CharacterDisplay } from '../components/CharacterDisplay';
import { getMotivationalMessage, isStudyCompletedToday, getTodayStr } from '../utils/dateUtils';
import { CharacterProgressionService } from '../services/CharacterProgressionService';
import { WORLDS } from '../utils/characters';
import { theme } from '../theme/theme';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Coins, AlertTriangle } from 'lucide-react-native';
import { StreakService } from '../services/streakService';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export const HomeScreen = () => {
    const { user, updateUser } = useUserStore();
    const navigation = useNavigation<any>();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false); // Restore State
    const [isEditGoalVisible, setIsEditGoalVisible] = React.useState(false);
    const [showCoinInfo, setShowCoinInfo] = React.useState(false); // New State
    const [isLevelExpanded, setIsLevelExpanded] = React.useState(false); // Header Level
    const [newGoal, setNewGoal] = React.useState('');
    const insets = useSafeAreaInsets(); // Get safe area insets

    // Reanimated Shared Values
    const translateX = useSharedValue(-DRAWER_WIDTH);
    const scrollY = useSharedValue(0);

    // Gestures
    const panGesture = Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-20, 20])
        .onUpdate((event) => {
            const newVal = isMenuOpen ? event.translationX : -DRAWER_WIDTH + event.translationX;
            translateX.value = Math.max(-DRAWER_WIDTH, Math.min(0, newVal));
        })
        .onEnd((event) => {
            if (translateX.value > -DRAWER_WIDTH / 2 || event.velocityX > 500) {
                translateX.value = withSpring(0, { damping: 20, stiffness: 90 }, () => {
                    runOnJS(setIsMenuOpen)(true);
                });
            } else {
                translateX.value = withTiming(-DRAWER_WIDTH, { duration: 300, easing: Easing.out(Easing.exp) }, () => {
                    runOnJS(setIsMenuOpen)(false);
                });
            }
        });

    const toggleMenu = () => {
        if (isMenuOpen) {
            translateX.value = withTiming(-DRAWER_WIDTH, { duration: 300, easing: Easing.out(Easing.exp) }, () => {
                runOnJS(setIsMenuOpen)(false);
            });
        } else {
            setIsMenuOpen(true);
            requestAnimationFrame(() => {
                translateX.value = withSpring(0, { damping: 20, stiffness: 90 });
            });
        }
    };

    const animatedDrawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    // Header Styles
    const HEADER_HEIGHT = 60; // Fixed content height
    const headerTopPadding = insets.top;
    const totalHeaderHeight = HEADER_HEIGHT + headerTopPadding;

    const animatedHeaderStyle = useAnimatedStyle(() => {
        const opacity = interpolate(scrollY.value, [0, 50], [0, 1], Extrapolation.CLAMP);
        return {
            // Background is handled by BlurView, container is just for structure/border
            backgroundColor: 'transparent',
            borderBottomColor: `rgba(229, 231, 235, ${opacity})`,
            borderBottomWidth: opacity > 0 ? 1 : 0,
            paddingTop: headerTopPadding, // Padding for status bar
            height: totalHeaderHeight,
        };
    });

    const confettiRef = React.useRef<any>(null);

    const handleRepairStreak = async () => {
        if (!user) return;
        try {
            const success = await StreakService.repairStreak(user.uid);
            if (success) {
                confettiRef.current?.start();
                alert("Streak Repaired! 🔥");
            }
        } catch (e: any) {
            alert(e.message);
        }
    };

    if (!user) return null;

    const completedToday = React.useMemo(() => isStudyCompletedToday(user.lastStudyDate), [user.lastStudyDate]);
    const activeCharacter = React.useMemo(() => CharacterProgressionService.getActiveCharacter(user.currentStreak), [user.currentStreak]);
    const levelProgress = React.useMemo(() => CharacterProgressionService.getLevelProgress(user.characterXP?.[activeCharacter.id] || 0), [user.characterXP, activeCharacter]);
    const activeWorld = React.useMemo(() => WORLDS.find(w => w.id === activeCharacter?.worldId) || WORLDS[0], [activeCharacter]);
    const motivationalMsg = React.useMemo(() => getMotivationalMessage(user.currentStreak), [user.currentStreak]);

    // Sync Today's Minutes if missing (Backfill fix)
    React.useEffect(() => {
        const checkAndSync = async () => {
            const today = getTodayStr(); // Local YYYY-MM-DD
            // Should sync if it's the same day, regardless of current value, to ensure consistency
            if (user.lastStudyDate === today) {
                console.log("Syncing Today's Minutes from history...");
                const result = await StreakService.syncTodayProgress(user.uid);
                updateUser({
                    todayStudyMinutes: result.today,
                    totalStudyMinutes: result.total
                });
            }
        };
        checkAndSync();
    }, [user.uid, user.lastStudyDate]);

    // Retroactive XP Sync
    React.useEffect(() => {
        if (user) {
            CharacterProgressionService.syncXPWithHistory(user).then((update) => {
                if (update) {
                    console.log("[HomeScreen] XP Synced. Updating local user...");
                    updateUser(update);
                }
            });
        }
    }, [user?.totalStudyMinutes]);

    return (
        <GestureDetector gesture={panGesture}>
            <View style={styles.mainContainer}>
                {/* Background */}
                <LinearGradient
                    colors={['#F0F4FF', '#FFFFFF', '#F5F3FF']}
                    locations={[0, 0.4, 1]}
                    style={StyleSheet.absoluteFill}
                />

                <View style={{ position: 'absolute', top: -100, left: 0, zIndex: 100 }} pointerEvents="none">
                    <ConfettiCannon
                        count={200}
                        origin={{ x: -10, y: 0 }}
                        autoStart={false}
                        ref={confettiRef}
                        fadeOut={true}
                    />
                </View>
                {/* Brain Coin Overlay */}
                {showCoinInfo && (
                    <View style={[StyleSheet.absoluteFill, styles.modalOverlay]}>
                        <View style={styles.modalCard}>
                            <View style={styles.coinImageContainer}>
                                <Image
                                    source={require('../images/brain_coin.png')}
                                    style={styles.coinImage}
                                    resizeMode="contain"
                                />
                            </View>

                            <Text style={styles.coinModalTitle}>Brain Coins</Text>

                            <Text style={styles.coinDescription}>
                                Earn coins by staying focused! You get <Text style={{ fontWeight: '700', color: theme.colors.primary }}>1 coin</Text> for every minute you study.
                            </Text>

                            <View style={styles.coinUsageList}>
                                <View style={styles.coinUsageItem}>
                                    <View style={[styles.usageIcon, { backgroundColor: '#FEE2E2' }]}>
                                        <Flame size={16} color="#EF4444" fill="#EF4444" />
                                    </View>
                                    <Text style={styles.usageText}>Repair broken streaks (400 coins)</Text>
                                </View>
                                <View style={styles.coinUsageItem}>
                                    <View style={[styles.usageIcon, { backgroundColor: '#FEF3C7' }]}>
                                        <Users size={16} color="#D97706" />
                                    </View>
                                    <Text style={styles.usageText}>Unlock special characters (Soon)</Text>
                                </View>
                            </View>

                            <Button
                                title="Got it!"
                                onPress={() => setShowCoinInfo(false)}
                                size="m"
                                style={{ width: '100%', marginTop: 24 }}
                            />
                        </View>
                    </View>
                )}

                {/* Absolute Header */}
                <Animated.View style={[styles.header, animatedHeaderStyle]}>
                    <AnimatedBlurView
                        intensity={Platform.OS === 'android' ? 70 : 80}
                        tint="light"
                        experimentalBlurMethod="dimezisBlurView"
                        style={[StyleSheet.absoluteFill, useAnimatedStyle(() => ({
                            opacity: interpolate(scrollY.value, [0, 50], [0, 1], Extrapolation.CLAMP),
                            // More translucent fallback for that "Glass" feel
                            backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.5)' : 'transparent'
                        }))]}
                    />
                    {/* Left Side: Hambuger + Level */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={toggleMenu} style={styles.iconButton}>
                            <Menu size={24} color={theme.colors.text.primary} />
                        </TouchableOpacity>

                        {/* Level Indicator (Moved & Resized) */}
                        <TouchableOpacity
                            style={[styles.statBadge, isLevelExpanded && styles.statBadgeExpanded]}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setIsLevelExpanded(!isLevelExpanded);
                            }}
                            activeOpacity={0.7}
                        >
                            <Star size={16} color="#3B82F6" fill="#3B82F6" />
                            <Text style={styles.statText}>Lvl {levelProgress.currentLevel}</Text>

                            {isLevelExpanded && (
                                <View style={styles.xpContainer}>
                                    <View style={styles.xpBarBg}>
                                        <View style={[styles.xpBarFill, { width: `${levelProgress.progressPercent}%` }]} />
                                    </View>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.headerRight}>



                        <TouchableOpacity
                            onPress={() => setShowCoinInfo(true)}
                            style={styles.statBadge}
                        >
                            <Coins size={16} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.statText}>{user.coins || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileBadge}>
                            {user.photoURL ? (
                                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                                    <Users size={14} color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Content */}
                <Animated.ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.content, { paddingTop: totalHeaderHeight + 20 }]} // Add padding for header
                    onScroll={(e) => { scrollY.value = e.nativeEvent.contentOffset.y; }}
                    scrollEventThrottle={16}
                >
                    <View style={styles.heroSection}>
                        <LinearGradient
                            colors={theme.gradients.primary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroCard}
                        >
                            <View style={styles.heroBackgroundDecor}>
                                <Flame size={200} color="rgba(255,255,255,0.1)" absoluteStrokeWidth={false} />
                            </View>

                            <View style={styles.heroContent}>
                                <View style={styles.streakInfo}>
                                    <View style={styles.streakIconContainer}>
                                        <Flame size={32} color="#EF4444" fill="#EF4444" />
                                    </View>
                                    <View>
                                        <Text style={styles.heroLabel}>Current Streak</Text>
                                        <Text style={styles.heroValue}>{user.currentStreak}</Text>
                                    </View>
                                </View>

                                <View style={styles.dailyGoalContainer}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={styles.dailyGoalText}>
                                            Today: {Math.floor(user.todayStudyMinutes || 0)}m {Math.round(((user.todayStudyMinutes || 0) % 1) * 60)}s / {user.targetDurationMinutes || 30}m
                                        </Text>
                                        <TouchableOpacity onPress={() => setIsEditGoalVisible(true)} style={{ padding: 4 }}>
                                            <Edit2 size={14} color="rgba(255,255,255,0.8)" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.progressBarBg}>
                                        <View style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${Math.min(100, ((user.todayStudyMinutes || 0) / (user.targetDurationMinutes || 30)) * 100)}%`,
                                                backgroundColor: (user.todayStudyMinutes || 0) >= (user.targetDurationMinutes || 30) ? '#10B981' : '#FFF'
                                            }
                                        ]} />
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Streak Repair Alert */}
                    {user.frozenStreak ? (
                        <View style={styles.alertWrapper}>
                            <View style={styles.repairContainer}>
                                <View style={styles.repairInfo}>
                                    <AlertTriangle size={24} color="#EF4444" />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={styles.repairTitle}>Streak Frozen!</Text>
                                        <Text style={styles.repairSubtitle}>Recover {user.frozenStreak} days for 400 coins</Text>
                                    </View>
                                </View>
                                <Button
                                    title="Repair"
                                    onPress={handleRepairStreak}
                                    size="s"
                                    variant="danger"
                                    style={{ paddingHorizontal: 16 }}
                                />
                            </View>
                        </View>
                    ) : null}

                    {/* Character Stage */}
                    <View style={styles.stageSection}>
                        <Text style={styles.sectionTitle}>Your Companion</Text>
                        <View style={[styles.stageCard, { borderColor: `${activeWorld.primaryColor}40` }]}>
                            <LinearGradient
                                colors={[`${activeWorld.primaryColor}15`, '#FFFFFF']}
                                style={styles.stageBackground}
                            />
                            <View style={[styles.spotlight, { backgroundColor: `${activeWorld.primaryColor}10` }]} />

                            <View style={styles.characterWrapper}>
                                <CharacterDisplay character={activeCharacter} size={140} />
                            </View>

                            <View style={[styles.quoteBubble, { backgroundColor: `${activeWorld.primaryColor}10` }]}>
                                <Text style={[styles.quoteText, { color: theme.colors.text.primary }]}>"{motivationalMsg}"</Text>
                                <View style={[styles.quoteArrow, { backgroundColor: `${activeWorld.primaryColor}10` }]} />
                            </View>

                            <View style={styles.characterInfo}>
                                <Text style={styles.characterName}>{activeCharacter?.name || activeCharacter?.id}</Text>
                                <View
                                    style={[styles.characterBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                                >
                                    <Star size={12} color="#3B82F6" fill="#3B82F6" />
                                    <Text style={styles.characterBadgeText}>
                                        Lvl {CharacterProgressionService.calculateLevel(user.characterXP?.[activeCharacter.id] || 0)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Quick Stats Grid */}
                    <View style={styles.statsGrid}>
                        <TouchableOpacity
                            style={styles.statCard}
                            onPress={() => navigation.navigate('Analytics')}
                        >
                            <View style={[styles.statIcon, { backgroundColor: '#E0E7FF' }]}>
                                <BarChart2 size={20} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.statValue}>
                                {(user.totalStudyMinutes || 0) > 60
                                    ? `${Math.floor((user.totalStudyMinutes || 0) / 60)}h ${Math.floor((user.totalStudyMinutes || 0) % 60)}m`
                                    : `${Math.floor(user.totalStudyMinutes || 0)}m ${Math.round(((user.totalStudyMinutes || 0) % 1) * 60)}s`
                                }
                            </Text>
                            <Text style={styles.statLabel}>Total Time</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.statCard}
                            onPress={() => navigation.navigate('Party')}
                        >
                            <View style={[styles.statIcon, { backgroundColor: '#FFEEF2' }]}>
                                <Book size={20} color={theme.colors.accent} />
                            </View>
                            <Text style={styles.statValue}>{(user.unlockedCharacterIds || []).length}</Text>
                            <Text style={styles.statLabel}>Characters</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 100 + insets.bottom }} />
                </Animated.ScrollView>

                {/* Floating Action Button */}
                <View style={styles.fabContainer}>
                    <TouchableOpacity
                        style={[styles.playButton, completedToday && styles.playButtonCompleted]}
                        onPress={() => navigation.navigate('StudySession')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={completedToday ? ['#10B981', '#059669'] : theme.gradients.primary}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {completedToday ? (
                                <>
                                    <Zap size={24} color="#FFF" fill="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.playButtonText}>Study Extra</Text>
                                </>
                            ) : (
                                <>
                                    <Play size={24} color="#FFF" fill="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.playButtonText}>Start Session</Text>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Edit Goal Modal */}
                {
                    isEditGoalVisible && (
                        <View style={styles.backdrop} pointerEvents="auto">
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Set Daily Goal</Text>
                                <Text style={styles.modalSubtitle}>How many minutes do you want to study daily?</Text>

                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 30"
                                    keyboardType="numeric"
                                    value={newGoal}
                                    onChangeText={setNewGoal}
                                    autoFocus
                                />

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => setIsEditGoalVisible(false)}
                                    >
                                        <Text style={styles.buttonTextSecondary}>Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.saveButton}
                                        onPress={async () => {
                                            const mins = parseInt(newGoal);
                                            if (mins > 0 && user) {
                                                await updateDoc(doc(db, 'users', user.uid), { targetDurationMinutes: mins });
                                                // Optimistic update
                                                updateUser({ targetDurationMinutes: mins });
                                                setIsEditGoalVisible(false);
                                                setNewGoal('');
                                            } else {
                                                alert("Please enter a valid number");
                                            }
                                        }}
                                    >
                                        <Text style={styles.buttonTextPrimary}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )
                }

                {/* Side Menu Overlay */}
                {
                    isMenuOpen && (
                        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                            <TouchableOpacity
                                style={styles.backdrop}
                                activeOpacity={1}
                                onPress={toggleMenu}
                            />

                            <Animated.View style={[styles.drawer, animatedDrawerStyle]}>
                                <SafeAreaView style={{ flex: 1 }}>
                                    <View style={styles.drawerHeader}>
                                        <Text style={styles.drawerTitle}>Menu</Text>
                                        <TouchableOpacity onPress={toggleMenu} style={styles.closeButton}>
                                            <X size={24} color={theme.colors.text.primary} />
                                        </TouchableOpacity>
                                    </View>

                                    <ScrollView contentContainerStyle={styles.drawerContent}>
                                        <DrawerItem icon={Users} label="Social Feed" color={theme.colors.success} onPress={() => { toggleMenu(); navigation.navigate('SocialFeed'); }} />
                                        <DrawerItem icon={Book} label="Subjects" color={theme.colors.primary} onPress={() => { toggleMenu(); navigation.navigate('Subjects'); }} />
                                        <DrawerItem icon={BarChart2} label="Analytics" color={theme.colors.primary} onPress={() => { toggleMenu(); navigation.navigate('Analytics'); }} />
                                        <DrawerItem icon={Sword} label="Characters" color={theme.colors.accent} onPress={() => { toggleMenu(); navigation.navigate('Party'); }} />
                                        <DrawerItem icon={Trophy} label="Leaderboard" color={theme.colors.warning} onPress={() => { toggleMenu(); navigation.navigate('Leaderboard'); }} />
                                        <View style={styles.divider} />
                                        <DrawerItem icon={Settings} label="Settings" color={theme.colors.text.secondary} onPress={() => { toggleMenu(); navigation.navigate('Settings'); }} />
                                    </ScrollView>
                                </SafeAreaView>
                            </Animated.View>
                        </View>
                    )
                }
            </View >
        </GestureDetector >
    );
};

const DrawerItem = ({ icon: Icon, label, color, onPress }: any) => (
    <GHTouchableOpacity
        style={styles.drawerItem}
        onPress={() => {
            // Instant feedback
            requestAnimationFrame(() => {
                onPress();
            });
        }}
    >
        <View style={[styles.drawerIconBox, { backgroundColor: `${color}15` }]}>
            <Icon size={20} color={color} />
        </View>
        <Text style={styles.drawerItemText}>{label}</Text>
        <ChevronRight size={16} color={theme.colors.text.disabled} style={{ marginLeft: 'auto' }} />
    </GHTouchableOpacity>
);

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        position: 'absolute', // Absolute positioning
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center', // Aligns vertically within the content height
        paddingHorizontal: 20,
        // paddingVertical handled by dynamic height/paddingTop
    },
    iconButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#FFF',
        ...theme.shadows.small,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    coinBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8E6',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    coinText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#D97706',
        marginLeft: 6,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        ...theme.shadows.small,
    },
    statBadgeExpanded: {
        paddingRight: 16,
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    statText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
    },
    xpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 4,
    },
    xpBarBg: {
        width: 60,
        height: 6,
        backgroundColor: '#DBEAFE',
        borderRadius: 3,
        overflow: 'hidden',
    },
    xpBarFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
    },


    profileBadge: {
        padding: 2,
        backgroundColor: '#FFF',
        borderRadius: 20,
        ...theme.shadows.small,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    heroSection: {
        marginBottom: 24,
        ...theme.shadows.medium,
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.25,
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 180,
    },
    heroBackgroundDecor: {
        position: 'absolute',
        right: -40,
        top: -20,
        opacity: 0.5,
    },
    heroContent: {
        flex: 1,
        justifyContent: 'space-between',
    },
    streakInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    streakIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    heroLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    heroValue: {
        fontSize: 42,
        fontWeight: '800',
        color: '#FFF',
        lineHeight: 48,
    },
    dailyGoalContainer: {
        marginTop: 20,
    },
    dailyGoalText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 8,
        fontWeight: '500',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    alertWrapper: {
        marginBottom: 24,
    },
    repairContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FEE2E2',
        padding: 16,
        borderRadius: 16,
    },
    repairInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    repairTitle: {
        fontWeight: '700',
        color: '#991B1B',
        fontSize: 16,
    },
    repairSubtitle: {
        color: '#B91C1C',
        fontSize: 12,
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
    },
    stageSection: {
        marginBottom: 24,
    },
    stageCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        ...theme.shadows.small,
        position: 'relative',
        overflow: 'hidden',
    },
    stageBackground: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.5,
    },
    spotlight: {
        position: 'absolute',
        top: '40%',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(79, 70, 229, 0.05)',
        transform: [{ scaleX: 2 }],
    },
    characterWrapper: {
        marginVertical: 10,
        zIndex: 2,
    },
    quoteBubble: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginTop: 16,
        position: 'relative',
        maxWidth: '90%',
    },
    quoteArrow: {
        position: 'absolute',
        top: -6,
        alignSelf: 'center',
        width: 12,
        height: 12,
        backgroundColor: '#F3F4F6',
        transform: [{ rotate: '45deg' }],
    },
    quoteText: {
        fontSize: 14,
        color: '#4B5563',
        fontStyle: 'italic',
        textAlign: 'center',
        lineHeight: 20,
    },
    characterInfo: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 16,
    },
    characterName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    characterBadge: {
        backgroundColor: '#EEF2FF',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    characterBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFF',
        padding: 20, // Increased padding
        borderRadius: 24, // Slightly rounder
        borderWidth: 1,
        borderColor: '#F3F4F6',
        ...theme.shadows.small,
        minHeight: 130, // Taller to match "Yesterday" look
        justifyContent: 'space-between',
    },
    statIcon: {
        width: 40, // Larger icon box
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 22, // Larger font
        fontWeight: '800',
        color: '#111827',
    },
    statLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    fabContainer: {
        position: 'absolute',
        bottom: 40, // Lifted up
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    playButton: {
        width: '100%',
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.large,
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.4,
    },
    playButtonCompleted: {
        shadowColor: theme.colors.success,
    },
    playButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 100,
    },
    drawer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: DRAWER_WIDTH,
        backgroundColor: '#FFF',
        zIndex: 101,
        borderRightWidth: 1,
        borderRightColor: '#F3F4F6',
    },
    drawerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 40 : 20, // Extra padding for Android status bar
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    drawerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
    },
    closeButton: {
        padding: 4,
    },
    drawerContent: {
        padding: 16,
        gap: 8,
    },
    drawerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#FFF',
    },
    drawerItemText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
        marginLeft: 12,
    },
    drawerIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 8,
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        alignSelf: 'center',
        top: '30%',
        ...theme.shadows.large,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        padding: 16,
        fontSize: 18,
        color: '#111827',
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        alignItems: 'center',
    },
    saveButton: {
        flex: 1,
        padding: 16,
        backgroundColor: theme.colors.primary,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonTextPrimary: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
    buttonTextSecondary: {
        color: '#4B5563',
        fontWeight: '600',
        fontSize: 16,
    },
    // Brain Coin Overlay Styles
    modalOverlay: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        zIndex: 1000,
    },
    modalCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        ...theme.shadows.large,
    },
    coinImageContainer: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#F59E0B',
        shadowOpacity: 0.4,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
    },
    coinImage: {
        width: '100%',
        height: '100%',
    },
    coinModalTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 12,
    },
    coinDescription: {
        fontSize: 15,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    coinUsageList: {
        width: '100%',
        gap: 12,
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 16,
    },
    coinUsageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    usageIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    usageText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
        flex: 1,
    },
});
