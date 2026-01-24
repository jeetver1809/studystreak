import 'react-native-gesture-handler'; // MUST BE AT THE TOP
import { enableScreens } from 'react-native-screens';
enableScreens();

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { DiagnosticsService } from './src/services/DiagnosticsService';
import { LogBox, View, Text } from 'react-native';

import * as Linking from 'expo-linking';
import { NetworkProvider } from './src/context/NetworkContext';
import { OfflineBanner } from './src/components/ui/OfflineBanner';

// ---------------------------------------------------------
// IGNORING HARMLESS WARNINGS (Nuclear Option)
// ---------------------------------------------------------
// Victory Native v36 uses 'defaultProps' which triggers a warning.
// Since we can't update the library (v40+ breaks Skia), we silence the log.

const ignoreWarns = [
  'relies on defaultProps',
  'Support for defaultProps',
  'Victory',
  'WrappedComponent'
];

const originalError = console.error;
console.error = (...args) => {
  const log = args.join(' ');
  if (ignoreWarns.some(msg => log.includes(msg))) return;
  originalError(...args);
};

const originalWarn = console.warn;
console.warn = (...args) => {
  const log = args.join(' ');
  if (ignoreWarns.some(msg => log.includes(msg))) return;
  originalWarn(...args);
};

LogBox.ignoreLogs(ignoreWarns);
// ---------------------------------------------------------

export default function App() {
  useEffect(() => {
    DiagnosticsService.runStartupChecks();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NetworkProvider>
          <OfflineBanner />
          <NavigationContainer
            linking={{
              prefixes: [Linking.createURL('/')],
              config: {
                screens: {
                  Login: 'auth',
                  Register: 'register',
                  Home: 'home',
                }
              }
            }}
          >
            <RootNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </NetworkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
