import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { theme } from '../theme/theme';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const SIZE = width * 0.7;
const STROKE_WIDTH = 20;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
    progress: number; // 0 to 1
}

export const CircularProgress = ({ progress }: Props) => {
    const animatedProgress = useSharedValue(0);

    useEffect(() => {
        animatedProgress.value = withTiming(progress, {
            duration: 500,
            easing: Easing.linear,
        });
    }, [progress]);

    const animatedProps = useAnimatedProps(() => {
        return {
            strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value),
        };
    });

    return (
        <View style={styles.container}>
            <Svg width={SIZE} height={SIZE}>
                <Defs>
                    <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor="#3B82F6" stopOpacity="1" />
                        <Stop offset="1" stopColor="#8B5CF6" stopOpacity="1" />
                    </LinearGradient>
                </Defs>
                <Circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    stroke={theme.colors.border}
                    strokeWidth={STROKE_WIDTH}
                    strokeOpacity={0.3}
                />
                <AnimatedCircle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    stroke="url(#grad)"
                    strokeWidth={STROKE_WIDTH}
                    strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    animatedProps={animatedProps}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
