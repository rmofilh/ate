import type { SupabaseClient } from '@supabase/supabase-js';
import { Directory, File, Paths } from 'expo-file-system';

import { ErroDeSincronizacao } from '../../core/application/errors/ErroDeSincronizacao';
import type { IArmazenamentoRemoto } from '../../core/application/gateways/IArmazenamentoRemoto';
import { PASTA_FOTOS } from '../fileSystem/ArmazenamentoDeFotos';
import { comLimiteDeTempo } from '../shared/limiteDeTempo';
import { erroDeRede, traduzirErroSupabase } from './traduzirErroSupabase';

export const BUCKET_FOTOS = 'fotos';
export const LIMITE_ARQUIVO_MS = 60_000;
const VALIDADE_URL_ASSINADA_S = 60;

interface FalhaDoStorage {
  message: string;
  status?: number;
  statusCode?: string;
}

/**
 * Bucket privado `fotos` (D3). Envio com `upsert` (reenviar não duplica); download por URL
 * assinada de curta duração direto para o arquivo local, sem passar bytes pelo JS.
 */
export class SupabaseArmazenamentoRemoto implements IArmazenamentoRemoto {
  constructor(
    private readonly cliente: Pick<SupabaseClient, 'storage'>,
    private readonly limiteMs = LIMITE_ARQUIVO_MS,
  ) {}

  async enviar(caminhoLocal: string, caminhoRemoto: string): Promise<void> {
    const arquivo = new File(Paths.document, caminhoLocal);
    if (!arquivo.exists) {
      throw new ErroDeSincronizacao('PERMANENTE', `Foto não encontrada no aparelho: ${caminhoLocal}`);
    }
    const bytes = await arquivo.bytes();
    // ArrayBuffer (não a view): é o corpo que o fetch do React Native envia sem conversão.
    const corpo = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const { error } = await this.chamar(
      this.cliente.storage
        .from(BUCKET_FOTOS)
        .upload(caminhoRemoto, corpo as ArrayBuffer, { contentType: 'image/jpeg', upsert: true }),
    );
    if (error) throw traduzir(error);
  }

  async baixar(caminhoRemoto: string, caminhoLocal: string): Promise<void> {
    const { data, error } = await this.chamar(
      this.cliente.storage
        .from(BUCKET_FOTOS)
        .createSignedUrl(caminhoRemoto, VALIDADE_URL_ASSINADA_S),
    );
    if (error || !data) throw traduzir(error ?? { message: 'URL assinada vazia' });
    new Directory(Paths.document, PASTA_FOTOS).create({ intermediates: true, idempotent: true });
    try {
      await comLimiteDeTempo(
        File.downloadFileAsync(data.signedUrl, new File(Paths.document, caminhoLocal)),
        this.limiteMs,
        () => new Error('Tempo esgotado'),
      );
    } catch (erro) {
      throw erroDeRede(erro);
    }
  }

  private async chamar<T>(requisicao: Promise<T>): Promise<T> {
    try {
      return await comLimiteDeTempo(requisicao, this.limiteMs, () => new Error('Tempo esgotado'));
    } catch (erro) {
      throw erroDeRede(erro);
    }
  }
}

function traduzir(falha: FalhaDoStorage): ErroDeSincronizacao {
  const status = falha.status ?? (Number(falha.statusCode) || 0);
  return traduzirErroSupabase({ status, message: falha.message });
}
