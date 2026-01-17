import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withSequence, withTiming, withRepeat, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Character } from '../types';
import { theme } from '../theme/theme';
import { Button } from '../components/ui/Button';

const { width } = Dimensions.get('window');

export const UnlockScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { character } = route.params as { character: Character };
    const confettiRef = useRef<ConfettiCannon>(null);

    // Animation Values
    const cardScale = useSharedValue(0.8);
    const cardOpacity = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const glowOpacity = useSharedValue(0);

    useEffect(() => {
        // Simple entrance sequence
        cardOpacity.value = withTiming(1, { duration: 600 });
        cardScale.value = withSpring(1, { damping: 12 });

        textOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));

        // Infinite Pulse Effect for the glow
        glowOpacity.value = withDelay(600, withRepeat(
            withSequence(
                withTiming(0.8, { duration: 1500 }),
                withTiming(0.4, { duration: 1500 })
            ),
            -1, // Infinite
            true // Reverse
        ));

        // Trigger confetti
        confettiRef.current?.start();
    }, []);

    const cardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }],
        opacity: cardOpacity.value
    }));

    const textAnimatedStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: withSpring(textOpacity.value === 1 ? 0 : 20) }]
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
        transform: [{ scale: withSpring(glowOpacity.value > 0.6 ? 1.1 : 1) }] // Gentle pulse sync
    }));

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={theme.gradients.primary} // Indigo -> Violet
                style={styles.container}
            >
                {/* Confetti Explosion */}
                <ConfettiCannon
                    ref={confettiRef}
                    count={200}
                    origin={{ x: width / 2, y: -20 }}
                    autoStart={true}
                    fadeOut={true}
                />

                <Animated.View style={[styles.headerContainer, textAnimatedStyle]}>
                    <Text style={styles.headerTitle}>NEW COMPANION!</Text>
                    <Text style={styles.headerSubtitle}>You've unlocked a new friend</Text>
                </Animated.View>

                {/* Main Card */}
                <Animated.View style={[styles.card, cardAnimatedStyle]}>
                    {/* Glow behind character */}
                    <Animated.View style={[styles.glow, glowStyle]} />

                    <View style={styles.imageContainer}>
                        <Image source={character.image} style={styles.image} resizeMode="contain" />
                    </View>

                    <Text style={styles.name}>{character.name}</Text>

                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {character.worldId.toUpperCase().replace('_', ' ')} WORLD
                        </Text>
                    </View>
                </Animated.View>

                {/* Footer Info */}
                <Animated.View style={[styles.footer, textAnimatedStyle]}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>UNLOCKED AT</Text>
                        <Text style={styles.statValue}>{character.unlockDay} DAY STREAK</Text>
                    </View>

                    <Button
                        title="Keep it up!"
                        onPress={() => navigation.navigate('Home')}
                        size="l"
                        variant="secondary"
                        style={styles.button}
                    />
                </Animated.View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly', // Better vertical distribution
        paddingVertical: 40
    },
    headerContainer: {
        alignItems: 'center',
        marginTop: 20
    },
    headerTitle: {
        ...theme.text.h1,
        color: '#FFF',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        letterSpacing: 1
    },
    headerSubtitle: {
        ...theme.text.body,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 8,
        letterSpacing: 0.5
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // Slightly translucent white
        width: width * 0.85,
        aspectRatio: 0.85,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        ...theme.shadows.large,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        elevation: 10
    },
    glow: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: theme.colors.secondary,
        opacity: 0.5,
        top: 40
    },
    imageContainer: {
        width: 180,
        height: 180,
        marginBottom: 20,
        zIndex: 2
    },
    image: {
        width: '100%',
        height: '100%',
    },
    name: {
        fontSize: 28,
        fontWeight: '800',
        color: theme.colors.text.primary,
        marginBottom: 12,
        textAlign: 'center'
    },
    badge: {
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.2
    },
    footer: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 30
    },
    statBox: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 16,
        marginBottom: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    statLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4
    },
    statValue: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700'
    },
    button: {
        width: '100%',
        backgroundColor: '#FFF', // White button
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5
    }
});
