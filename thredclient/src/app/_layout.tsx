import { useFonts } from 'expo-font';
import { Redirect, Slot, SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import React from 'react';
import { SourceSans3_400Regular, SourceSans3_500Medium } from '@expo-google-fonts/source-sans-3';
import { MediumText } from '../components/common/MediumText';

SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Nexa-ExtraLight': require('../../assets/fonts/Nexa-ExtraLight.ttf'),
    'Nexa-Heavy': require('../../assets/fonts/Nexa-Heavy.ttf'),
    SourceSans3_500Medium,
    SourceSans3_400Regular,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return <MediumText>Loading...</MediumText>;
  }

  return <Slot />;
}
