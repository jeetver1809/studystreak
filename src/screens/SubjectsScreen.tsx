import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Dimensions, KeyboardAvoidingView, Platform, InteractionManager, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Book, Trash2, X, Check } from 'lucide-react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { SubjectService } from '../services/SubjectService';
import { useUserStore } from '../store/userStore';
import { Subject } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenGradient } from '../components/ui/ScreenGradient';
import { SubjectBook } from '../components/SubjectBook';
import { Skeleton } from '../components/ui/Skeleton';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;

const BOOK_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#84CC16', // Lime
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899'  // Pink
];

export const SubjectsScreen = () => {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const { user } = useUserStore();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setModalVisible] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [selectedColor, setSelectedColor] = useState(BOOK_COLORS[0]);
    const hasLoaded = React.useRef(false); // Track if we've already loaded data once

    const fetchSubjects = async () => {
        if (!user) return;

        // Only show skeleton on first load
        const showSkeleton = !hasLoaded.current;

        if (showSkeleton) {
            setLoading(true);
        }

        // Guarantee at least 800ms of skeleton ONLY if showing skeleton
        const minDelay = showSkeleton ? new Promise(resolve => setTimeout(resolve, 800)) : Promise.resolve();

        try {
            const [data] = await Promise.all([
                SubjectService.getSubjects(user.uid),
                minDelay
            ]);
            setSubjects(data);
            hasLoaded.current = true; // Mark as loaded
        } catch (error) {
            console.error("Error fetching subjects:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            if (isFocused) {
                fetchSubjects();
            }
        });
        return () => task.cancel();
    }, [user, isFocused]);

    const handleAddSubject = async () => {
        if (!newSubjectName.trim() || !user) return;
        try {
            await SubjectService.addSubject(user.uid, newSubjectName, selectedColor);
            setNewSubjectName('');
            setSelectedColor(BOOK_COLORS[0]); // Reset color
            setModalVisible(false);
            fetchSubjects();
        } catch (error) {
            Alert.alert("Error", "Failed to create subject");
        }
    };

    const handleDeleteSubject = (id: string) => {
        Alert.alert("Delete Subject", "Are you sure? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    if (!user) return;
                    await SubjectService.deleteSubject(user.uid, id);
                    fetchSubjects();
                }
            }
        ]);
    };

    const renderItem = ({ item, index }: { item: Subject | 'ADD_BUTTON', index: number }) => {
        if (item === 'ADD_BUTTON') {
            return (
                <TouchableOpacity
                    style={styles.addBookContainer}
                    onPress={() => setModalVisible(true)}
                >
                    <View style={styles.addBookPlaceholder}>
                        <Plus size={40} color={theme.colors.text.disabled} />
                        <Text style={styles.addBookText}>Add New</Text>
                    </View>
                </TouchableOpacity>
            );
        }

        return (
            <View style={styles.bookWrapper}>
                <SubjectBook
                    subject={item}
                    isSelected={false}
                    onPress={() => navigation.navigate('SubjectDetails', { subject: item })}
                    onLongPress={() => handleDeleteSubject(item.id)}
                />
            </View>
        );
    };

    // Combine subjects with the "Add Button" item
    const dataWithAddButton: (Subject | 'ADD_BUTTON')[] = [...subjects, 'ADD_BUTTON'];

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>My Library</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={[styles.list, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }]}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <View key={i} style={[styles.bookWrapper, { marginBottom: 24 }]}>
                            <Skeleton width={140} height={180} borderRadius={16} />
                            <View style={{ marginTop: 12, alignItems: 'center' }}>
                                <Skeleton width={100} height={16} borderRadius={4} />
                                <Skeleton width={60} height={12} borderRadius={4} style={{ marginTop: 6 }} />
                            </View>
                        </View>
                    ))}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScreenGradient />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>My Library</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={dataWithAddButton}
                renderItem={renderItem}
                keyExtractor={(item) => (typeof item === 'string' ? item : item.id)}
                contentContainerStyle={styles.list}
                numColumns={2}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={styles.columnWrapper}
            />

            {isModalVisible && (
                <Animated.View
                    style={[StyleSheet.absoluteFill, styles.modalOverlay]}
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardAvoid}
                    >
                        <Animated.View
                            style={styles.modalContent}
                            entering={ZoomIn.duration(300).springify()}
                            exiting={ZoomOut.duration(200)}
                        >
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>New Subject</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                    <X size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>Subject Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Advanced Physics"
                                value={newSubjectName}
                                onChangeText={setNewSubjectName}
                                placeholderTextColor="#94A3B8"
                            />

                            <Text style={styles.inputLabel}>Book Color</Text>
                            <View style={styles.colorGrid}>
                                {BOOK_COLORS.map((color) => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[
                                            styles.colorCircle,
                                            { backgroundColor: color },
                                            selectedColor === color && styles.colorCircleSelected
                                        ]}
                                        onPress={() => setSelectedColor(color)}
                                    >
                                        {selectedColor === color && <Check size={16} color="white" strokeWidth={3} />}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                    <Text style={styles.btnTextSecondary}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleAddSubject} style={styles.saveBtn}>
                                    <LinearGradient
                                        colors={theme.gradients.primary}
                                        style={StyleSheet.absoluteFill}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    />
                                    <Text style={styles.btnTextPrimary}>Create Button</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </KeyboardAvoidingView>
                </Animated.View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#FFF',
        ...theme.shadows.small,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B'
    },
    list: {
        padding: 20,
        paddingBottom: 100
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 24, // Vertical spacing between rows
    },
    bookWrapper: {
        width: (SCREEN_WIDTH - 60) / 2, // 2 columns with padding
        height: 200, // Increased for taller books
        alignItems: 'center',
        justifyContent: 'flex-end', // Align bottom of book
    },
    addBookContainer: {
        width: (SCREEN_WIDTH - 60) / 2,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBookPlaceholder: {
        width: 140,
        height: 180,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#CBD5E1',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    addBookText: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
    },
    // Modal Styles
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
        gap: 16
    },
    emptyText: { ...theme.text.body, color: theme.colors.text.secondary },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)', // Darker user overlay
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
    },
    keyboardAvoid: {
        flex: 1,
        justifyContent: 'center',
        width: '100%',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        ...theme.shadows.large,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'left',
        marginBottom: 0,
    },
    closeBtn: {
        padding: 4,
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        marginBottom: 24,
        color: '#334155',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', // For gradient
    },
    btnTextPrimary: { color: 'white', fontWeight: '700', fontSize: 16 },
    btnTextSecondary: { color: '#64748B', fontWeight: '600', fontSize: 16 },
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
    }
});
