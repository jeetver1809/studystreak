import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../store/userStore';
import { StatsService, DailyStats } from '../services/StatsService';
import { SubjectService } from '../services/SubjectService';
import { theme } from '../theme/theme';
import { Clock, Flame, BarChart2, PieChart as PieIcon } from 'lucide-react-native';
import { Card } from '../components/ui/Card';
import { SafeBarChart } from '../components/analytics/SafeBarChart';
import { SafePieChart } from '../components/analytics/SafePieChart';
import { FilterComponent, FilterRange } from '../components/analytics/FilterComponent';
import { Subject } from '../types';
import { ScreenGradient } from '../components/ui/ScreenGradient';

import { format, parseISO } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const AnalyticsScreen = () => {
    const { user } = useUserStore();
    const [stats, setStats] = useState<DailyStats[]>([]);
    const [subjectStats, setSubjectStats] = useState<Record<string, number>>({});
    const [subjects, setSubjects] = useState<Subject[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [range, setRange] = useState<FilterRange>('week'); // Default to week
    const [selectedLog, setSelectedLog] = useState<string | null>(null);

    const fetchData = async () => {
        if (user?.uid) {
            try {
                // 1. Weekly Activity Stats (Always fetch for the chart)
                const dailyData = await StatsService.getWeeklyStats(user.uid);
                setStats(dailyData);

                // 2. Subject Stats (Filtered)
                const subjData = await StatsService.getSubjectStats(user.uid, range);
                setSubjectStats(subjData);

                // 3. Subject Metadata (For names/colors)
                // Cache this? For now fetch every time is fine for small list
                const subjList = await SubjectService.getSubjects(user.uid);
                setSubjects(subjList);

            } catch (e) {
                console.error("Failed to fetch analytics", e);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.uid, range]); // Re-fetch when range changes

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    // --- Computed Data ---

    const formatDuration = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.round(totalSeconds % 60);

        const pad = (num: number) => num.toString().padStart(2, '0');

        if (h > 0) {
            return `${pad(h)}hr ${pad(m)}min ${pad(s)}sec`;
        } else if (m > 0) {
            return `${pad(m)}min ${pad(s)}sec`;
        } else {
            return `${pad(s)}sec`;
        }
    };

    // 1. Total Hours for Selected Range
    const totalHoursDisplay = useMemo(() => {
        const totalSeconds = Object.values(subjectStats).reduce((acc, val) => acc + val, 0);
        return totalSeconds / 3600;
    }, [subjectStats]);

    // Calculate Max Value for proper scaling (Min 1 hour)
    const maxWeeklyHours = Math.max(1, ...stats.map(d => d.totalSeconds / 3600));
    const maxSubjectHours = Math.max(1, ...Object.values(subjectStats).map(s => s / 3600));

    // 2. Weekly Bar Chart Data
    const weeklyBarData = useMemo(() => {
        if (!stats || !Array.isArray(stats)) return [];
        return stats
            .map((day, index) => {
                const realHours = day.totalSeconds / 3600;
                return {
                    id: `week-bar-${day.date}`,
                    // Tiny bar floor (0.02h ~ 1.2 min)
                    value: realHours > 0 ? Math.max(realHours, 0.02) : 0,
                    realValue: day.totalSeconds, // Store SECONDS
                    tooltipText: formatDuration(day.totalSeconds), // Pass formatted time for Tooltip
                    label: format(parseISO(day.date), 'EEE'),
                    frontColor: index === stats.length - 1 ? theme.colors.primary : theme.colors.secondary,
                };
            });
    }, [stats]);

    // 3. Subject Breakdown Data (Pie Chart)
    const subjectBarData = useMemo(() => {
        if (!subjectStats) return [];

        // Vibrant palette as requested
        const VIBRANT_COLORS = [
            '#FF69B4', // Hot Pink
            '#FF6347', // Tomato Red
            '#4169E1', // Royal Blue
            '#FFA500', // Orange
            '#9370DB', // Medium Purple
            '#FFD700', // Gold (Dark Yellow)
            '#E6E6FA', // Lavender
            '#20B2AA', // Light Sea Green
            '#FF4500', // Orange Red
            '#1E90FF', // Dodger Blue
        ];

        const data = Object.entries(subjectStats)
            .map(([subjId, seconds], index) => {
                const subject = subjects.find(s => s.id === subjId);
                const name = subject ? subject.name : (subjId === 'uncategorized' ? 'No Subject' : 'Unknown');
                // Cycle through vibrant colors
                const color = VIBRANT_COLORS[index % VIBRANT_COLORS.length];
                const realHours = seconds / 3600;

                return {
                    id: `subj-bar-${subjId}`,
                    // Tiny slice floor
                    value: realHours > 0 ? Math.max(realHours, 0.02) : 0,
                    realValue: seconds, // Store SECONDS
                    label: name, // Full name for Pie Label
                    frontColor: color,
                };
            });

        return data.sort((a, b) => b.realValue - a.realValue);
    }, [subjectStats, subjects]);


    return (
        <SafeAreaView style={styles.container}>
            <ScreenGradient />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Analytics</Text>
                    <Text style={styles.subtitle}>Track your performance</Text>
                </View>

                {/* Range Filter */}
                <FilterComponent selectedRange={range} onSelectRange={setRange} />

                {/* Summary Cards */}
                <View style={styles.statsRow}>
                    <Card style={styles.statCard} padding="m">
                        <Clock size={24} color={theme.colors.primary} />
                        <Text style={styles.statValue}>
                            <Text>{Math.floor(totalHoursDisplay)}</Text>
                            <Text style={styles.unit}>h </Text>
                            <Text>{Math.round((totalHoursDisplay % 1) * 60)}</Text>
                            <Text style={styles.unit}>m</Text>
                        </Text>
                        <Text style={styles.statLabel}>Studied ({range === 'week' ? '7 Days' : range === 'today' ? 'Today' : 'All Time'})</Text>
                    </Card>

                    <Card style={styles.statCard} padding="m">
                        <Flame size={24} color={theme.colors.warning} />
                        <Text style={styles.statValue}>{user?.currentStreak || 0}</Text>
                        <Text style={styles.statLabel}>Current Streak</Text>
                    </Card>
                </View>

                {/* 1. Subject Breakdown (Pie Chart requested) */}
                {subjectBarData.length > 0 ? (
                    <Card style={styles.chartCard} padding="l">
                        <View style={styles.chartHeader}>
                            <PieIcon size={20} color={theme.colors.text.secondary} />
                            <Text style={styles.sectionTitle}>Subject Breakdown</Text>
                        </View>
                        <View style={{ alignItems: 'center', marginTop: 10 }}>
                            <SafePieChart
                                data={subjectBarData}
                                height={260}
                                formatTooltip={formatDuration}
                            />
                        </View>
                    </Card>
                ) : (
                    <Card style={styles.emptyCard} padding="l">
                        <Text style={styles.emptyText}>No study data for this period.</Text>
                    </Card>
                )}


                {/* 2. Weekly Activity Chart */}
                {weeklyBarData.length > 0 ? (
                    <Card style={[styles.chartCard, { marginTop: 24 }]} padding="l">
                        <View style={styles.chartHeader}>
                            <BarChart2 size={20} color={theme.colors.text.secondary} />
                            <Text style={styles.sectionTitle}>Last 7 Days Activity</Text>
                        </View>

                        <View style={{ alignItems: 'center' }}>
                            <SafeBarChart
                                data={weeklyBarData}
                                height={250} // Explicitly bigger
                                barWidth={22}
                                spacing={20}
                                maxValue={maxWeeklyHours}
                            />
                        </View>
                    </Card>
                ) : (
                    <Card style={[styles.chartCard, { marginTop: 24 }]} padding="l">
                        <View style={styles.chartHeader}>
                            <BarChart2 size={20} color={theme.colors.text.secondary} />
                            <Text style={styles.sectionTitle}>Last 7 Days Activity</Text>
                        </View>
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No activity recorded this week.</Text>
                        </View>
                    </Card>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { padding: theme.spacing.l, paddingBottom: 100 },
    header: { marginBottom: 16 },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: 4
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.text.secondary,
    },

    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginTop: 8,
    },
    unit: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text.secondary,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginTop: 4,
    },

    chartCard: {
        minHeight: 300,
        overflow: 'hidden'
    },
    emptyCard: {
        minHeight: 150,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 100
    },
    emptyText: {
        color: theme.colors.text.secondary,
        fontStyle: 'italic'
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    },
    selectedLogContainer: {
        marginBottom: 10,
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: 8,
        borderRadius: 8,
    },
    selectedLogText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
});
