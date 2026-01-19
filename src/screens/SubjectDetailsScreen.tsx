import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, CheckCircle, Circle, FileText, X, Edit2, Check, ChevronRight } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { SubjectService } from '../services/SubjectService';
import { useUserStore } from '../store/userStore';
import { Subject, Chapter } from '../types';
import { ScreenGradient } from '../components/ui/ScreenGradient';

export const SubjectDetailsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { user } = useUserStore();
    const { subject } = route.params as { subject: Subject };

    // Need to keep subject state local to reflect edits immediately
    const [currentSubject, setCurrentSubject] = useState<Subject>(subject);

    // Book Colors (Same as SubjectsScreen)
    const BOOK_COLORS = [
        '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
        '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'
    ];

    // We maintain local state for chapters to update UI immediately
    const [chapters, setChapters] = useState<Chapter[]>(subject.chapters || []);
    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [newChapterName, setNewChapterName] = useState('');

    // Edit Subject Modal
    const [isEditSubjectModalVisible, setEditSubjectModalVisible] = useState(false);
    const [editSubjectName, setEditSubjectName] = useState(subject.name);
    const [editSubjectColor, setEditSubjectColor] = useState(subject.color);

    // Detail/Edit Modal State
    const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');

    const handleAddChapter = async () => {
        if (!newChapterName.trim() || !user) return;
        try {
            const newChapter = await SubjectService.addChapter(user.uid, currentSubject.id, newChapterName);
            setChapters([...chapters, newChapter]);
            setNewChapterName('');
            setAddModalVisible(false);
        } catch (error) {
            Alert.alert("Error", "Failed to add chapter");
        }
    };

    const handleSaveSubjectDetails = async () => {
        if (!editSubjectName.trim() || !user) return;
        try {
            await SubjectService.updateSubject(user.uid, currentSubject.id, {
                name: editSubjectName,
                color: editSubjectColor
            });
            setCurrentSubject({ ...currentSubject, name: editSubjectName, color: editSubjectColor });
            setEditSubjectModalVisible(false);
        } catch (error) {
            Alert.alert("Error", "Failed to update subject");
        }
    };

    const handleSaveChapterDetails = async () => {
        if (!selectedChapter || !user) return;

        const updatedChapter: Chapter = {
            ...selectedChapter,
            name: editName,
            description: editDescription
        };

        try {
            await SubjectService.updateChapter(user.uid, currentSubject.id, updatedChapter);

            // Update local state
            setChapters(chapters.map(c => c.id === updatedChapter.id ? updatedChapter : c));
            setSelectedChapter(null);
        } catch (error) {
            Alert.alert("Error", "Failed to save changes");
        }
    };

    const openChapterDetails = (chapter: Chapter) => {
        setSelectedChapter(chapter);
        setEditName(chapter.name);
        setEditDescription(chapter.description || '');
    };

    const handleDeleteChapter = (chapterId: string) => {
        Alert.alert(
            "Delete Chapter",
            "Are you sure you want to delete this chapter?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        if (!user) return;
                        try {
                            await SubjectService.deleteChapter(user.uid, currentSubject.id, chapterId);
                            setChapters(chapters.filter(c => c.id !== chapterId));
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete chapter");
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Chapter }) => (
        <TouchableOpacity
            style={styles.chapterCard}
            onPress={() => openChapterDetails(item)}
            onLongPress={() => handleDeleteChapter(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.chapterHeader}>
                {/* No Check Circle on left as per new design */}
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[
                        styles.chapterName,
                        item.isCompleted && styles.chapterNameCompleted
                    ]}>
                        {item.name}
                    </Text>
                    {item.description ? (
                        <Text numberOfLines={1} style={styles.chapterPreview}>{item.description}</Text>
                    ) : (
                        <Text style={styles.addNoteText}>Tap to view details...</Text>
                    )}
                </View>
                <ChevronRight size={20} color="#CBD5E1" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScreenGradient />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.title}>{currentSubject.name}</Text>
                    <Text style={styles.subtitle}>{chapters.length} Chapters</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => setEditSubjectModalVisible(true)} style={styles.iconButton}>
                        <Edit2 size={20} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addButton}>
                        <Plus size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={chapters}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />

            {/* Add Chapter Modal */}
            <Modal visible={isAddModalVisible} transparent animationType="fade">
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
                            <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.btnTextSecondary}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddChapter} style={styles.saveBtn}>
                                <Text style={styles.btnTextPrimary}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit/Detail Chapter Modal */}
            <Modal visible={!!selectedChapter} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.detailModalContainer}>
                    <View style={styles.detailHeader}>
                        <TouchableOpacity onPress={() => setSelectedChapter(null)} style={styles.closeButton}>
                            <X size={24} color={theme.colors.text.primary} />
                        </TouchableOpacity>
                        <Text style={styles.detailHeaderTitle}>Chapter Details</Text>
                        <TouchableOpacity onPress={handleSaveChapterDetails} style={styles.saveButtonTextBtn}>
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.detailContent}>
                        <Text style={styles.label}>Chapter Name</Text>
                        <TextInput
                            style={styles.detailInput}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Enter chapter name"
                        />

                        <Text style={styles.label}>Notes / Description</Text>
                        <TextInput
                            style={[styles.detailInput, styles.textArea]}
                            value={editDescription}
                            onChangeText={setEditDescription}
                            placeholder="Write about this chapter..."
                            multiline
                            textAlignVertical="top"
                        />
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Edit Subject Modal */}
            <Modal visible={isEditSubjectModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Subject</Text>

                        <Text style={styles.inputLabel}>Subject Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Subject Name"
                            value={editSubjectName}
                            onChangeText={setEditSubjectName}
                        />

                        <Text style={styles.inputLabel}>Book Color</Text>
                        <View style={styles.colorGrid}>
                            {BOOK_COLORS.map((color) => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorCircle,
                                        { backgroundColor: color },
                                        editSubjectColor === color && styles.colorCircleSelected
                                    ]}
                                    onPress={() => setEditSubjectColor(color)}
                                >
                                    {editSubjectColor === color && <Check size={16} color="white" strokeWidth={3} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setEditSubjectModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.btnTextSecondary}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSaveSubjectDetails} style={styles.saveBtn}>
                                <Text style={styles.btnTextPrimary}>Save Changes</Text>
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
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        ...theme.shadows.small
    },
    title: { ...theme.text.h2, color: theme.colors.text.primary },
    subtitle: { ...theme.text.caption, color: theme.colors.text.secondary },
    list: { padding: theme.spacing.l, paddingBottom: 100 },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.small
    },
    chapterCard: {
        backgroundColor: theme.colors.surface,
        padding: 20,
        borderRadius: 20,
        marginBottom: 16,
        ...theme.shadows.medium,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    chapterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    chapterName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B'
    },
    chapterNameCompleted: {
        color: theme.colors.text.disabled,
        textDecorationLine: 'line-through'
    },
    chapterPreview: {
        fontSize: 13,
        color: '#64748B',
    },
    addNoteText: {
        fontSize: 12,
        color: '#94A3B8',
        fontStyle: 'italic'
    },

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
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingVertical: 8,
        fontSize: 18,
        marginBottom: 24
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    colorCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorCircleSelected: {
        borderColor: '#0F172A',
        transform: [{ scale: 1.1 }],
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
    btnTextSecondary: { color: theme.colors.text.secondary },

    // Detail Modal Styles
    detailModalContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: 'white'
    },
    detailHeaderTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#0F172A'
    },
    closeButton: {
        padding: 8,
    },
    saveButtonTextBtn: {
        padding: 8,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.primary
    },
    detailContent: {
        padding: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 8,
        marginTop: 16
    },
    detailInput: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1E293B',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    textArea: {
        height: 200,
        textAlignVertical: 'top'
    }
});
