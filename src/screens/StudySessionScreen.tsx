import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions, Platform, InteractionManager } from 'react-native';
import { ScrollView, FlatList } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, X, Clock, Settings, ArrowLeft, ChevronDown, Check, Trophy } from 'lucide-react-native';
import { Logger } from '../utils/logger';

import { useTimer } from '../hooks/useTimer';
import { CircularProgress } from '../components/CircularProgress';
import { BrainTree } from '../components/BrainTree';
import { useUserStore } from '../store/userStore';
import { StreakService } from '../services/streakService';
import { SubjectService } from '../services/SubjectService';
import { StudyNotificationService } from '../services/StudyNotificationService';
import { Subject, Chapter } from '../types';
import { theme } from '../theme/theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { isStudyCompletedToday, getTodayStr } from '../utils/dateUtils';
import { SubjectBook } from '../components/SubjectBook';
import { Skeleton } from '../components/ui/Skeleton';
import { Slider as AwesomeSlider } from 'react-native-awesome-slider';

const SLIDER_STEPS = [10, 20, 30, 45, 60, 90, 120, 180];
const MIN_DURATION = SLIDER_STEPS[0];
const MAX_DURATION = SLIDER_STEPS[SLIDER_STEPS.length - 1];

const Ticks = React.memo(() => {
    return (
        <View style={styles.tickContainer}>
            {SLIDER_STEPS.map((_, i) => (
                <View
                    key={i}
                    style={[
                        styles.tickDot,
                        { left: `${(i / (SLIDER_STEPS.length - 1)) * 100}%` }
                    ]}
                />
            ))}
        </View>
    );
});

const DurationSlider = React.memo(({ value, onSlidingComplete, onSlidingStart }: { value: number, onSlidingComplete: (val: number) => void, onSlidingStart: () => void }) => {
    // Shared Values for UI Thread animation
    const initialIndex = SLIDER_STEPS.findIndex(s => s === value);
    const progress = useSharedValue(initialIndex !== -1 ? initialIndex : 2);
    const min = useSharedValue(0);
    const max = useSharedValue(SLIDER_STEPS.length - 1);

    // Local State for Text Display
    const [displayIndex, setDisplayIndex] = useState(initialIndex !== -1 ? initialIndex : 2);

    // Sync only if value changes externally
    useEffect(() => {
        const idx = SLIDER_STEPS.findIndex(s => s === value);
        if (idx !== -1) {
            progress.value = idx;
            setDisplayIndex(idx);
        }
    }, [value]);

    const updateDisplay = useCallback((idx: number) => {
        setDisplayIndex(idx);
    }, []);

    // UI Thread Hysteresis Logic
    useAnimatedReaction(
        () => progress.value,
        (currentValue, previousValue) => {
            if (previousValue === null) return;

            // Safety: If exact match/snap (e.g. dragging stops or starts), sync
            // Note: AwesomeSlider progress is float.
            const rawRounded = Math.round(currentValue);
            const rounded = Math.max(0, Math.min(rawRounded, SLIDER_STEPS.length - 1)); // Clamp to ensure no overflow (fix 180->10 bug)
            const diff = Math.abs(currentValue - rawRounded); // Use raw diff for snap check

            // 1. Safety Snap (Close to integer)
            if (diff < 0.15) {
                runOnJS(updateDisplay)(rounded);
                return;
            }

            // 2. Hysteresis (Sticky) strategy
            // We need to know the *current* display index to apply hysteresis.
            // Since we can't easily read JS state here without prop, 
            // we can stick to a simple rounding with heavy threshold or standard behaviour.
            // But we can infer "previous committed" or just filter rapid changes.
            // Let's implement the "Sticky" logic: 
            // Only flip if we are > 0.75 away from the previous integer we "settled" on?
            // Simpler: Just rely on the Safety Snap + Rounding, as UI thread is smooth.
            // The flicker came from JS lag. On UI thread, rounding is 60fps true.
            runOnJS(updateDisplay)(rounded);
        },
        [progress] // dependence
    );

    return (
        <View style={styles.sliderContainer}>
            <Text style={styles.durationValue}>
                {SLIDER_STEPS[displayIndex] ?? SLIDER_STEPS[0]}
                <Text style={styles.durationUnit}> min</Text>
            </Text>

            <View style={styles.sliderTrackContainer}>
                {/* Visual Ticks - Removed per user request */}
                {/* <Ticks /> */}

                <AwesomeSlider
                    progress={progress}
                    minimumValue={min}
                    maximumValue={max}
                    step={0} // Continuous
                    onSlidingStart={onSlidingStart}
                    onSlidingComplete={(val) => {
                        const rawRounded = Math.round(val);
                        const snappedIndex = Math.max(0, Math.min(rawRounded, SLIDER_STEPS.length - 1));
                        progress.value = snappedIndex; // Snap visually
                        runOnJS(onSlidingComplete)(SLIDER_STEPS[snappedIndex]);
                    }}
                    theme={{
                        disableMinTrackTintColor: theme.colors.primary,
                        maximumTrackTintColor: '#E2E8F0',
                        minimumTrackTintColor: theme.colors.primary,
                        bubbleBackgroundColor: 'transparent', // Hide bubble
                    }}
                    renderBubble={() => null} // Double ensure no bubble
                    thumbWidth={24} // Approximate standard size
                />
            </View>

            <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>{MIN_DURATION}m</Text>
                <Text style={styles.sliderLabelText}>{MAX_DURATION}m</Text>
            </View>
        </View>
    );
});

