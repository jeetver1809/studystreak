import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthService } from '../../services/authService';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export const RegisterScreen = () => {
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!email || !password || !username) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Weak Password', 'Password should be at least 6 characters long.');
            return;
        }

        setLoading(true);
        try {
            // 1. Check Username Uniqueness
            const isAvailable = await AuthService.checkUsernameAvailability(username);
            if (!isAvailable) {
                Alert.alert('Username Taken', 'This username is already being used by someone else.');
                setLoading(false);
                return;
            }

            const user = await AuthService.registerWithEmail(email, password, username);

            // Send Verification Email
            // Workaround: Get current user from auth (since they are logged in after register)
            const { auth } = require('../../services/firebaseConfig');
            if (auth.currentUser) {
                await AuthService.sendVerificationEmail(auth.currentUser);
                Alert.alert("Success!", "Account created. Please verify your email address to secure your account.");
            }
        } catch (error: any) {
            Alert.alert('Registration Failed', error.message);
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#FFFFFF', '#EEF2FF']} // White -> Very Light Indigo
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
            >
                <Animated.View entering={FadeInDown.delay(200).duration(1000).springify()} style={styles.headerContainer}>
                    <Text style={styles.appTitle}>Study Streak</Text>
                    <Text style={styles.title}>Join the Party!</Text>
                    <Text style={styles.subtitle}>Create your legend today.</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(500).duration(1000).springify()} style={styles.formContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor="#999"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#999"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <Text style={styles.registerButtonText}>{loading ? "Creating Account..." : "Sign Up"}</Text>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(700).duration(1000).springify()} style={styles.footer}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkContainer}>
                        <Text style={styles.linkText}>Already have an account? <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline', color: '#4F46E5' }}>Log In</Text></Text>
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    appTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#4F46E5', // Indigo Primary
        marginBottom: 5,
        letterSpacing: 1,
        // Removed text shadow for cleaner look on light bg or soft shadow
        textShadowColor: 'rgba(79, 70, 229, 0.2)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 10
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937', // Dark Grey
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280', // Medium Grey
        opacity: 0.9,
    },
    formContainer: {
        width: width * 0.85,
        backgroundColor: '#FFFFFF',
        padding: 25,
        borderRadius: 30,
        shadowColor: "#4F46E5", // Indigo shadow
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15, // Slightly stronger for white-on-white/light
        shadowRadius: 20,
        elevation: 10,
    },
    inputWrapper: {
        marginBottom: 15,
        backgroundColor: '#F9FAFB',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    input: {
        padding: 15,
        paddingHorizontal: 20,
        fontSize: 16,
        color: '#111827',
    },
    registerButton: {
        backgroundColor: '#10B981', // Accent Green
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    registerButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footer: {
        marginTop: 30,
    },
    linkContainer: {
        padding: 10,
    },
    linkText: {
        color: '#4B5563', // Darker Grey
        fontSize: 16,
    }
});
