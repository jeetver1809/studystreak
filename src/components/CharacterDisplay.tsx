import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { theme } from '../theme/theme';
import { Character } from '../types';

interface Props {
    character?: Character;
    size?: number;
}

export const CharacterDisplay = ({ character, size = 120 }: Props) => {
    const scale = useSharedValue(1);
    const translateY = useSharedValue(0);

    useEffect(() => {
        // Breathing animation
        scale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        // Floating animation
        translateY.value = withRepeat(
            withSequence(
                withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
                withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateY: translateY.value }
        ]
    }));

    return (
        <View style={styles.container}>
            <Animated.View style={[
                styles.circle,
                animatedStyle,
                { width: size, height: size, borderRadius: size / 2 }
            ]}>
                {character?.image ? (
                    <Image source={character.image} style={styles.charImage} resizeMode="contain" />
                ) : (
                    <Text style={[styles.emoji, { fontSize: size * 0.4 }]}>🥚</Text>
                )}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circle: {
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFF',
        ...theme.shadows.medium,
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.2,
    },
    charImage: {
        width: '85%',
        height: '85%',
    },
    emoji: {
        // dynamic fontSize in component
    }
});
