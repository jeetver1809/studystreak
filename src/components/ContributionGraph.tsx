import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text, Dimensions } from 'react-native';
import { theme } from '../theme/theme';
import { subDays, format, startOfWeek, addDays, getDay } from 'date-fns';

interface Props {
    data: Record<string, number>; // date "YYYY-MM-DD" -> minutes
    endDate?: Date;
    days?: number;
}

const SQUARE_SIZE = 12;
const GAP = 3;
const TOTAL_WEEKS = 20; // 5 months approx

export const ContributionGraph = ({ data, endDate = new Date(), days = 140 }: Props) => {

    // Generate the grid data
    const weeks = useMemo(() => {
        const weeksArray = [];
        let currentDate = startOfWeek(subDays(endDate, days), { weekStartsOn: 0 });

        // We want to fill columns until we hit today
        // Actually simpler: Just generate fixed number of columns ending at this week

        const endWeekObj = startOfWeek(endDate, { weekStartsOn: 0 });
        const startWeekObj = subDays(endWeekObj, days); // Rough start

        // Let's just build 20 weeks back from endWeek
        for (let w = 0; w < TOTAL_WEEKS; w++) {
            const weekStart = subDays(endWeekObj, (TOTAL_WEEKS - 1 - w) * 7);
            const daysInWeek = [];

            for (let d = 0; d < 7; d++) {
                const date = addDays(weekStart, d);
                const dateStr = format(date, 'yyyy-MM-dd');
                const minutes = data[dateStr] || 0;

                let level = 0;
                if (minutes > 0) level = 1;
                if (minutes > 30) level = 2;
                if (minutes > 60) level = 3;
                if (minutes > 120) level = 4;

                daysInWeek.push({ date, dateStr, minutes, level });
            }
            weeksArray.push(daysInWeek);
        }

        return weeksArray;
    }, [data, endDate, days]);

    const getColor = (level: number) => {
        switch (level) {
            case 0: return '#EAEDF0'; // Empty (Light mode github gray)
            case 1: return '#9BE9A8'; // Light Green
            case 2: return '#40C463';
            case 3: return '#30A14E';
            case 4: return '#216E39'; // Dark Green
            default: return '#EAEDF0';
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Consistency</Text>
                <Text style={styles.subtitle}>Last {TOTAL_WEEKS} Weeks</Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={{ flexGrow: 0 }} // Ensure it doesn't expand vertically
            >
                <View style={styles.grid}>
                    {weeks.map((week, wIndex) => (
                        <View key={wIndex} style={styles.column}>
                            {week.map((day, dIndex) => (
                                <View
                                    key={day.dateStr}
                                    style={[
                                        styles.square,
                                        { backgroundColor: getColor(day.level) }
                                    ]}
                                />
                            ))}
                        </View>
                    ))}
                </View>
            </ScrollView>

            <View style={styles.legend}>
                <Text style={styles.legendText}>Less</Text>
                {[0, 1, 2, 3, 4].map(l => (
                    <View key={l} style={[styles.legendSquare, { backgroundColor: getColor(l) }]} />
                ))}
                <Text style={styles.legendText}>More</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        marginHorizontal: theme.spacing.l,
        padding: theme.spacing.m,
        paddingBottom: theme.spacing.s,
        borderRadius: 16,
        ...theme.shadows.medium,
        marginBottom: theme.spacing.l,
        flexGrow: 0, // Prevent growing
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: theme.spacing.m,
    },
    title: {
        ...theme.text.h3,
        fontSize: 16,
    },
    subtitle: {
        ...theme.text.caption,
        color: theme.colors.text.secondary,
    },
    scrollContent: {
        paddingRight: 20
    },
    grid: {
        flexDirection: 'row',
        gap: GAP,
    },
    column: {
        gap: GAP,
    },
    square: {
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        borderRadius: 2,
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: theme.spacing.m,
        gap: 4,
    },
    legendSquare: {
        width: 10,
        height: 10,
        borderRadius: 2,
    },
    legendText: {
        fontSize: 10,
        color: theme.colors.text.secondary,
        marginHorizontal: 4,
    }
});
