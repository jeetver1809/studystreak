import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Circle, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedProps, SharedValue, useDerivedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../theme/theme';

interface BrainTreeProps {
    progress: SharedValue<number>; // Reanimated Shared Value
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
const BRANCH_ANGLE = Math.PI / 5;
const LENGTH_SCALE = 0.75;

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const BranchLine = React.memo(({ branch, progress }: { branch: Branch, progress: SharedValue<number> }) => {
    const activeDepth = MAX_DEPTH + 1;

    const animatedProps = useAnimatedProps(() => {
        const currentActiveDepth = progress.value * activeDepth;
        const isActive = branch.depth < currentActiveDepth;

        return {
            stroke: isActive ? theme.colors.primary : '#E5E7EB',
            strokeWidth: isActive ? Math.max(1, 4 - branch.depth) : 1,
            strokeOpacity: isActive ? 1 : 0.3,
        };
    });

    return (
        <AnimatedLine
            x1={branch.x1}
            y1={branch.y1}
            x2={branch.x2}
            y2={branch.y2}
            strokeLinecap="round"
            animatedProps={animatedProps}
        />
    );
});

const BranchNode = React.memo(({ branch, progress }: { branch: Branch, progress: SharedValue<number> }) => {
    const activeDepth = MAX_DEPTH + 1;

    // Simplify: Just one animated circle, no glowing URL reference which can crash Reanimated
    const animatedProps = useAnimatedProps(() => {
        const currentActiveDepth = progress.value * activeDepth;
        const isActive = branch.depth < currentActiveDepth;

        return {
            fillOpacity: isActive ? 1 : 0,
            r: isActive ? Math.max(2, 6 - branch.depth) : 0,
        };
    });

    return (
        <AnimatedCircle
            cx={branch.x2}
            cy={branch.y2}
            fill={theme.colors.primary}
            animatedProps={animatedProps}
        />
    );
});

export const BrainTree: React.FC<BrainTreeProps> = React.memo(({
    progress,
    height = 300,
    width = 300
}) => {
    // Generate Tree Data (Memoized)
    const treeData = useMemo(() => {
        const branches: Branch[] = [];
        const startLength = height * 0.25;

        const generate = (x: number, y: number, angle: number, depth: number, length: number, parentId: string) => {
            if (depth > MAX_DEPTH) return;

            const x2 = x + Math.cos(angle) * length;
            const y2 = y - Math.sin(angle) * length;
            const id = `${parentId}-${depth}`;

            branches.push({ x1: x, y1: y, x2, y2, angle, depth, id });

            generate(x2, y2, angle - BRANCH_ANGLE + (Math.random() * 0.2 - 0.1), depth + 1, length * LENGTH_SCALE, id + 'L');
            generate(x2, y2, angle + BRANCH_ANGLE + (Math.random() * 0.2 - 0.1), depth + 1, length * LENGTH_SCALE, id + 'R');
        };

        generate(width / 2, height * 0.9, Math.PI / 2, 0, startLength, 'root');
        return branches;
    }, [height, width]);

    return (
        <View style={styles.container}>
            <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>


                {treeData.map((b) => (
                    <BranchLine key={b.id} branch={b} progress={progress} />
                ))}

                {treeData.map((b) => (
                    <BranchNode key={`node-${b.id}`} branch={b} progress={progress} />
                ))}
            </Svg>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    }
});
