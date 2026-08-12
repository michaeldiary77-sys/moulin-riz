import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppBar, FilledButton } from '@/components/ui/material';
import { useStabiliteClavier } from '@/lib/hooks/useStabiliteClavier';
import { useAppTheme } from '@/lib/theme/useAppTheme';
import { definirTarifs, lireTarifs } from '@/lib/db/tarifs';

const TARIF_PAR_DEFAUT_AR_PAR_KG = 100;
const TARIF_PAR_DEFAUT_AR_PAR_KPK = 500;

export default function TarifsScreen() {
  const theme = useAppTheme();
  const styles = makeStyles(theme);
  const [arParKg, setArParKg] = useState('');
  const [arParKpk, setArParKpk] = useState('');
  const [enregistre, setEnregistre] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const arParKgRef = useRef<TextInput>(null);
  const arParKpkRef = useRef<TextInput>(null);
  useStabiliteClavier([arParKgRef, arParKpkRef]);

  useEffect(() => {
    lireTarifs()
      .then((tarifs) => {
        if (tarifs) {
          setArParKg(String(tarifs.arParKg));
          setArParKpk(String(tarifs.arParKpk));
        } else {
          setArParKg(String(TARIF_PAR_DEFAUT_AR_PAR_KG));
          setArParKpk(String(TARIF_PAR_DEFAUT_AR_PAR_KPK));
        }
      })
      .catch((error) => {
        console.error('Erreur lors de la lecture des tarifs :', error);
      });
  }, []);

  async function handleEnregistrer() {
    const kg = Number(arParKg);
    const kpk = Number(arParKpk);
    if (!Number.isFinite(kg) || kg <= 0 || !Number.isFinite(kpk) || kpk <= 0) {
      setErreur('Veuillez saisir des tarifs strictement supérieurs à 0.');
      setEnregistre(false);
      return;
    }
    try {
      await definirTarifs(kg, kpk);
      setEnregistre(true);
      setErreur(null);
    } catch (error) {
      setErreur(error instanceof Error ? error.message : String(error));
      setEnregistre(false);
      console.error('Erreur lors de l\'enregistrement des tarifs :', error);
    }
  }

  return (
    <View style={styles.container}>
      <AppBar title="Tarifs" />
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.texteBlock}>
        <Text style={styles.texteLabel}>Configuration du moulin</Text>
        <Text style={styles.texteTitre}>Ajustez vos prix de prestation</Text>
      </View>

      <View style={styles.carte}>
        <View style={styles.carteHeader}>
          <View style={styles.carteIcôneCercle}>
            <MaterialCommunityIcons name="cash" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.carteLibelle}>Tarif Ar par kg</Text>
        </View>
        <Text style={styles.carteDescription}>Prestation standard (maïs, grains divers)</Text>
        <View style={styles.valeurRow}>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={arParKg}
            onChangeText={(text) => {
              setArParKg(text);
              setEnregistre(false);
            }}
            ref={arParKgRef}
          />
          <Text style={styles.unite}>Ar / kg</Text>
        </View>
      </View>

      <View style={styles.carte}>
        <View style={styles.carteHeader}>
          <View style={styles.carteIcôneCercle}>
            <MaterialCommunityIcons name="basket" size={20} color={theme.colors.ar} />
          </View>
          <Text style={styles.carteLibelle}>Tarif Ar par Kpk (riz)</Text>
        </View>
        <Text style={styles.carteDescription}>Mesure spécifique pour le décorticage</Text>
        <View style={styles.valeurRow}>
          <TextInput
            style={styles.inputKpk}
            keyboardType="numeric"
            value={arParKpk}
            onChangeText={(text) => {
              setArParKpk(text);
              setEnregistre(false);
            }}
            ref={arParKpkRef}
          />
          <Text style={styles.unite}>Ar / Kpk</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <MaterialCommunityIcons
          name="information-outline"
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
        <Text style={styles.infoText}>
          Ces nouveaux tarifs seront appliqués immédiatement pour toutes les transactions saisies
          par vos opérateurs à partir de l&apos;enregistrement.
        </Text>
      </View>

      <FilledButton
        label="Enregistrer les tarifs"
        icon={<MaterialCommunityIcons name="content-save" size={22} color={theme.colors.onPrimary} />}
        onPress={handleEnregistrer}
      />

      {erreur && <Text style={styles.erreur}>{erreur}</Text>}
      {enregistre && <Text style={styles.confirmation}>Tarifs enregistrés</Text>}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    texteBlock: {
      gap: theme.spacing.xs,
    },
    texteLabel: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    texteTitre: {
      fontFamily: theme.fontFamilies.headline,
      fontSize: theme.fontSizes.headlineMd,
      color: theme.colors.onSurface,
    },
    carte: {
      backgroundColor: theme.colors.surfaceContainer,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    carteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    carteIcôneCercle: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    carteLibelle: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    carteDescription: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
    },
    valeurRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.md,
      minHeight: 56,
      fontSize: theme.fontSizes.headlineMd,
      fontFamily: theme.fontFamilies.headline,
      color: theme.colors.onSurface,
      minWidth: 120,
    },
    inputKpk: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.md,
      minHeight: 56,
      fontSize: theme.fontSizes.headlineMd,
      fontFamily: theme.fontFamilies.headline,
      color: theme.colors.onSurface,
      minWidth: 120,
    },
    unite: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
    },
    infoBox: {
      backgroundColor: theme.colors.surfaceContainer,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    infoText: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
    },
    confirmation: {
      color: theme.colors.success,
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      textAlign: 'center',
    },
    erreur: {
      color: theme.colors.error,
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.bodyMd,
      textAlign: 'center',
    },
  });
}
