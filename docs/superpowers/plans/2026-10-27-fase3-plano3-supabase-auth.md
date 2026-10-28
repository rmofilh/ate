# Plano 3 — Supabase: schema remoto, RLS, bucket e Auth real (Implementation Plan)

> **ADIADO (27/10/2026).** Não executar ainda. O Plano 5A (GPS) vem antes, por causa da apresentação de Câmera e Geolocalização (roteiro, §1.1). Antes de executar: aplicar a revisão `2026-10-27-fase3-plano3-revisao.md` e rebasear números de linha e contagens de teste sobre a `main` depois do 5A.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a parte remota do ate no Supabase (tabelas, RLS, bucket privado de fotos, versionados em SQL) e trocar o `FakeAuthGateway` do runtime por login real com sessão persistida de forma segura, que funciona offline e protege os dados locais quando outra conta entra no aparelho.

**Architecture:** O SQL vive em `supabase/migrations/` e é aplicado pelo SQL Editor; um roteiro SQL com rollback prova o isolamento entre dois usuários. No app, `SupabaseAuthGateway` implementa o `IAuthGateway` existente (contrato inalterado) sobre o cliente `supabase-js`, que guarda a sessão num adaptador cifrado (chave AES no `expo-secure-store`, sessão cifrada no AsyncStorage). A regra D4 é um decorator do `LoginUseCase` no composition root, apoiado em `DonoDosDadosLocais` (SQLite). A tela de login passa a mostrar a mensagem real do erro e oferece "Apagar dados locais e entrar".

**Tech Stack:** Supabase (Postgres 15+, RLS, Storage), `@supabase/supabase-js` 2.x (2.118 em 27/10), `expo-secure-store` (~57.0.4), `@react-native-async-storage/async-storage` (2.2.0, versão do SDK 57), `aes-js` 3.1.2 + `@types/aes-js`, `expo-crypto` (já instalado), Drizzle/SQLite (Plano 1), Jest + RNTL.

**Spec:** `docs/superpowers/plans/2026-10-27-fase3-roteiro.md`, seção "Plano 3 — Supabase: projeto, schema remoto, RLS, bucket e Auth" (3A e 3B), mais as seções 2 (princípios) e 4 (decisões D3 e D4). Estado atual: `docs/ate-fase3.md` (Planos 1 e 2).

## Decisões deste plano

| # | Decisão | Origem |
|---|---|---|
| D3 | **Bucket privado** `fotos`; o banco remoto guarda o **caminho do objeto** (`<usuario_id>/<foto_id>.jpg`), e a exibição usará URL assinada. Diverge de "URLs públicas" no UC16 | Recomendação do roteiro. **Assumida: confirmar com o usuário antes de executar** |
| D4 | Se outra conta entrar num aparelho com dados locais de outra, o login é bloqueado com aviso, com a opção "Apagar dados locais e entrar" | Recomendação do roteiro. **Assumida: confirmar com o usuário antes de executar** |
| P3-1 | Colunas remotas `foto_conclusao_path` e `foto_path` (caminho no bucket), não `*_url` como no DER da fase 2 | Consequência de D3 |
| P3-2 | `CHECK` no servidor: pedido `FEITO` exige foto, exceto venda direta | Roteiro: "o servidor nunca deve ter um pedido `FEITO` sem foto" (RNF11) |
| P3-3 | Sem tabela `profiles`: o app não usa perfil | Roteiro (opcional) e YAGNI |
| P3-4 | `usuario_id` remoto com `default auth.uid()` e FK para `auth.users`; `id` sem default (vem do aparelho) | Roteiro 3A |
| P3-5 | Chave AES gerada com `expo-crypto.getRandomBytes` (já é dependência), no lugar de `react-native-get-random-values` do guia do Supabase | Menos dependências; mesma fonte criptográfica |
| P3-6 | `getSession()` sem rede e com token vencido: o `supabase-js` devolve sessão nula; o gateway então lê a sessão guardada no armazenamento. `logout()` sempre apaga a sessão guardada, mesmo se o `signOut` falhar offline | Lido no código do `@supabase/auth-js` 2.118 (`__loadSession` e `_signOut`) |
| P3-7 | Variáveis `EXPO_PUBLIC_*` lidas com acesso **literal** (`process.env.EXPO_PUBLIC_SUPABASE_URL`) só no composition root; o Expo só embute acessos literais | Documentação do Expo (variáveis de ambiente) |
| P3-8 | `react-native-url-polyfill` **não** é instalado de saída (o guia atual do Supabase para Expo não o usa). O smoke test confirma; se aparecer erro de `URL`, a Tarefa 9 traz o passo de correção | Roteiro: spike no início do 3B |
| P3-9 | Dono dos dados locais = `sync_meta['dono_dos_dados']`; se ausente, o primeiro `usuario_id` encontrado nas tabelas locais (cobre os dados de desenvolvimento do usuário falso `a1111111-…`) | Roteiro (troca de usuário) |

## Global Constraints

- Expo SDK 57. Pacotes do Expo com `npx expo install`; `aes-js` e `@types/aes-js` com `npm install` (não são módulos do Expo). Tudo roda no **Expo Go** (`expo-secure-store` e AsyncStorage fazem parte dele; `supabase-js` e `aes-js` são JS puro).
- Contratos inalterados: `IAuthGateway` (`login`, `logout`, `getSession`), `LoginUseCase`, `LogoutUseCase`, `AuthSession { userId; token }`. Nenhuma porta nova em `core/`.
- Chave **publishable** (`sb_publishable_…`, antiga "anon") em `EXPO_PUBLIC_SUPABASE_KEY`; URL em `EXPO_PUBLIC_SUPABASE_URL`. `.env` fora do git; `.env.example` versionado. A chave `secret`/`service_role` **nunca** entra no app.
- Sessão nunca em AsyncStorage em texto claro.
- Remoto: tabelas `clientes`, `obras`, `pedidos`, `eventos`. Sem `status_sync`, sem `fila_sync`, sem `fotos`, sem `sync_meta` no servidor.
- `updated_at` remoto é sempre o `now()` do servidor (trigger em `insert` e `update`); o relógio do aparelho nunca decide conflito (RNF04).
- RLS em todas as tabelas, políticas `select`, `insert`, `update` com `usuario_id = auth.uid()`; **sem `delete`** (exclusão é lógica). Mesmo escopo no bucket pela primeira pasta do caminho.
- Mensagens do app em português com acentos: "E-mail ou senha incorretos", "Sem conexão: entre uma vez com internet para usar o app offline.".
- Baseline por commit: `npm test`, `npm run typecheck`, `npm run lint` (0 erros, no máximo 11 warnings), `npm run db:check`.
- Execução como nos Planos 1 e 2: direto na `main`, uma tarefa por vez, um commit por tarefa (confirmar com o usuário).
- Passos no dashboard do Supabase são do **usuário** (checkpoints); o executor não cria projeto nem usa credenciais reais.

## Review Focus

1. **Abrir o app offline com o token vencido** (feira sem sinal, dias depois do último uso): o artesão continua logado. → teste na Tarefa 5 (`getSession` com erro de rede cai na sessão guardada).
2. **Sair offline**: o `signOut` do Supabase falha sem rede, mas a sessão local some e o app volta ao login. → teste na Tarefa 5.
3. **Outra conta entra no aparelho com dados locais**, inclusive os dados de desenvolvimento do usuário falso: login bloqueado, aviso e opção de apagar; nada é apagado sem confirmação. → testes nas Tarefas 6 e 8.
4. **`.env` ausente ou incompleto** (e o Jest, que não tem `.env`): tela de erro explicando o que fazer, sem crash e sem quebrar a suíte. → testes nas Tarefas 4 e 7.
5. **Sessão guardada corrompida** (app morto entre gravar a chave no SecureStore e a cifra no AsyncStorage): tratada como "sem sessão", sem crash. → teste na Tarefa 3.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `supabase/migrations/0001_tabelas.sql` | Tabelas, `CHECK`, índices, trigger de `updated_at` | 1 |
| `supabase/migrations/0002_rls.sql` | RLS, políticas e grants | 1 |
| `supabase/migrations/0003_storage.sql` | Bucket privado `fotos` e políticas | 1 |
| `supabase/tests/rls_isolamento.sql` | Prova de isolamento entre dois usuários (rollback no fim) | 1 |
| `supabase/LEIA-ME.md` | Como criar o projeto, aplicar o SQL, criar a conta e preencher o `.env` | 1 |
| `src/infrastructure/supabase/__tests__/MigrationsSupabase.test.ts` | Contrato estático do SQL (RLS, sem delete, bucket privado) | 1 |
| `.env.example`, `.gitignore` | Variáveis do Supabase | 1 |
| `src/test-support/mocks/expoSecureStore.ts` | Dublê do SecureStore | 3 |
| `src/infrastructure/auth/ArmazenamentoCifradoDeSessao.ts` | Adaptador de storage cifrado (LargeSecureStore) | 3 |
| `src/infrastructure/supabase/cliente.ts` | Validação da config e criação do cliente com `AppState` | 4 |
| `src/infrastructure/auth/SupabaseAuthGateway.ts` | `IAuthGateway` real | 5 |
| `src/infrastructure/database/sqlite/DonoDosDadosLocais.ts` | Dono dos dados locais e limpeza total | 6 |
| `src/infrastructure/fileSystem/ArmazenamentoDeFotos.ts` | `apagarArquivos()` | 6 |
| `src/main/auth/protegerDonoDosDados.ts` | Decorator do login (D4) e `DadosDeOutroUsuarioError` | 6 |
| `src/main/auth/criarSupabaseDoApp.ts` | Lê o `.env` e monta cliente + gateway | 7 |
| `src/main/factories/makeSqliteProviders.ts`, `ProviderBag.ts` | Auth injetado, D4 ligado, `apagarDadosLocais` | 7 |
| `src/app/_layout.tsx`, `src/presentation/components/TelaErroBanco.tsx` | Tela de configuração ausente | 7 |
| `src/presentation/hooks/AppProviders.tsx` | `restaurando` e `apagarDadosEEntrar` | 8 |
| `src/app/(auth)/login.tsx` | Mensagem real do erro e fluxo D4 | 8 |
| `docs/ate-fase3.md` | Seção "Plano 3" | 9 |

---

### Task 1: SQL versionado, verificação de RLS e variáveis de ambiente

**Files:**
- Create: `supabase/migrations/0001_tabelas.sql`, `supabase/migrations/0002_rls.sql`, `supabase/migrations/0003_storage.sql`
- Create: `supabase/tests/rls_isolamento.sql`, `supabase/LEIA-ME.md`
- Create: `.env.example`; Modify: `.gitignore`
- Test: `src/infrastructure/supabase/__tests__/MigrationsSupabase.test.ts`

**Interfaces:**
- Produces: tabelas remotas `public.clientes`, `public.obras`, `public.pedidos`, `public.eventos` (colunas abaixo, que o Plano 4 vai mapear); bucket `fotos`; variáveis `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_KEY`.

- [ ] **Step 1: Escrever o teste de contrato que falha**

`src/infrastructure/supabase/__tests__/MigrationsSupabase.test.ts`:

