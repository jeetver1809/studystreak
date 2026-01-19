import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Dimensions, Platform, InteractionManager } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, X, Clock, Settings, ArrowLeft, ChevronDown, Check, Trophy } from 'lucide-react-native';

import { useTimer } from '../hooks/useTimer';
import { CircularProgress } from '../components/CircularProgress';
import { BrainTree } from '../components/BrainTree';
import { useUserStore } from '../store/userStore';
import { StreakService } from '../services/streakService';
import { SubjectService } from '../services/SubjectService';
import { Subject, Chapter } from '../types';
import { theme } from '../theme/theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { isStudyCompletedToday, getTodayStr } from '../utils/dateUtils';
import { SubjectBook } from '../components/SubjectBook';

const MIN_DURATION = 30; // Minutes
const DURATIONS = [10, 30, 45, 60, 90, 120];

export const StudySessionScreen = () => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const { user, updateUser } = useUserStore();

    // State
    const [selectedDuration, setSelectedDuration] = useState(MIN_DURATION); // Minutes
    const [mode, setMode] = useState<'SETUP' | 'FOCUS'>('SETUP');
    const [isCompleted, setIsCompleted] = useState(false);
    const [status, setStatus] = useState(""); // Debug status
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Subject State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

    // Timer Hook
    const { timeLeft, isActive, startTimer, pauseTimer, resetTimer } = useTimer(selectedDuration * 60);

    const progress = 1 - (timeLeft / (selectedDuration * 60));

    // Animation for breathing effect
    const breathingScale = useSharedValue(1);

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

    // Load Subjects
    useEffect(() => {
        if (user?.uid && isFocused) {
            const task = InteractionManager.runAfterInteractions(() => {
                console.log("Fetching subjects for user:", user.uid);
                SubjectService.getSubjects(user.uid)
                    .then(setSubjects)
                    .catch(err => {
                        console.error(err);
                        Alert.alert("Offline Error", "Could not load subjects. Please check your connection or try again.");
                    });
            });
            return () => task.cancel();
        }
    }, [user?.uid, isFocused]);

    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

    // Effects
    useEffect(() => {
        if (timeLeft === 0 && !isCompleted && mode === 'FOCUS') {
            handleCompletion();
        }
    }, [timeLeft, mode]);

    const handleCompletion = async () => {
        setIsCompleted(true);
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
                    console.log(`[Study] Updating subject ${selectedSubjectId} time...`);
                    await SubjectService.updateStudyTime(user.uid, selectedSubjectId, durationInt, selectedChapterId || undefined);
                }

                // 2. Complete Session (Streak, Coins, Unlocks)
                const { unlockedCharacter } = await StreakService.completeSession(
                    user.uid,
                    durationInt,
                    selectedSubjectId || undefined,
                    selectedChapterId || undefined
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
                    unlockedCharacterIds: unlockedCharacter ? [...(user.unlockedCharacterIds || []), unlockedCharacter.id] : user.unlockedCharacterIds,
                    totalCharacters: (user.totalCharacters || 0) + (unlockedCharacter ? 1 : 0)
                });

                if (unlockedCharacter) {
                    setTimeout(() => navigation.navigate('Unlock', { character: unlockedCharacter }), 500);
                } else {
                    // Show Custom Success Modal instead of Alert
                    setShowSuccessModal(true);
                }
            } catch (e: any) {
                console.error(e);
                setStatus(`Error: ${e.message}`);
                Alert.alert("Error", `Failed to save progress: ${e.message}`);
            }
        } else {
            setStatus("Error: User is NULL");
            console.error("handleCompletion: User is null");
            Alert.alert("Error", "User not logged in. Session cannot be saved.", [
                { text: "Go to Login", onPress: () => navigation.navigate("Login") }
            ]);
        }
    };

    const handleStart = () => {
        if (!selectedSubject) {
            Alert.alert("Wait!", "Please select a subject to study.");
            return;
        }
        setMode('FOCUS');
        startTimer();
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
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>New Session</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* 1. Subject Selection - Horizontal Books */}
                    <Text style={styles.sectionHeader}>Select Subject</Text>

                    {subjects.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.subjectList}
                            style={{ overflow: 'visible' }} // Allow shadows to show
                        >
                            {subjects.map(subject => (
                                <SubjectBook
                                    key={subject.id}
                                    subject={subject}
                                    isSelected={selectedSubjectId === subject.id}
                                    onPress={() => {
                                        setSelectedSubjectId(subject.id);
                                        setSelectedChapterId(null);
                                    }}
                                />
                            ))}

                            <TouchableOpacity
                                style={[styles.subjectBookPlaceholder]}
                                onPress={() => navigation.navigate('Subjects')}
                            >
                                <View style={styles.placeholderDashed}>
                                    <Text style={{ fontSize: 24, color: theme.colors.text.disabled }}>+</Text>
                                    <Text style={{ fontSize: 12, color: theme.colors.text.disabled, marginTop: 4 }}>Add New</Text>
                                </View>
                            </TouchableOpacity>
                        </ScrollView>
                    ) : (
                        <TouchableOpacity
                            style={styles.emptySubjectCard}
                            onPress={() => navigation.navigate('Subjects')}
                        >
                            <Text style={styles.emptySubjectText}>No subjects yet. Tap to create one!</Text>
                        </TouchableOpacity>
                    )}

                    {/* 2. Chapter Selection (Optional) */}
                    {selectedSubject && (
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionHeader}>Focus Area <Text style={styles.optionalText}>(Optional)</Text></Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
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
                    <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Duration</Text>
                    <View style={styles.durationGrid}>
                        {DURATIONS.map((mins) => (
                            <TouchableOpacity
                                key={mins}
                                onPress={() => setSelectedDuration(mins)}
                                style={[
                                    styles.durationPill,
                                    selectedDuration === mins && styles.durationPillSelected
                                ]}
                            >
                                <Text style={[
                                    styles.durationPillText,
                                    selectedDuration === mins && styles.durationPillTextSelected
                                ]}>
                                    {mins}m
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Dev Timer (Hidden for Prod) */}
                    {/* <TouchableOpacity
                        onPress={() => setSelectedDuration(0.17)} // Approx 10s
                        style={{ alignSelf: 'center', marginTop: 16, opacity: 0.5, padding: 8 }}
                    >
                        <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>Dev: 10s Timer (1 XP)</Text>
                    </TouchableOpacity> */}

                    <Card style={styles.tipCard}>
                        <View style={styles.tipIconBox}>
                            <Clock size={16} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.tipText}>
                            <Text style={{ fontWeight: '700', color: theme.colors.primary }}>Pro Tip:</Text> 30+ min sessions count towards your daily streak!
                        </Text>
                    </Card>

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
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#FFFFFF', '#F0F9FF']} // Light theme
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
                    <BrainTree progress={progress} height={280} width={280} />
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
};

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
    content: { padding: theme.spacing.l },
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
        paddingHorizontal: 8,
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
        color: '#4B5563',
        fontWeight: '500',
    },
    chipTextSelected: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    durationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    durationPill: {
        flexGrow: 1,
        flexBasis: '30%',
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: '#FFF',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        ...theme.shadows.small,
    },
    durationPillSelected: {
        backgroundColor: '#EFF6FF',
        borderColor: theme.colors.primary,
        ...theme.shadows.medium,
    },
    durationPillText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
    },
    durationPillTextSelected: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    tipCard: {
        marginTop: 32,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 16,
        borderWidth: 0,
    },
    tipIconBox: {
        padding: 8,
        backgroundColor: '#E0F2FE',
        borderRadius: 8,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        color: '#64748B',
        lineHeight: 20,
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
