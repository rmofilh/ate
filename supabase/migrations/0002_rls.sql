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

-- A opção "automatic RLS" do dashboard cria public.rls_auto_enable() como SECURITY DEFINER,
-- exposta em /rest/v1/rpc para anon e authenticated (Security Advisor 0028/0029).
-- Ela é disparada por event trigger, que não depende deste grant.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
