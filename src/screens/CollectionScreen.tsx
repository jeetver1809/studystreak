import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, SectionList, TouchableOpacity, Dimensions, InteractionManager, ViewStyle } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useUserStore } from '../store/userStore';
import { CharacterProgressionService } from '../services/CharacterProgressionService';
import { theme } from '../theme/theme';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GAP = 12;
const CONTAINER_PADDING = theme.spacing.l;
// Calculate item width accounting for padding and gaps
const AVAILABLE_WIDTH = width - (CONTAINER_PADDING * 2) - (GAP * (COLUMN_COUNT - 1));
const ITEM_WIDTH = AVAILABLE_WIDTH / COLUMN_COUNT;

export const CollectionScreen = () => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { user } = useUserStore();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            // Tiny delay for smooth transition
            setTimeout(() => {
                setIsReady(true);
            }, 50);
        });
        return () => task.cancel();
    }, [isFocused]);

    const sections = useMemo(() => {
        if (!user) return [];
        return CharacterProgressionService.getCollectionData(user.currentStreak).map(group => ({
            title: group.world.name,
            data: group.characters,
            world: group.world
        }));
    }, [user?.currentStreak]);

    const renderSectionHeader = useCallback(({ section: { title, world } }: any) => (
        <View style={styles.sectionHeader}>
            <View style={[styles.colorStrip, { backgroundColor: world.primaryColor }]} />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    ), []);

    const renderItem = useCallback(({ item }: { item: any }) => {
        return null; // Not used directly, we render rows
    }, []);

    // Helper to chunk data for grid rows
    const sectionListData = useMemo(() => {
        return sections.map(section => {
            const rows = [];
            for (let i = 0; i < section.data.length; i += COLUMN_COUNT) {
                rows.push({
                    id: `${section.title}-row-${i}`,
                    items: section.data.slice(i, i + COLUMN_COUNT),
                    world: section.world
                });
            }
            return {
                ...section,
                data: rows
            };
        });
    }, [sections]);

    const renderRow = useCallback(({ item }: { item: any }) => (
        <View style={styles.gridRow}>
            {item.items.map((char: any) => (
                <CharacterGridItem key={char.id} item={char} />
            ))}
            {/* Fill empty spots to maintain alignment if row is not full */}
            {Array.from({ length: COLUMN_COUNT - item.items.length }).map((_, i) => (
                <View key={`empty-${i}`} style={{ width: ITEM_WIDTH }} />
            ))}
        </View>
    ), []);

    if (!user) return null;

    if (!isReady) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Your Collection</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={{ paddingHorizontal: theme.spacing.l, paddingTop: theme.spacing.m }}>
                    {/* Skeleton for World Title */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <Skeleton width={4} height={24} borderRadius={2} style={{ marginRight: 8 }} />
                        <Skeleton width={120} height={24} borderRadius={4} />
                    </View>
                    {/* Skeleton Grid */}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Skeleton width={ITEM_WIDTH} height={ITEM_WIDTH * 1.4} borderRadius={16} />
                        <Skeleton width={ITEM_WIDTH} height={ITEM_WIDTH * 1.4} borderRadius={16} />
                        <Skeleton width={ITEM_WIDTH} height={ITEM_WIDTH * 1.4} borderRadius={16} />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#FFFFFF', '#F8FAFC', '#F1F5F9']}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <ArrowLeft size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>Your Collection</Text>
                <View style={{ width: 40 }} />
            </View>

            <SectionList
                sections={sectionListData}
                keyExtractor={(item) => item.id}
                renderItem={renderRow}
                renderSectionHeader={renderSectionHeader}
                contentContainerStyle={styles.scrollContent}
                stickySectionHeadersEnabled={false}
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                windowSize={5}
                removeClippedSubviews={true}
            />
        </SafeAreaView>
    );
};

