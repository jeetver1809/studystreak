import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '../../context/NetworkContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const OfflineBanner = () => {
    const { isConnected, isInternetReachable } = useNetworkStatus();
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(-100);
    const [visible, setVisible] = useState(false);

    // Show banner if not connected OR internet not reachable
    const isOffline = !isConnected || isInternetReachable === false;

    useEffect(() => {
        if (isOffline) {
            setVisible(true);
            translateY.value = withTiming(0, { duration: 300 });
        } else {
            // Delay hiding to let user see "Back Online" briefly if we wanted, 
            // but here we just slide up.
            translateY.value = withTiming(-100, { duration: 300 }, (finished) => {
                if (finished) {
                    // runOnJS(setVisible)(false); // If we wanted to unmount 
                }
            });
        }
    }, [isOffline]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    return (
        <Animated.View style={[styles.container, { paddingTop: insets.top }, animatedStyle]}>
            <View style={styles.content}>
                <WifiOff size={16} color="white" />
                <Text style={styles.text}>You are offline</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ef4444', // Red-500
        zIndex: 9999,
        paddingBottom: 8,
        alignItems: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    text: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    }
});
