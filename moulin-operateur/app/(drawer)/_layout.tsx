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
      initialRouteName="accueil"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          height: 56 + barreSysteme,
          paddingBottom: barreSysteme,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: theme.fontFamilies.bodyMedium,
        },
      }}>
      <Tabs.Screen
        name="accueil"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="resume"
        options={{
          title: 'Résumé',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-box" size={size} color={color} />
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
