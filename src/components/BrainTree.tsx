import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Circle, G, Defs, RadialGradient, Stop, Path } from 'react-native-svg';
import { theme } from '../theme/theme';

interface BrainTreeProps {
    progress: number; // 0 to 1
    height?: number;
    width?: number;
}

interface Branch {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    angle: number;
    depth: number;
    id: string;
}

const MAX_DEPTH = 5;
const BRANCH_ANGLE = Math.PI / 5; // 36 degrees
const LENGTH_SCALE = 0.75;

export const BrainTree: React.FC<BrainTreeProps> = ({
    progress,
    height = 300,
    width = 300
}) => {
    // Generate Tree Data (Memoized so it doesn't change on render)
    const treeData = useMemo(() => {
        const branches: Branch[] = [];
        const startLength = height * 0.25;

        const generate = (x: number, y: number, angle: number, depth: number, length: number, parentId: string) => {
            if (depth > MAX_DEPTH) return;

            const x2 = x + Math.cos(angle) * length;
            const y2 = y - Math.sin(angle) * length; // Up is negative Y
            const id = `${parentId}-${depth}`;

            branches.push({ x1: x, y1: y, x2, y2, angle, depth, id });

            // Branch out
            generate(x2, y2, angle - BRANCH_ANGLE + (Math.random() * 0.2 - 0.1), depth + 1, length * LENGTH_SCALE, id + 'L');
            generate(x2, y2, angle + BRANCH_ANGLE + (Math.random() * 0.2 - 0.1), depth + 1, length * LENGTH_SCALE, id + 'R');
        };

        // Start from bottom center
        generate(width / 2, height * 0.9, Math.PI / 2, 0, startLength, 'root');
        return branches;
    }, [height, width]);

    // Calculate which branches are active based on progress
    // We want the tree to fill from bottom (root) to top (leaves)
    // Map depth 0->MAX_DEPTH to progress 0->1
    const activeDepth = progress * (MAX_DEPTH + 1);

    return (
        <View style={styles.container}>
            <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
                <Defs>
                    <RadialGradient id="nodeGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                        <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity="1" />
                        <Stop offset="100%" stopColor={theme.colors.primary} stopOpacity="0" />
                    </RadialGradient>
                </Defs>

                {/* Draw Connections */}
                {treeData.map((b) => {
                    const isActive = b.depth < activeDepth;
                    const isFullyActive = b.depth < activeDepth - 0.5;

                    return (
                        <Line
                            key={b.id}
                            x1={b.x1}
                            y1={b.y1}
                            x2={b.x2}
                            y2={b.y2}
                            stroke={isActive ? theme.colors.primary : '#E5E7EB'}
                            strokeWidth={isActive ? Math.max(1, 4 - b.depth) : 1}
                            strokeOpacity={isActive ? 1 : 0.3}
                            strokeLinecap="round"
                        />
                    );
                })}

                {/* Draw Nodes (Synapses) */}
                {treeData.map((b) => {
                    const isActive = b.depth < activeDepth;
                    if (!isActive) return null;

                    // Only draw nodes at joints/ends
                    return (
                        <G key={`node-${b.id}`}>
                            <Circle
                                cx={b.x2}
                                cy={b.y2}
                                r={Math.max(2, 6 - b.depth)}
                                fill={theme.colors.primary}
                                opacity={0.8}
                            />
                            {/* Glow effect for active tips */}
                            {Math.abs(b.depth - activeDepth) < 1 && (
                                <Circle
                                    cx={b.x2}
                                    cy={b.y2}
                                    r={10}
                                    fill="url(#nodeGlow)"
                                    opacity={0.6}
                                />
                            )}
                        </G>
                    );
                })}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    }
});
