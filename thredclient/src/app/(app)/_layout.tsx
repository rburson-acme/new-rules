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
  const { authStore, themeStore } = RootStore.get();

  function logOut() {
    authStore.logOut();
  }

  const { theme } = themeStore;
  const isAdmin = authStore.role === 'admin';

  if (!authStore.userId) {
    return <Redirect href={'/sign-in'} />;
  }
  return (
    <ThemeProvider themeStore={themeStore}>
      <Drawer
        initialRouteName="admin"
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
        })}>
        {/* ADMIN SCREENS */}
        <Drawer.Screen
          options={{
            headerRight: () => <Button onPress={logOut} content={'Log out'} />, // TODO: Add Avatar here with logout functionality
            headerTitle: () => <HeaderTitle />,
            headerTitleAlign: 'center',
            headerRightContainerStyle: styles.headerRightContainerStyle,
            drawerLabel: 'Home',
            title: 'Home',
            drawerItemStyle: !isAdmin ? { display: 'none' } : undefined,
          }}
          name="admin"
        />
        <Drawer.Screen
          name="admin-tools"
          options={{
            headerRight: () => <Button onPress={logOut} content={'Log out'} />,
            headerRightContainerStyle: styles.headerRightContainerStyle,
            drawerLabel: 'Admin Tools',
            title: 'Admin Tools',
            drawerItemStyle: !isAdmin ? { display: 'none' } : undefined,
          }}
        />
        {/* USER SCREENS */}
        <Drawer.Screen
          options={{
            headerRight: () => <Button onPress={logOut} content={'Log out'} />, // TODO: Add Avatar here with logout functionality
            headerTitle: () => <HeaderTitle />,
            headerTitleAlign: 'center',
            headerRightContainerStyle: styles.headerRightContainerStyle,
            drawerLabel: 'Home',
            title: 'Home',
            drawerItemStyle: isAdmin ? { display: 'none' } : undefined,
          }}
          name="messenger"
        />

        {/* SCREENS  FOR ALL USERS */}
        <Drawer.Screen
          name="modules"
          options={{
            headerRight: () => <Button onPress={logOut} content={'Log out'} />,
            headerRightContainerStyle: styles.headerRightContainerStyle,
            drawerLabel: 'Modules',
            title: 'Modules',
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
  const newRulesLogo = require('../../../assets/new-rules-logo.png');

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Image source={newRulesLogo} style={{ width: 48, height: 48 }} />
      <Text style={{ fontFamily: 'Nexa-Heavy', fontSize: 18 }}>New</Text>
      <Text style={{ fontFamily: 'Nexa-ExtraLight', fontSize: 18 }}>Rules</Text>
    </View>
  );
};
export default observer(AppLayout);
