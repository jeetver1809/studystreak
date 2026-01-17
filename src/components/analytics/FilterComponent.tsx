import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

export type FilterRange = 'today' | 'week' | 'all';

interface FilterComponentProps {
    selectedRange: FilterRange;
    onSelectRange: (range: FilterRange) => void;
}

export const FilterComponent = ({ selectedRange, onSelectRange }: FilterComponentProps) => {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.option, selectedRange === 'today' && styles.selectedOption]}
                onPress={() => onSelectRange('today')}
            >
                <Text style={[styles.text, selectedRange === 'today' && styles.selectedText]}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.option, selectedRange === 'week' && styles.selectedOption]}
                onPress={() => onSelectRange('week')}
            >
                <Text style={[styles.text, selectedRange === 'week' && styles.selectedText]}>7 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.option, selectedRange === 'all' && styles.selectedOption]}
                onPress={() => onSelectRange('all')}
            >
                <Text style={[styles.text, selectedRange === 'all' && styles.selectedText]}>Overall</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        padding: 4,
        alignSelf: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0', // Border for better definition
    },
    option: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    selectedOption: {
        backgroundColor: theme.colors.primary,
        ...theme.shadows.small,
    },
    text: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text.secondary,
    },
    selectedText: {
        color: 'white',
    }
});
