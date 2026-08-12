import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/lib/theme/useAppTheme';

export function androidRipple(color: string, borderless = false) {
  return Platform.OS === 'android' ? { color, borderless, foreground: true } : undefined;
}

export function IconButton({
  onPress,
  children,
  accessibilityLabel,
  style,
}: {
  onPress?: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={androidRipple(theme.colors.ripple, true)}
      style={[styles.iconButton, style]}>
      {children}
    </Pressable>
  );
}

export function FilledButton({
  onPress,
  label,
  icon,
  disabled,
  style,
}: {
  onPress?: () => void;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      android_ripple={disabled ? undefined : androidRipple(theme.colors.ripple)}
      style={[
        styles.filled,
        {
          backgroundColor: disabled ? theme.colors.surfaceContainerHigh : theme.colors.primary,
          borderRadius: theme.radius.xl,
          minHeight: 48,
        },
        style,
      ]}>
      {icon}
      <Text
        style={{
          color: disabled ? theme.colors.onSurfaceVariant : theme.colors.onPrimary,
          fontFamily: theme.fontFamilies.bodyMedium,
          fontSize: theme.fontSizes.bodyMd,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TextButton({
  onPress,
  label,
  disabled,
}: {
  onPress?: () => void;
  label: string;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      android_ripple={androidRipple(theme.colors.ripple)}
      style={styles.textButton}>
      <Text
        style={{
          color: theme.colors.primary,
          fontFamily: theme.fontFamilies.bodyMedium,
          fontSize: theme.fontSizes.bodyMd,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AppBar({
  title,
  subtitle,
  left,
  right,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.appBar,
        theme.elevation.bar,
        {
          paddingTop: insets.top,
          backgroundColor: theme.colors.surface,
        },
      ]}>
      <View style={styles.appBarRow}>
        {left ?? <View style={styles.iconButton} />}
        <View style={styles.appBarTitles}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: theme.fontFamilies.headlineSemiBold,
              fontSize: theme.fontSizes.headlineMd,
              color: theme.colors.onSurface,
            }}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: theme.fontFamilies.body,
                fontSize: theme.fontSizes.labelMd,
                color: theme.colors.onSurfaceVariant,
              }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ?? <View style={styles.iconButton} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  textButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBar: {
    zIndex: 2,
  },
  appBarRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  appBarTitles: {
    flex: 1,
    paddingHorizontal: 4,
  },
});
