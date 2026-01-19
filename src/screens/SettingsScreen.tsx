import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Linking } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Edit2, X } from 'lucide-react-native';
import { useUserStore } from '../store/userStore';
import { AuthService } from '../services/authService';
import { NotificationService } from '../services/notificationService';
import { theme } from '../theme/theme';

export const SettingsScreen = () => {
    const navigation = useNavigation<any>();
    const { user, updateUser } = useUserStore();
    const [darkMode, setDarkMode] = useState(user?.isDarkMode || false);

    // Notification Time State
    const [reminderTime, setReminderTime] = useState(new Date(new Date().setHours(9, 0, 0, 0))); // Default 9 AM
    const [showTimePicker, setShowTimePicker] = useState(false);

    // Edit Username State
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [newUsername, setNewUsername] = useState(user?.username || "");
    const [isSaving, setIsSaving] = useState(false);

    const toggleDarkMode = (value: boolean) => {
        setDarkMode(value);
        if (user) updateUser({ isDarkMode: value });
        // TODO: Apply Theme Context globally
    };

    const handleTimeChange = async (event: any, selectedDate?: Date) => {
        setShowTimePicker(false);
        if (selectedDate) {
            setReminderTime(selectedDate);
            const hour = selectedDate.getHours();
            const minute = selectedDate.getMinutes();

            await NotificationService.registerForPushNotificationsAsync();
            await NotificationService.scheduleDailyReminder(hour, minute);

            Alert.alert("Reminder Set!", `We'll buzz you at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} daily.`);
        }
    };

    const handleLogout = async () => {
        await AuthService.logout();
    };

    const handleSaveUsername = async () => {
        if (!newUsername.trim()) {
            Alert.alert("Error", "Username cannot be empty");
            return;
        }
        if (!user?.uid) return;

        setIsSaving(true);
        try {
            await AuthService.updateUsername(user.uid, newUsername.trim());
            updateUser({ username: newUsername.trim() });
            setEditModalVisible(false);
            Alert.alert("Success", "Username updated!");
        } catch (error) {
            Alert.alert("Error", "Failed to update username.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronLeft size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferences</Text>

                <View style={styles.row}>
                    <Text style={styles.label}>Dark Mode</Text>
                    <Switch value={darkMode} onValueChange={toggleDarkMode} />
                </View>

                <TouchableOpacity style={styles.row} onPress={() => setShowTimePicker(true)}>
                    <Text style={styles.label}>Daily Reminder</Text>
                    <Text style={styles.link}>
                        {reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </TouchableOpacity>

                {showTimePicker && (
                    <DateTimePicker
                        value={reminderTime}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={handleTimeChange}
                    />
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.row}>
                    <Text style={styles.label}>Username</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={styles.value}>{user?.username || user?.uid?.substring(0, 8) || "Unknown"}</Text>
                        <TouchableOpacity onPress={() => { setNewUsername(user?.username || ""); setEditModalVisible(true); }}>
                            <Edit2 size={16} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>User ID</Text>
                    <Text style={[styles.value, { maxWidth: 150 }]} numberOfLines={1}>{user?.uid || "MISSING"}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Version</Text>
                    <Text style={styles.value}>1.1 (MVP)</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            {/* Credits Footer */}
            <View style={styles.footer}>
                <Text style={styles.creditsText}>developed by Jeet Verma💗</Text>
                <View style={styles.linksContainer}>
                    <TouchableOpacity onPress={() => Linking.openURL('https://github.com/jeetver1809')}>
                        <Text style={styles.linkText}>GitHub</Text>
                    </TouchableOpacity>
                    <Text style={styles.divider}>•</Text>
                    <TouchableOpacity onPress={() => Linking.openURL('https://discord.com/users/872817963659587606')}>
                        <Text style={styles.linkText}>Discord</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Edit Username Modal */}
            <Modal
                visible={isEditModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <KeyboardAvoidingView
                                behavior={Platform.OS === "ios" ? "padding" : "height"}
                                style={styles.modalContent}
                            >
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Edit Username</Text>
                                    <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                        <X size={24} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    style={styles.input}
                                    value={newUsername}
                                    onChangeText={setNewUsername}
                                    placeholder="Enter new username"
                                    autoFocus
                                    maxLength={20}
                                />

                                <TouchableOpacity
                                    style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                                    onPress={handleSaveUsername}
                                    disabled={isSaving}
                                >
                                    <Text style={styles.saveBtnText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
                                </TouchableOpacity>
                            </KeyboardAvoidingView>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold' },
    section: { marginTop: 20, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 14, color: '#888', marginBottom: 10, textTransform: 'uppercase', fontWeight: 'bold' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    label: { fontSize: 16, color: '#333' },
    value: { fontSize: 16, color: '#666' },
    link: { fontSize: 16, color: '#007AFF' },
    logoutBtn: { margin: 20, padding: 16, backgroundColor: '#f0f0f0', borderRadius: 12, alignItems: 'center', marginTop: 40 },
    logoutText: { color: '#FF3B30', fontWeight: 'bold', fontSize: 16 },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        ...theme.shadows.large
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text.primary
    },
    input: {
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        marginBottom: 24,
        color: '#000'
    },
    saveBtn: {
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center'
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    footer: {
        marginTop: 'auto', // Push to bottom if container flexes, otherwise just margin
        marginBottom: 20,
        alignItems: 'center',
        opacity: 0.6
    },
    creditsText: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    linksContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    linkText: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '600'
    },
    divider: {
        fontSize: 12,
        color: '#CCC'
    }
});
