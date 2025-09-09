import 'react-native-get-random-values';
import { useFonts } from 'expo-font';
import { Redirect, Slot, SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import React from 'react';
import { SourceSans3_400Regular, SourceSans3_500Medium } from '@expo-google-fonts/source-sans-3';
import { MediumText } from '../components/common/MediumText';
import { Platform } from 'react-native';

SplashScreen.preventAutoHideAsync();
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
export default function RootLayout() {
  useEffect(() => {
    async function registerForNotifications() {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted!');
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }
    }

    registerForNotifications();
  }, []);

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
