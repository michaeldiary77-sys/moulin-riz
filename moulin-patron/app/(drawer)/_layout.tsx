import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { MenuTiroir } from '@/components/MenuTiroir';
import { useAppTheme } from '@/lib/theme/useAppTheme';

export default function DrawerLayout() {
  const theme = useAppTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <MenuTiroir {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: 'front',
          drawerStyle: {
            backgroundColor: theme.colors.surface,
            width: 280,
          },
        }}>
        <Drawer.Screen name="(tabs)" options={{ title: 'Menu' }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}
