import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from '../../services/firebaseConfig';
import { AuthService } from '../../services/authService';
import { useUserStore } from '../../store/userStore';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const UsernameSetupScreen = () => {
    const [username, setUsername] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const { setUser } = useUserStore();

    const handleCreateProfile = async () => {
        if (username.length < 3) {
            Alert.alert("Invalid Username", "Username must be at least 3 characters long.");
            return;
        }

        setIsValidating(true);
        try {
            // Check uniqueness
            const q = query(collection(db, 'users'), where('username', '==', username));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                Alert.alert("Unavailable", "This username is already taken. Please choose another.");
                setIsValidating(false);
                return;
            }

            if (auth.currentUser) {
                const newUser = await AuthService.createUserProfile(
                    auth.currentUser.uid,
                    auth.currentUser.email || '',
                    username,
                    auth.currentUser.photoURL || undefined
                );
                setUser(newUser);
            }
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Pick a Username</Text>
            <Text style={styles.subtitle}>This is how you'll appear on the leaderboard.</Text>

            <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!isValidating}
            />

            <TouchableOpacity
                style={[styles.button, isValidating && styles.disabledButton]}
                onPress={handleCreateProfile}
                disabled={isValidating}
            >
                {isValidating ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Get Started</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1a1a1a',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        marginBottom: 24,
        backgroundColor: '#f9f9f9',
    },
    button: {
        backgroundColor: '#000',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
