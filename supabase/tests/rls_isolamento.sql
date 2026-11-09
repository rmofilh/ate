-- Prova de isolamento entre usuários (RNF03). Rodar inteiro depois das migrations
-- (SQL Editor ou MCP `execute_sql`). Tudo acontece numa transação desfeita no fim: nada fica gravado.
--
-- Usuário A = a conta real do artesão (o primeiro usuário de auth.users).
-- Usuário B = um UUID sintético, sem conta: basta para provar que um terceiro autenticado não lê,
--             não altera, não grava em nome de A e não acessa a pasta de fotos de A.
-- Sucesso: termina com a linha 'RLS OK'. Qualquer violação interrompe com "FALHA: ...".

begin;

-- Ainda como postgres: guarda o id de A antes de trocar de papel (authenticated não lê auth.users).
select set_config('teste.usuario_a', (select id::text from auth.users order by created_at limit 1), true);
select set_config('teste.usuario_b', '00000000-0000-4000-8000-0000000000b2', true);

set local role authenticated;

-- Usuário A grava cliente, pedido e um objeto na própria pasta.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('teste.usuario_a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  a uuid := current_setting('teste.usuario_a')::uuid;
  dono uuid;
  atualizado timestamptz;
begin
  if a is null then raise exception 'FALHA: nenhuma conta em auth.users (crie a do artesão)'; end if;

  insert into public.clientes (id, nome, contato, criado_em_local, updated_at)
  values ('11111111-1111-4111-8111-0000000000a1', 'Cliente de A', '1', now(), '2000-01-01');

  select usuario_id, updated_at into dono, atualizado
  from public.clientes where id = '11111111-1111-4111-8111-0000000000a1';
  if dono <> a then raise exception 'FALHA: usuario_id não veio de auth.uid()'; end if;
  if atualizado < now() - interval '1 minute' then
    raise exception 'FALHA: updated_at enviado pelo cliente foi aceito';
  end if;

  -- RNF11 no servidor: pedido FEITO sem foto é recusado.
  begin
    insert into public.pedidos (id, cliente_id, descricao, canal_origem, data_entrega, status,
                                venda_direta, quantidade_obra, criado_em_local)
    values ('33333333-3333-4333-8333-0000000000a1', '11111111-1111-4111-8111-0000000000a1',
            'Sem foto', 'PRESENCIAL', now(), 'FEITO', false, 0, now());
    raise exception 'FALHA: pedido FEITO sem foto aceito';
  exception when check_violation then null;
  end;

  insert into storage.objects (bucket_id, name)
  values ('fotos', a::text || '/foto.jpg');
end $$;

-- Usuário B tenta ler, alterar, apagar e se passar por A.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('teste.usuario_b'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  a text := current_setting('teste.usuario_a');
  quantidade integer;
begin
  select count(*) into quantidade from public.clientes;
  if quantidade <> 0 then raise exception 'FALHA: B leu linhas de A'; end if;

  update public.clientes set nome = 'invadido' where id = '11111111-1111-4111-8111-0000000000a1';
  get diagnostics quantidade = row_count;
  if quantidade <> 0 then raise exception 'FALHA: B alterou linha de A'; end if;

  begin
    insert into public.clientes (id, usuario_id, nome, contato, criado_em_local)
    values ('22222222-2222-4222-8222-0000000000b2', a::uuid, 'Falso', '1', now());
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
    values ('fotos', a || '/intruso.jpg');
    raise exception 'FALHA: B gravou na pasta de A';
  exception when insufficient_privilege then null;
  end;
end $$;

select 'RLS OK' as resultado;

rollback;
