## Get started

### Set up the Android emulator for 'development build' [here](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=simulated&mode=development-build)

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