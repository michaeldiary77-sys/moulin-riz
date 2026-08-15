import { Platform } from 'react-native';

import { colors } from '@/lib/theme/tokens';

export const Colors = {
  light: {
    text: colors.light.onSurface,
    background: colors.light.background,
    tint: colors.light.primary,
    icon: colors.light.onSurfaceVariant,
    tabIconDefault: colors.light.onSurfaceVariant,
    tabIconSelected: colors.light.primary,
  },
  dark: {
    text: colors.dark.onSurface,
    background: colors.dark.background,
    tint: colors.dark.primary,
    icon: colors.dark.onSurfaceVariant,
    tabIconDefault: colors.dark.onSurfaceVariant,
    tabIconSelected: colors.dark.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Roboto, system-ui, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: 'system-ui',
    mono: 'monospace',
  },
});
