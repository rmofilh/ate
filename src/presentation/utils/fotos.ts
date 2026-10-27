import { File, Paths } from 'expo-file-system';

/**
 * Converte o caminho salvo no banco em URI exibível. Relativo (fotos/x.jpg) é resolvido contra
 * o diretório de documentos do app; absoluto ou URI (fixtures, dados antigos) fica como está.
 */
export function resolverUriDaFoto(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  if (caminho.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(caminho)) return caminho;
  return new File(Paths.document, caminho).uri;
}
