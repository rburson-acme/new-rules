import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { useAuthStore } from '@/features/auth/useAuthStore';
import { queryClient } from '@/lib/queryClient';

if (Platform.OS === 'web') {
  require('../global.css');
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Nexa-ExtraLight': require('../assets/Nexa-ExtraLight.ttf'),
    'Nexa-Heavy': require('../assets/Nexa-Heavy.ttf'),
  });

  const userId = useAuthStore((s) => s.userId);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(auth)" />
      </Stack>
      {!userId && <Redirect href="/(auth)/sign-in" />}
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
