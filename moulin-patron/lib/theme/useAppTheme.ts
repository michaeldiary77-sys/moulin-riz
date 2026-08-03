import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, fontFamilies, fontSizes, radius, spacing } from '@/lib/theme/tokens';

/**
 * Retourne les constantes de thème selon le thème actif du téléphone.
 * Si le thème est inconnu (null/undefined/autre), 'dark' est utilisé par défaut.
 */
export function useAppTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  return {
    colors: isDark ? colors.dark : colors.light,
    radius,
    spacing,
    fontFamilies,
    fontSizes,
  };
}
