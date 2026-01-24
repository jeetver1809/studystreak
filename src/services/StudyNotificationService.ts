import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Logger } from '../utils/logger';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

export const StudyNotificationService = {
    async requestPermissions() {
        // Setup categories for interactive notifications
        await Notifications.setNotificationCategoryAsync('timer-controls', [
            {
                identifier: 'PAUSE',
                buttonTitle: 'Pause ⏸️',
                options: {
                    opensAppToForeground: false, // Keep in background
                },
            },
            {
                identifier: 'RESUME',
                buttonTitle: 'Resume ▶️',
                options: {
                    opensAppToForeground: false,
                },
            },
        ]);

        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
    },

    async scheduleStudyNotification(minutes: number, isPaused = false) {
        try {
            // Ensure channel exists on Android
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('study-timer', {
                    name: 'Focus Timer',
                    importance: Notifications.AndroidImportance.HIGH,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#4F46E5', // Electric Indigo
                });
            }

            await Notifications.dismissAllNotificationsAsync();

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: isPaused ? "Timer Paused ⏸️" : "⚡ Deep Focus Active",
                    subtitle: isPaused ? "Ready to resume?" : "Stay in the zone",
                    body: isPaused
                        ? "Don't lose your momentum! Tap to resume."
                        : `🎯 ${minutes}m remaining. You're doing great!`,
                    sticky: true,
                    autoDismiss: false,
                    categoryIdentifier: 'timer-controls',
                    data: { minutes },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    ...(Platform.OS === 'android' ? { channelId: 'study-timer', color: '#4F46E5' } : {}),
                },
                trigger: null,
            });
        } catch (error) {
            Logger.error("Failed to schedule notification:", error);
        }
    },

    async cancelNotifications() {
        try {
            await Notifications.dismissAllNotificationsAsync();
        } catch (error) {
            Logger.error("Failed to cancel notifications:", error);
        }
    },

    async registerForPushNotificationsAsync() {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        return finalStatus === 'granted';
    },

    async scheduleDailyReminder(hour: number, minute: number) {
        try {
            // Cancel existing daily reminders to avoid duplicates
            // Ideally we'd tag them, but canceling all for now is safer or we can manage via IDs
            // For MVP, simple scheduling:

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Time to Study! 📚",
                    body: "Keep your streak alive. log in a session today!",
                },
                trigger: {
                    hour,
                    minute,
                    type: Notifications.SchedulableTriggerInputTypes.DAILY
                },
            });
        } catch (error) {
            Logger.error("Failed to schedule daily reminder:", error);
        }
    }
};
