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
      console.error("Erreur lors de l'enregistrement des tarifs :", error);
    }
  }

  return (
    <View style={styles.container}>
      <AppBar title="Tarifs" subtitle="Prix appliqués par les opérateurs" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.carte}>
          <Text style={styles.carteLibelle}>Tarif Ar par kg</Text>
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
          <Text style={styles.carteLibelle}>Tarif Ar par Kpk (riz)</Text>
          <View style={styles.valeurRow}>
            <TextInput
              style={styles.input}
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

        <FilledButton
          label="Enregistrer les tarifs"
          icon={<MaterialCommunityIcons name="content-save" size={20} color={theme.colors.onPrimary} />}
          onPress={handleEnregistrer}
        />

        {erreur ? <Text style={styles.erreur}>{erreur}</Text> : null}
        {enregistre ? <Text style={styles.confirmation}>Tarifs enregistrés</Text> : null}

        <View style={styles.infoBox}>
          <MaterialCommunityIcons
            name="information-outline"
            size={18}
            color={theme.colors.onSurfaceVariant}
          />
          <Text style={styles.infoText}>
            Exportez ensuite tarifs.csv depuis Sync pour les appliquer sur le téléphone opérateur.
          </Text>
        </View>
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
      gap: theme.spacing.sm,
    },
    carte: {
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    carteLibelle: {
      fontFamily: theme.fontFamilies.bodyMedium,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    valeurRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.md,
      minHeight: 44,
      fontSize: theme.fontSizes.headlineSm,
      fontFamily: theme.fontFamilies.headline,
      color: theme.colors.onSurface,
    },
    unite: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
    },
    infoBox: {
      backgroundColor: theme.colors.surfaceContainer,
      borderRadius: theme.radius.md,
      padding: theme.spacing.sm,
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    infoText: {
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
    },
    confirmation: {
      color: theme.colors.success,
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
      textAlign: 'center',
    },
    erreur: {
      color: theme.colors.error,
      fontFamily: theme.fontFamilies.body,
      fontSize: theme.fontSizes.labelMd,
      textAlign: 'center',
    },
  });
}
