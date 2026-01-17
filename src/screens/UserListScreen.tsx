import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { theme } from '../theme/theme';
import { db } from '../services/firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, documentId } from 'firebase/firestore';

interface UserListItem {
    uid: string;
    username: string;
    photoURL?: string;
    bio?: string;
}

export const UserListScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { userId, type, title } = route.params; // type: 'followers' | 'following'

    const [users, setUsers] = useState<UserListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, [userId, type]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // 1. Get the target user's document to find IDs
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (!userDoc.exists()) {
                setLoading(false);
                return;
            }

            const userData = userDoc.data();
            const ids = type === 'following' ? userData.followingIds : userData.followersIds;

            if (!ids || ids.length === 0) {
                setUsers([]);
                setLoading(false);
                return;
            }

            // 2. Query users by those IDs
            // Firestore 'in' query supports up to 10 items. For more, we need to batch or loop. 
            // For simplicity in this demo, we'll fetch them (or assume limiting to recent 10).
            // A better way for large lists is to store a subcollection 'followers' with redundant data.
            // Here we'll just loop fetch for simplicity since we don't expect 1000s yet.

            const userPromises = ids.map((id: string) => getDoc(doc(db, 'users', id)));
            const userSnapshots = await Promise.all(userPromises);

            const loadedUsers = userSnapshots
                .filter(snap => snap.exists())
                .map(snap => ({ uid: snap.id, ...snap.data() } as UserListItem));

            setUsers(loadedUsers);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: UserListItem }) => (
        <TouchableOpacity
            style={styles.userRow}
            onPress={() => navigation.push('Profile', { userId: item.uid })}
        >
            <Image
                source={item.photoURL ? { uri: item.photoURL } : require('../../assets/adaptive-icon.png')}
                style={styles.avatar}
            />
            <View style={styles.userInfo}>
                <Text style={styles.username}>{item.username}</Text>
                {item.bio && <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <ArrowLeft size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>{title}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderItem}
                    keyExtractor={item => item.uid}
                    contentContainerStyle={{ padding: theme.spacing.m }}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No users found.</Text>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.s,
        paddingBottom: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        ...theme.text.h3,
        color: theme.colors.text.primary,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#eee',
    },
    userInfo: {
        marginLeft: theme.spacing.m,
        flex: 1,
    },
    username: {
        ...theme.text.body,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    bio: {
        ...theme.text.caption,
        color: theme.colors.text.secondary,
        marginTop: 2,
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.text.secondary,
        marginTop: 40,
        ...theme.text.body,
    }
});
