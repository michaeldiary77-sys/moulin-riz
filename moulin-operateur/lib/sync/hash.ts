import { digestStringAsync, CryptoDigestAlgorithm, CryptoEncoding } from 'expo-crypto';

/**
 * Calcule une empreinte SHA-256 du texte donné.
 * Ce hash sert uniquement à détecter une modification ou corruption du fichier
 * après export — pas à le rendre illisible (le CSV reste en clair).
 */
export async function computeHash(content: string): Promise<string> {
  return digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    content,
    { encoding: CryptoEncoding.HEX },
  );
}
