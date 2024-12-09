import { observer } from 'mobx-react-lite';
import { createDrawerNavigator } from '@react-navigation/drawer';
import rootStore from '../stores/rootStore';
import { LoginScreen } from './Login/LoginScreen';
import { MessengerLayout } from './Messenger/MessengerLayout';
import { AdminLayout } from './Admin/AdminLayout';
import { Button } from '../components/Button';
import { createStackNavigator } from '@react-navigation/stack';
import { ModuleLayout } from './Module/ModuleLayout';
import {
  AdminDrawerParamList,
  DevtoolStackParamList,
  MessengerDrawerParamList,
  ModuleStackParamList,
} from '../core/Navigation';
import { ModuleListLayout } from './ModuleList/ModuleListLayout';
import { DevtoolListLayout } from './DevtoolList/DevtoolListLayout';
import { DevtoolLayout } from './Devtool/DevtoolLayout';

export const Layout = observer(({}) => {
  const AuthDrawer = createDrawerNavigator<AdminDrawerParamList>();
  const MessengerDrawer = createDrawerNavigator<MessengerDrawerParamList>();
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
        <AuthDrawer.Screen name="Modules" component={ModuleStackDef} />
        <AuthDrawer.Screen name="Devtools" component={DevtoolStackDef} initialParams={{ rootStore }} />
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
        <AuthDrawer.Screen name="Devtools" component={DevtoolStackDef} initialParams={{ rootStore }} />
      </MessengerDrawer.Navigator>
    );
  } else return <LoginScreen />;
});

function ModuleStackDef() {
  const ModuleStack = createStackNavigator<ModuleStackParamList>();

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

function DevtoolStackDef() {
  const DevtoolStack = createStackNavigator<DevtoolStackParamList>();

  return (
    <DevtoolStack.Navigator>
      <DevtoolStack.Screen
        name="DevtoolListLayout"
        options={{ headerShown: false }}
        component={DevtoolListLayout}
        initialParams={{ rootStore }}
      />
      <DevtoolStack.Screen
        name="Devtool"
        component={DevtoolLayout}
        options={({ route }) => ({ title: route.params.name })}
        initialParams={{ rootStore }}
      />
    </DevtoolStack.Navigator>
  );
}
