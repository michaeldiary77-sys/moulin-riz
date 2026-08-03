import { useEffect } from 'react';
import { Keyboard, type TextInput } from 'react-native';

/**
 * Stabilise le clavier sur les écrans/popups avec champs de saisie.
 * Règle deux problèmes Android déjà rencontrés :
 * - le bouton "retour" ferme le clavier sans retirer le focus du TextInput
 *   actif : on le retire donc explicitement dès que le clavier se ferme ;
 * - autoFocus ne se déclenche qu'au premier montage, or un Modal ne démonte
 *   pas son contenu entre deux ouvertures : on redemande donc explicitement
 *   le focus à chaque ouverture du popup.
 */
export function useStabiliteClavier(
  refs: React.RefObject<TextInput | null>[],
  visible?: boolean,
) {
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      for (const ref of refs) {
        ref.current?.blur();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (visible === undefined || !visible) {
      return;
    }
    const timeout = setTimeout(() => {
      refs[0]?.current?.focus();
    }, 150);
    return () => clearTimeout(timeout);
  }, [visible]);
}
