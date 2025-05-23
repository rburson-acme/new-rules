import { Button } from '@/src/components/common/Button';
import { ThemeProvider } from '@/src/contexts/ThemeContext';
import { RootStore } from '@/src/stores/RootStore';
import Drawer from 'expo-router/drawer';
import { observer } from 'mobx-react-lite';
import { Image, StyleSheet, Text } from 'react-native';
import React from 'react';
import 'react-native-reanimated';
import { View } from 'react-native-animatable';
import Feather from '@expo/vector-icons/Feather';
import { Redirect } from 'expo-router';

function AppLayout() {
  const { authStore, themeStore, connectionStore } = RootStore.get();

  function logOut() {
    authStore.logOut();

    connectionStore.disconnect();
  }

  const { theme } = themeStore;
  const isAdmin = authStore.role === 'admin';

  if (!authStore.userId) {
    return <Redirect href={'/sign-in'} />;
  }
  return (
    <ThemeProvider themeStore={themeStore}>
      <Drawer
        initialRouteName="threds"
        screenOptions={({ navigation }) => ({
          title: 'New Rules',
          headerLeft: () => (
            <Feather
              name="menu"
              size={24}
              color={theme.colors.icon}
              style={[{ borderColor: theme.colors.border }, styles.iconStyles]}
              onPress={navigation.openDrawer}
            />
          ),
          headerRight: () => <Button onPress={logOut} content={'Log out'} />, // TODO: Add Avatar here with logout functionality
          headerTitle: () => <HeaderTitle />,
          headerTitleAlign: 'center',
          headerRightContainerStyle: styles.headerRightContainerStyle,
        })}>
        {/* SCREENS  FOR ALL USERS */}
        <Drawer.Screen
          options={{
            drawerLabel: 'Home',
            title: 'Home',
          }}
          name="threds"
        />

        <Drawer.Screen
          name="modules"
          options={{
            drawerLabel: 'Modules',
            title: 'Modules',
          }}
        />
        <Drawer.Screen
          name="threds/[thredId]"
          options={{
            drawerItemStyle: { display: 'none' },
          }}
        />
        {/* SCREENS FOR ADMIN */}
        <Drawer.Screen
          name="admin-tools"
          options={{
            drawerLabel: 'Admin Tools',
            title: 'Admin Tools',
            drawerItemStyle: !isAdmin ? { display: 'none' } : undefined,
          }}
        />
      </Drawer>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  iconStyles: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 4,
    marginLeft: 16,
    marginVertical: 8,
  },
  headerRightContainerStyle: { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 10 },
});

const HeaderTitle = () => {
  const initiativeLabsLogo = require('../../../assets/initiative-blue.png');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Image source={initiativeLabsLogo} style={{ width: 100, height: 48 }} resizeMode="contain" />
    </View>
  );
};
export default observer(AppLayout);
