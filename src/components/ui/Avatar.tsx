import { View, Image, StyleSheet, ViewStyle, ImageStyle, StyleProp } from 'react-native';
import { User } from 'lucide-react-native';
import { theme } from '../../theme/theme';

interface AvatarProps {
    source?: string | null;
    size?: number;
    style?: StyleProp<ImageStyle>;
}

export const Avatar: React.FC<AvatarProps> = ({ source, size = 60, style }) => {
    // If we have a source URL, show the image
    if (source) {
        return (
            <Image
                source={{ uri: source }}
                style={[
                    styles.avatar,
                    { width: size, height: size, borderRadius: size / 2 },
                    style
                ]}
            />
        );
    }

    // Fallback: Icon
    return (
        <View
            style={[
                styles.fallback,
                { width: size, height: size, borderRadius: size / 2 },
                style
            ]}
        >
            <User size={size * 0.5} color="#94A3B8" />
        </View>
    );
};

const styles = StyleSheet.create({
    avatar: {
        backgroundColor: '#E2E8F0',
    },
    fallback: {
        backgroundColor: '#F1F5F9', // Light gray/blue
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    }
});
