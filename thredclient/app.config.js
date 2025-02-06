import 'dotenv/config'; // Import the dotenv package to load .env variables.

export default () => ({
  expo: {
    name: 'thredclient',
    slug: 'thredclient',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/bot-icon.png',
    scheme: 'thredclient',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/wt_splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.initiativelabs.newrules',
    },
    android: {
      config: {
        googleMaps: {
          apiKey: 'AIzaSyCnuc0oFIuDIGf0gFfAVBeDI7o3RSTMBhQ',
          // This API Key only works for this android application.
          // Will not work anywhere else
        },
      },
      adaptiveIcon: {
        foregroundImage: './assets/bot-icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: ['android.permission.health.READ_BODY_TEMPERATURE'],
      package: 'com.initiativelabs.newrules',
    },
    web: {
      bundler: 'metro',
      output: 'static',
    },
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow $(PRODUCT_NAME) to use your location.',
        },
      ],
      'expo-health-connect',
      [
        'expo-build-properties',
        {
          android: {
            minSdkVersion: 26,
            compileSdkVersion: 35,
            targetSdkVersion: 35,
          },
        },
      ],
      [
        'expo-video',
        {
          supportsBackgroundPlayback: true,
          supportsPictureInPicture: true,
        },
      ],
      'expo-router',
      'react-native-health-connect',
      [
        'expo-font',
        {
          fonts: ['./assets/fonts/Nexa-ExtraLight.ttf', './assets/fonts/Nexa-Heavy.ttf'],
        },
      ],
    ],
  },
});
