import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { theme } from '../theme/theme';

interface Props {
    streak: number;
}

export const StreakCounter = ({ streak }: Props) => {
    const scale = useSharedValue(1);

    useEffect(() => {
        if (streak > 0) {
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
                ),
                -1, // Infinite
                true // Reverse
            );
        } else {
            scale.value = 1;
        }
    }, [streak]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }]
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={animatedStyle}>
                <Flame
                    size={48}
                    color={streak > 0 ? theme.gradients.fire[1] : "#ccc"}
                    fill={streak > 0 ? theme.gradients.fire[0] : "none"}
                />
            </Animated.View>
            <Text style={styles.count}>{streak}</Text>
            <Text style={styles.label}>Day Streak</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: theme.spacing.l,
    },
    count: {
        ...theme.text.h1,
        fontSize: 64, // Keep it massive for impact
        lineHeight: 70,
        color: theme.colors.text.primary,
        fontVariant: ['tabular-nums'],
    },
    label: {
        ...theme.text.button,
        color: theme.colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});
