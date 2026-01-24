import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuthListener } from '../hooks/useAuthListener';
import { useUserStore } from '../store/userStore';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { UsernameSetupScreen } from '../screens/auth/UsernameSetupScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { StudySessionScreen } from '../screens/StudySessionScreen';
import { UnlockScreen } from '../screens/UnlockScreen';
import { PartyScreen } from '../screens/PartyScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { UserListScreen } from '../screens/UserListScreen';
import { SocialFeedScreen } from '../screens/SocialFeedScreen';
import { VerifyEmailScreen } from '../screens/auth/VerifyEmailScreen';

import { SubjectsScreen } from '../screens/SubjectsScreen';
import { SubjectDetailsScreen } from '../screens/SubjectDetailsScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
    const { isNewUser } = useAuthListener();
    const { user, isLoading } = useUserStore();

    // Default to true (verified) if user is newly persisted to avoid blocking? 
    // No, strictly check user object. If user exists, isEmailVerified should be there.
    // However, existing users in DB won't have this field yet.
    // So we should treat "undefined" as "true" (verified) for backward compatibility,
    // OR migrate existing users.
    // For now, treat undefined as verified to avoid blocking legacy users.
    const isEmailVerified = user?.isEmailVerified ?? true;

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#FFFFFF' }, // Force white background
                gestureEnabled: true,
                animation: 'none', // Globally disable animations to prevent rendering/color artifacts
                // Transition presets are handled natively by default
            }}
        >
            {user ? (
                // Enforce Email Verification
                !isEmailVerified ? (
                    <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
                ) : (
                    <>
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Subjects" component={SubjectsScreen} />
                        <Stack.Screen name="SubjectDetails" component={SubjectDetailsScreen} />
                        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
                        <Stack.Screen
                            name="StudySession"
                            component={StudySessionScreen}
                            options={{
                                contentStyle: { backgroundColor: '#FFFFFF' },
                                animation: 'none', // Disable sliding to prevent ghosting
                            }}
                        />
                        <Stack.Screen name="Unlock" component={UnlockScreen} />
                        <Stack.Screen name="Party" component={PartyScreen} />
                        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                        <Stack.Screen name="Profile" component={ProfileScreen} />
                        <Stack.Screen name="UserList" component={UserListScreen} />
                        <Stack.Screen name="SocialFeed" component={SocialFeedScreen} />
                    </>
                )
            ) : (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                    {isNewUser && (
                        <Stack.Screen name="UsernameSetup" component={UsernameSetupScreen} />
                    )}
                </>
            )}
        </Stack.Navigator>
    );
};
