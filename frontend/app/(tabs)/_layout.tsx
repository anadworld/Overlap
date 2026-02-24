import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Extracted icon components to avoid unstable nested component warnings
const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="calendar" size={size} color={color} />
);
const SavedIcon = ({ color, size, focused }: { color: string; size: number; focused?: boolean }) => (
  <Ionicons name={focused ? 'bookmark' : 'bookmark-outline'} size={size} color={color} />
);
const SettingsIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="settings-outline" size={size} color={color} />
);

function TabLayoutContent() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#7C9CBF',
        tabBarInactiveTintColor: '#A0AEC0',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: bottomInset > 0 ? bottomInset : 10,
          height: 56 + (bottomInset > 0 ? bottomInset : 10),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved', tabBarIcon: SavedIcon }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: SettingsIcon }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return <TabLayoutContent />;
}
