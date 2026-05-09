import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tabs: Array<{ name: string; label: string; icon: IconName; activeIcon: IconName }> = [
  { name: 'search', label: 'SEARCH', icon: 'search-outline', activeIcon: 'search' },
  { name: 'map', label: 'MAP', icon: 'map-outline', activeIcon: 'map' },
  { name: 'watchlist', label: 'WATCHLIST', icon: 'heart-outline', activeIcon: 'heart' },
  { name: 'profile', label: 'PROFILE', icon: 'person-outline', activeIcon: 'person' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bgSecondary,
          borderTopColor: Colors.borderSubtle,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.accentGreen,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 9,
          letterSpacing: 1.5,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? tab.activeIcon : tab.icon}
                size={22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
