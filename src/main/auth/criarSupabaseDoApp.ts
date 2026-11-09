import type { SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Storage } from 'expo-sqlite/kv-store';

import type { IAuthGateway } from '../../core/application/gateways/IAuthGateway';
import {
  type ArmazemChaveValor,
  ArmazenamentoCifradoDeSessao,
} from '../../infrastructure/auth/ArmazenamentoCifradoDeSessao';
import { CifradorAesGcm } from '../../infrastructure/auth/CifradorAesGcm';
import { SupabaseAuthGateway } from '../../infrastructure/auth/SupabaseAuthGateway';
import {
  CHAVE_SESSAO,
  criarClienteSupabase,
  validarConfigSupabase,
} from '../../infrastructure/supabase/cliente';
import { SupabaseArmazenamentoRemoto } from '../../infrastructure/supabase/SupabaseArmazenamentoRemoto';
import { SupabaseServidorRemoto } from '../../infrastructure/supabase/SupabaseServidorRemoto';
import type { Remoto } from '../factories/makeSqliteProviders';

export interface SupabaseDoApp {
  auth: IAuthGateway;
  /** O mesmo cliente do auth: o sync usa PostgREST e Storage com a sessão dele. */
  cliente: SupabaseClient;
  /** Destino do sync: tabelas (PostgREST) e bucket de fotos (Storage). */
  remoto: Remoto;
}

const cofreSecureStore: ArmazemChaveValor = {
  getItem: (chave) => SecureStore.getItemAsync(chave),
  setItem: (chave, valor) => SecureStore.setItemAsync(chave, valor),
  removeItem: (chave) => SecureStore.deleteItemAsync(chave),
};

/**
 * Monta o Supabase do app: chave AES no SecureStore, sessão cifrada no kv-store do expo-sqlite.
 * Lança ConfigSupabaseInvalidaError sem .env válido.
 */
export function criarSupabaseDoApp(bruta: { url?: string; chave?: string }): SupabaseDoApp {
  const config = validarConfigSupabase(bruta);
  const armazenamento = new ArmazenamentoCifradoDeSessao(
    cofreSecureStore,
    Storage,
    new CifradorAesGcm(),
  );
  const cliente = criarClienteSupabase(config, armazenamento);
  return {
    auth: new SupabaseAuthGateway(cliente.auth, armazenamento, CHAVE_SESSAO),
    cliente,
    remoto: {
      servidor: new SupabaseServidorRemoto(cliente),
      armazenamento: new SupabaseArmazenamentoRemoto(cliente),
    },
  };
}

let instancia: SupabaseDoApp | null = null;

/**
 * Instância única do app (um só GoTrueClient: StrictMode e Fast Refresh não criam outro).
 * Os acessos a process.env.EXPO_PUBLIC_* ficam literais porque o Expo só embute no bundle o que
 * é acessado dessa forma.
 */
export function obterSupabaseDoApp(): SupabaseDoApp {
  instancia ??= criarSupabaseDoApp({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    chave: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return instancia;
}
