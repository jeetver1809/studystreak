import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from '../types';
import { theme } from '../theme/theme';
import { Globe } from 'lucide-react-native';
import { Avatar } from './ui/Avatar';

interface StoryTrayProps {
    users: User[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}

export const StoryTray: React.FC<StoryTrayProps> = ({ users, selectedId, onSelect }) => {

    // Header for "All" option
    const renderHeader = useCallback(() => (
        <TouchableOpacity
            style={[styles.storyItem, { marginRight: 16 }]}
            onPress={() => onSelect(null)}
        >
            <View style={[
                styles.ring,
                selectedId === null ? styles.ringActive : styles.ringInactive
            ]}>
                <View style={styles.avatarPlaceholder}>
                    <Globe size={24} color={selectedId === null ? "white" : theme.colors.primary} />
                </View>
            </View>
            <Text style={styles.name}>All</Text>
        </TouchableOpacity>
    ), [selectedId, onSelect]);

    const renderItem = useCallback(({ item }: { item: User }) => (
        <StoryItem
            user={item}
            isSelected={selectedId === item.uid}
            onSelect={onSelect}
        />
    ), [selectedId, onSelect]);

    return (
        <FlatList
            data={users}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
            renderItem={renderItem}
            keyExtractor={item => item.uid}
            ListHeaderComponent={renderHeader}
            initialNumToRender={5}
            windowSize={3}
        />
    );
};

// Memoized Item
const StoryItem = React.memo(({ user, isSelected, onSelect }: { user: User, isSelected: boolean, onSelect: (id: string) => void }) => {
    return (
        <TouchableOpacity
            style={styles.storyItem}
            onPress={() => onSelect(user.uid)}
        >
            <LinearGradient
                colors={isSelected ? ['#3B82F6', '#8B5CF6'] : ['#E5E7EB', '#E5E7EB']}
                style={styles.ringGradient}
            >
                <View style={styles.avatarContainer}>
                    <Avatar source={user.photoURL} size={52} />
                </View>
            </LinearGradient>
            <Text style={styles.name} numberOfLines={1}>
                {user.username.split(' ')[0]}
            </Text>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 16,
    },
    storyItem: {
        alignItems: 'center',
        width: 64,
    },
    ring: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    ringGradient: {
        width: 62,
        height: 62,
        borderRadius: 31,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    ringActive: {
        backgroundColor: theme.colors.primary,
        borderWidth: 0,
    },
    ringInactive: {
        backgroundColor: '#F3F4F6',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.1)', // slightly darker for "All" icon bg if needed, or transparent if ring handles it.
        // Actually for "All", if active, ring is blue, so icon should be white.
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'white', // Border gap
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    name: {
        fontSize: 12,
        color: '#4B5563',
        fontWeight: '500',
    }
});
