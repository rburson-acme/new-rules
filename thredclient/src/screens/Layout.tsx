import { observer } from 'mobx-react-lite';
import { createDrawerNavigator } from '@react-navigation/drawer';
import rootStore from '../stores/rootStore';
import { LoginScreen } from './Login/LoginScreen';
import { MessengerLayout } from './Messenger/MessengerLayout';
import { AdminLayout } from './Admin/AdminLayout';
import { Button } from '../components/Button';;
import { createStackNavigator } from '@react-navigation/stack';
import { ModuleLayout } from './Module/ModuleLayout';
import { AdminDrawerParamList, MessengerDrawerParamList, ModuleStackParamList } from '../core/Navigation';
import { ModuleListLayout } from './ModuleList/ModuleListLayout';

export const Layout = observer(({}) => {
  const AuthDrawer = createDrawerNavigator<AdminDrawerParamList>();
  const MessengerDrawer = createDrawerNavigator<MessengerDrawerParamList>();
  const { authStore } = rootStore;

  const ModuleStack = createStackNavigator<ModuleStackParamList>();

  function ModuleStackDef() {
    return (
      <ModuleStack.Navigator>
        <ModuleStack.Screen
          name="ModuleListLayout"
          options={{ headerShown: false }}
          component={ModuleListLayout}
          initialParams={{ rootStore }}
        />
        <ModuleStack.Screen
          name="Module"
          options={({ route }) => ({ title: route.params.name })}
          component={ModuleLayout}
        />
      </ModuleStack.Navigator>
    );
  }

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
        <AuthDrawer.Screen name="Modules" component={ModuleStackDef} />
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
        <AuthDrawer.Screen name="Modules" component={ModuleStackDef} />
      </MessengerDrawer.Navigator>
    );
  } else return <LoginScreen />;
});
