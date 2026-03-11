import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import { Tabs } from 'expo-router';
import { useWindowDimensions, TouchableOpacity } from 'react-native';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useConnectionStore } from '@/features/connection/useConnectionStore';
import { router } from 'expo-router';

const SIDEBAR_BREAKPOINT = 768;

function LogoutButton() {
  const logout = useAuthStore((s) => s.logout);
  const disconnect = useConnectionStore((s) => s.disconnect);

  const handleLogout = () => {
    disconnect();
    logout();
    router.replace('/sign-in' as any);
  };

  return (
    <TouchableOpacity onPress={handleLogout} className="mr-4">
      <Ionicons name="log-out-outline" size={24} color="#545E75" />
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const { width } = useWindowDimensions();
  const role = useAuthStore((s) => s.role);
  const isWide = width >= SIDEBAR_BREAKPOINT;

  if (isWide) {
    return (
      <Drawer
        screenOptions={{
          headerRight: () => <LogoutButton />,
          drawerStyle: { width: 240 },
          drawerActiveTintColor: '#63ADF2',
          drawerInactiveTintColor: '#545E75',
        }}>
        <Drawer.Screen
          name="(threds)"
          options={{
            drawerLabel: 'Threds',
            title: 'Threds',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="modules"
          options={{
            drawerLabel: 'Modules',
            title: 'Modules',
            drawerIcon: ({ color, size }) => (
              <Ionicons name="apps-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="admin"
          options={{
            drawerLabel: 'Admin Tools',
            title: 'Admin Tools',
            drawerItemStyle: role !== 'admin' ? { display: 'none' } : undefined,
            drawerIcon: ({ color, size }) => (
              <Ionicons name="construct-outline" size={size} color={color} />
            ),
          }}
        />
      </Drawer>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerRight: () => <LogoutButton />,
        tabBarActiveTintColor: '#63ADF2',
        tabBarInactiveTintColor: '#545E75',
        tabBarStyle: { borderTopColor: '#DDDDDD' },
      }}>
      <Tabs.Screen
        name="(threds)"
        options={{
          title: 'Threds',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="modules"
        options={{
          title: 'Modules',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="apps-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarItemStyle: role !== 'admin' ? { display: 'none' } : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
