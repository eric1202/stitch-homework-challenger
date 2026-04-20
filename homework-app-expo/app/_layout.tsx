import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, Slot, Tabs } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import '../global.css';
import '../src/i18n'; // Initialize i18n
import { useDevice } from '../src/hooks/useDevice';
import { useData } from '../src/hooks/useData';
import Sidebar from '../src/components/Sidebar';
import { initSupabase } from '../src/services/supabase';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    // Initialize Supabase (with URL failover) before hiding splash
    initSupabase().then(() => {
        setSupabaseReady(true);
    });
  }, []);

  useEffect(() => {
    if (loaded && supabaseReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, supabaseReady]);

  if (!loaded || !supabaseReady) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isLargeScreen } = useDevice();
  const { totalPoints, userName } = useData();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1, flexDirection: isLargeScreen ? 'row' : 'column' }} className="bg-background-light dark:bg-background-dark">
        {isLargeScreen && <Sidebar totalPoints={totalPoints} userName={userName} />}
        
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </View>
      </View>
    </ThemeProvider>
  );
}