export const StudySessionScreen = () => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const { user, updateUser } = useUserStore();

    // State
    // Default to user preference (memory) or 30 min
    const [selectedDuration, setSelectedDuration] = useState(user?.targetDurationMinutes || 30);
    const [isScrollEnabled, setIsScrollEnabled] = useState(true);
    const [mode, setMode] = useState<'SETUP' | 'FOCUS'>('SETUP');
    const [isCompleted, setIsCompleted] = useState(false);
    const [status, setStatus] = useState(""); // Debug status
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Skeleton State

    // Subject State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

    // Timer Hook
    const { timeLeft, isActive, startTimer, pauseTimer, resetTimer } = useTimer(selectedDuration * 60);

    const progress = 1 - (timeLeft / (selectedDuration * 60));

    // Animation for breathing effect
    const breathingScale = useSharedValue(1);
    const progressShared = useSharedValue(0);

    // Initial Progress Set
    useEffect(() => {
        const targetProgress = 1 - (timeLeft / (selectedDuration * 60));
        // Smoothly interpolate to the new progress over 1 second (since timeLeft updates every second)
        // Use linear easing to make continuous seconds feel like one smooth flow
        progressShared.value = withTiming(targetProgress, { duration: 1000, easing: Easing.linear });
    }, [timeLeft, selectedDuration]);

    const animatedTextStyle = useAnimatedStyle(() => ({
        transform: [{ scale: breathingScale.value }]
    }));

    useEffect(() => {
        if (isActive) {
            breathingScale.value = withRepeat(
                withSequence(
                    withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        } else {
            breathingScale.value = withTiming(1);
        }
    }, [isActive]);

    // Load Subjects with Skeleton Delay
    useEffect(() => {
        if (user?.uid && isFocused) {
            const task = InteractionManager.runAfterInteractions(async () => {
                Logger.log("Fetching subjects for user:", user.uid);

                // Guarantee at least 800ms of skeleton to prevent white flash
                const minDelay = new Promise(resolve => setTimeout(resolve, 800));

                try {
                    const [fetchedSubjects] = await Promise.all([
                        SubjectService.getSubjects(user.uid),
                        minDelay
                    ]);
                    setSubjects(fetchedSubjects);
                } catch (err) {
                    Logger.error(err);
                    Alert.alert("Offline Error", "Could not load subjects. Please check your connection or try again.");
                } finally {
                    setIsLoading(false);
                }
            });
            return () => task.cancel();
        }
    }, [user?.uid, isFocused]);

    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

    const handleCompletion = async () => {
        setIsCompleted(true);
        StudyNotificationService.cancelNotifications();
        setStatus("Timer finished. Checking user...");

        if (user) {
            try {
                if (!user.uid) {
                    setStatus("Error: User ID missing on object");
                    throw new Error("User ID is missing");
                }
                setStatus(`Saving (Step 1/3)...`);

                // Ensure integer seconds
                const durationInt = Math.floor(selectedDuration * 60);

                // 1. Update Subject Time
                if (selectedSubjectId) {
                    Logger.log(`[Study] Updating subject ${selectedSubjectId} time...`);
                    await SubjectService.updateStudyTime(user.uid, selectedSubjectId, durationInt, selectedChapterId || undefined);
                }

                // 2. Complete Session (Streak, Coins, Unlocks)
                // START OPTIMIZATION: Pass 'user' object to skip fetching it again
                const { unlockedCharacter } = await StreakService.completeSession(
                    user.uid,
                    durationInt,
                    selectedSubjectId || undefined,
                    selectedChapterId || undefined,
                    user! // <--- Cached User
                );

                setStatus(`Saved! Unlocked: ${unlockedCharacter?.name || 'None'}`);

                // Optimistic update
                const currentStreak = user.currentStreak || 0;
                const longestStreak = user.longestStreak || 0;
                const alreadyStudied = isStudyCompletedToday(user.lastStudyDate);

                // Only increment streak if not already studied today
                const nextStreak = alreadyStudied ? currentStreak : currentStreak + 1;

                updateUser({
                    currentStreak: nextStreak,
                    longestStreak: Math.max(longestStreak, nextStreak),
                    lastStudyDate: getTodayStr(),
                    unlockedCharacterIds: unlockedCharacter ? [...(user!.unlockedCharacterIds || []), unlockedCharacter.id] : user!.unlockedCharacterIds,
                    totalCharacters: (user!.totalCharacters || 0) + (unlockedCharacter ? 1 : 0),
                    targetDurationMinutes: selectedDuration // <--- Remember for next time!
                });

                if (unlockedCharacter) {
                    setTimeout(() => navigation.navigate('Unlock', { character: unlockedCharacter }), 500);
                } else {
                    // Show Custom Success Modal instead of Alert
                    setShowSuccessModal(true);
                }
            } catch (e: any) {
                Logger.error(e);
                setStatus(`Error: ${e.message}`);
                Alert.alert("Error", `Failed to save progress: ${e.message}`);
            }
        } else {
            setStatus("Error: User is NULL");
            Logger.error("handleCompletion: User is null");
            Alert.alert("Error", "User not logged in. Session cannot be saved.", [
                { text: "Go to Login", onPress: () => navigation.navigate("Login") }
            ]);
        }
    };

    // Effects
    useEffect(() => {
        if (timeLeft === 0 && !isCompleted && mode === 'FOCUS') {
            handleCompletion();
        }
    }, [timeLeft, mode]);

    // Notification Action Handler
    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
            const actionId = response.actionIdentifier;
            const minutesLeft = Math.ceil(timeLeft / 60);

            if (actionId === 'PAUSE') {
                pauseTimer();
                StudyNotificationService.scheduleStudyNotification(minutesLeft, true);
            } else if (actionId === 'RESUME') {
                startTimer();
                StudyNotificationService.scheduleStudyNotification(minutesLeft, false);
            }
        });

        return () => subscription.remove();
    }, [timeLeft, pauseTimer, startTimer]);

    const handleStart = async () => {
        if (!selectedSubject) {
            Alert.alert("Wait!", "Please select a subject to study.");
            return;
        }

        // Save preference immediately on start (so Give Up doesn't lose it)
        updateUser({ targetDurationMinutes: selectedDuration });

        setMode('FOCUS');
        startTimer();

        // Schedule notification
        await StudyNotificationService.requestPermissions();
        await StudyNotificationService.scheduleStudyNotification(Math.ceil(timeLeft / 60));
    };

    const handleGiveUp = () => {
        Alert.alert("Give Up?", "Your progress will be lost.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Give Up",
                style: "destructive",
                onPress: () => {
                    pauseTimer();
                    setMode('SETUP');
                    resetTimer();
                    StudyNotificationService.cancelNotifications();
                }
            }
        ]);
    };

    const formatTime = (seconds: number) => {
        const safeSeconds = Math.max(0, Math.floor(seconds));
        const m = Math.floor(safeSeconds / 60);
        const s = safeSeconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (mode === 'SETUP') {
        const chapters = selectedSubject?.chapters || [];

        return (
            <SafeAreaView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', zIndex: -1 }]} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>New Session</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    scrollEnabled={isScrollEnabled}
                >

                    {/* 1. Subject Selection - Horizontal Books */}
                    <Text style={[styles.sectionHeader, { paddingHorizontal: theme.spacing.l }]}>Select Subject</Text>

                    {isLoading ? (
                        <View style={{ height: 260, flexDirection: 'row', paddingHorizontal: theme.spacing.l, gap: 16 }}>
                            {/* Skeleton Books */}
                            <View>
                                <Skeleton width={180} height={240} borderRadius={16} />
                            </View>
                            <View>
                                <Skeleton width={180} height={240} borderRadius={16} />
                            </View>
                        </View>
                    ) : subjects.length > 0 ? (
                        <View style={{ height: 260, width: '100%' }}>
                            <FlatList<Subject>
                                data={subjects}
                                extraData={selectedSubjectId}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: theme.spacing.l, paddingVertical: 20 }}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }: { item: Subject }) => (
                                    <SubjectBook
                                        subject={item}
                                        isSelected={selectedSubjectId === item.id}
                                        onPress={() => {
                                            setSelectedSubjectId(item.id);
                                            setSelectedChapterId(null);
                                        }}
                                    />
                                )}
                                ListFooterComponent={
                                    <TouchableOpacity
                                        style={[styles.subjectBookPlaceholder]}
                                        onPress={() => navigation.navigate('Subjects')}
                                    >
                                        <View style={styles.placeholderDashed}>
                                            <Text style={{ fontSize: 24, color: theme.colors.text.disabled }}>+</Text>
                                            <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 4 }}>Add New</Text>
                                        </View>
                                    </TouchableOpacity>
                                }
                            />
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.emptySubjectCard, { marginHorizontal: theme.spacing.l }]}
                            onPress={() => navigation.navigate('Subjects')}
                        >
                            <Text style={styles.emptySubjectText}>No subjects yet. Tap to create one!</Text>
                        </TouchableOpacity>
                    )}

                    {/* 2. Chapter Selection (Optional) */}
                    {selectedSubject && (
                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionHeader, { paddingHorizontal: theme.spacing.l }]}>Focus Area <Text style={styles.optionalText}>(Optional)</Text></Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8, paddingHorizontal: theme.spacing.l }}
                            >
                                <TouchableOpacity
                                    style={[styles.chip, !selectedChapterId && styles.chipSelected]}
                                    onPress={() => setSelectedChapterId(null)}
                                >
                                    <Text style={[styles.chipText, !selectedChapterId && styles.chipTextSelected]}>General</Text>
                                </TouchableOpacity>
                                {chapters.length > 0 ? (
                                    chapters.map(chapter => (
                                        <TouchableOpacity
                                            key={chapter.id}
                                            style={[styles.chip, selectedChapterId === chapter.id && styles.chipSelected]}
                                            onPress={() => setSelectedChapterId(chapter.id)}
                                        >
                                            <Text style={[styles.chipText, selectedChapterId === chapter.id && styles.chipTextSelected]}>
                                                {chapter.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={{ justifyContent: 'center', paddingHorizontal: 8 }}>
                                        <Text style={{ color: theme.colors.text.disabled, fontStyle: 'italic', fontSize: 13 }}>No chapters</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    )}

                    {/* 3. Duration Selection */}
                    <Text style={[styles.sectionHeader, { marginTop: 24, paddingHorizontal: theme.spacing.l }]}>Duration</Text>
                    {isLoading ? (
                        <View style={{ paddingHorizontal: theme.spacing.l, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            {/* Skeleton Durations */}
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <Skeleton key={i} width='30%' height={50} borderRadius={16} />
                            ))}
                        </View>
                    ) : (
                        <View style={{ paddingHorizontal: theme.spacing.l, marginTop: 8 }}>
                            <DurationSlider
                                value={selectedDuration}
                                onSlidingComplete={(val) => {
                                    setSelectedDuration(val);
                                    setIsScrollEnabled(true);
                                }}
                                onSlidingStart={() => setIsScrollEnabled(false)}
                            />
                        </View>
                    )}


                    {/* Dev Timer (Hidden for Prod) */}
                    {/* <TouchableOpacity
                        onPress={() => setSelectedDuration(0.17)} // Approx 10s
                        style={{ alignSelf: 'center', marginTop: 16, opacity: 0.5, padding: 8 }}
                    >
                        <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>Dev: 10s Timer (1 XP)</Text>
                    </TouchableOpacity> */}


                    <View style={{ height: 120 }} />
                </ScrollView>

                {/* Floating Bottom Bar */}
                <View style={[styles.bottomBar]}>
                    <Button
                        title={selectedSubject ? "Start Focus Session" : "Select a Subject"}
                        onPress={handleStart}
                        size="l"
                        icon={selectedSubject ? <Play size={20} color="white" fill="white" /> : undefined}
                        disabled={!selectedSubject}
                        variant={selectedSubject ? 'primary' : 'secondary'}
                        style={styles.startButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    // FOCUS MODE
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', zIndex: -2 }]} />
            <LinearGradient
                colors={['rgba(255,255,255,0)', '#F0F9FF']} // Transparent to Light Blue
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={handleGiveUp} style={styles.closeButton}>
                    <X size={24} color={theme.colors.text.secondary} />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.title}>Deep Focus</Text>
                    <Text style={styles.subtitle}>{selectedSubject?.name}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.timerContainer}>
                {/* Tree Circle Container */}
                <View style={styles.treeCircle}>
                    <BrainTree progress={progressShared} height={280} width={280} />
                </View>

                {/* Time & Status Below */}
                <View style={styles.timeContainer}>
                    <Animated.Text style={[styles.timeText, animatedTextStyle]}>
                        {formatTime(timeLeft)}
                    </Animated.Text>

                    <View style={[
                        styles.statusBadge,
                        isActive ? styles.statusActive : styles.statusPaused
                    ]}>
                        <View style={[
                            styles.statusDot,
                            isActive ? styles.dotActive : styles.dotPaused
                        ]} />
                        <Text style={styles.statusText}>{isActive ? "NEURAL SYNC" : "PAUSED"}</Text>
                    </View>

                    {!!status && <Text style={{ color: theme.colors.text.secondary, marginTop: 12, fontSize: 12 }}>{status}</Text>}
                </View>
            </View>

            <View style={styles.footer}>
                {isActive ? (
                    <Button
                        title="Pause Session"
                        onPress={pauseTimer}
                        variant="secondary"
                        size="l"
                        icon={<Pause size={20} color={theme.colors.primary} />}
                        style={{ backgroundColor: 'white', borderWidth: 1, borderColor: theme.colors.border }}
                    />
                ) : (
                    <Button
                        title="Resume Focus"
                        onPress={startTimer}
                        size="l"
                        icon={<Play size={20} color="white" />}
                        style={{ backgroundColor: theme.colors.success }}
                    />
                )}
                <TouchableOpacity
                    onPress={handleGiveUp}
                    style={styles.giveUpButton}
                >
                    <Text style={styles.giveUpText}>End Session</Text>
                </TouchableOpacity>
            </View>

            {/* Custom Success Overlay (Replaces Modal for stability) */}
            {showSuccessModal && (
                <View style={[StyleSheet.absoluteFill, styles.modalOverlay]}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconContainer}>
                            <Trophy size={40} color="#F59E0B" fill="#FDE68A" />
                        </View>

                        <Text style={styles.modalTitle}>Session Complete!</Text>
                        <Text style={styles.modalSubtitle}>Great job staying focused.</Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{Math.floor(selectedDuration)}m</Text>
                                <Text style={styles.statLabel}>Focus</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>+{(selectedDuration * 10).toFixed(0)}</Text>
                                <Text style={styles.statLabel}>XP</Text>
                            </View>
                        </View>

                        <Button
                            title="Continue"
                            onPress={() => {
                                setShowSuccessModal(false);
                                navigation.navigate('Home');
                            }}
                            size="l"
                            style={{ width: '100%', marginTop: 24 }}
                        />
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}



const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.l,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.small
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.small,
    },
    title: { ...theme.text.h3, color: theme.colors.text.primary },
    subtitle: { ...theme.text.caption, color: theme.colors.text.secondary },
    content: { paddingVertical: theme.spacing.l },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },
    optionalText: {
        fontSize: 14,
        fontWeight: 'normal',
        color: '#9CA3AF',
    },
    sectionContainer: {
        marginTop: 24,
    },
    subjectList: {
        gap: 0,
        // paddingHorizontal: 8 // Moved to inline style
        paddingBottom: 20,
    },
    subjectBookPlaceholder: {
        width: 100,
        height: 140,
        marginHorizontal: 8,
        marginVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderDashed: {
        width: '90%',
        height: '95%',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#D1D5DB',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB'
    },
    emptySubjectCard: {
        width: '100%',
        padding: 20,
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    emptySubjectText: {
        color: '#6B7280',
        fontSize: 14,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipSelected: {
        backgroundColor: '#EFF6FF',
        borderColor: theme.colors.primary,
    },
    chipText: {
        fontSize: 14,
        color: '#4B5563', // Explicit Dark Grey
        fontWeight: '500',
    },
    chipTextSelected: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    sliderContainer: {
        backgroundColor: '#EEF2FF', // Indigo 50 - Premium tint
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        // borderWidth: 1, // Removed
        // borderColor: '#F1F5F9', // Removed
        height: 180, // Increased height to prevent overlap
        justifyContent: 'center', // Center content vertically
        ...theme.shadows.medium,
    },
    durationValue: {
        fontSize: 42,
        fontWeight: '800',
        color: theme.colors.primary,
        marginBottom: 12,
        fontVariant: ['tabular-nums']
    },
    durationUnit: {
        fontSize: 18,
        fontWeight: '500',
        color: '#94A3B8',
        marginBottom: 6,
    },
    slider: {
        width: '100%',
        height: 40,
        zIndex: 2, // Ensure thumb is above ticks
    },
    sliderTrackContainer: {
        width: '100%',
        justifyContent: 'center',
    },
    tickContainer: {
        position: 'absolute',
        left: 15,
        right: 15,
        height: 40, // Match slider height
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 1, // Behind slider
    },
    tickDot: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E2E8F0', // Lighter grey dot
        transform: [{ translateX: -2 }] // Center the dot on the exact % position
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10,
        marginTop: 12 // Increased spacing
    },
    sliderLabelText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600'
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF',
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        ...theme.shadows.large,
    },
    startButton: {
        width: '100%',
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 5,
    },
    timerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
    },
    treeCircle: {
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#4F46E5', // Primary Blue Boundary
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...theme.shadows.small,
    },
    timeContainer: {
        alignItems: 'center',
        gap: 16,
    },
    timeText: {
        fontSize: 64,
        fontWeight: '700',
        color: theme.colors.text.primary,
        letterSpacing: 2,
        fontVariant: ['tabular-nums'],
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        gap: 8,
    },
    statusActive: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE'
    },
    statusPaused: {
        backgroundColor: '#F3F4F6',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotActive: { backgroundColor: theme.colors.primary },
    dotPaused: { backgroundColor: theme.colors.text.disabled },
    statusText: {
        ...theme.text.button,
        color: theme.colors.text.secondary,
        fontSize: 12,
        letterSpacing: 1.5,
    },
    footer: {
        padding: theme.spacing.l,
        paddingBottom: theme.spacing.xxl,
    },
    giveUpButton: {
        marginTop: theme.spacing.l,
        alignSelf: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        backgroundColor: '#F3F4F6',
    },
    giveUpText: {
        color: theme.colors.text.secondary,
        fontSize: 14,
        fontWeight: '600'
    },
    modalOverlay: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        zIndex: 1000,
    },
    modalCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 32,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        ...theme.shadows.large,
    },
    modalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFBEB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 4,
        borderColor: '#FEF3C7',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text.primary,
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        paddingVertical: 16,
        paddingHorizontal: 24,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        width: '100%',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text.primary,
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
    },
});