```ts
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
      expect(texto).toMatch(new RegExp(`create table if not exists public\\.${tabela} \\(\\s+id uuid primary key,`));
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
    expect(sql()).toContain("check (status <> 'feito' or venda_direta or foto_conclusao_path is not null)");
  });

  it('bucket fotos é privado', () => {
    const texto = sql();
    expect(texto).toMatch(/insert into storage\.buckets[\s\S]*'fotos', 'fotos', false/);
    expect(texto).toContain('(storage.foldername(name))[1] = (select auth.uid())::text');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest MigrationsSupabase`
Expected: FAIL com `ENOENT: no such file or directory, scandir '.../supabase/migrations'`.

- [ ] **Step 3: Escrever `0001_tabelas.sql`**

`supabase/migrations/0001_tabelas.sql`:

```sql
-- 0001 — Tabelas de domínio do ate no Supabase (Plano 3).
-- Espelha o SQLite local, sem as colunas e tabelas que só existem no aparelho (outbox, metadados de fotos e de sync).
-- `id` vem do aparelho (UUID v4), sem default. `updated_at` é sempre o relógio do servidor (RNF04).

create table if not exists public.clientes (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  contato text not null,
  criado_em_local timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.obras (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('UNICA', 'SERIE')),
  quantidade integer not null check (quantidade >= 0),
  status_obra text not null check (status_obra in ('DISPONIVEL', 'RESERVADA', 'ENTREGUE', 'ARQUIVADA')),
  -- Caminho do objeto no bucket `fotos` (<usuario_id>/<foto_id>.jpg), preenchido pelo sync (Plano 4).
  foto_path text,
  criado_em_local timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.pedidos (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id),
  obra_id uuid references public.obras (id),
  descricao text not null,
  canal_origem text not null check (canal_origem in ('INSTAGRAM', 'WHATSAPP', 'PRESENCIAL', 'TELEFONE', 'OUTROS')),
  data_entrega date not null,
  status text not null check (status in ('A_FAZER', 'FAZENDO', 'FEITO')),
  -- Caminho do objeto no bucket `fotos` (<usuario_id>/<foto_id>.jpg), preenchido pelo sync (Plano 4).
  foto_conclusao_path text,
  venda_direta boolean not null default false,
  quantidade_obra integer not null check (quantidade_obra >= 0),
  criado_em_local timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- RNF11: o servidor nunca guarda pedido FEITO sem foto (venda direta não tem foto de conclusão).
  constraint ck_pedidos_feito_com_foto
    check (status <> 'FEITO' or venda_direta or foto_conclusao_path is not null)
);

create table if not exists public.eventos (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  data date not null,
  endereco text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  observacoes text not null default '',
  criado_em_local timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Pull por cursor composto (updated_at, id) por usuário (Plano 4).
create index if not exists idx_clientes_usuario_cursor on public.clientes (usuario_id, updated_at, id);
create index if not exists idx_obras_usuario_cursor on public.obras (usuario_id, updated_at, id);
create index if not exists idx_pedidos_usuario_cursor on public.pedidos (usuario_id, updated_at, id);
create index if not exists idx_eventos_usuario_cursor on public.eventos (usuario_id, updated_at, id);
create index if not exists idx_pedidos_cliente on public.pedidos (cliente_id);
create index if not exists idx_pedidos_obra on public.pedidos (obra_id);

-- updated_at sempre do servidor, ignorando o que o aparelho enviar.
create or replace function public.definir_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_clientes_updated_at on public.clientes;
create trigger trg_clientes_updated_at before insert or update on public.clientes
  for each row execute function public.definir_updated_at();

drop trigger if exists trg_obras_updated_at on public.obras;
create trigger trg_obras_updated_at before insert or update on public.obras
  for each row execute function public.definir_updated_at();

drop trigger if exists trg_pedidos_updated_at on public.pedidos;
create trigger trg_pedidos_updated_at before insert or update on public.pedidos
  for each row execute function public.definir_updated_at();

drop trigger if exists trg_eventos_updated_at on public.eventos;
create trigger trg_eventos_updated_at before insert or update on public.eventos
  for each row execute function public.definir_updated_at();
```

- [ ] **Step 4: Escrever `0002_rls.sql`**

`supabase/migrations/0002_rls.sql`:

```sql
-- 0002 — Row Level Security (RNF03). Cada usuário só vê e altera as próprias linhas.
-- Ninguém apaga linhas pela API: exclusão é sempre lógica (deleted_at).
-- `(select auth.uid())` em vez de `auth.uid()` evita reavaliar a função por linha.

alter table public.clientes enable row level security;
alter table public.obras enable row level security;
alter table public.pedidos enable row level security;
alter table public.eventos enable row level security;

revoke all on public.clientes, public.obras, public.pedidos, public.eventos from anon;
revoke all on public.clientes, public.obras, public.pedidos, public.eventos from authenticated;
grant select, insert, update on public.clientes to authenticated;
grant select, insert, update on public.obras to authenticated;
grant select, insert, update on public.pedidos to authenticated;
grant select, insert, update on public.eventos to authenticated;

drop policy if exists "clientes: dono lê" on public.clientes;
create policy "clientes: dono lê" on public.clientes
  for select to authenticated using ((select auth.uid()) = usuario_id);
drop policy if exists "clientes: dono cria" on public.clientes;
create policy "clientes: dono cria" on public.clientes
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
drop policy if exists "clientes: dono altera" on public.clientes;
create policy "clientes: dono altera" on public.clientes
  for update to authenticated
  using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);

drop policy if exists "obras: dono lê" on public.obras;
create policy "obras: dono lê" on public.obras
  for select to authenticated using ((select auth.uid()) = usuario_id);
drop policy if exists "obras: dono cria" on public.obras;
create policy "obras: dono cria" on public.obras
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
drop policy if exists "obras: dono altera" on public.obras;
create policy "obras: dono altera" on public.obras
  for update to authenticated
  using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);

drop policy if exists "pedidos: dono lê" on public.pedidos;
create policy "pedidos: dono lê" on public.pedidos
  for select to authenticated using ((select auth.uid()) = usuario_id);
drop policy if exists "pedidos: dono cria" on public.pedidos;
create policy "pedidos: dono cria" on public.pedidos
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
drop policy if exists "pedidos: dono altera" on public.pedidos;
create policy "pedidos: dono altera" on public.pedidos
  for update to authenticated
  using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);

drop policy if exists "eventos: dono lê" on public.eventos;
create policy "eventos: dono lê" on public.eventos
  for select to authenticated using ((select auth.uid()) = usuario_id);
drop policy if exists "eventos: dono cria" on public.eventos;
create policy "eventos: dono cria" on public.eventos
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
drop policy if exists "eventos: dono altera" on public.eventos;
create policy "eventos: dono altera" on public.eventos
  for update to authenticated
  using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
```

- [ ] **Step 5: Escrever `0003_storage.sql`**

`supabase/migrations/0003_storage.sql`:

```sql
-- 0003 — Bucket privado de fotos (D3). Objeto em <usuario_id>/<foto_id>.jpg; exibição por URL assinada.
-- O usuário só lê, cria e substitui objetos da própria pasta. Sem delete.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos: dono lê" on storage.objects;
create policy "fotos: dono lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "fotos: dono envia" on storage.objects;
create policy "fotos: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "fotos: dono substitui" on storage.objects;
create policy "fotos: dono substitui" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

- [ ] **Step 6: Escrever o roteiro de verificação de RLS**

`supabase/tests/rls_isolamento.sql`:

```sql
-- Prova de isolamento entre dois usuários (RNF03). Rodar inteiro no SQL Editor, depois das migrations.
-- Tudo acontece numa transação desfeita no fim: nada fica gravado.
-- Sucesso: roda até o fim sem erro (o aviso "RLS OK" aparece se o editor mostrar notices).
-- Qualquer violação interrompe com "FALHA: ...".

begin;

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-0000000000a1', 'rls-a@teste.local'),
  ('00000000-0000-4000-8000-0000000000b2', 'rls-b@teste.local');

set local role authenticated;

-- Usuário A grava um cliente e um objeto na própria pasta.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

insert into public.clientes (id, nome, contato, criado_em_local, updated_at)
values ('11111111-1111-4111-8111-0000000000a1', 'Cliente de A', '1', now(), '2000-01-01');

insert into storage.objects (bucket_id, name)
values ('fotos', '00000000-0000-4000-8000-0000000000a1/foto.jpg');

do $$
declare
  dono uuid;
  atualizado timestamptz;
begin
  select usuario_id, updated_at into dono, atualizado
  from public.clientes where id = '11111111-1111-4111-8111-0000000000a1';
  if dono <> '00000000-0000-4000-8000-0000000000a1' then
    raise exception 'FALHA: usuario_id não veio de auth.uid()';
  end if;
  if atualizado < now() - interval '1 minute' then
    raise exception 'FALHA: updated_at enviado pelo cliente foi aceito';
  end if;
end $$;

-- Usuário B tenta ler, alterar, apagar e se passar por A.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);

do $$
declare
  quantidade integer;
begin
  select count(*) into quantidade from public.clientes;
  if quantidade <> 0 then raise exception 'FALHA: B leu linhas de A'; end if;

  update public.clientes set nome = 'invadido' where id = '11111111-1111-4111-8111-0000000000a1';
  get diagnostics quantidade = row_count;
  if quantidade <> 0 then raise exception 'FALHA: B alterou linha de A'; end if;

  begin
    insert into public.clientes (id, usuario_id, nome, contato, criado_em_local)
    values ('22222222-2222-4222-8222-0000000000b2', '00000000-0000-4000-8000-0000000000a1', 'Falso', '1', now());
    raise exception 'FALHA: B gravou linha em nome de A';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.clientes;
    raise exception 'FALHA: delete permitido';
  exception when insufficient_privilege then null;
  end;

  select count(*) into quantidade from storage.objects where bucket_id = 'fotos';
  if quantidade <> 0 then raise exception 'FALHA: B listou objetos de A'; end if;

  begin
    insert into storage.objects (bucket_id, name)
    values ('fotos', '00000000-0000-4000-8000-0000000000a1/intruso.jpg');
    raise exception 'FALHA: B gravou na pasta de A';
  exception when insufficient_privilege then null;
  end;

  insert into storage.objects (bucket_id, name)
  values ('fotos', '00000000-0000-4000-8000-0000000000b2/propria.jpg');

  raise notice 'RLS OK';
end $$;

rollback;
```

- [ ] **Step 7: Escrever o guia do Supabase e as variáveis de ambiente**

`supabase/LEIA-ME.md`:

```markdown
# Supabase do ate

## Primeira configuração (uma vez)

1. Criar um projeto em https://supabase.com/dashboard, região **South America (São Paulo)**.
2. SQL Editor → colar e rodar, nesta ordem: `migrations/0001_tabelas.sql`, `migrations/0002_rls.sql`, `migrations/0003_storage.sql`. Rodar de novo não estraga nada (os arquivos são idempotentes).
3. SQL Editor → rodar `tests/rls_isolamento.sql`. Deve rodar até o fim **sem erro** (se o editor mostrar notices, aparece **RLS OK**). Qualquer violação para com `FALHA: …`. Nada fica gravado (rollback no fim).
4. Authentication → Users → **Add user** → e-mail e senha do artesão, marcando "Auto Confirm User". O app não tem cadastro: a conta é criada só aqui.
5. Project Settings → API Keys → copiar a **Publishable key** (`sb_publishable_…`) e a URL do projeto (`https://<ref>.supabase.co`).
6. Na raiz do repositório: `cp .env.example .env` e preencher as duas variáveis. Reiniciar o `npx expo start` (o Expo lê o `.env` ao iniciar).

## Regras

