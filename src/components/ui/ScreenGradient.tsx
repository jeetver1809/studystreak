import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ScreenGradientProps {
    style?: ViewStyle;
}

export const ScreenGradient: React.FC<ScreenGradientProps> = ({ style }) => {
    return (
        <LinearGradient
            colors={['#FFFFFF', '#F0F9FF']}
            style={[StyleSheet.absoluteFill, { zIndex: -1 }, style]}
        />
    );
};
