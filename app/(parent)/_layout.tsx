import { Tabs } from 'expo-router';
import { colors } from '../../src/theme/tokens';

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.cobalt,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: 'Inter-SemiBold', fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: '#EEEEEE',
        },
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      <Tabs.Screen name="task-edit" options={{ href: null }} />
    </Tabs>
  );
}
