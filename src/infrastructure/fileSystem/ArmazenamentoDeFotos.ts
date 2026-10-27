import { CryptoDigestAlgorithm, digest } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { IIdGenerator } from '../../core/application/gateways/IIdGenerator';
import type { DrizzleAppDb } from '../database/sqlite/DrizzleDb';
import { fotos } from '../database/sqlite/schema';

export const PASTA_FOTOS = 'fotos';
export const LADO_MAXIMO_PX = 1600;
export const QUALIDADE_JPEG = 0.7;

/** Foto aceita na câmera, ainda no arquivo temporário. */
export interface FotoCapturada {
  uri: string;
  largura: number;
  altura: number;
}

/**
 * Comprime a foto aceita, guarda em <documentos>/fotos/<uuid>.jpg e registra em `fotos`.
 * Devolve o caminho RELATIVO (fotos/<uuid>.jpg): o absoluto muda entre builds e reinstalações.
 */
export class ArmazenamentoDeFotos {
  constructor(
    private readonly db: DrizzleAppDb,
    private readonly ids: IIdGenerator,
    private readonly relogio: () => Date = () => new Date(),
    private readonly diagnostico: (mensagem: string) => void = () => {},
  ) {}

  async armazenar(foto: FotoCapturada): Promise<string> {
    const id = this.ids.gerar();
    const caminhoRelativo = `${PASTA_FOTOS}/${id}.jpg`;
    const uriComprimida = await comprimir(foto);
    new Directory(Paths.document, PASTA_FOTOS).create({ intermediates: true, idempotent: true });
    const destino = new File(Paths.document, caminhoRelativo);
    try {
      await new File(uriComprimida).move(destino);
      const hash = await sha256(destino);
      await this.db.insert(fotos).values({
        id,
        caminhoLocal: caminhoRelativo,
        hash,
        status: 'PENDENTE_UPLOAD',
        tentativas: 0,
        criadoEmLocal: this.relogio().toISOString(),
      });
    } catch (erro) {
      apagarSeExistir(destino);
      apagarSeExistir(new File(uriComprimida));
      throw erro;
    }
    apagarSeExistir(new File(foto.uri));
    const tamanhoKb = Math.round((destino.info().size ?? 0) / 1024);
    this.diagnostico(`[fotos] ${caminhoRelativo} salva com ${tamanhoKb} KB`);
    return caminhoRelativo;
  }
}

async function comprimir(foto: FotoCapturada): Promise<string> {
  const contexto = ImageManipulator.manipulate(foto.uri);
  if (Math.max(foto.largura, foto.altura) > LADO_MAXIMO_PX) {
    contexto.resize(
      foto.largura >= foto.altura ? { width: LADO_MAXIMO_PX } : { height: LADO_MAXIMO_PX },
    );
  }
  try {
    const imagem = await contexto.renderAsync();
    try {
      const salva = await imagem.saveAsync({ compress: QUALIDADE_JPEG, format: SaveFormat.JPEG });
      return salva.uri;
    } finally {
      imagem.release();
    }
  } finally {
    contexto.release();
  }
}

async function sha256(arquivo: File): Promise<string> {
  const resumo = await digest(CryptoDigestAlgorithm.SHA256, await arquivo.bytes());
  return Array.from(new Uint8Array(resumo), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function apagarSeExistir(arquivo: File): void {
  try {
    if (arquivo.exists) arquivo.delete();
  } catch {
    // Limpeza de melhor esforço: o erro original é o que importa.
  }
}
