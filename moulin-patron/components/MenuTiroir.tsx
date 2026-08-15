import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerContentScrollView, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { usePathname, useRouter } from 'expo-router';

import { androidRipple } from '@/components/ui/material';
import { useAppTheme } from '@/lib/theme/useAppTheme';

const ENTREES = [
  { href: '/', label: 'Accueil', icone: 'view-dashboard' },
  { href: '/tarifs', label: 'Tarifs', icone: 'tune' },
  { href: '/graphiques', label: 'Graphiques', icone: 'chart-bar' },
  { href: '/journee', label: 'Journées', icone: 'calendar-check' },
  { href: '/dettes-plus', label: 'Dette+', icone: 'cash-plus' },
  { href: '/dettes-moins', label: 'Dette-', icone: 'cash-minus' },
  { href: '/synchronisation', label: 'Sync', icone: 'sync' },
] as const;

export function MenuTiroir(props: DrawerContentComponentProps) {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const chemin = usePathname();

  return (
    <DrawerContentScrollView {...props} style={styles.fond} contentContainerStyle={styles.contenu}>
      <Text style={styles.titre}>Moulin Patron</Text>
      {ENTREES.map((entree) => {
        const actif =
          entree.href === '/'
            ? chemin === '/' || chemin.endsWith('/index')
            : chemin === entree.href || chemin.endsWith(entree.href);
        return (
          <Pressable
            key={entree.href}
            android_ripple={androidRipple(theme.colors.ripple)}
            style={[styles.ligne, actif && styles.ligneActive]}
            onPress={() => {
              router.replace(entree.href);
              props.navigation.closeDrawer();
            }}>
            <MaterialCommunityIcons
              name={entree.icone}
              size={22}
              color={actif ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.libelle, actif && styles.libelleActif]}>{entree.label}</Text>
          </Pressable>
        );
      })}
      <View />
    </DrawerContentScrollView>
  );
}

function makeStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    fond: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    contenu: {
      paddingTop: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    titre: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.headlineSm,
      color: theme.colors.onSurface,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    ligne: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      marginHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
    },
    ligneActive: {
      backgroundColor: theme.colors.primaryContainer,
    },
    libelle: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurface,
    },
    libelleActif: {
      color: theme.colors.primary,
    },
  });
}
