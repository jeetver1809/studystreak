import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
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

    // Edit Username State
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [newUsername, setNewUsername] = useState(user?.username || "");
    const [isSaving, setIsSaving] = useState(false);

    const toggleDarkMode = (value: boolean) => {
        setDarkMode(value);
        if (user) updateUser({ isDarkMode: value });
        // TODO: Apply Theme Context globally
    };

    const handleNotificationSetup = async () => {
        await NotificationService.registerForPushNotificationsAsync();
        await NotificationService.scheduleDailyReminder(9, 0);
        Alert.alert("Notifications Enabled", "We'll remind you at 9:00 AM daily.");
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

                <TouchableOpacity style={styles.row} onPress={handleNotificationSetup}>
                    <Text style={styles.label}>Enable Daily Reminders</Text>
                    <Text style={styles.link}>Setup</Text>
                </TouchableOpacity>
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
                    <Text style={styles.value}>1.0.0 (MVP)</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

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
    }
});