- Nunca colocar a chave **secret** / `service_role` no `.env` do app nem no repositório.
- Mudança de schema = arquivo novo `NNNN_descricao.sql` em `migrations/`, nunca editar um já aplicado.
```

`.env.example`:

```bash
# Copie para .env (fora do git) e preencha com os dados do seu projeto Supabase.
# Só a chave PUBLISHABLE (sb_publishable_…). Nunca a secret/service_role.
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_COLE_AQUI
```

Em `.gitignore`, trocar o bloco `# local env files` por:

```gitignore
# local env files
.env
.env*.local
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest MigrationsSupabase`
Expected: PASS (11 testes).

Conferir também: `git check-ignore -v .env` deve apontar a regra do `.gitignore`.

- [ ] **Step 9: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint && npm run db:check
git add supabase .env.example .gitignore src/infrastructure/supabase
git commit -m "feat(supabase): schema remoto, RLS, bucket privado e verificação de isolamento"
```

---

### Task 2: Checkpoint A — projeto Supabase criado e RLS verificado (usuário)

**Files:** nenhum.

- [ ] **Step 1: Parar e pedir ao usuário** que siga `supabase/LEIA-ME.md` (passos 1 a 6) e informe:
  1. as três migrations rodaram sem erro;
  2. `tests/rls_isolamento.sql` rodou até o fim sem erro (se parar com `FALHA: …` ou outro erro, copiar a mensagem);
  3. a conta do artesão foi criada;
  4. o `.env` está preenchido (não colar a chave na conversa).

- [ ] **Step 2: Tratar o retorno.** Se o `insert into auth.users` do roteiro falhar por coluna obrigatória na versão do projeto, ajustar o roteiro para usar dois usuários criados no dashboard (trocar os dois UUIDs fixos pelos ids reais, mantendo o `rollback`) e pedir para rodar de novo. Qualquer `FALHA:` de política vira correção numa migration **nova** (`0004_…`), com o teste de contrato atualizado, e commit `fix(supabase): …`.

As Tarefas 3 a 6 não dependem deste checkpoint e podem seguir enquanto o usuário configura o projeto. A Tarefa 7 precisa do `.env` só para o smoke test.

---

### Task 3: Adaptador de sessão cifrado (LargeSecureStore)

**Files:**
- Modify: `package.json`, `package-lock.json`, `jest.setup.js`
- Create: `src/test-support/mocks/expoSecureStore.ts`
- Create: `src/infrastructure/auth/ArmazenamentoCifradoDeSessao.ts`
- Test: `src/infrastructure/auth/__tests__/ArmazenamentoCifradoDeSessao.test.ts`

**Interfaces:**
- Consumes: `getRandomBytes` (`expo-crypto`, mock global já existente).
- Produces:
  - `interface ArmazenamentoDeSessao { getItem(chave: string): Promise<string | null>; setItem(chave: string, valor: string): Promise<void>; removeItem(chave: string): Promise<void> }` (formato que o `supabase-js` aceita em `auth.storage`).
  - `class ArmazenamentoCifradoDeSessao implements ArmazenamentoDeSessao`.
  - Dublê: `secureStoreDeTeste` (`valores()`, `limpar()`).

- [ ] **Step 1: Instalar dependências**

```bash
npx expo install @supabase/supabase-js expo-secure-store @react-native-async-storage/async-storage
npm install aes-js@^3.1.2
npm install -D @types/aes-js@^3.1.4
```

Conferir em `package.json`: `@supabase/supabase-js` 2.x, `expo-secure-store` ~57.0.4, `@react-native-async-storage/async-storage` 2.2.0, `aes-js` ^3.1.2, `@types/aes-js` ^3.1.4.

- [ ] **Step 2: Criar o dublê do SecureStore e registrar os dublês**

`src/test-support/mocks/expoSecureStore.ts`:

```ts
/** Dublê em memória do expo-secure-store (SDK 57). Rejeita chaves com caracteres inválidos, como o real. */
const valores = new Map<string, string>();

function validarChave(chave: string): void {
  if (!/^[\w.-]+$/.test(chave)) throw new Error(`Invalid key provided to SecureStore: ${chave}`);
}

export const WHEN_UNLOCKED = 'WHEN_UNLOCKED';

export async function getItemAsync(chave: string): Promise<string | null> {
  validarChave(chave);
  return valores.get(chave) ?? null;
}

export async function setItemAsync(chave: string, valor: string): Promise<void> {
  validarChave(chave);
  valores.set(chave, valor);
}

export async function deleteItemAsync(chave: string): Promise<void> {
  validarChave(chave);
  valores.delete(chave);
}

export const secureStoreDeTeste = {
  valores: (): Map<string, string> => new Map(valores),
  limpar: (): void => valores.clear(),
};
```

Ao final de `jest.setup.js`:

```js
jest.mock('expo-secure-store', () => jest.requireActual('./src/test-support/mocks/expoSecureStore'));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
```

(O mock oficial do AsyncStorage exporta o objeto via `module.exports`; o `import AsyncStorage from …` funciona por interop do Babel.)

- [ ] **Step 3: Escrever o teste que falha**

`src/infrastructure/auth/__tests__/ArmazenamentoCifradoDeSessao.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { secureStoreDeTeste } from '../../../test-support/mocks/expoSecureStore';
import { ArmazenamentoCifradoDeSessao } from '../ArmazenamentoCifradoDeSessao';

const CHAVE = 'ate-auth';
const SESSAO = JSON.stringify({
  access_token: 'token-secreto',
  refresh_token: 'refresh-secreto',
  user: { id: 'a1111111-1111-4111-8111-111111111111', email: 'artesao@email.com' },
});

