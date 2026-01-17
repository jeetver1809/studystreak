import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../theme/theme';

interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    padding?: 'none' | 's' | 'm' | 'l';
}

export const Card = ({ children, style, padding = 'm' }: CardProps) => {
    const getPadding = () => {
        switch (padding) {
            case 'none': return 0;
            case 's': return theme.spacing.s;
            case 'm': return theme.spacing.m;
            case 'l': return theme.spacing.l;
            default: return theme.spacing.m;
        }
    };

    return (
        <Animated.View
            entering={FadeInDown.springify()}
            style={[styles.card, { padding: getPadding() }, style]}
        >
            {children}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        // Modern "Soft" Shadow
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    }
});
