import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';
import { Clock, Flame, Calendar, Trophy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface StatsGridProps {
    totalSeconds: number;
    currentStreak: number;
    longestStreak: number;
    dailyAverageSeconds: number;
}

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

export const StatsGrid = ({ totalSeconds, currentStreak, longestStreak, dailyAverageSeconds }: StatsGridProps) => {
    return (
        <View style={styles.container}>
            {/* Top Row: Focus Time (Large) & Streak (Small) */}
            <View style={styles.row}>
                <View style={[styles.card, styles.largeCard]}>
                    <View style={styles.iconContainer}>
                        <Clock size={24} color={theme.colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.label}>Focus Time</Text>
                        <Text style={styles.valueLarge}>{formatDuration(totalSeconds)}</Text>
                    </View>
                    <LinearGradient
                        colors={[theme.colors.primary + '20', 'transparent']} // Hex+Alpha might fail if not valid hex, assuming primary is hex
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                </View>

                <View style={[styles.card, styles.smallCard]}>
                    <Flame size={24} color={theme.colors.warning} />
                    <Text style={styles.value}>{currentStreak}</Text>
                    <Text style={styles.label}>Streak</Text>
                </View>
            </View>

            {/* Bottom Row: Daily Avg & Longest Streak */}
            <View style={styles.row}>
                <View style={[styles.card, styles.smallCard]}>
                    <Calendar size={24} color={theme.colors.accent} />
                    <Text style={styles.value}>{formatDuration(dailyAverageSeconds)}</Text>
                    <Text style={styles.label}>Daily Avg</Text>
                </View>

                <View style={[styles.card, styles.largeCard, { backgroundColor: '#FFF0F5' }]}>
                    <View style={styles.iconContainer}>
                        <Trophy size={24} color="#D97706" />
                    </View>
                    <View>
                        <Text style={styles.label}>Best Streak</Text>
                        <Text style={styles.valueLarge}>{longestStreak} Days</Text>
                    </View>
                    <LinearGradient
                        colors={['#FFF0F5', 'transparent']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 12,
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        justifyContent: 'space-between',
        ...theme.shadows.small,
        overflow: 'hidden',
    },
    largeCard: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    smallCard: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    value: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    },
    valueLarge: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    }
});
