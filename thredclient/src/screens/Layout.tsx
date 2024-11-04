import { observer } from 'mobx-react-lite';
import { createDrawerNavigator } from '@react-navigation/drawer';
import rootStore from '../stores/rootStore';
import { LoginScreen } from './Login/LoginScreen';
import { MessengerLayout } from './Messenger/MessengerLayout';
import { AdminLayout } from './Admin/AdminLayout';
import { Button } from '../components/Button';

export type AdminStackParamList = {
  Home: { rootStore: typeof rootStore };
};

export type MessengerStackParamList = {
  Home: { rootStore: typeof rootStore };
};
export const Layout = observer(({}) => {
  const AuthDrawer = createDrawerNavigator<AdminStackParamList>();
  const MessengerDrawer = createDrawerNavigator<MessengerStackParamList>();
  const { authStore } = rootStore;

  function logOut() {
    authStore.logOut();
  }
  if (authStore.role === 'admin') {
    return (
      <AuthDrawer.Navigator initialRouteName="Home">
        <AuthDrawer.Screen
          options={{
            headerRight: () => <Button onPress={logOut} content={'Log out'} />,
            headerRightContainerStyle: { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 10 },
          }}
          name="Home"
          component={AdminLayout}
          initialParams={{ rootStore }}
        />
      </AuthDrawer.Navigator>
    );
  }
  if (authStore.role === 'user') {
    return (
      <MessengerDrawer.Navigator initialRouteName="Home">
        <MessengerDrawer.Screen
          options={{
            headerRight: () => <Button onPress={logOut} content={'Log out'} />,
            headerRightContainerStyle: { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 10 },
          }}
          name="Home"
          component={MessengerLayout}
          initialParams={{ rootStore }}
        />
      </MessengerDrawer.Navigator>
    );
  } else return <LoginScreen />;
});
