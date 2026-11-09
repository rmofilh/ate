-- 0001 — Tabelas de domínio do ate no Supabase (fase 4).
-- Espelha o SQLite local, sem as colunas e tabelas que só existem no aparelho (outbox, metadados de fotos e de sync).
-- `id` vem do aparelho (UUID v4), sem default. `updated_at` é sempre o relógio do servidor (RNF04).
-- Datas de negócio (`data_entrega`, `data`) são timestamptz: o aparelho grava ISO completo e o vaivém do sync
-- não pode perder nem deslocar o dia por fuso.

create table if not exists public.clientes (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  contato text not null,
  criado_em_local timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Alvo das FKs compostas de pedidos: um pedido só aponta para cliente do mesmo dono.
  constraint uq_clientes_id_usuario unique (id, usuario_id)
);

create table if not exists public.obras (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('UNICA', 'SERIE')),
  quantidade integer not null check (quantidade >= 0),
  status_obra text not null check (status_obra in ('DISPONIVEL', 'RESERVADA', 'ENTREGUE', 'ARQUIVADA')),
  -- Caminho do objeto no bucket `fotos` (<usuario_id>/<foto_id>.jpg), preenchido pelo sync.
  foto_path text,
  criado_em_local timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint uq_obras_id_usuario unique (id, usuario_id)
);

create table if not exists public.pedidos (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cliente_id uuid not null,
  obra_id uuid,
  descricao text not null,
  canal_origem text not null check (canal_origem in ('INSTAGRAM', 'WHATSAPP', 'PRESENCIAL', 'TELEFONE', 'OUTROS')),
  data_entrega timestamptz not null,
  status text not null check (status in ('A_FAZER', 'FAZENDO', 'FEITO')),
  -- Caminho do objeto no bucket `fotos` (<usuario_id>/<foto_id>.jpg), preenchido pelo sync.
  foto_conclusao_path text,
  venda_direta boolean not null default false,
  quantidade_obra integer not null check (quantidade_obra >= 0),
  criado_em_local timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- FKs compostas: o RLS sozinho não impede um pedido de A apontar para cliente/obra de B.
  -- obra_id nulo continua válido (MATCH SIMPLE).
  constraint fk_pedidos_cliente_mesmo_dono
    foreign key (cliente_id, usuario_id) references public.clientes (id, usuario_id),
  constraint fk_pedidos_obra_mesmo_dono
    foreign key (obra_id, usuario_id) references public.obras (id, usuario_id),
  -- RNF11: o servidor nunca guarda pedido FEITO sem foto (venda direta não tem foto de conclusão).
  constraint ck_pedidos_feito_com_foto
    check (status <> 'FEITO' or venda_direta or foto_conclusao_path is not null)
);

create table if not exists public.eventos (
  id uuid primary key,
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  data timestamptz not null,
  endereco text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  observacoes text not null default '',
  criado_em_local timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Pull por cursor composto (updated_at, id) por usuário.
create index if not exists idx_clientes_usuario_cursor on public.clientes (usuario_id, updated_at, id);
create index if not exists idx_obras_usuario_cursor on public.obras (usuario_id, updated_at, id);
create index if not exists idx_pedidos_usuario_cursor on public.pedidos (usuario_id, updated_at, id);
create index if not exists idx_eventos_usuario_cursor on public.eventos (usuario_id, updated_at, id);
create index if not exists idx_pedidos_cliente on public.pedidos (cliente_id, usuario_id);
create index if not exists idx_pedidos_obra on public.pedidos (obra_id, usuario_id);

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

-- Função de trigger não é chamável pela API.
revoke execute on function public.definir_updated_at() from public, anon, authenticated;

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
