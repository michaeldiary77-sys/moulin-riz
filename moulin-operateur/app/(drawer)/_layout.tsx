import { Drawer } from 'expo-router/drawer';

export default function DrawerLayout() {
  return (
    <Drawer screenOptions={{ headerShown: false }}>
      <Drawer.Screen name="resume" options={{ title: 'Résumé' }} />
      <Drawer.Screen name="accueil" options={{ title: 'Accueil' }} />
      <Drawer.Screen name="dettes" options={{ title: 'Dettes' }} />
    </Drawer>
  );
}