describe('ArmazenamentoCifradoDeSessao', () => {
  let armazenamento: ArmazenamentoCifradoDeSessao;

  beforeEach(async () => {
    secureStoreDeTeste.limpar();
    await AsyncStorage.clear();
    armazenamento = new ArmazenamentoCifradoDeSessao();
  });

  it('grava e lê de volta o mesmo valor', async () => {
    await armazenamento.setItem(CHAVE, SESSAO);
    await expect(armazenamento.getItem(CHAVE)).resolves.toBe(SESSAO);
  });

  it('o AsyncStorage guarda só a cifra, nunca o texto claro', async () => {
    await armazenamento.setItem(CHAVE, SESSAO);

    const cifrado = await AsyncStorage.getItem(CHAVE);
    expect(cifrado).toMatch(/^[0-9a-f]+$/);
    expect(cifrado).not.toContain('token-secreto');
  });

  it('a chave AES de 256 bits fica no SecureStore', async () => {
    await armazenamento.setItem(CHAVE, SESSAO);
    expect(secureStoreDeTeste.valores().get(CHAVE)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('cada gravação usa uma chave nova', async () => {
    await armazenamento.setItem(CHAVE, SESSAO);
    const primeira = secureStoreDeTeste.valores().get(CHAVE);
    await armazenamento.setItem(CHAVE, SESSAO);
    expect(secureStoreDeTeste.valores().get(CHAVE)).not.toBe(primeira);
    await expect(armazenamento.getItem(CHAVE)).resolves.toBe(SESSAO);
  });

  it('removeItem apaga a chave e a cifra', async () => {
    await armazenamento.setItem(CHAVE, SESSAO);
    await armazenamento.removeItem(CHAVE);

    expect(secureStoreDeTeste.valores().has(CHAVE)).toBe(false);
    await expect(AsyncStorage.getItem(CHAVE)).resolves.toBeNull();
    await expect(armazenamento.getItem(CHAVE)).resolves.toBeNull();
  });

  it('sem chave ou sem cifra devolve null', async () => {
    await expect(armazenamento.getItem(CHAVE)).resolves.toBeNull();

    await armazenamento.setItem(CHAVE, SESSAO);
    secureStoreDeTeste.limpar();
    await expect(armazenamento.getItem(CHAVE)).resolves.toBeNull();
  });

  it('chave e cifra de gravações diferentes (app morto no meio) viram "sem sessão" e são limpas', async () => {
    await armazenamento.setItem(CHAVE, SESSAO);
    const cifraAntiga = await AsyncStorage.getItem(CHAVE);
    await armazenamento.setItem(CHAVE, SESSAO);
    await AsyncStorage.setItem(CHAVE, cifraAntiga as string);

    await expect(armazenamento.getItem(CHAVE)).resolves.toBeNull();
    expect(secureStoreDeTeste.valores().has(CHAVE)).toBe(false);
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx jest ArmazenamentoCifradoDeSessao`
Expected: FAIL com `Cannot find module '../ArmazenamentoCifradoDeSessao'`.

- [ ] **Step 5: Implementar**

`src/infrastructure/auth/ArmazenamentoCifradoDeSessao.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/** Formato de storage que o supabase-js aceita em `auth.storage`. */
export interface ArmazenamentoDeSessao {
  getItem(chave: string): Promise<string | null>;
  setItem(chave: string, valor: string): Promise<void>;
  removeItem(chave: string): Promise<void>;
}

/**
 * Padrão LargeSecureStore do guia oficial do Supabase para Expo. A sessão passa do limite
 * de ~2 KB do SecureStore, então cada gravação gera uma chave AES-256 nova, guardada no
 * SecureStore, e a sessão cifrada (AES-CTR) vai para o AsyncStorage. Nunca texto claro.
 */
export class ArmazenamentoCifradoDeSessao implements ArmazenamentoDeSessao {
  async getItem(chave: string): Promise<string | null> {
    const [cifrado, chaveHex] = await Promise.all([
      AsyncStorage.getItem(chave),
      SecureStore.getItemAsync(chave),
    ]);
    if (!cifrado || !chaveHex) return null;
    try {
      const valor = decifrar(chaveHex, cifrado);
      // O supabase-js grava sempre JSON; se não for, chave e cifra são de gravações diferentes.
      JSON.parse(valor);
      return valor;
    } catch {
      await this.removeItem(chave);
      return null;
    }
  }

  async setItem(chave: string, valor: string): Promise<void> {
    const chaveAes = getRandomBytes(32);
    const cifra = new aesjs.ModeOfOperation.ctr(chaveAes, new aesjs.Counter(1));
    const cifrado = cifra.encrypt(aesjs.utils.utf8.toBytes(valor));
    await SecureStore.setItemAsync(chave, aesjs.utils.hex.fromBytes(chaveAes));
    await AsyncStorage.setItem(chave, aesjs.utils.hex.fromBytes(cifrado));
  }

  async removeItem(chave: string): Promise<void> {
    await Promise.all([AsyncStorage.removeItem(chave), SecureStore.deleteItemAsync(chave)]);
  }
}

function decifrar(chaveHex: string, cifradoHex: string): string {
  const cifra = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(chaveHex), new aesjs.Counter(1));
  return aesjs.utils.utf8.fromBytes(cifra.decrypt(aesjs.utils.hex.toBytes(cifradoHex)));
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx jest ArmazenamentoCifradoDeSessao`
Expected: PASS (7 testes).

- [ ] **Step 7: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint && npm run db:check
git add package.json package-lock.json jest.setup.js src/test-support/mocks/expoSecureStore.ts src/infrastructure/auth
git commit -m "feat(infra): sessão do Supabase cifrada com chave no SecureStore"
```

---

### Task 4: Configuração e cliente Supabase

**Files:**
- Create: `src/infrastructure/supabase/cliente.ts`
- Test: `src/infrastructure/supabase/__tests__/cliente.test.ts`

**Interfaces:**
- Consumes: `ArmazenamentoDeSessao` (Tarefa 3).
- Produces:
  - `CHAVE_SESSAO = 'ate-auth'`
  - `interface ConfigSupabase { url: string; chave: string }`
  - `class ConfigSupabaseInvalidaError extends Error`
  - `validarConfigSupabase(bruta: { url?: string; chave?: string }): ConfigSupabase`
  - `criarClienteSupabase(config: ConfigSupabase, armazenamento: ArmazenamentoDeSessao, appState?: { addEventListener: typeof AppState.addEventListener }): SupabaseClient`

- [ ] **Step 1: Escrever o teste que falha**

`src/infrastructure/supabase/__tests__/cliente.test.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

import {
  CHAVE_SESSAO,
  ConfigSupabaseInvalidaError,
  criarClienteSupabase,
  validarConfigSupabase,
} from '../cliente';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ auth: { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() } })),
}));

const VALIDA = { url: 'https://abcd.supabase.co', chave: 'sb_publishable_xyz' };

function jwtCom(payload: object): string {
  const base64 = (valor: object) => btoa(JSON.stringify(valor)).replace(/=+$/, '');
  return `${base64({ alg: 'HS256' })}.${base64(payload)}.assinatura`;
}

describe('validarConfigSupabase', () => {
  it('aceita URL https e chave publishable, sem barra final', () => {
    expect(validarConfigSupabase({ url: 'https://abcd.supabase.co/', chave: ' sb_publishable_xyz ' })).toEqual(VALIDA);
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
    expect(() => validarConfigSupabase({ ...VALIDA, url: 'http://abcd.supabase.co' })).toThrow(/https/);
  });

  it('recusa chave secret nova e service_role antiga', () => {
    expect(() => validarConfigSupabase({ ...VALIDA, chave: 'sb_secret_abc' })).toThrow(/publishable/);
    expect(() =>
      validarConfigSupabase({ ...VALIDA, chave: jwtCom({ role: 'service_role' }) }),
    ).toThrow(/publishable/);
  });

  it('aceita a chave anon antiga (JWT com role anon)', () => {
    const anon = jwtCom({ role: 'anon' });
    expect(validarConfigSupabase({ ...VALIDA, chave: anon }).chave).toBe(anon);
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/infrastructure/supabase/__tests__/cliente`
Expected: FAIL com `Cannot find module '../cliente'`.

- [ ] **Step 3: Implementar**

`src/infrastructure/supabase/cliente.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

import type { ArmazenamentoDeSessao } from '../auth/ArmazenamentoCifradoDeSessao';

export const CHAVE_SESSAO = 'ate-auth';

export interface ConfigSupabase {
  url: string;
  chave: string;
}

export const MENSAGEM_CONFIG_AUSENTE =
  'Configuração do Supabase ausente. Copie .env.example para .env, preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_KEY e reinicie o Expo.';

export class ConfigSupabaseInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ConfigSupabaseInvalidaError';
    Object.setPrototypeOf(this, ConfigSupabaseInvalidaError.prototype);
  }
}

/**
 * Valida os valores já lidos de process.env.EXPO_PUBLIC_* (o Expo só embute acessos literais,
 * então a leitura fica no composition root). Recusa chave secreta: o app só usa a publishable.
 */
export function validarConfigSupabase(bruta: { url?: string; chave?: string }): ConfigSupabase {
  const url = bruta.url?.trim() ?? '';
  const chave = bruta.chave?.trim() ?? '';
  if (!url || !chave) throw new ConfigSupabaseInvalidaError(MENSAGEM_CONFIG_AUSENTE);
  if (!/^https:\/\/\S+$/.test(url)) {
    throw new ConfigSupabaseInvalidaError('EXPO_PUBLIC_SUPABASE_URL inválida: use a URL https do projeto.');
  }
  if (chave.startsWith('sb_secret_') || papelDoJwt(chave) === 'service_role') {
    throw new ConfigSupabaseInvalidaError(
      'EXPO_PUBLIC_SUPABASE_KEY deve ser a chave publishable (sb_publishable_…), nunca a secret/service_role.',
    );
  }
  return { url: url.replace(/\/+$/, ''), chave };
}

function papelDoJwt(chave: string): string | null {
  const partes = chave.split('.');
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as { role?: unknown };
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/infrastructure/supabase`
Expected: PASS (contrato SQL + 9 testes do cliente).

- [ ] **Step 5: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/infrastructure/supabase
git commit -m "feat(infra): configuração validada e cliente Supabase"
```

---

### Task 5: `SupabaseAuthGateway`

**Files:**
- Create: `src/infrastructure/auth/SupabaseAuthGateway.ts`
- Test: `src/infrastructure/auth/__tests__/SupabaseAuthGateway.test.ts`

**Interfaces:**
- Consumes: `IAuthGateway`, `AuthSession`; `ArmazenamentoDeSessao` (Tarefa 3); `CHAVE_SESSAO` (Tarefa 4); `isAuthRetryableFetchError`, `Session`, `AuthError` de `@supabase/supabase-js`.
- Produces:
  - `interface ClienteDeAuth { signInWithPassword(...); getSession(); signOut({ scope: 'local' }) }` (satisfeita por `SupabaseClient['auth']`)
  - `class SupabaseAuthGateway implements IAuthGateway { constructor(auth: ClienteDeAuth, armazenamento: ArmazenamentoDeSessao, chaveSessao: string) }`
  - Mensagens: `MENSAGEM_CREDENCIAIS_INVALIDAS`, `MENSAGEM_SEM_CONEXAO`, `MENSAGEM_FALHA_LOGIN`.

- [ ] **Step 1: Escrever o teste que falha**

`src/infrastructure/auth/__tests__/SupabaseAuthGateway.test.ts`:

```ts
import { AuthApiError, AuthRetryableFetchError, type Session } from '@supabase/supabase-js';

import {
  type ClienteDeAuth,
  MENSAGEM_CREDENCIAIS_INVALIDAS,
  MENSAGEM_FALHA_LOGIN,
  MENSAGEM_SEM_CONEXAO,
  SupabaseAuthGateway,
} from '../SupabaseAuthGateway';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';
const CHAVE = 'ate-auth';
const SESSAO = {
  access_token: 'token-1',
  refresh_token: 'refresh-1',
  expires_at: 1,
  user: { id: USUARIO },
} as unknown as Session;

function setup() {
  const auth = {
    signInWithPassword: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(async () => ({ error: null })),
  };
  const guardado = new Map<string, string>();
  const armazenamento = {
    getItem: jest.fn(async (chave: string) => guardado.get(chave) ?? null),
    setItem: jest.fn(async (chave: string, valor: string) => {
      guardado.set(chave, valor);
    }),
    removeItem: jest.fn(async (chave: string) => {
      guardado.delete(chave);
    }),
  };
  const gateway = new SupabaseAuthGateway(auth as unknown as ClienteDeAuth, armazenamento, CHAVE);
  return { auth, armazenamento, guardado, gateway };
}

const semRede = () => new AuthRetryableFetchError('Failed to fetch', 0);

describe('SupabaseAuthGateway.login', () => {
  it('devolve userId e token da sessão', async () => {
    const { auth, gateway } = setup();
    auth.signInWithPassword.mockResolvedValue({ data: { session: SESSAO }, error: null });

    await expect(gateway.login('artesao@email.com', 'senha')).resolves.toEqual({
      userId: USUARIO,
      token: 'token-1',
    });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'artesao@email.com', password: 'senha' });
  });

  it('credencial errada vira mensagem do app', async () => {
    const { auth, gateway } = setup();
    auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
    });
    await expect(gateway.login('a@b.com', 'x')).rejects.toThrow(MENSAGEM_CREDENCIAIS_INVALIDAS);
  });

  it('sem rede explica que precisa entrar uma vez com internet', async () => {
    const { auth, gateway } = setup();
    auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: semRede() });
    await expect(gateway.login('a@b.com', 'x')).rejects.toThrow(MENSAGEM_SEM_CONEXAO);
  });

  it('exceção de rede lançada também vira "sem conexão"', async () => {
    const { auth, gateway } = setup();
    auth.signInWithPassword.mockRejectedValue(new TypeError('Network request failed'));
    await expect(gateway.login('a@b.com', 'x')).rejects.toThrow(MENSAGEM_SEM_CONEXAO);
  });

  it('outro erro do servidor vira mensagem genérica', async () => {
    const { auth, gateway } = setup();
    auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new AuthApiError('Internal error', 500, 'unexpected_failure'),
    });
    await expect(gateway.login('a@b.com', 'x')).rejects.toThrow(MENSAGEM_FALHA_LOGIN);
  });
});

describe('SupabaseAuthGateway.getSession', () => {
  it('sessão válida restaurada', async () => {
    const { auth, gateway } = setup();
    auth.getSession.mockResolvedValue({ data: { session: SESSAO }, error: null });
    await expect(gateway.getSession()).resolves.toEqual({ userId: USUARIO, token: 'token-1' });
  });

  it('sem sessão devolve null', async () => {
    const { auth, gateway } = setup();
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(gateway.getSession()).resolves.toBeNull();
  });

  it('offline com token vencido: usa a sessão guardada e não desloga', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, JSON.stringify(SESSAO));
    auth.getSession.mockResolvedValue({ data: { session: null }, error: semRede() });

    await expect(gateway.getSession()).resolves.toEqual({ userId: USUARIO, token: 'token-1' });
  });

  it('offline sem nada guardado devolve null', async () => {
    const { auth, gateway } = setup();
    auth.getSession.mockResolvedValue({ data: { session: null }, error: semRede() });
    await expect(gateway.getSession()).resolves.toBeNull();
  });

  it('offline com sessão guardada ilegível devolve null', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, '{"sem":"usuario"}');
    auth.getSession.mockResolvedValue({ data: { session: null }, error: semRede() });
    await expect(gateway.getSession()).resolves.toBeNull();
  });

  it('erro definitivo do servidor (refresh revogado) devolve null', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, JSON.stringify(SESSAO));
    auth.getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthApiError('Invalid Refresh Token', 400, 'refresh_token_not_found'),
    });
    await expect(gateway.getSession()).resolves.toBeNull();
  });
});

