import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, CheckCircle, Circle } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { SubjectService } from '../services/SubjectService';
import { useUserStore } from '../store/userStore';
import { Subject, Chapter } from '../types';
import { LinearGradient } from 'expo-linear-gradient';

export const SubjectDetailsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { user } = useUserStore();
    const { subject } = route.params as { subject: Subject };

    // We maintain local state for chapters to update UI immediately
    const [chapters, setChapters] = useState<Chapter[]>(subject.chapters || []);
    const [isModalVisible, setModalVisible] = useState(false);
    const [newChapterName, setNewChapterName] = useState('');

    const handleAddChapter = async () => {
        if (!newChapterName.trim() || !user) return;
        try {
            const newChapter = await SubjectService.addChapter(user.uid, subject.id, newChapterName);
            setChapters([...chapters, newChapter]);
            setNewChapterName('');
            setModalVisible(false);
        } catch (error) {
            Alert.alert("Error", "Failed to add chapter");
        }
    };

    const renderItem = ({ item }: { item: Chapter }) => (
        <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {item.isCompleted ? (
                    <CheckCircle size={20} color={theme.colors.success} />
                ) : (
                    <Circle size={20} color={theme.colors.text.disabled} />
                )}
                <Text style={styles.chapterName}>{item.name}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#FFFFFF', '#F0F9FF']}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.title}>{subject.name}</Text>
                    <Text style={styles.subtitle}>{chapters.length} Chapters</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <Plus size={24} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={chapters}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />

            <Modal visible={isModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Chapter</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Chapter Name"
                            value={newChapterName}
                            onChangeText={setNewChapterName}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.btnTextSecondary}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddChapter} style={styles.saveBtn}>
                                <Text style={styles.btnTextPrimary}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.l,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    title: { ...theme.text.h2, color: theme.colors.text.primary },
    subtitle: { ...theme.text.caption, color: theme.colors.text.secondary },
    list: { padding: theme.spacing.l },
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.m,
        ...theme.shadows.small,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    chapterName: { ...theme.text.body, color: theme.colors.text.primary },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: theme.spacing.l
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: theme.spacing.xl
    },
    modalTitle: { ...theme.text.h2, marginBottom: 16 },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingVertical: 8,
        fontSize: 18,
        marginBottom: 24
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16
    },
    cancelBtn: { padding: 8 },
    saveBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8
    },
    btnTextPrimary: { color: 'white', fontWeight: 'bold' },
    btnTextSecondary: { color: theme.colors.text.secondary }
});
