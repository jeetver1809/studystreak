import React from 'react';
import { Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { theme } from '../../theme/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
type ButtonSize = 's' | 'm' | 'l';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    style?: any;
    icon?: React.ReactNode;
}

import { LinearGradient } from 'expo-linear-gradient';

export const Button = ({
    title,
    onPress,
    variant = 'primary',
    size = 'm',
    loading = false,
    disabled = false,
    style,
    icon
}: ButtonProps) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.96);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    const getBackgroundColor = () => {
        if (disabled) return theme.colors.text.disabled;
        switch (variant) {
            case 'primary': return theme.colors.primary;
            case 'secondary': return theme.colors.secondary;
            case 'danger': return theme.colors.error;
            case 'ghost': return 'transparent';
            default: return theme.colors.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return '#fff';
        switch (variant) {
            case 'primary': return theme.colors.primaryForeground;
            case 'secondary': return theme.colors.secondaryForeground;
            case 'danger': return '#fff';
            case 'ghost': return theme.colors.primary;
            default: return '#fff';
        }
    };

    const containerStyles = [
        styles.base,
        styles[size],
        variant !== 'gradient' && { backgroundColor: getBackgroundColor() },
        variant === 'secondary' && styles.border,
        style
    ];

    const textStyle = {
        color: variant === 'gradient' ? '#fff' : getTextColor(),
        fontSize: size === 'l' ? 18 : 16,
        fontWeight: '600' as const,
    };

    const content = (
        <>
            {loading ? (
                <ActivityIndicator color={textStyle.color} />
            ) : (
                <>
                    {icon && icon}
                    <Text style={[textStyle, icon ? { marginLeft: 8 } : {}]}>{title}</Text>
                </>
            )}
        </>
    );

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={!disabled && !loading ? onPress : undefined}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
        >
            <Animated.View style={[containerStyles, animatedStyle]}>
                {variant === 'gradient' && !disabled ? (
                    <LinearGradient
                        colors={theme.gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                ) : null}
                {/* ZIndex needed to sit above gradient */}
                <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 1 }}>
                    {content}
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.l, // More rounded modern look
        overflow: 'hidden', // Essential for gradient
    },
    border: {
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    s: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    m: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    l: {
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
});