describe('SupabaseAuthGateway.logout', () => {
  it('encerra só a sessão deste aparelho e apaga a guardada', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, JSON.stringify(SESSAO));

    await gateway.logout();

    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(guardado.has(CHAVE)).toBe(false);
  });

  it('offline: o signOut falha, mas a sessão local some e nada é lançado', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, JSON.stringify(SESSAO));
    auth.signOut.mockResolvedValue({ error: semRede() } as never);

    await expect(gateway.logout()).resolves.toBeUndefined();
    expect(guardado.has(CHAVE)).toBe(false);
  });

  it('signOut que lança também não impede apagar a sessão', async () => {
    const { auth, guardado, gateway } = setup();
    guardado.set(CHAVE, JSON.stringify(SESSAO));
    auth.signOut.mockRejectedValue(new TypeError('Network request failed'));

    await expect(gateway.logout()).resolves.toBeUndefined();
    expect(guardado.has(CHAVE)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest SupabaseAuthGateway`
Expected: FAIL com `Cannot find module '../SupabaseAuthGateway'`.

- [ ] **Step 3: Implementar**

`src/infrastructure/auth/SupabaseAuthGateway.ts`:

```ts
import { type AuthError, isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';

import type { AuthSession, IAuthGateway } from '../../core/application/gateways/IAuthGateway';
import type { ArmazenamentoDeSessao } from './ArmazenamentoCifradoDeSessao';

export const MENSAGEM_CREDENCIAIS_INVALIDAS = 'E-mail ou senha incorretos';
export const MENSAGEM_SEM_CONEXAO = 'Sem conexão: entre uma vez com internet para usar o app offline.';
export const MENSAGEM_FALHA_LOGIN = 'Não foi possível entrar agora. Tente novamente.';

type Resposta<T> = Promise<{ data: T; error: AuthError | null }>;

/** O pedaço do cliente de auth do supabase-js que o gateway usa. */
export interface ClienteDeAuth {
  signInWithPassword(credenciais: { email: string; password: string }): Resposta<{ session: Session | null }>;
  getSession(): Resposta<{ session: Session | null }>;
  signOut(opcoes: { scope: 'local' }): Promise<{ error: AuthError | null }>;
}

/** IAuthGateway real. A conta é criada no dashboard; o app só entra e sai. */
export class SupabaseAuthGateway implements IAuthGateway {
  constructor(
    private readonly auth: ClienteDeAuth,
    private readonly armazenamento: ArmazenamentoDeSessao,
    private readonly chaveSessao: string,
  ) {}

  async login(email: string, password: string): Promise<AuthSession> {
    let resposta: Awaited<ReturnType<ClienteDeAuth['signInWithPassword']>>;
    try {
      resposta = await this.auth.signInWithPassword({ email, password });
    } catch {
      throw new Error(MENSAGEM_SEM_CONEXAO);
    }
    if (resposta.error) throw new Error(traduzirErro(resposta.error));
    if (!resposta.data.session) throw new Error(MENSAGEM_FALHA_LOGIN);
    return paraSessao(resposta.data.session);
  }

  /**
   * Restaura a sessão sem exigir rede. Sem internet e com o token vencido, o supabase-js devolve
   * sessão nula com erro de rede; nesse caso vale a sessão guardada (o artesão abre o app na feira).
   */
  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.auth.getSession();
    if (data.session) return paraSessao(data.session);
    if (error && isAuthRetryableFetchError(error)) return this.sessaoGuardada();
    return null;
  }

  /** Funciona offline: mesmo se o signOut falhar sem rede, a sessão deste aparelho é apagada. */
  async logout(): Promise<void> {
    try {
      await this.auth.signOut({ scope: 'local' });
    } catch {
      // Sem rede: segue para apagar a sessão local.
    } finally {
      await this.armazenamento.removeItem(this.chaveSessao);
    }
  }

  private async sessaoGuardada(): Promise<AuthSession | null> {
    const bruto = await this.armazenamento.getItem(this.chaveSessao);
    if (!bruto) return null;
    try {
      const salva = JSON.parse(bruto) as { access_token?: unknown; user?: { id?: unknown } };
      if (typeof salva.access_token === 'string' && typeof salva.user?.id === 'string') {
        return { userId: salva.user.id, token: salva.access_token };
      }
    } catch {
      // Sessão ilegível conta como "sem sessão".
    }
    return null;
  }
}

function traduzirErro(erro: AuthError): string {
  if (isAuthRetryableFetchError(erro)) return MENSAGEM_SEM_CONEXAO;
  if (erro.code === 'invalid_credentials' || erro.status === 400) return MENSAGEM_CREDENCIAIS_INVALIDAS;
  return MENSAGEM_FALHA_LOGIN;
}

function paraSessao(sessao: Session): AuthSession {
  return { userId: sessao.user.id, token: sessao.access_token };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest SupabaseAuthGateway`
Expected: PASS (14 testes).

(Não é preciso teste extra de tipo: na Tarefa 7, `new SupabaseAuthGateway(cliente.auth, …)` só compila se o `auth` do supabase-js satisfizer `ClienteDeAuth`. Se o `tsc` reclamar ali, ajustar `ClienteDeAuth` aos tipos de `node_modules/@supabase/auth-js/dist/module/GoTrueClient.d.ts`, sem `any`.)

- [ ] **Step 5: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/infrastructure/auth
git commit -m "feat(infra): SupabaseAuthGateway com sessão offline e logout local"
```

---

### Task 6: D4 — dono dos dados locais

**Files:**
- Create: `src/infrastructure/database/sqlite/DonoDosDadosLocais.ts`
- Modify: `src/infrastructure/fileSystem/ArmazenamentoDeFotos.ts` (método `apagarArquivos`)
- Create: `src/main/auth/protegerDonoDosDados.ts`
- Test: `src/infrastructure/database/sqlite/__tests__/DonoDosDadosLocais.test.ts`, `src/main/auth/__tests__/protegerDonoDosDados.test.ts`, `src/infrastructure/fileSystem/__tests__/LimpezaDeFotosOrfas.test.ts` (acrescentar caso)

**Interfaces:**
- Consumes: `DrizzleAppDb`, tabelas do `schema.ts`; `LoginUseCase`, `IAuthGateway`; `fsDeTeste`.
- Produces:
  - `CHAVE_DONO = 'dono_dos_dados'`
  - `class DonoDosDadosLocais { constructor(db: DrizzleAppDb); ler(): Promise<string | null>; registrar(usuarioId: string): Promise<void>; apagarTudo(): Promise<void> }`
  - `ArmazenamentoDeFotos.apagarArquivos(): void`
  - `class DadosDeOutroUsuarioError extends Error`
  - `protegerDonoDosDados(login: LoginUseCase, auth: IAuthGateway, dono: Pick<DonoDosDadosLocais, 'ler' | 'registrar'>): LoginUseCase`

- [ ] **Step 1: Escrever os testes que falham**

`src/infrastructure/database/sqlite/__tests__/DonoDosDadosLocais.test.ts`:

```ts
import { bancoDeTeste } from '../../../../test-support/bancoDeTeste';
import type { DrizzleAppDb } from '../DrizzleDb';
import { CHAVE_DONO, DonoDosDadosLocais } from '../DonoDosDadosLocais';
import { clientes, eventos, filaSync, fotos, obras, pedidos, syncMeta } from '../schema';

const A = 'a1111111-1111-4111-8111-111111111111';
const B = 'b2222222-2222-4222-8222-222222222222';
const QUANDO = '2026-10-27T12:00:00.000Z';

describe('DonoDosDadosLocais', () => {
  let db: DrizzleAppDb;
  let dono: DonoDosDadosLocais;

  beforeEach(() => {
    db = bancoDeTeste();
    dono = new DonoDosDadosLocais(db);
  });

  async function dadosDe(usuarioId: string) {
    await db.insert(clientes).values({
      id: 'c1', usuarioId, nome: 'Ana', contato: '1', statusSync: 'PENDENTE', criadoEmLocal: QUANDO,
    });
    await db.insert(obras).values({
      id: 'o1', usuarioId, nome: 'Coruja', tipo: 'UNICA', quantidade: 1, statusObra: 'DISPONIVEL',
      statusSync: 'PENDENTE', criadoEmLocal: QUANDO,
    });
    await db.insert(pedidos).values({
      id: 'p1', usuarioId, clienteId: 'c1', obraId: 'o1', descricao: 'Vaso', canalOrigem: 'WHATSAPP',
      dataEntrega: QUANDO, status: 'A_FAZER', vendaDireta: false, quantidadeObra: 1,
      statusSync: 'PENDENTE', criadoEmLocal: QUANDO,
    });
    await db.insert(eventos).values({
      id: 'e1', usuarioId, nome: 'Feira', data: QUANDO, endereco: 'Praça', latitude: 0, longitude: 0,
      statusSync: 'PENDENTE', criadoEmLocal: QUANDO,
    });
    await db.insert(filaSync).values({
      id: 'f1', tipoOperacao: 'CRIAR', entidade: 'Cliente', entidadeId: 'c1', payload: '{}', criadoEmLocal: QUANDO,
    });
    await db.insert(fotos).values({ id: 'ft1', caminhoLocal: 'fotos/x.jpg', hash: 'h', criadoEmLocal: QUANDO });
  }

  it('banco vazio não tem dono', async () => {
    await expect(dono.ler()).resolves.toBeNull();
  });

  it('dono registrado em sync_meta', async () => {
    await dono.registrar(A);
    await expect(dono.ler()).resolves.toBe(A);
    expect(await db.select().from(syncMeta)).toEqual([{ chave: CHAVE_DONO, valor: A }]);
  });

  it('registrar de novo substitui sem duplicar', async () => {
    await dono.registrar(A);
    await dono.registrar(B);
    await expect(dono.ler()).resolves.toBe(B);
    expect(await db.select().from(syncMeta)).toHaveLength(1);
  });

  it('sem registro, o dono é quem tem dados locais (dados de desenvolvimento)', async () => {
    await dadosDe(A);
    await expect(dono.ler()).resolves.toBe(A);
  });

  it('só um evento (sem cliente) também identifica o dono', async () => {
    await db.insert(eventos).values({
      id: 'e9', usuarioId: B, nome: 'Feira', data: QUANDO, endereco: 'Praça', latitude: 0, longitude: 0,
      statusSync: 'PENDENTE', criadoEmLocal: QUANDO,
    });
    await expect(dono.ler()).resolves.toBe(B);
  });

  it('apagarTudo zera todas as tabelas locais, inclusive fila, fotos e o dono', async () => {
    await dadosDe(A);
    await dono.registrar(A);

    await dono.apagarTudo();

    for (const tabela of [clientes, obras, pedidos, eventos, filaSync, fotos, syncMeta]) {
      expect(await db.select().from(tabela)).toEqual([]);
    }
    await expect(dono.ler()).resolves.toBeNull();
  });
});
```

`src/main/auth/__tests__/protegerDonoDosDados.test.ts`:

```ts
import { LoginUseCase } from '../../../core/application/usecases/LoginUseCase';
import { FakeAuthGateway } from '../../../infrastructure/device/FakeAuthGateway';
import { DadosDeOutroUsuarioError, protegerDonoDosDados } from '../protegerDonoDosDados';

const A = 'a1111111-1111-4111-8111-111111111111';
const B = 'b2222222-2222-4222-8222-222222222222';

function setup(donoAtual: string | null) {
  const auth = new FakeAuthGateway(
    new Map([
      ['a@ate.app', { password: '1', userId: A }],
      ['b@ate.app', { password: '2', userId: B }],
    ]),
  );
  const dono = { ler: jest.fn(async () => donoAtual), registrar: jest.fn(async () => {}) };
  const login = protegerDonoDosDados(new LoginUseCase(auth), auth, dono);
  return { auth, dono, login };
}

describe('protegerDonoDosDados (D4)', () => {
  it('aparelho sem dados: entra e registra o dono', async () => {
    const { login, dono } = setup(null);
    await expect(login.execute({ email: 'a@ate.app', password: '1' })).resolves.toMatchObject({ userId: A });
    expect(dono.registrar).toHaveBeenCalledWith(A);
  });

  it('mesmo dono: entra sem registrar de novo', async () => {
    const { login, dono } = setup(A);
    await expect(login.execute({ email: 'a@ate.app', password: '1' })).resolves.toMatchObject({ userId: A });
    expect(dono.registrar).not.toHaveBeenCalled();
  });

  it('outra conta com dados locais: bloqueia, desfaz o login e não apaga nada', async () => {
    const { login, auth, dono } = setup(A);

    await expect(login.execute({ email: 'b@ate.app', password: '2' })).rejects.toBeInstanceOf(
      DadosDeOutroUsuarioError,
    );
    await expect(auth.getSession()).resolves.toBeNull();
    expect(dono.registrar).not.toHaveBeenCalled();
  });

  it('a mensagem explica a saída', () => {
    expect(new DadosDeOutroUsuarioError().message).toMatch(/apagar os dados locais/i);
  });

  it('credencial errada continua sendo o erro do gateway', async () => {
    const { login, dono } = setup(A);
    await expect(login.execute({ email: 'b@ate.app', password: 'x' })).rejects.toThrow('E-mail ou senha incorretos');
    expect(dono.ler).not.toHaveBeenCalled();
  });

  it('continua instanceof LoginUseCase', () => {
    expect(setup(null).login).toBeInstanceOf(LoginUseCase);
  });
});
```

Em `src/infrastructure/fileSystem/__tests__/LimpezaDeFotosOrfas.test.ts`, acrescentar ao fim do `describe`:

```ts
  it('apagarArquivos remove todas as fotos do aparelho', async () => {
    fsDeTeste.escrever('file:///docs/fotos/a.jpg');
    fsDeTeste.escrever('file:///docs/fotos/b.jpg');
    fsDeTeste.escrever('file:///cache/outra.jpg');

    armazenamento.apagarArquivos();

    expect(fsDeTeste.uris()).toEqual(['file:///cache/outra.jpg']);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest DonoDosDadosLocais protegerDonoDosDados LimpezaDeFotosOrfas`
Expected: FAIL (`Cannot find module '../DonoDosDadosLocais'`, `Cannot find module '../protegerDonoDosDados'`, `apagarArquivos is not a function`).

- [ ] **Step 3: Implementar `DonoDosDadosLocais`**

`src/infrastructure/database/sqlite/DonoDosDadosLocais.ts`:

```ts
import { eq } from 'drizzle-orm';

import type { DrizzleAppDb } from './DrizzleDb';
import { clientes, eventos, filaSync, fotos, obras, pedidos, syncMeta } from './schema';

export const CHAVE_DONO = 'dono_dos_dados';

/**
 * Conta dona dos dados deste aparelho (D4). Vem de sync_meta; sem registro, vale o usuario_id
 * de qualquer linha local (cobre os dados criados antes do login real, inclusive tombstones).
 */
export class DonoDosDadosLocais {
  constructor(private readonly db: DrizzleAppDb) {}

  async ler(): Promise<string | null> {
    const [registrado] = await this.db.select().from(syncMeta).where(eq(syncMeta.chave, CHAVE_DONO));
    if (registrado) return registrado.valor;
    // Uma consulta por tabela (um laço sobre a união das tabelas confunde os tipos do Drizzle).
    const consultas = [
      () => this.db.select({ usuarioId: clientes.usuarioId }).from(clientes).limit(1),
      () => this.db.select({ usuarioId: obras.usuarioId }).from(obras).limit(1),
      () => this.db.select({ usuarioId: pedidos.usuarioId }).from(pedidos).limit(1),
      () => this.db.select({ usuarioId: eventos.usuarioId }).from(eventos).limit(1),
    ];
    for (const consultar of consultas) {
      const [linha] = await consultar();
      if (linha) return linha.usuarioId;
    }
    return null;
  }

  async registrar(usuarioId: string): Promise<void> {
    await this.db
      .insert(syncMeta)
      .values({ chave: CHAVE_DONO, valor: usuarioId })
      .onConflictDoUpdate({ target: syncMeta.chave, set: { valor: usuarioId } });
  }

  /** Apaga todos os dados locais. Pedidos antes de clientes e obras por causa das FKs. */
  async apagarTudo(): Promise<void> {
    await this.db.delete(pedidos);
    await this.db.delete(filaSync);
    await this.db.delete(clientes);
    await this.db.delete(obras);
    await this.db.delete(eventos);
    await this.db.delete(fotos);
    await this.db.delete(syncMeta);
  }
}
```

- [ ] **Step 4: Implementar `apagarArquivos`**

Em `src/infrastructure/fileSystem/ArmazenamentoDeFotos.ts`, depois de `limparOrfas`:

```ts
  /** Remove todas as fotos do aparelho (usado ao apagar os dados locais, D4). */
  apagarArquivos(): void {
    const pasta = new Directory(Paths.document, PASTA_FOTOS);
    if (!pasta.exists) return;
    for (const item of pasta.list()) {
      if (item instanceof File) apagarSeExistir(item);
    }
  }
```

- [ ] **Step 5: Implementar o decorator do login**

`src/main/auth/protegerDonoDosDados.ts`:

```ts
import type { AuthSession, IAuthGateway } from '../../core/application/gateways/IAuthGateway';
import type { LoginUseCase } from '../../core/application/usecases/LoginUseCase';

export class DadosDeOutroUsuarioError extends Error {
  constructor() {
    super(
      'Este aparelho tem dados de outra conta. Para entrar com esta conta, é preciso apagar os dados locais.',
    );
    this.name = 'DadosDeOutroUsuarioError';
    Object.setPrototypeOf(this, DadosDeOutroUsuarioError.prototype);
  }
}

interface DonoDosDados {
  ler(): Promise<string | null>;
  registrar(usuarioId: string): Promise<void>;
}

/**
 * D4: depois do login, confere se os dados locais são da mesma conta. Se forem de outra,
 * desfaz o login (logout local) e lança DadosDeOutroUsuarioError; nada é apagado aqui.
 * Mesmo tipo e protótipo do LoginUseCase original.
 */
export function protegerDonoDosDados(
  login: LoginUseCase,
  auth: IAuthGateway,
  dono: DonoDosDados,
): LoginUseCase {
  const original = login.execute.bind(login);
  const decorado = Object.create(Object.getPrototypeOf(login)) as LoginUseCase;
  Object.assign(decorado, login);
  decorado.execute = async (args: { email: string; password: string }): Promise<AuthSession> => {
    const sessao = await original(args);
    const atual = await dono.ler();
    if (atual && atual !== sessao.userId) {
      await auth.logout();
      throw new DadosDeOutroUsuarioError();
    }
    if (!atual) await dono.registrar(sessao.userId);
    return sessao;
  };
  return decorado;
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx jest DonoDosDadosLocais protegerDonoDosDados LimpezaDeFotosOrfas`
Expected: PASS.

- [ ] **Step 7: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint && npm run db:check
git add src/infrastructure/database/sqlite src/infrastructure/fileSystem src/main/auth
git commit -m "feat(main): D4 bloqueia login de outra conta com dados locais"
```

---

### Task 7: Composition root com auth real

**Files:**
- Create: `src/main/auth/criarSupabaseDoApp.ts`
- Modify: `src/main/factories/makeSqliteProviders.ts`, `src/main/factories/ProviderBag.ts`
- Modify: `src/presentation/components/TelaErroBanco.tsx`, `src/app/_layout.tsx`
- Modify: `src/main/factories/__tests__/makeSqliteProviders.test.ts`, `src/presentation/__tests__/RouterGuards.test.tsx`
- Test: `src/main/auth/__tests__/criarSupabaseDoApp.test.ts`

**Interfaces:**
- Consumes: Tarefas 3 a 6.
- Produces:
  - `criarSupabaseDoApp(bruta?: { url?: string; chave?: string }): { auth: IAuthGateway }` (padrão: as variáveis `EXPO_PUBLIC_*`; lança `ConfigSupabaseInvalidaError` sem elas)
  - `makeSqliteProviders(db, executor, auth: IAuthGateway)` — `useCases.login` protegido por D4; `apagarDadosLocais(): Promise<void>`
  - `ProviderBag.apagarDadosLocais?(): Promise<void>`
  - `TelaErroBanco({ mensagem, titulo? })`

- [ ] **Step 1: Escrever os testes que falham**

`src/main/auth/__tests__/criarSupabaseDoApp.test.ts`:

```ts
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

  it('com URL e chave publishable monta o SupabaseAuthGateway', () => {
    expect(
      criarSupabaseDoApp({ url: 'https://abcd.supabase.co', chave: 'sb_publishable_xyz' }).auth,
    ).toBeInstanceOf(SupabaseAuthGateway);
  });
});
```

Em `src/main/factories/__tests__/makeSqliteProviders.test.ts`:

1. Imports novos:

```ts
import { FakeAuthGateway } from '../../../infrastructure/device/FakeAuthGateway';
import { DadosDeOutroUsuarioError } from '../../auth/protegerDonoDosDados';
import { syncMeta } from '../../../infrastructure/database/sqlite/schema';
```

(juntar `syncMeta` ao import existente de `schema`).

2. No `beforeEach`, trocar a criação da bag por:

```ts
    bag = makeSqliteProviders(
      db,
      new ExecutorDeTransacao(db),
      new FakeAuthGateway(
        new Map([
          ['a@ate.app', { password: '1', userId: USUARIO }],
          ['b@ate.app', { password: '2', userId: 'b2222222-2222-4222-8222-222222222222' }],
        ]),
      ),
    );
```

3. Casos novos no `describe`:

```ts
  it('login registra o dono e bloqueia outra conta com dados locais (D4)', async () => {
    await bag.useCases.login.execute({ email: 'a@ate.app', password: '1' });
    await bag.useCases.cadastrarObra.execute({ usuarioId: USUARIO, nome: 'Coruja', tipo: 'UNICA' });
    await bag.useCases.logout.execute();

    await expect(bag.useCases.login.execute({ email: 'b@ate.app', password: '2' })).rejects.toBeInstanceOf(
      DadosDeOutroUsuarioError,
    );
    await expect(bag.gateways.auth.getSession()).resolves.toBeNull();
  });

  it('apagarDadosLocais zera o banco e libera a outra conta', async () => {
    await bag.useCases.login.execute({ email: 'a@ate.app', password: '1' });
    await bag.useCases.cadastrarObra.execute({ usuarioId: USUARIO, nome: 'Coruja', tipo: 'UNICA' });

    await bag.apagarDadosLocais();

    expect(await db.select().from(syncMeta)).toEqual([]);
    expect(await db.select().from(filaSync)).toEqual([]);
    await expect(
      bag.useCases.login.execute({ email: 'b@ate.app', password: '2' }),
    ).resolves.toMatchObject({ userId: 'b2222222-2222-4222-8222-222222222222' });
  });
```

Em `src/presentation/__tests__/RouterGuards.test.tsx`, junto dos outros `jest.mock`:

```tsx
// O layout raiz lê o .env do Supabase; no Jest usa o FakeAuthGateway com a conta demo.
jest.mock('../../main/auth/criarSupabaseDoApp', () => ({
  criarSupabaseDoApp: () => {
    const { FakeAuthGateway } = jest.requireActual<{ FakeAuthGateway: new () => unknown }>(
      '../../infrastructure/device/FakeAuthGateway',
    );
    return { auth: new FakeAuthGateway() };
  },
}));
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest criarSupabaseDoApp makeSqliteProviders`
Expected: FAIL (`Cannot find module '../criarSupabaseDoApp'`; `bag.apagarDadosLocais is not a function`).

- [ ] **Step 3: Implementar `criarSupabaseDoApp`**

`src/main/auth/criarSupabaseDoApp.ts`:

```ts
import type { IAuthGateway } from '../../core/application/gateways/IAuthGateway';
import { ArmazenamentoCifradoDeSessao } from '../../infrastructure/auth/ArmazenamentoCifradoDeSessao';
import { SupabaseAuthGateway } from '../../infrastructure/auth/SupabaseAuthGateway';
import {
  CHAVE_SESSAO,
  criarClienteSupabase,
  validarConfigSupabase,
} from '../../infrastructure/supabase/cliente';

/**
 * Monta o Supabase do app a partir do .env. Os acessos a process.env.EXPO_PUBLIC_* ficam
 * literais no valor padrão porque o Expo só embute no bundle o que é acessado dessa forma;
 * os testes passam os valores explicitamente. Lança ConfigSupabaseInvalidaError sem .env.
 */
export function criarSupabaseDoApp(
  bruta: { url?: string; chave?: string } = {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    chave: process.env.EXPO_PUBLIC_SUPABASE_KEY,
  },
): { auth: IAuthGateway } {
  const config = validarConfigSupabase(bruta);
  const armazenamento = new ArmazenamentoCifradoDeSessao();
  const cliente = criarClienteSupabase(config, armazenamento);
  return { auth: new SupabaseAuthGateway(cliente.auth, armazenamento, CHAVE_SESSAO) };
}
```

- [ ] **Step 4: Injetar o auth no `makeSqliteProviders` e ligar o D4**

Em `src/main/factories/makeSqliteProviders.ts`:

1. Imports: remover `FakeAuthGateway`; acrescentar

```ts
import type { IAuthGateway } from '../../core/application/gateways/IAuthGateway';
import { DonoDosDadosLocais } from '../../infrastructure/database/sqlite/DonoDosDadosLocais';
import { protegerDonoDosDados } from '../auth/protegerDonoDosDados';
```

2. Assinatura e criação:

```ts
export function makeSqliteProviders(
  db: DrizzleAppDb,
  executor: ExecutorDeTransacao,
  auth: IAuthGateway,
) {
```

remover `const auth = new FakeAuthGateway();` e acrescentar, junto dos repositórios:

```ts
  const donoDosDados = new DonoDosDadosLocais(db);
```

3. Em `useCases`, trocar a linha do login por:

```ts
    login: protegerDonoDosDados(new LoginUseCase(auth), auth, donoDosDados),
```

4. No objeto `bag`, depois de `aoIniciar`:

```ts
    /** D4: apaga banco e fotos deste aparelho (a outra conta pode entrar em seguida). */
    async apagarDadosLocais(): Promise<void> {
      await executor.executar(() => donoDosDados.apagarTudo());
      armazenamentoDeFotos.apagarArquivos();
    },
```

5. Comentário da função: "Câmera e fotos (Plano 2) e auth (Plano 3) são reais; GPS (Plano 5) ainda é fake."

Em `src/main/factories/ProviderBag.ts`, depois de `aoIniciar?`:

```ts
  /** D4: apaga os dados locais deste aparelho (ausente na bag fake). */
  apagarDadosLocais?(): Promise<void>;
```

- [ ] **Step 5: Tela de configuração ausente no `_layout.tsx`**

Substituir `src/presentation/components/TelaErroBanco.tsx` por (título opcional; a dica de reabrir o app só vale para o erro do banco):

```tsx
import React from 'react';
import { Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useUIStyles } from '@/presentation/styles/uiStyles';

const TITULO_BANCO = 'Não foi possível abrir seus dados';

/** Erro que impede o app de seguir: banco local (padrão) ou configuração ausente. */
export function TelaErroBanco({ mensagem, titulo = TITULO_BANCO }: { mensagem: string; titulo?: string }) {
  const uiStyles = useUIStyles();
  return (
    <View
      testID="tela-erro-banco"
      style={[uiStyles.screen, { justifyContent: 'center', padding: spacing.x6, gap: spacing.x3 }]}
    >
      <Text accessibilityRole="header" style={uiStyles.title}>{titulo}</Text>
      <Text style={uiStyles.error}>{mensagem}</Text>
      {titulo === TITULO_BANCO ? (
        <Text style={uiStyles.muted}>Feche e abra o app de novo. Se continuar, reinstale o app.</Text>
      ) : null}
    </View>
  );
}
```

Em `src/app/_layout.tsx`:

1. Imports:

```tsx
import { criarSupabaseDoApp } from '@/main/auth/criarSupabaseDoApp';
```

2. Em `RootLayout`, antes de `useMigrations`:

```tsx
  const [supabase] = useState(() => {
    try {
      return { auth: criarSupabaseDoApp().auth, erro: null };
    } catch (erro) {
      return { auth: null, erro: erro instanceof Error ? erro.message : 'Configuração inválida' };
    }
  });
```

3. A criação dos providers passa o auth (só usada quando `supabase.auth` existe):

```tsx
  const [providers] = useState(() =>
    supabase.auth
      ? makeSqliteProviders(conexao.db, new ExecutorDeTransacao(conexao.db), supabase.auth)
      : null);
```

4. No retorno, a primeira condição dentro do `FontLoader` passa a ser:

```tsx
      {supabase.erro || !providers ? (
        <TelaErroBanco titulo="Configuração incompleta" mensagem={supabase.erro ?? 'Configuração inválida'} />
      ) : error ? (
```

(o resto — `TelaErroBanco` das migrations, `TelaCarregando`, `AppProviders` — continua igual).

- [ ] **Step 6: Rodar e ver passar**

Run: `npx jest criarSupabaseDoApp makeSqliteProviders RouterGuards`
Expected: PASS. O `RouterGuards` continua entrando com `artesao@email.com` / `123456` pelo `FakeAuthGateway` do mock.

- [ ] **Step 7: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint && npm run db:check
git add src/main src/app/_layout.tsx src/presentation/components/TelaErroBanco.tsx src/presentation/__tests__/RouterGuards.test.tsx
git commit -m "feat(main): auth do Supabase no runtime e tela de configuração ausente"
```

---

### Task 8: Sessão restaurada, mensagens reais e fluxo D4 na tela de login

**Files:**
- Modify: `src/presentation/hooks/AppProviders.tsx`, `src/app/_layout.tsx`, `src/app/(auth)/login.tsx`
- Test: `src/presentation/__tests__/AuthRestauracao.test.tsx` (novo), `src/presentation/__tests__/TelaLogin.test.tsx` (acrescentar casos)

**Interfaces:**
- Consumes: `DadosDeOutroUsuarioError` (Tarefa 6), `providers.apagarDadosLocais` (Tarefa 7), `ConfirmDialog`, `TelaCarregando`.
- Produces: `AuthCtx` ganha `restaurando?: boolean` e `apagarDadosEEntrar?(email: string, password: string): Promise<void>` (opcionais: os testes que montam `AuthContext.Provider` à mão continuam válidos); testIDs `aviso-outra-conta`, `botao-apagar-e-entrar`.

- [ ] **Step 1: Escrever os testes que falham**

`src/presentation/__tests__/AuthRestauracao.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { makeFakeProviders } from '../../main/factories/makeFakeProviders';
import { AppProviders, useAuth } from '../hooks/AppProviders';

function Sonda() {
  const { restaurando, session } = useAuth();
  return <Text testID="estado">{restaurando ? 'restaurando' : session ? 'logado' : 'deslogado'}</Text>;
}

describe('restauração da sessão', () => {
  it('fica em "restaurando" até o getSession responder', async () => {
    const providers = makeFakeProviders();
    let responder!: (valor: { userId: string; token: string } | null) => void;
    jest.spyOn(providers.gateways.auth, 'getSession').mockReturnValue(
      new Promise((resolve) => {
        responder = resolve;
      }),
    );

    await render(<AppProviders providers={providers}><Sonda /></AppProviders>);
    expect(screen.getByTestId('estado')).toHaveTextContent('restaurando');

    responder({ userId: providers.usuarioId, token: 't' });
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('logado'));
  });

  it('falha ao restaurar termina deslogado, sem travar em "restaurando"', async () => {
    const providers = makeFakeProviders();
    jest.spyOn(providers.gateways.auth, 'getSession').mockRejectedValue(new Error('storage'));

    await render(<AppProviders providers={providers}><Sonda /></AppProviders>);

    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('deslogado'));
  });
});
```

Em `src/presentation/__tests__/TelaLogin.test.tsx`, acrescentar o import

```tsx
import { DadosDeOutroUsuarioError } from '../../main/auth/protegerDonoDosDados';
```

e os casos:

```tsx
  it('mostra a mensagem real do erro (ex.: sem conexão)', async () => {
    const login = jest.fn(async () => {
      throw new Error('Sem conexão: entre uma vez com internet para usar o app offline.');
    });
    await render(
      <AuthContext.Provider value={{ session: null, login, logout: async () => {} }}>
        <TelaLogin />
      </AuthContext.Provider>,
    );
    await fireEvent.changeText(screen.getByTestId('campo-email'), 'a@ate.app');
    await fireEvent.changeText(screen.getByTestId('campo-senha'), '1');
    await fireEvent.press(screen.getByTestId('botao-entrar'));

    await waitFor(() => expect(screen.getByTestId('erro-login')).toHaveTextContent(/Sem conexão/));
  });

  it('outra conta com dados locais: avisa, pede confirmação e só então apaga e entra', async () => {
    const login = jest.fn(async () => {
      throw new DadosDeOutroUsuarioError();
    });
    const apagarDadosEEntrar = jest.fn(async () => {});
    await render(
      <AuthContext.Provider value={{ session: null, login, logout: async () => {}, apagarDadosEEntrar }}>
        <TelaLogin />
      </AuthContext.Provider>,
    );
    await fireEvent.changeText(screen.getByTestId('campo-email'), 'b@ate.app');
    await fireEvent.changeText(screen.getByTestId('campo-senha'), '2');
    await fireEvent.press(screen.getByTestId('botao-entrar'));

    await waitFor(() => expect(screen.getByTestId('aviso-outra-conta')).toHaveTextContent(/outra conta/));
    await fireEvent.press(screen.getByTestId('botao-apagar-e-entrar'));
    expect(apagarDadosEEntrar).not.toHaveBeenCalled();

    expect(screen.getByTestId('dialog-confirm')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('dialog-confirm-btn'));

    await waitFor(() => expect(apagarDadosEEntrar).toHaveBeenCalledWith('b@ate.app', '2'));
  });

  it('cancelar a confirmação não apaga nada', async () => {
    const login = jest.fn(async () => {
      throw new DadosDeOutroUsuarioError();
    });
    const apagarDadosEEntrar = jest.fn(async () => {});
    await render(
      <AuthContext.Provider value={{ session: null, login, logout: async () => {}, apagarDadosEEntrar }}>
        <TelaLogin />
      </AuthContext.Provider>,
    );
    await fireEvent.changeText(screen.getByTestId('campo-email'), 'b@ate.app');
    await fireEvent.changeText(screen.getByTestId('campo-senha'), '2');
    await fireEvent.press(screen.getByTestId('botao-entrar'));
    await fireEvent.press(await screen.findByTestId('botao-apagar-e-entrar'));

    await fireEvent.press(screen.getByTestId('dialog-cancel'));

    expect(apagarDadosEEntrar).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dialog-confirm')).toBeNull();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest AuthRestauracao TelaLogin`
Expected: FAIL (`restaurando` inexistente; `erro-login` com texto fixo; sem `aviso-outra-conta`).

- [ ] **Step 3: `AuthProvider` com `restaurando` e `apagarDadosEEntrar`**

Em `src/presentation/hooks/AppProviders.tsx`:

1. `AuthCtx`:

```tsx
export interface AuthCtx {
  session: AuthSession | null;
  /** true enquanto a sessão guardada é lida na abertura do app. */
  restaurando?: boolean;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  /** D4: apaga os dados locais deste aparelho e entra com a outra conta. */
  apagarDadosEEntrar?(email: string, password: string): Promise<void>;
}
```

2. Substituir o corpo de `AuthProvider` por:

```tsx
  const [session, setSession] = useState<AuthSession | null>(null);
  const [restaurando, setRestaurando] = useState(true);

  useEffect(() => {
    let ativo = true;
    providers.gateways.auth
      .getSession()
      .then(
        (restaurada) => {
          if (!ativo) return;
          providers.registrarSessao?.(restaurada);
          setSession(restaurada);
        },
        () => undefined,
      )
      .finally(() => {
        if (ativo) setRestaurando(false);
      });
    return () => {
      ativo = false;
    };
  }, [providers]);

  async function login(email: string, password: string): Promise<void> {
    const nextSession = await providers.useCases.login.execute({ email, password });
    providers.registrarSessao?.(nextSession);
    setSession(nextSession);
  }

  async function logout(): Promise<void> {
    await providers.useCases.logout.execute();
    providers.registrarSessao?.(null);
    setSession(null);
  }

  async function apagarDadosEEntrar(email: string, password: string): Promise<void> {
    await providers.apagarDadosLocais?.();
    await login(email, password);
  }

  return (
    <AuthContext.Provider value={{ session, restaurando, login, logout, apagarDadosEEntrar }}>
      {children}
    </AuthContext.Provider>
  );
```

- [ ] **Step 4: Não mostrar o login enquanto restaura**

Em `src/app/_layout.tsx`, no início de `RootNavigator`:

```tsx
  const { session, restaurando } = useAuth();
```

e, depois de `const { colors, scheme } = useDesignTheme();` (todos os hooks antes do retorno antecipado):

```tsx
  if (restaurando) return <TelaCarregando />;
```

- [ ] **Step 5: Tela de login com a mensagem real e o fluxo D4**

Em `src/app/(auth)/login.tsx`:

1. Imports:

```tsx
import { DadosDeOutroUsuarioError } from '@/main/auth/protegerDonoDosDados';
import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
```

2. Estados e funções (substituir `entrar` e acrescentar `apagarEEntrar`):

```tsx
  const { login, apagarDadosEEntrar } = useAuth();
  const [outraConta, setOutraConta] = useState(false);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);

  async function entrar() {
    if (loading) return;
    setLoading(true);
    setErro(null);
    setOutraConta(false);
    try {
      await login(email, password);
    } catch (error) {
      if (error instanceof DadosDeOutroUsuarioError) setOutraConta(true);
      else setErro(error instanceof Error ? error.message : 'E-mail ou senha incorretos');
    } finally {
      setLoading(false);
    }
  }

  async function apagarEEntrar() {
    setConfirmandoApagar(false);
    if (loading || !apagarDadosEEntrar) return;
    setLoading(true);
    setErro(null);
    try {
      await apagarDadosEEntrar(email, password);
      setOutraConta(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível apagar os dados locais');
    } finally {
      setLoading(false);
    }
  }
```

(`useState` de `outraConta`/`confirmandoApagar` junto dos outros; a linha antiga `const { login } = useAuth();` sai.)

3. No JSX, logo depois do `{erro ? <Text testID="erro-login" … /> : null}`:

```tsx
        {outraConta ? (
          <View style={styles.field}>
            <Text testID="aviso-outra-conta" accessibilityLiveRegion="polite" style={styles.error}>
              Este aparelho tem dados de outra conta que ainda podem não ter sido enviados. Para entrar
              com esta conta, apague os dados locais.
            </Text>
            {confirmandoApagar ? (
              <ConfirmDialog
                titulo="Apagar pedidos, obras, clientes, eventos e fotos deste aparelho?"
                confirmLabel="Apagar e entrar"
                onConfirm={() => void apagarEEntrar()}
                onCancel={() => setConfirmandoApagar(false)}
                loading={loading}
                appearance="panel"
              />
            ) : (
              <ActionButton label="botao-apagar-e-entrar" title="Apagar dados locais e entrar"
                appearance="secondary" disabled={loading} onPress={() => setConfirmandoApagar(true)} />
            )}
          </View>
        ) : null}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx jest AuthRestauracao TelaLogin RouterGuards DataProviderSessao AppProvidersCamera`
Expected: PASS.

- [ ] **Step 7: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/presentation src/app
git commit -m "feat(presentation): restauração da sessão, erros reais no login e fluxo de outra conta"
```

---

### Task 9: Checkpoint B — smoke test com a conta real e registro

**Files:**
- Modify: `docs/ate-fase3.md` (seção "Plano 3"); possivelmente `package.json` e `src/infrastructure/supabase/cliente.ts` (polyfill, só se o Step 2 pedir)

- [ ] **Step 1: Parar e pedir o smoke test ao usuário** (com o `.env` do Checkpoint A e `npx expo start --clear`):
  1. **Primeira abertura** com os dados de desenvolvimento do usuário falso: entrar com a conta real deve mostrar o aviso de **outra conta**. Usar **Apagar dados locais e entrar**, confirmar: entra com as abas vazias.
  2. Fechar o app pelos recentes e reabrir: entra direto, **sem** mostrar o login.
  3. **Modo avião** e reabrir: entra direto (sessão salva).
  4. Ainda em modo avião, **Sair**: volta ao login. Tentar entrar: mensagem "Sem conexão: …".
  5. Com rede: senha errada mostra "E-mail ou senha incorretos"; senha certa entra.
  6. Criar um cliente, sair e entrar de novo com a **mesma** conta: o cliente continua lá (sem aviso de outra conta).
  7. Apagar a variável `EXPO_PUBLIC_SUPABASE_KEY` do `.env` e reiniciar o Expo: aparece "Configuração incompleta" (depois restaurar o `.env`).

- [ ] **Step 2: Spike do polyfill de URL (só se necessário).** Se o login falhar com erro mencionando `URL`, `URLSearchParams` ou `not implemented`:

```bash
npx expo install react-native-url-polyfill
```

e na **primeira linha** de `src/infrastructure/supabase/cliente.ts`:

```ts
import 'react-native-url-polyfill/auto';
```

Rodar o baseline, commit `fix(infra): polyfill de URL para o supabase-js no Hermes` e repetir o smoke test. Se não houver erro, registrar em `docs/ate-fase3.md` que o polyfill não foi necessário no SDK 57.

- [ ] **Step 3: Registrar em `docs/ate-fase3.md`**

Acrescentar ao final do arquivo, substituindo os marcadores `<…>` pelo que o usuário informar:

```markdown
## Plano 3 — Supabase: schema remoto, RLS, bucket e Auth

Concluído em <data>. O app entra com a conta real do artesão no Supabase, mantém a sessão cifrada no aparelho (inclusive offline) e protege os dados locais quando outra conta entra. O lado remoto (tabelas, RLS e bucket privado) está versionado em `supabase/` e foi verificado com um roteiro de isolamento entre dois usuários.

### Arquitetura entregue

- `supabase/migrations/0001_tabelas.sql`, `0002_rls.sql`, `0003_storage.sql`: tabelas `clientes`, `obras`, `pedidos`, `eventos` espelhando o SQLite (sem `status_sync`, `fila_sync`, `fotos`, `sync_meta`); `id` vindo do aparelho; `usuario_id default auth.uid()`; `updated_at` forçado pelo servidor; índices `(usuario_id, updated_at, id)` para o pull do Plano 4; RLS com `select`/`insert`/`update` do dono e sem `delete`; bucket privado `fotos` com o mesmo escopo pela primeira pasta.
- `supabase/tests/rls_isolamento.sql`: prova que um usuário não lê, não altera, não grava em nome de outro, não apaga e não acessa a pasta de fotos de outro. Resultado: <RLS OK>.
- `infrastructure/auth/ArmazenamentoCifradoDeSessao.ts`: padrão LargeSecureStore (chave AES-256 nova a cada gravação no `expo-secure-store`, sessão cifrada em AES-CTR no AsyncStorage).
- `infrastructure/supabase/cliente.ts`: valida o `.env` (recusa chave secreta) e cria o cliente com renovação só em primeiro plano.
- `infrastructure/auth/SupabaseAuthGateway.ts`: `IAuthGateway` real (contrato inalterado). Mensagens do app para credencial errada e falta de rede; restauração offline pela sessão guardada; logout local que funciona sem rede.
- D4: `DonoDosDadosLocais` + decorator `protegerDonoDosDados` no login; "Apagar dados locais e entrar" com confirmação.
- O `FakeAuthGateway` saiu do runtime (continua nos testes).

### Decisões e divergências em relação à fase 2

| # | Decisão | Motivo |
|---|---|---|
| 1 | Bucket privado e caminho do objeto no banco (`foto_conclusao_path`, `foto_path`), no lugar de URL pública (`*_url`, UC16) | D3: fotos de clientes; LGPD |
| 2 | Pedido `FEITO` exige foto também no servidor (`CHECK`), exceto venda direta | RNF11 garantido no destino |
| 3 | Sem tabela `profiles` | O app não usa perfil |
| 4 | Sem política de `delete` no banco e no bucket | Exclusão sempre lógica (tombstone, RNF13) |
| 5 | Outra conta com dados locais: bloqueio com opção de apagar | D4 (usuário único, Decisão #1) |
| 6 | Sessão restaurada offline mesmo com o token vencido | O artesão abre o app na feira sem sinal |
| 7 | Polyfill de URL: <necessário / não necessário> no SDK 57 | Spike do smoke test |

### Testes

Contrato estático do SQL no Jest; adaptador cifrado com `expo-secure-store` e AsyncStorage dublados; cliente com `supabase-js` mockado; gateway com cliente de auth falso (sucesso, credencial errada, sem rede, erro genérico, restauração online e offline, sessão ilegível, refresh revogado, logout offline); D4 com SQLite real em memória e decorator; composição com `FakeAuthGateway`; telas (restauração, mensagem real, aviso de outra conta com confirmação).

Baseline ao fim do plano: <N> testes, `typecheck` limpo, `lint` com 0 erros (11 warnings herdados), `db:check` ok.

### Smoke test no aparelho (Expo Go, <data>)

<resultado informado pelo usuário, item a item>

### Pendências para os próximos planos

- Envio da fila, upload das fotos para `<usuario_id>/<foto_id>.jpg`, pull por cursor e URL assinada para exibir fotos vindas do servidor (Plano 4).
- Variáveis `EXPO_PUBLIC_*` no EAS (`eas env`) para o APK (Plano 6).
```

- [ ] **Step 4: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint && npm run db:check
git add docs/ate-fase3.md
git commit -m "docs: registra o Plano 3 (Supabase e Auth) em ate-fase3"
```

---

## Ordem de execução e checkpoints

- Tarefas 1 → 9, um commit por tarefa, baseline completo ao fim de cada uma.
- Dependências: 3 independe de 1; 4 depende de 3; 5 depende de 3 e 4; 6 independe de 3 a 5; 7 depende de 3 a 6; 8 depende de 6 e 7; 9 por último.
- **Checkpoint A** (Tarefa 2): o usuário cria o projeto, aplica o SQL, roda a verificação de RLS, cria a conta e preenche o `.env`. As Tarefas 3 a 6 podem seguir em paralelo.
- **Checkpoint B** (Tarefa 9): smoke test com a conta real, inclusive offline e o fluxo D4.
- **Antes de começar:** confirmar com o usuário as decisões **D3** e **D4** (assumidas aqui pela recomendação do roteiro).