// Memoized Item Component
const CharacterGridItem = React.memo(({ item }: { item: any }) => {
    const isUnlocked = item.isUnlocked;
    const isNext = item.isNext;

    return (
        <View style={{ width: ITEM_WIDTH }}>
            <Card
                style={[
                    styles.card,
                    isNext && styles.cardNext,
                    !isUnlocked && !isNext && styles.cardLocked
                ]}
                padding="s"
            >
                <View style={styles.imageContainer}>
                    <Image
                        source={item.image}
                        style={[
                            styles.image,
                            !isUnlocked && styles.imageLocked,
                        ]}
                        resizeMode="contain"
                    />

                    {!isUnlocked && (
                        <View style={[styles.lockOverlay, isNext ? styles.nextOverlay : styles.lockedOverlay]}>
                            {isNext ? (
                                <View>
                                    <Text style={styles.nextLabel}>NEXT</Text>
                                    <Text style={styles.nextDay}>Day {item.unlockDay}</Text>
                                </View>
                            ) : (
                                <Lock size={16} color="rgba(255,255,255,0.5)" />
                            )}
                        </View>
                    )}
                </View>

                <View style={styles.infoContainer}>
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.charName,
                            isUnlocked ? styles.textUnlocked : styles.textLocked,
                            isNext && { color: theme.colors.primary }
                        ]}
                    >
                        {isUnlocked ? item.name : "???"}
                    </Text>
                </View>
            </Card>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.m,
        // Optional shadow for header separation
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)'
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    title: {
        ...theme.text.h2,
        color: theme.colors.text.primary,
        fontSize: 20,
    },
    scrollContent: {
        paddingTop: theme.spacing.m,
        paddingBottom: theme.spacing.xxl,
    },
    sectionContainer: {
        marginBottom: theme.spacing.l,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        marginBottom: theme.spacing.m,
    },
    colorStrip: {
        width: 4,
        height: 24,
        borderRadius: 2,
        marginRight: theme.spacing.s,
    },
    sectionTitle: {
        ...theme.text.h3,
        color: theme.colors.text.primary,
        fontSize: 18,
    },
    gridRow: {
        flexDirection: 'row',
        paddingHorizontal: CONTAINER_PADDING,
        justifyContent: 'space-between', // Changed to space-between for alignment
        gap: GAP, // Keep gap, but if space-between, gap might conflict with exact math. 
        // Actually, with precise widths, 'flex-start' + gap is safer.
        // Let's revert to 'flex-start' for row.
        marginBottom: GAP
    },
    // Removed gridContainer in favor of gridRow logic managed by renderRow
    // Card Styles
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        alignItems: 'center',
        height: ITEM_WIDTH * 1.4, // Aspect ratio
        justifyContent: 'space-between',
        ...theme.shadows.small,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    cardLocked: {
        backgroundColor: '#F1F5F9', // Light gray for locked
        elevation: 0,
        shadowOpacity: 0,
        borderColor: 'transparent',
    },
    cardNext: {
        borderColor: theme.colors.primary,
        borderWidth: 2,
        backgroundColor: '#F0F9FF', // Subtle blue tint
    },
    imageContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        padding: 4,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imageLocked: {
        opacity: 0.2,
        tintColor: '#94A3B8', // Slate 400
    },
    lockOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextOverlay: {
        // No full overlay, just content
    },
    lockedOverlay: {
        backgroundColor: 'transparent',
    },
    nextLabel: {
        ...theme.text.caption,
        color: theme.colors.primary,
        fontWeight: '900',
        fontSize: 10,
        textAlign: 'center',
        letterSpacing: 1,
    },
    nextDay: {
        ...theme.text.caption,
        color: theme.colors.primary,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    infoContainer: {
        width: '100%',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
    },
    charName: {
        ...theme.text.caption,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    textUnlocked: {
        color: theme.colors.text.primary,
    },
    textLocked: {
        color: theme.colors.text.disabled,
        fontStyle: 'italic',
    }
});
