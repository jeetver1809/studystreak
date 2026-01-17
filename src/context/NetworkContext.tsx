import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextType {
    isConnected: boolean;
    isInternetReachable: boolean;
}

const NetworkContext = createContext<NetworkContextType>({
    isConnected: true,
    isInternetReachable: true,
});

export const useNetworkStatus = () => useContext(NetworkContext);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<NetworkContextType>({
        isConnected: true,
        isInternetReachable: true,
    });

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            setStatus({
                isConnected: !!state.isConnected,
                isInternetReachable: state.isInternetReachable ?? true, // Default to true if null (unknown)
            });
        });

        return () => unsubscribe();
    }, []);

    return (
        <NetworkContext.Provider value={status}>
            {children}
        </NetworkContext.Provider>
    );
};
