import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Dimensions, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthService } from '../../services/authService';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export const LoginScreen = () => {
    // using any for simplicity, ensuring compatibility
    const navigation = useNavigation<StackNavigationProp<any>>();

    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleEmailLogin = async () => {
        const trimmedEmail = email.trim();
        console.log("Attempting login with:", trimmedEmail, password ? "[PASSWORD_SET]" : "[PASSWORD_EMPTY]");

        if (!trimmedEmail || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            Alert.alert("Invalid Email", "Please enter a full email address (e.g., example@gmail.com).");
            return;
        }

        setLoading(true);
        try {
            await AuthService.loginWithEmail(trimmedEmail, password);
            console.log("LoginScreen: Login successful, waiting for auth listener");
        } catch (error: any) {
            let msg = "An unexpected error occurred.";
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                msg = "Invalid email or password.";
            } else if (error.code === 'auth/invalid-email') {
                msg = "Please enter a valid email address.";
            } else if (error.code === 'auth/too-many-requests') {
                msg = "Too many failed attempts. Please try again later.";
            } else {
                msg = error.message;
            }
            Alert.alert("Login Failed", msg);
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
                    <Image
                        source={require('../../images/app_logos/login_signup app image.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Welcome Back!</Text>
                    <Text style={styles.subtitle}>Ready to crush your goals?</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(500).duration(1000).springify()} style={styles.formContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
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

                    <TouchableOpacity style={styles.loginButton} onPress={handleEmailLogin} disabled={loading}>
                        <Text style={styles.loginButtonText}>{loading ? "Connecting..." : "Log In"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={async () => {
                            const trimmedEmail = email.trim();
                            if (!trimmedEmail) {
                                Alert.alert("Forgot Password", "Enter your email above so we can send the reset link.");
                                return;
                            }
                            try {
                                await AuthService.sendPasswordReset(trimmedEmail);
                                Alert.alert("Email Sent", "Check your inbox for password reset instructions.");
                            } catch (error: any) {
                                Alert.alert("Error", error.message);
                            }
                        }}
                        style={{ alignSelf: 'center', marginTop: 15 }}
                    >
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(700).duration(1000).springify()} style={styles.footer}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Register')}
                        style={styles.linkContainer}
                    >
                        <Text style={styles.linkText}>New here? <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline', color: '#4F46E5' }}>Create Account</Text></Text>
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
        marginBottom: 40,
    },
    logo: {
        width: 300,
        height: 100,
        marginBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1F2937', // Dark Grey
        marginBottom: 10,
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
    loginButton: {
        backgroundColor: '#4F46E5', // Primary Indigo
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    forgotPasswordText: {
        color: '#6B7280',
        fontSize: 14,
    },
    footer: {
        marginTop: 40,
    },
    linkContainer: {
        padding: 10,
    },
    linkText: {
        color: '#4B5563', // Darker Grey for "New here?"
        fontSize: 16,
    }
});
