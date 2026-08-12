import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tarifs',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="journee"
        options={{
          title: 'Journées',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="calendar-check" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dettes"
        options={{
          title: 'Dettes',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="cash-sync" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="synchronisation"
        options={{
          title: 'Sync',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="sync" size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
