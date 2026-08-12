import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FilledButton, androidRipple } from '@/components/ui/material';
import { useProfilActif } from '@/lib/context/ProfilActifContext';
import { ajouterProfil, listerProfils, type Profil } from '@/lib/db/profils';
import { useStabiliteClavier } from '@/lib/hooks/useStabiliteClavier';
import { useAppTheme } from '@/lib/theme/useAppTheme';

/**
 * Écran "Qui êtes-vous ?" : sélection d'un profil existant ou création d'un nouveau.
 */
export function SelecteurProfil() {
  const { definirProfilActif } = useProfilActif();
  const [profils, setProfils] = useState<Profil[]>([]);
  const [nouveauNom, setNouveauNom] = useState('');
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const nomInputRef = useRef<TextInput>(null);
  useStabiliteClavier([nomInputRef]);

  useEffect(() => {
    listerProfils()
      .then(setProfils)
      .catch((error) => {
        console.error('Erreur lors du chargement des profils :', error);
      });
  }, []);

  function handleChoisirProfil(profil: Profil) {
    definirProfilActif({ id: profil.id, nom: profil.nom });
  }

  async function handleCreerProfil() {
    const nom = nouveauNom.trim();
    if (!nom) {
      return;
    }
    try {
      const id = await ajouterProfil(nom);
      definirProfilActif({ id, nom });
      setNouveauNom('');
    } catch (error) {
      console.error('Erreur lors de la création du profil :', error);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: theme.spacing.lg + insets.top, paddingBottom: theme.spacing.xl + insets.bottom },
      ]}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <MaterialCommunityIcons name="tractor" size={40} color={theme.colors.onPrimary} />
        </View>
        <Text style={styles.title}>Bienvenue au Moulin</Text>
        <Text style={styles.subtitle}>Sélectionnez votre profil pour commencer la journée.</Text>
      </View>

      <View style={styles.creerSection}>
        <View style={styles.creerTitreRow}>
          <MaterialCommunityIcons name="account-plus" size={24} color={theme.colors.primary} />
          <Text style={styles.creerTitre}>Créer un nouveau profil</Text>
        </View>
        <TextInput
          style={styles.input}
          value={nouveauNom}
          onChangeText={setNouveauNom}
          placeholder="Nom du nouveau profil"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          ref={nomInputRef}
        />
        <FilledButton
          label="Ajouter"
          icon={<MaterialCommunityIcons name="plus-circle" size={22} color={theme.colors.onPrimary} />}
          onPress={handleCreerProfil}
        />
      </View>

      <Text style={styles.profilsLabel}>PROFILS EXISTANTS</Text>
      <View style={styles.profilsList}>
        {profils.map((profil) => (
          <Pressable
            key={profil.id}
            android_ripple={androidRipple(theme.colors.ripple)}
            style={styles.profilCard}
            onPress={() => handleChoisirProfil(profil)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{profil.nom.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.profilNom}>{profil.nom}</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    header: {
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    logoBox: {
      width: 72,
      height: 72,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
    title: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineLg,
      color: theme.colors.onSurface,
    },
    subtitle: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    profilsLabel: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.sm,
    },
    profilsList: {
      gap: theme.spacing.sm,
    },
    profilCard: {
      backgroundColor: theme.colors.surfaceContainer,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: 20,
      color: theme.colors.primary,
    },
    profilNom: {
      flex: 1,
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.headlineSm,
      color: theme.colors.onSurface,
    },
    creerSection: {
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    creerTitreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    creerTitre: {
      fontFamily: theme.fontFamilies.headlineSemiBold,
      fontSize: theme.fontSizes.headlineSm,
      color: theme.colors.onSurface,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.md,
      minHeight: 48,
      color: theme.colors.onSurface,
      fontSize: theme.fontSizes.bodyMd,
    },
  });
}
