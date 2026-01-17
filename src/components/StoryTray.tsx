import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from '../types';
import { theme } from '../theme/theme';
import { Globe } from 'lucide-react-native';

interface StoryTrayProps {
    users: User[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
}

export const StoryTray: React.FC<StoryTrayProps> = ({ users, selectedId, onSelect }) => {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {/* "All" Option */}
            <TouchableOpacity
                style={styles.storyItem}
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

            {/* Friend Items */}
            {users.map(user => {
                const isSelected = selectedId === user.uid;
                return (
                    <TouchableOpacity
                        key={user.uid}
                        style={styles.storyItem}
                        onPress={() => onSelect(user.uid)}
                    >
                        <LinearGradient
                            colors={isSelected ? ['#3B82F6', '#8B5CF6'] : ['#E5E7EB', '#E5E7EB']}
                            style={styles.ringGradient}
                        >
                            <View style={styles.avatarContainer}>
                                <Image
                                    source={user.photoURL ? { uri: user.photoURL } : require('../../assets/adaptive-icon.png')}
                                    style={styles.avatar}
                                />
                            </View>
                        </LinearGradient>
                        <Text style={styles.name} numberOfLines={1}>
                            {user.username.split(' ')[0]}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
};

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
