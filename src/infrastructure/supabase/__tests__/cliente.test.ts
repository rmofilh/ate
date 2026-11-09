import { createClient } from '@supabase/supabase-js';

import {
  CHAVE_SESSAO,
  ConfigSupabaseInvalidaError,
  criarClienteSupabase,
  validarConfigSupabase,
} from '../cliente';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() },
  })),
}));

const VALIDA = { url: 'https://abcd.supabase.co', chave: 'sb_publishable_xyz' };

describe('validarConfigSupabase', () => {
  it('aceita URL https e chave publishable, sem barra final', () => {
    expect(
      validarConfigSupabase({ url: 'https://abcd.supabase.co/', chave: ' sb_publishable_xyz ' }),
    ).toEqual(VALIDA);
  });

  it.each([
    ['sem nada', {}],
    ['URL vazia', { url: '  ', chave: 'sb_publishable_xyz' }],
    ['chave vazia', { url: 'https://abcd.supabase.co' }],
  ])('%s: erro explicando o .env', (_, bruta) => {
    expect(() => validarConfigSupabase(bruta)).toThrow(ConfigSupabaseInvalidaError);
    expect(() => validarConfigSupabase(bruta)).toThrow(/\.env/);
  });

  it('recusa URL sem https', () => {
    expect(() => validarConfigSupabase({ ...VALIDA, url: 'http://abcd.supabase.co' })).toThrow(
      /https/,
    );
  });

  it.each([
    ['secret nova', 'sb_secret_abc'],
    ['JWT antigo (anon ou service_role)', 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.x'],
  ])('recusa chave que não é publishable: %s', (_, chave) => {
    expect(() => validarConfigSupabase({ ...VALIDA, chave })).toThrow(/publishable/);
  });
});

describe('criarClienteSupabase', () => {
  it('cria o cliente com sessão persistida no armazenamento cifrado', () => {
    const armazenamento = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };
    const appState = { addEventListener: jest.fn() };

    criarClienteSupabase(VALIDA, armazenamento, appState as never);

    expect(createClient).toHaveBeenCalledWith(VALIDA.url, VALIDA.chave, {
      auth: {
        storage: armazenamento,
        storageKey: CHAVE_SESSAO,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  });

  it('renova o token só com o app em primeiro plano', () => {
    const appState = { addEventListener: jest.fn() };
    const cliente = criarClienteSupabase(
      VALIDA,
      { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
      appState as never,
    );
    const aoMudar = appState.addEventListener.mock.calls[0][1] as (estado: string) => void;

    aoMudar('active');
    expect(cliente.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    aoMudar('background');
    expect(cliente.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
  });
});
