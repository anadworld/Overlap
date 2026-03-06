import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

const TAB_COLORS = {
  holiday: { active: '#4A8B9F', inactive: '#A0C4CF' },
  school: { active: '#5B8DEF', inactive: '#A3BFF0' },
  saved: { active: '#F5A623', inactive: '#F0CFA0' },
  settings: { active: '#7C9CBF', inactive: '#B0C4D8' },
};

const HomeIcon = ({ focused, size }: { color: string; size: number; focused: boolean }) => (
  <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={focused ? TAB_COLORS.holiday.active : TAB_COLORS.holiday.inactive} />
);
const SchoolIcon = ({ focused, size }: { color: string; size: number; focused: boolean }) => (
  <Ionicons name={focused ? 'school' : 'school-outline'} size={size} color={focused ? TAB_COLORS.school.active : TAB_COLORS.school.inactive} />
);
const SavedIcon = ({ focused, size }: { color: string; size: number; focused: boolean }) => (
  <Ionicons name={focused ? 'bookmark' : 'bookmark-outline'} size={size} color={focused ? TAB_COLORS.saved.active : TAB_COLORS.saved.inactive} />
);
const SettingsIcon = ({ focused, size }: { color: string; size: number; focused: boolean }) => (
  <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={focused ? TAB_COLORS.settings.active : TAB_COLORS.settings.inactive} />
);

function TabLayoutContent() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2D3748',
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
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Holiday',
        tabBarIcon: HomeIcon,
        tabBarActiveTintColor: TAB_COLORS.holiday.active,
      }} />
      <Tabs.Screen name="school" options={{
        title: 'School',
        tabBarIcon: SchoolIcon,
        tabBarActiveTintColor: TAB_COLORS.school.active,
      }} />
      <Tabs.Screen name="saved" options={{
        title: 'Saved',
        tabBarIcon: SavedIcon,
        tabBarActiveTintColor: TAB_COLORS.saved.active,
      }} />
      <Tabs.Screen name="settings" options={{
        title: 'Settings',
        tabBarIcon: SettingsIcon,
        tabBarActiveTintColor: TAB_COLORS.settings.active,
      }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return <TabLayoutContent />;
}
