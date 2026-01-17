import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
// @ts-ignore: Victory types are sometimes missing correct exports
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTheme, VictoryTooltip } from 'victory-native';
import { theme } from '../../theme/theme';

interface CustomBarChartProps {
    data: any[];
    height?: number;
    barWidth?: number;
    spacing?: number;
    maxValue?: number;
    onPress?: (item: any) => void;
}

export const SafeBarChart = React.memo(({
    data,
    height = 250, // Increased Height
    barWidth = 18,
    maxValue,
    onPress,
}: CustomBarChartProps) => {

    const screenWidth = Dimensions.get('window').width;
    const [selectedBar, setSelectedBar] = useState<string | null>(null);

    // 1. Sanitize & Format Data for Victory
    const sanitizedData = useMemo(() => {
        if (!Array.isArray(data)) return [];
        return data
            .filter(d => d && typeof d.value === 'number')
            .map(d => ({
                x: String(d.label || ''),
                y: Math.max(0, d.value),
                realValue: d.realValue !== undefined ? d.realValue : d.value,
                // Add tooltip text if provided, else fallback
                tooltipText: d.tooltipText || `${d.value.toFixed(1)}h`,
                fill: d.frontColor || theme.colors.primary,
            }));
    }, [data]);

    const yDomain = useMemo(() => {
        if (!maxValue) return undefined;
        return { y: [0, maxValue] };
    }, [maxValue]);

    if (sanitizedData.length === 0) return null;

    return (
        <View key={sanitizedData.length} style={styles.container}>
            <VictoryChart
                height={height}
                width={screenWidth + 10} // Wider to fill card usage (parent adds padding)
                domainPadding={{ x: 40 }} // Adjusted for wider chart
                theme={VictoryTheme.material}
                domain={yDomain}
            >
                {/* Y Axis - Hidden axis line, kept grid */}
                <VictoryAxis dependentAxis
                    style={{
                        axis: { stroke: "transparent" },
                        ticks: { stroke: "transparent" },
                        grid: { stroke: "#F1F5F9", strokeDasharray: "4, 4" }, // Subtle dashed grid
                        tickLabels: {
                            fill: "transparent", // HIDDEN LABELS per request
                            fontSize: 10,
                            padding: 0 // Remove padding since hidden
                        }
                    }}
                />

                {/* X Axis - Days */}
                <VictoryAxis
                    style={{
                        axis: { stroke: "transparent" },
                        ticks: { stroke: "transparent" },
                        grid: { stroke: "transparent" },
                        tickLabels: {
                            fill: theme.colors.text.secondary,
                            fontSize: 12,
                            fontWeight: '600',
                            padding: 10
                        }
                    }}
                />

                <VictoryBar
                    data={sanitizedData}
                    barWidth={barWidth}
                    cornerRadius={{ top: 6, bottom: 6 }} // Modern Pill shape
                    style={{
                        data: {
                            fill: ({ datum }: { datum: any }) =>
                                (selectedBar === datum.x) ? theme.colors.primary : '#818CF8', // Highlight selection
                            fillOpacity: ({ datum }: { datum: any }) =>
                                (selectedBar === datum.x) ? 1 : 0.7, // Faded unless selected
                        },
                    }}
                    // Tooltip Logic
                    labels={({ datum }: { datum: any }) => datum.tooltipText}
                    labelComponent={
                        <ControlledTooltip selectedBar={selectedBar} />
                    }
                    animate={{
                        duration: 600,
                        onLoad: { duration: 600 }
                    }}
                    events={[{
                        target: "data",
                        eventHandlers: {
                            onPressIn: () => {
                                return [{
                                    target: "labels",
                                    mutation: (props: any) => {
                                        if (props.datum && props.datum.x) {
                                            // Toggle selection
                                            setSelectedBar(props.datum.x === selectedBar ? null : props.datum.x);
                                            // Optional: Call parent handler
                                            if (onPress) onPress(props.datum);
                                        }
                                        return null;
                                    }
                                }];
                            }
                        }
                    }]}
                />
            </VictoryChart>
        </View>
    );
});

// Helper component to prevent empty tooltips from rendering artifacts
const ControlledTooltip = (props: any) => {
    // Explicit Check: Am I the selected bar?
    // Victory passes `datum` to this component automatically.
    // We also passed `selectedBar` manually.
    if (!props.datum || props.datum.x !== props.selectedBar) return null;

    return (
        <VictoryTooltip
            {...props}
            active={true}
            renderInPortal={false}
            constrainToVisibleArea
            dy={-5} // Lift slightly above bar
            flyoutStyle={{
                stroke: 'rgba(255,255,255,0.2)',
                fill: '#1E293B', // Dark Slate
                strokeWidth: 1,
                cornerRadius: 8,
                pointerLength: 6
            }}
            flyoutPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
            style={{ fill: '#FFFFFF', fontSize: 13, fontWeight: 'bold' }}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10 // Shift right slightly to center on screen
    },
});
