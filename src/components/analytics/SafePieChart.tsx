import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
// @ts-ignore: Victory types are sometimes missing correct exports
import { VictoryPie, VictoryTooltip, VictoryLabel } from 'victory-native';
import { theme } from '../../theme/theme';

interface CustomPieChartProps {
    data: any[];
    height?: number;
    formatTooltip?: (value: number) => string;
}

export const SafePieChart = React.memo(({
    data,
    height = 280,
    formatTooltip
}: CustomPieChartProps) => {

    const screenWidth = Dimensions.get('window').width;

    const processedData = useMemo(() => {
        if (!Array.isArray(data)) return [];

        const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0);

        return data
            .filter(d => d.value > 0)
            .map((d, index) => {
                const percentage = total > 0 ? (d.value / total * 100) : 0;
                return {
                    x: d.label,
                    y: d.value,
                    realValue: d.realValue,
                    color: d.frontColor || theme.colors.primary,
                    // "Subject \n 25%"
                    percentageLabel: `${d.label}\n${percentage.toFixed(0)}%`,
                    tooltipText: formatTooltip ? formatTooltip(d.realValue) : `${d.realValue}`
                };
            });
    }, [data, formatTooltip]);

    const [selectedSlice, setSelectedSlice] = useState<string | null>(null);

    // 1. Sanitize & Format Data 
    // ... (processedData logic is fine)

    // Sort data so the legend looks organized (High to Low)
    const sortedData = useMemo(() => {
        return [...processedData].sort((a, b) => b.y - a.y);
    }, [processedData]);

    if (processedData.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.chartContainer}>
                <View style={{ width: screenWidth - 40, height: height }}>
                    {/* Layer 1: The Visual Pie */}
                    <VictoryPie
                        data={processedData}
                        colorScale={processedData.map(d => d.color)}
                        height={height}
                        width={screenWidth - 40}
                        padAngle={2}
                        innerRadius={0}
                        // Pop effect (Reduced base radius to prevent clipping)
                        radius={({ datum }: { datum: any }) => (selectedSlice && selectedSlice === datum.x) ? (height / 2) - 10 : (height / 2) - 20}
                        style={{
                            data: {
                                stroke: theme.colors.surface,
                                strokeWidth: 2,
                                fillOpacity: 0.9,
                            },
                            labels: { display: 'none' }
                        }}
                    />

                    {/* Layer 2: Invisible Interaction Layer */}
                    <View style={StyleSheet.absoluteFill}>
                        <VictoryPie
                            data={processedData}
                            height={height}
                            width={screenWidth - 40}
                            padAngle={2}
                            innerRadius={0}
                            radius={({ datum }: { datum: any }) => (selectedSlice && selectedSlice === datum.x) ? (height / 2) - 10 : (height / 2) - 20}
                            style={{
                                data: { fill: "transparent", stroke: "transparent" },
                                labels: { fill: theme.colors.primary, fontWeight: 'bold' }
                            }}
                            // Only show label for selected slice
                            labels={({ datum }: { datum: any }) => (selectedSlice === datum.x ? datum.tooltipText : "")}
                            // Place tooltip inside the slice (approx centered)
                            labelRadius={({ radius }: any) => (typeof radius === 'number' ? radius * 0.65 : height / 2 * 0.65)}
                            labelComponent={
                                <ControlledTooltip />
                            }
                            events={[{
                                target: "data",
                                eventHandlers: {
                                    onPressIn: () => {
                                        return [{
                                            target: "labels",
                                            mutation: (props: any) => {
                                                if (props.datum && props.datum.x) {
                                                    setSelectedSlice(props.datum.x === selectedSlice ? null : props.datum.x);
                                                }
                                                return null;
                                            }
                                        }];
                                    }
                                }
                            }]}
                        />
                    </View>
                </View>
            </View>

            {/* Premium Legend Section (Unchanged) */}
            <View style={styles.legendContainer}>
                {sortedData.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                        <View style={styles.legendLeft}>
                            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                            <Text style={styles.legendLabel} numberOfLines={1}>
                                {item.x}
                            </Text>
                        </View>
                        <Text style={styles.legendValue}>{item.percentageLabel.split('\n')[1]}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
});

// Helper component to prevent empty tooltips from rendering artifacts
const ControlledTooltip = (props: any) => {
    if (!props.text) return null;
    return (
        <VictoryTooltip
            {...props}
            active={true}
            renderInPortal={false}
            constrainToVisibleArea
            // Dark premium tooltip style
            flyoutStyle={{
                stroke: 'rgba(255,255,255,0.2)', // Subtle border
                fill: '#1E293B', // Dark Slate background
                strokeWidth: 1,
                cornerRadius: 8,
                pointerLength: 8 // Slightly longer pointer
            }}
            flyoutPadding={{ top: 8, bottom: 8, left: 12, right: 12 }} // More padding = Bigger Box
            style={{ fill: '#FFFFFF', fontSize: 13, fontWeight: 'bold' }} // Revert to standard size
        />
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    legendContainer: {
        width: '100%',
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingVertical: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: '#F1F5F9',
    },
    legendLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    legendLabel: {
        fontSize: 14,
        color: theme.colors.text.primary,
        fontWeight: '500',
    },
    legendValue: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        fontWeight: 'bold',
    },
});
