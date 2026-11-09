import { SupabaseAuthGateway } from '../../../infrastructure/auth/SupabaseAuthGateway';
import { ConfigSupabaseInvalidaError } from '../../../infrastructure/supabase/cliente';
import { criarSupabaseDoApp } from '../criarSupabaseDoApp';

jest.mock('@supabase/supabase-js', () => ({
  ...jest.requireActual('@supabase/supabase-js'),
  createClient: jest.fn(() => ({
    auth: { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() },
  })),
}));

describe('criarSupabaseDoApp', () => {
  it('sem valores lança o erro de configuração', () => {
    expect(() => criarSupabaseDoApp({})).toThrow(ConfigSupabaseInvalidaError);
  });

  it('com URL e chave publishable monta o gateway e expõe o mesmo cliente', () => {
    const supabase = criarSupabaseDoApp({
      url: 'https://abcd.supabase.co',
      chave: 'sb_publishable_xyz',
    });
    expect(supabase.auth).toBeInstanceOf(SupabaseAuthGateway);
    expect(supabase.cliente.auth).toBeDefined();
  });
});
