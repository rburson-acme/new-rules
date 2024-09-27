#!/bin/sh

echo "react-native bundle --platform android --dev false --entry-file ./index.js --bundle-output android/app/src/main/assets/index.android.bundle"
react-native bundle --platform android --dev false --entry-file ./index.js --bundle-output android/app/src/main/assets/index.android.bundle
echo "cd android"
cd android
echo "./gradlew assembleRelease"
./gradlew assembleRelease
echo "cp app/build/outputs/apk/release/app-release.apk ../../srvthreds/src/web/builds/wt_latest.apk"
cp app/build/outputs/apk/release/app-release.apk ../../srvthreds/src/web/builds/wt_latest.apk
