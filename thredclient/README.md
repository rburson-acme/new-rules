## Get started

### Set up the Android emulator for local 'development build' [here](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=simulated&mode=development-build&buildEnv=local)

### Install dependencies and run with:

```javascript
/* Go to the '../thredlib' directory and run npm link */
cd ../thredlib; npm link

/* Install and link thredlib */
cd ../thredclient; npm install; npm link thredlib

npx expo run:android
   or
npx expo start
```

## Android Health Connect

This application uses the Android Health Connect API for bringing in biometric data if the user opts in. The link to the React Native wrapper of this api can be found [here](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=simulated&mode=development-build&buildEnv=local)

At the time of writing this, (November, 14th 2024) the only data recieved is reading body temperature. To extend these capabilites, follow the instructions below.

### Extending Andorid Health Capabilities

In the app.json file, find expo.android.permissions and add any item to the array in [this](https://matinzd.github.io/react-native-health-connect/docs/permissions) list of permissions.

Additionally, in the AndroidManifest.xml file, add the line to the list of user permissions.

` <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>`

After completing both of these steps, run command `npx expo prebuild --platform android` in the terminal. This will add the necessary code to the android files behind the scenes.

### Android Health Connect Toolbox

Android Health Connect Toolbox is a developer tool that allows you to add data to the health connect system. Instructions for downloading this into your emulator can be found [here](https://developer.android.com/health-and-fitness/guides/health-connect/test/health-connect-toolbox), along with instructions for reading and writing health records into the android emulator.

### Android Health Connect Toolbox

This app uses expo-router
[expo-router](https://docs.expo.dev/router/introduction/)


### Add environment variables inside `thredclient/.env`

- GOOGLE_MAPS_API=""