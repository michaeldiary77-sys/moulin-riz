import { useColorScheme } from '@/hooks/use-color-scheme';
import { colors, elevation, fontFamilies, fontSizes, radius, spacing } from '@/lib/theme/tokens';

/**
 * Thème Material 3. Suit le système ; si inconnu, le mode clair (défaut Android).
 */
export function useAppTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  return {
    colors: isDark ? colors.dark : colors.light,
    radius,
    spacing,
    fontFamilies,
    fontSizes,
    elevation,
    isDark,
  };
}
