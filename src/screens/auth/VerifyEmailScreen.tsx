import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../../services/firebaseConfig';
import { AuthService } from '../../services/authService';
import { sendEmailVerification } from 'firebase/auth';

import { useUserStore } from '../../store/userStore';

export const VerifyEmailScreen = () => {
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const { updateUser } = useUserStore();

    const checkVerification = async () => {
        setChecking(true);
        try {
            await auth.currentUser?.reload();
            if (auth.currentUser?.emailVerified) {
                // Force a refresh of the app state (listener should pick it up)
                // Or we might need to manually trigger a re-render in RootNavigator if it relies on a discrete state
                // Ideally, useAuthListener will notice the change if we force an update
                Alert.alert("Success", "Email verified! Logging you in...");

                // Explicitly update global store to trigger navigation
                updateUser({ isEmailVerified: true });

                // Although reload() updates the currentUser, our React state might not know yet.
                // We might need to call a global refresh or just wait for the next auth loop.
                // Actually, if we rely on `onIdTokenChanged`, reload() triggers it.
            } else {
                Alert.alert("Not Verified", "We haven't detected the verification yet. Please try again.");
            }
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setChecking(false);
        }
    };

    const handleResend = async () => {
        setLoading(true);
        try {
            if (auth.currentUser) {
                await sendEmailVerification(auth.currentUser);
                Alert.alert("Sent", "Verification email sent again. Check your spam folder.");
            }
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.icon}>✉️</Text>
                <Text style={styles.title}>Verify your Email</Text>
                <Text style={styles.subtitle}>
                    We sent a verification link to {auth.currentUser?.email}.
                    Please click the link in your email to continue.
                </Text>

                <TouchableOpacity
                    style={styles.checkButton}
                    onPress={checkVerification}
                    disabled={checking}
                >
                    {checking ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>I've Verified It</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResend}
                    disabled={loading}
                >
                    <Text style={styles.resendText}>{loading ? "Sending..." : "Resend Email"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{ marginTop: 20 }}
                    onPress={() => AuthService.logout()}
                >
                    <Text style={{ color: '#666' }}>Cancel / Logout</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20 },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    icon: { fontSize: 64, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40, lineHeight: 24 },
    checkButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
        marginBottom: 15
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    resendButton: { padding: 10 },
    resendText: { color: '#007AFF', fontSize: 16 }
});
