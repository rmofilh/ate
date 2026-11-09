import fs from 'fs';
import path from 'path';

const PASTA = path.resolve(__dirname, '../../../../supabase/migrations');
const TABELAS = ['clientes', 'obras', 'pedidos', 'eventos'];

function sql(): string {
  return fs
    .readdirSync(PASTA)
    .filter((nome) => nome.endsWith('.sql'))
    .sort()
    .map((nome) => fs.readFileSync(path.join(PASTA, nome), 'utf8'))
    .join('\n')
    .toLowerCase();
}

describe('migrations do Supabase (contrato estático)', () => {
  it('arquivos numerados em ordem', () => {
    expect(fs.readdirSync(PASTA).sort()).toEqual([
      '0001_tabelas.sql',
      '0002_rls.sql',
      '0003_storage.sql',
    ]);
  });

  it.each(TABELAS)('%s: RLS ligado e políticas de select, insert e update pelo dono', (tabela) => {
    const texto = sql();
    expect(texto).toContain(`alter table public.${tabela} enable row level security`);
    for (const acao of ['select', 'insert', 'update']) {
      expect(texto).toMatch(new RegExp(`on public\\.${tabela}\\s+for ${acao} to authenticated`));
    }
    expect(texto).toContain(`grant select, insert, update on public.${tabela} to authenticated`);
  });

  it('nenhuma política ou grant de delete (exclusão é lógica)', () => {
    const texto = sql();
    expect(texto).not.toMatch(/for delete/);
    expect(texto).not.toMatch(/grant[^;]*delete/);
  });

  it('nenhuma tabela local-only no servidor', () => {
    const texto = sql();
    for (const local of ['fila_sync', 'sync_meta', 'status_sync', 'public.fotos']) {
      expect(texto).not.toContain(local);
    }
  });

  it('id sem default e usuario_id com default auth.uid()', () => {
    const texto = sql();
    for (const tabela of TABELAS) {
      expect(texto).toMatch(
        new RegExp(`create table if not exists public\\.${tabela} \\(\\s+id uuid primary key,`),
      );
    }
    expect(texto.match(/usuario_id uuid not null default auth\.uid\(\)/g)).toHaveLength(4);
  });

  it('updated_at forçado pelo servidor em insert e update', () => {
    const texto = sql();
    for (const tabela of TABELAS) {
      expect(texto).toContain(`before insert or update on public.${tabela}`);
    }
  });

  it('pedido feito exige foto, exceto venda direta', () => {
    expect(sql()).toContain(
      "check (status <> 'feito' or venda_direta or foto_conclusao_path is not null)",
    );
  });

  it('pedido só aponta para cliente e obra do mesmo dono (FKs compostas)', () => {
    const texto = sql();
    expect(texto).toContain('unique (id, usuario_id)');
    expect(texto).toMatch(
      /foreign key \(cliente_id, usuario_id\) references public\.clientes \(id, usuario_id\)/,
    );
    expect(texto).toMatch(
      /foreign key \(obra_id, usuario_id\) references public\.obras \(id, usuario_id\)/,
    );
  });

  it('funções internas não ficam expostas na API', () => {
    const texto = sql();
    expect(texto).toContain(
      'revoke execute on function public.definir_updated_at() from public, anon, authenticated',
    );
    expect(texto).toContain(
      'revoke execute on function public.rls_auto_enable() from public, anon, authenticated',
    );
  });

  it('bucket fotos é privado', () => {
    const texto = sql();
    expect(texto).toMatch(/insert into storage\.buckets[\s\S]*'fotos', 'fotos', false/);
    expect(texto).toContain('(storage.foldername(name))[1] = (select auth.uid())::text');
  });
});
