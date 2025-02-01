import { Button } from '@/src/components/common/Button';
import { RootStore } from '@/src/stores/rootStore';
import { Redirect, Stack } from 'expo-router';
import Drawer from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import 'react-native-reanimated';

// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

// TODO: fix splashScreen on android
function AppLayout() {
  const loaded = true;
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // // You can keep the splash screen open, or render a loading screen like we do here.
  // if (isLoading) {
  //   return <Text>Loading...</Text>;
  // }

  const { authStore } = RootStore.get();

  function logOut() {
    authStore.logOut();
  }

  //TODO: add protections on messenger and admin to make sure they cannot access those pages

  // This layout can be deferred because it's not the root layout.
  if (authStore.role === 'admin') {
    return (
      <Drawer initialRouteName="admin">
        <Drawer.Screen
          options={{
            headerRight: () => <Button onPress={logOut} content={'Log out'} />,
            headerRightContainerStyle: { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 10 },
            drawerLabel: 'Home',
            title: 'Home',
          }}
          name="admin"
        />
        <Drawer.Screen
          options={{
            drawerItemStyle: { display: 'none' },
          }}
          name="messenger"
        />
        <Drawer.Screen
          name="modules"
          options={{
            headerRight: () => <Button onPress={logOut} content={'Log out'} />,
            headerRightContainerStyle: { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 10 },
            drawerLabel: 'Modules',
            title: 'Modules',
          }}
        />
        <Drawer.Screen
          name="admin-tools"
          options={{
            headerRight: () => <Button onPress={logOut} content={'Log out'} />,
            headerRightContainerStyle: { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 10 },
            drawerLabel: 'Admin Tools',
            title: 'Admin Tools',
          }}
        />
      </Drawer>
    );
  }
  if (authStore.role === 'user') {
    return (
      <Drawer initialRouteName="messenger">
        <Drawer.Screen
          options={{
            headerRight: () => <Button onPress={logOut} content={'Log out'} />,
            headerRightContainerStyle: { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 10 },
            drawerLabel: 'Home',
            title: 'Home',
          }}
          name="messenger"
        />
        <Drawer.Screen
          options={{
            drawerItemStyle: { display: 'none' },
          }}
          name="admin"
        />
        <Drawer.Screen
          name="modules"
          options={{
            headerRight: () => <Button onPress={logOut} content={'Log out'} />,
            headerRightContainerStyle: { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 10 },
            drawerLabel: 'Modules',
            title: 'Modules',
          }}
        />
        <Drawer.Screen
          name="admin-tools"
          redirect={true}
          options={{
            headerRight: () => <Button onPress={logOut} content={'Log out'} />,
            headerRightContainerStyle: { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 10 },
            drawerLabel: 'Admin Tools',
            title: 'Admin Tools',
            drawerItemStyle: { display: 'none' },
          }}
        />
      </Drawer>
    );
  } else {
    return <Redirect href="/sign-in" />;
  }
}

export default observer(AppLayout);
