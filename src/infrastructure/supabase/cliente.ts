import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

import type { ArmazenamentoDeSessao } from '../auth/ArmazenamentoCifradoDeSessao';

export const CHAVE_SESSAO = 'ate-auth';

export interface ConfigSupabase {
  url: string;
  chave: string;
}

export const MENSAGEM_CONFIG_AUSENTE =
  'Configuração do Supabase ausente. Copie .env.example para .env, preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY e reinicie o Expo.';

export class ConfigSupabaseInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ConfigSupabaseInvalidaError';
    Object.setPrototypeOf(this, ConfigSupabaseInvalidaError.prototype);
  }
}

/**
 * Valida os valores já lidos de process.env.EXPO_PUBLIC_* (o Expo só embute acessos literais,
 * então a leitura fica no composition root). Só aceita a chave publishable (`sb_publishable_…`):
 * a proteção real dos dados é o RLS, e a chave secreta nunca pode ir para dentro do app.
 */
export function validarConfigSupabase(bruta: { url?: string; chave?: string }): ConfigSupabase {
  const url = bruta.url?.trim() ?? '';
  const chave = bruta.chave?.trim() ?? '';
  if (!url || !chave) throw new ConfigSupabaseInvalidaError(MENSAGEM_CONFIG_AUSENTE);
  if (!/^https:\/\/\S+$/.test(url)) {
    throw new ConfigSupabaseInvalidaError(
      'EXPO_PUBLIC_SUPABASE_URL inválida: use a URL https do projeto.',
    );
  }
  if (!chave.startsWith('sb_publishable_')) {
    throw new ConfigSupabaseInvalidaError(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY deve ser a chave publishable (sb_publishable_…), nunca a secret/service_role.',
    );
  }
  return { url: url.replace(/\/+$/, ''), chave };
}

/** Cliente único do app. A sessão fica no armazenamento cifrado e só renova em primeiro plano. */
export function criarClienteSupabase(
  config: ConfigSupabase,
  armazenamento: ArmazenamentoDeSessao,
  appState: Pick<typeof AppState, 'addEventListener'> = AppState,
): SupabaseClient {
  const cliente = createClient(config.url, config.chave, {
    auth: {
      storage: armazenamento,
      storageKey: CHAVE_SESSAO,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  // Recomendação do Supabase para React Native: renovar o token só com o app ativo.
  appState.addEventListener('change', (estado: AppStateStatus) => {
    if (estado === 'active') void cliente.auth.startAutoRefresh();
    else void cliente.auth.stopAutoRefresh();
  });
  return cliente;
}
