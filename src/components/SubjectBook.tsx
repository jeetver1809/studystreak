import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    Easing
} from 'react-native-reanimated';
import { Subject } from '../types';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface Props {
    subject: Subject;
    isSelected: boolean;
    onPress: () => void;
    onLongPress?: () => void;
}

const BOOK_WIDTH = 140;
const BOOK_HEIGHT = 180;
const SPINE_WIDTH = 14;

// Rich, deep colors for book covers that ensuring white text is visible
const BOOK_PALETTE = [
    '#D32F2F', // Red 700
    '#C2185B', // Pink 700
    '#7B1FA2', // Purple 700
    '#512DA8', // Deep Purple 700
    '#303F9F', // Indigo 700
    '#1976D2', // Blue 700
    '#0288D1', // Light Blue 700
    '#0097A7', // Cyan 700
    '#00796B', // Teal 700
    '#388E3C', // Green 700
    '#689F38', // Light Green 700
    '#AFB42B', // Lime 700
    '#FBC02D', // Yellow 700
    '#FFA000', // Amber 700
    '#F57C00', // Orange 700
    '#E64A19', // Deep Orange 700
    '#5D4037', // Brown 700
    '#616161', // Grey 700
    '#455A64', // Blue Grey 700
];

const getBookColor = (id: string, definedColor?: string) => {
    if (definedColor) return definedColor;

    // Simple hash to pick a consistent color from palette
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % BOOK_PALETTE.length;
    return BOOK_PALETTE[index];
};

const SubjectBookComponent = ({ subject, isSelected, onPress, onLongPress }: Props) => {
    // ... logic ...
    const animation = useSharedValue(0);
    const sheenProgress = useSharedValue(0);

    // Determine color
    const bookColor = getBookColor(subject.id, subject.color);

    useEffect(() => {
        animation.value = withSpring(isSelected ? 1 : 0, {
            damping: 12, // Bouncier
            stiffness: 100
        });

        if (isSelected) {
            sheenProgress.value = 0;
            sheenProgress.value = withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) });
        }
    }, [isSelected]);

    const handlePress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onPress();
    };

    const animatedStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(animation.value, [0, 1], [0, -15]); // Open slightly
        const translateY = interpolate(animation.value, [0, 1], [0, -12]);
        const scale = interpolate(animation.value, [0, 1], [1, 1.05]);
        const shadowOpacity = interpolate(animation.value, [0, 1], [0.2, 0.5]);

        return {
            transform: [
                { perspective: 1000 },
                { rotateY: `${rotateY}deg` },
                { translateY: translateY },
                { scale: scale }
            ],
            shadowOpacity: shadowOpacity,
        };
    });

    const sheenStyle = useAnimatedStyle(() => {
        const translateX = interpolate(sheenProgress.value, [0, 1], [-BOOK_WIDTH, BOOK_WIDTH * 1.5]);
        return {
            transform: [{ translateX }],
            opacity: interpolate(sheenProgress.value, [0, 0.5, 1], [0, 0.5, 0]), // More visible (0.5)
        };
    });

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={handlePress} onLongPress={onLongPress}>
            <Animated.View style={[styles.container, animatedStyle]}>

                {/* Book Spine (Left) */}
                <View style={[styles.spine, { backgroundColor: bookColor }]}>
                    <View style={styles.spineOverlay} />
                </View>

                {/* Book Cover */}
                <View style={[styles.cover, { backgroundColor: bookColor }]}>
                    {/* Sheen Effect */}
                    <Animated.View style={[styles.sheen, sheenStyle]} />

                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Text style={styles.iconText}>{subject.name.charAt(0)}</Text>
                        </View>
                        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
                            {subject.name}
                        </Text>
                    </View>

                    {/* Selected Badge */}
                    {isSelected && (
                        <View style={styles.badge}>
                            <Check size={12} color="white" strokeWidth={4} />
                        </View>
                    )}
                </View>

                {/* Pages (Right Edge effect - Simplified) */}
                <View style={[styles.pagesRight]} />

            </Animated.View>
        </TouchableOpacity>
    );
};

export const SubjectBook = React.memo(SubjectBookComponent);

const styles = StyleSheet.create({
    container: {
        width: BOOK_WIDTH,
        height: BOOK_HEIGHT,
        marginHorizontal: 8,
        marginVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, // More natural drop shadow
        shadowOpacity: 0.15, // Lighter shadow
        shadowRadius: 8,
        elevation: 6,
    },
    spine: {
        position: 'absolute',
        left: 0,
        width: SPINE_WIDTH,
        height: '100%',
        borderTopLeftRadius: 16, // Rounded
        borderBottomLeftRadius: 16,
        zIndex: 1,
    },
    spineOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },
    cover: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: SPINE_WIDTH - 2,
        right: 4, // Space for pages
        padding: 8, // Reduced padding
        borderRadius: 0, // Reset
        borderTopRightRadius: 16, // Rounded outer corners
        borderBottomRightRadius: 16,
        zIndex: 2,
        overflow: 'hidden', // Clip sheen
    },
    sheen: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 60, // Wider sheen
        backgroundColor: 'rgba(255,255,255,0.4)',
        transform: [{ skewX: '-20deg' }], // Angled sheen
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    iconText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    title: {
        color: 'white',
        fontWeight: '600', // Semibold
        fontSize: 15, // Reduced from 16
        textAlign: 'center',
        lineHeight: 20,
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 10,
        padding: 2,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    pagesRight: {
        position: 'absolute',
        right: 0,
        top: 2,
        bottom: 2,
        width: 4,
        backgroundColor: '#F8F8F8',
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
        zIndex: 0,
    }
});
