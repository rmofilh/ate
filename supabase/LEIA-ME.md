# Supabase do ate

Projeto: `mogzqhuwdztyrbmmyxul` (região São Paulo, plano Free).

## Estrutura

- `migrations/0001_tabelas.sql`: tabelas `clientes`, `obras`, `pedidos` e `eventos`; `CHECK`s; FKs compostas `(id, usuario_id)`; trigger que força `updated_at = now()`.
- `migrations/0002_rls.sql`: RLS e políticas de `select`, `insert` e `update` só para o dono (`usuario_id = auth.uid()`). Sem `delete`, porque a exclusão é lógica (`deleted_at`).
- `migrations/0003_storage.sql`: bucket **privado** `fotos`, com objetos em `<usuario_id>/<foto_id>.jpg` e o mesmo escopo pela primeira pasta.
- `tests/rls_isolamento.sql`: prova de isolamento. A conta real do artesão faz o papel do usuário A e um UUID sintético o do usuário B. Roda dentro de uma transação desfeita no fim e termina com `RLS OK`.

## Primeira configuração (uma vez)

1. Criar o projeto em https://supabase.com/dashboard, na região **South America (São Paulo)**.
2. Em Authentication → Users → **Add user**, criar a conta do artesão com "Auto Confirm User". O app não tem cadastro.
3. Em Authentication → Sign In / Providers, desligar **Allow new users to sign up**.
4. Aplicar as migrations em ordem. Há 2 jeitos:
   - pelo MCP do Supabase no Claude Code (`apply_migration`);
   - colando cada arquivo no SQL Editor.
5. Rodar `tests/rls_isolamento.sql`. O resultado esperado é `RLS OK`; qualquer violação para com `FALHA: …`.
6. Em Project Settings → API Keys, copiar a URL e a **Publishable key** (`sb_publishable_…`). Na raiz do repositório, rodar `cp .env.example .env`, preencher as variáveis e reiniciar o `npx expo start`.

## Regras

- Nunca colocar a chave **secret** (`service_role`) no `.env` do app nem no repositório.
- Para mudar o schema, criar um arquivo novo `NNNN_descricao.sql` em `migrations/`. Nunca editar um arquivo que já foi aplicado.
- "Leaked password protection" fica desligada: o recurso só existe nos planos pagos.
