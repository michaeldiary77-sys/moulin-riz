import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { useAppTheme } from '@/lib/theme/useAppTheme';

export default function TabLayout() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const barreSysteme = Math.max(insets.bottom, 48);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          height: 56 + barreSysteme,
          paddingBottom: barreSysteme,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: theme.fontFamilies.bodyMedium,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tarifs"
        options={{
          title: 'Tarifs',
          href: null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="tune" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journee"
        options={{
          title: 'Journées',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-check" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dettes-plus"
        options={{
          title: 'Dette+',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cash-plus" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dettes-moins"
        options={{
          title: 'Dette-',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cash-minus" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="synchronisation"
        options={{
          title: 'Sync',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="sync" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
