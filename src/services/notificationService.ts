import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => {
        return {
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        };
    },
});

export const NotificationService = {
    async registerForPushNotificationsAsync() {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return;
            }
        } else {
            console.log('Must use physical device for Push Notifications');
        }
    },

    async scheduleDailyReminder(hour: number = 20, minute: number = 0) {
        await Notifications.cancelAllScheduledNotificationsAsync();

        const messages = [
            { title: "Time to study! 😼", body: "Don't break the streak, legend." },
            { title: "Study or bad luck 🔮", body: "Just kidding (maybe). Open the app!" },
            { title: "Hey you! 👀", body: "Your future self is begging you to study." },
            { title: "Knock knock 🚪", body: "Who's there? A higher GPA if you study now." },
            { title: "Brain food time 🧠", body: "Feed your brain some knowledge." },
            { title: "Streak at risk! 🔥", body: "Save your streak before it freezes!" },
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        await Notifications.scheduleNotificationAsync({
            content: {
                title: randomMessage.title,
                body: randomMessage.body,
            },
            trigger: {
                hour,
                minute,
                repeats: true,
            } as any,
        });
        console.log(`Scheduled reminder for ${hour}:${minute} with message: ${randomMessage.title}`);
    }
};
