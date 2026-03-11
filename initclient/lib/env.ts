import { Platform } from 'react-native';

// Server URL differs between web and Android emulator.
// Set EXPO_PUBLIC_SERVER_URL_WEB and EXPO_PUBLIC_SERVER_URL_ANDROID in .env
const SERVER_URL_WEB = process.env.EXPO_PUBLIC_SERVER_URL_WEB ?? 'http://localhost:3000';
const SERVER_URL_ANDROID = process.env.EXPO_PUBLIC_SERVER_URL_ANDROID ?? 'http://10.0.2.2:3000';

export const SERVER_URL = Platform.OS === 'web' ? SERVER_URL_WEB : SERVER_URL_ANDROID;

export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API ?? '';
