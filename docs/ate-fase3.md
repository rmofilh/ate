# Documento de Software — Fase 3 (Implementação offline-first)

Registro contínuo das decisões da fase 3 e das divergências em relação ao documento da fase 2 (`docs/ate-fase2.md`). Cada plano acrescenta a sua seção. Roteiro completo: `docs/superpowers/plans/2026-10-27-fase3-roteiro.md`.

## Plano 1 — Persistência local real (SQLite + Drizzle)

Concluído em 27/10/2026. Os 4 repositórios em memória e o `FakeSyncGateway` foram substituídos no runtime por SQLite (`expo-sqlite` + Drizzle ORM) e por uma fila outbox real (`fila_sync`). O app roda no Expo Go, abre vazio e mantém os dados ao fechar e reabrir. Os fakes continuam como dublês de teste.

### Arquitetura entregue

- `infrastructure/database/sqlite/`: schema Drizzle (`schema.ts`), tipo comum dos drivers (`DrizzleAppDb`), `ExecutorDeTransacao` + decorator `transacional` e os 4 repositórios SQLite.
- `infrastructure/sync/OutboxSyncGateway.ts`: implementa `ISyncGateway` gravando em `fila_sync`.
- `main/database/openAppDatabase.ts`: abre `ate.db` com `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;` e `enableChangeListener` (base do Plano 4).
- `main/factories/makeSqliteProviders.ts`: composition root do runtime. `ProviderBag` é o tipo estrutural que o `AppProviders` aceita; a bag fake continua satisfazendo esse tipo nos testes.
- Migrations geradas pelo `drizzle-kit` em `drizzle/` (versionadas), embutidas no bundle (`babel-plugin-inline-import` + `.sql` no Metro) e aplicadas com `useMigrations` no `_layout.tsx`.
- Ainda fakes no runtime: autenticação (até o Plano 3), câmera (até o Plano 2) e GPS (até o Plano 5, com o botão desabilitado nas telas de evento).

### Decisões e divergências em relação à fase 2

| # | Fase 2 | Fase 3 (Plano 1) | Motivo |
|---|---|---|---|
| 1 | `fila_sync` com `tipo_operacao`, `entidade`, `entidade_id`, `payload`, `status`, `criado_em_local` (§3.2/§3.3) | Acrescenta `tentativas`, `proxima_tentativa_em` e `erro`; `status` aceita `PENDENTE`, `ENVIANDO` e `FALHA` | Retentativa com backoff e falha visível no motor de sync (Plano 4) |
| 2 | Foto como `foto_conclusao_path` + `foto_conclusao_url` (pedido) e `foto_path` + `foto_url` (obra) | As entidades guardam só o caminho **relativo** do arquivo; hash, status de upload e caminho remoto ficam na tabela nova `fotos` | Padrão do material ("arquivo no filesystem; no SQLite só caminho, status e hash"); o caminho absoluto muda entre builds e reinstalações |
| 3 | — | Tabela nova `sync_meta` (chave/valor) | Cursor do pull por tabela (Plano 4) |
| 4 | `updated_at` só no remoto | `updated_at` também local, só de infraestrutura (fora das entidades). O upsert grava apenas as colunas da entidade e preserva essa coluna | Guardar o timestamp do servidor recebido no pull |
| 5 | Linha removida fisicamente após o servidor confirmar o `DELETAR` (§3.1 "Campo `deletedAt`" e §3.3) | Tombstone (`deleted_at`) mantido localmente **para sempre**; toda leitura de UI filtra `deleted_at IS NULL` | RNF13; o pull não ressuscita registros removidos |
| 6 | — | Sem coluna `version` | Usuário único, um aparelho, servidor vence pelo timestamp dele |
| 7 | Enums e faixas validados só no domínio | Validados também no banco com `CHECK` (status, tipo, canal, quantidades ≥ 0, latitude/longitude) e índice único parcial para um único cliente balcão vivo por usuário | Defesa em profundidade contra dado corrompido |
| 8 | Atomicidade registro + fila não especificada | Cada caso de uso que escreve roda numa transação (`transacional(...)` no composition root) | RNF02: nunca registro sem fila, nem obra reservada sem pedido |
| 9 | Entidades criadas só por `criar`/`balcao`/`criarVendaDireta` | Novo método estático `reidratar(props)` nas 4 entidades (decisão D1, aprovada) | Reconstruir entidades lidas do banco sem reaplicar as regras de criação; valida só a estrutura (UUID, enums, datas, inteiros, `Coordenada`) |
| 10 | Dados de exemplo no runtime | Runtime inicia vazio; fixtures só nos testes | Concepção da fase 3 |
| 11 | Botão "Usar minha localização" ativo com GPS falso | Botão desabilitado com aviso; coordenadas só manuais | Nunca gravar a coordenada fixa do fake como se fosse real (Plano 5 reabilita) |

### Transação por caso de uso, e por que não `db.transaction(async …)`

No driver `drizzle-orm/expo-sqlite` a transação é **síncrona**: com callback `async`, ela faz `COMMIT` assim que o callback devolve a Promise, e as escritas depois do primeiro `await` ficam fora da transação, sem erro algum. No better-sqlite3 o mesmo código lança `Transaction function cannot return a promise`.

O `ExecutorDeTransacao` abre `BEGIN IMMEDIATE`, aguarda o trabalho assíncrono e faz `COMMIT` ou `ROLLBACK` na conexão única, serializando os trabalhos numa fila de Promises. O decorator `transacional` devolve um objeto com o mesmo protótipo do caso de uso (o `instanceof` continua valendo). Assim os contratos e os casos de uso não mudaram.

Limites conhecidos:
- Leituras fora do executor (ex.: `loadData` da UI) durante um trabalho podem ver dados ainda não confirmados. É inofensivo com usuário único e poucos dados.
- Um caso de uso decorado não pode chamar outro decorado (o executor não aceita aninhamento). Hoje `VendaDireta` instancia `ResolverClienteBalcao` direto, sem decorator.

### Sessão e carregamento dos dados

- `registrarSessao(sessao)` informa a sessão à bag SQLite. Sem sessão, `usuarioId` lança `SessaoNaoDisponivelError` e `loadData()` devolve listas vazias.
- O `DataProvider` recarrega a cada nova sessão e zera os dados no logout (nunca na montagem sem sessão). Uma falha de leitura do banco não é mais engolida: fica em `erro` e aparece num banner nas abas Pedidos, Estoque e Eventos.
- Falha ao abrir ou migrar o banco mostra uma tela de erro própria em vez de seguir sem dados.

### Testes

- Pirâmide do material: domínio sem mock (inclui `reidratar`), casos de uso com fakes, repositórios e executor com **SQLite real em memória** (`better-sqlite3` com as mesmas migrations, via `test-support/bancoDeTeste.ts`) e telas com RNTL.
- Cobertos: migrations (tabelas, índices, `CHECK`, idempotência), roundtrip campo a campo de cada repositório, preservação de `updated_at` no upsert, tombstone, isolamento por usuário, FKs, cliente balcão único, rollback do executor e atomicidade de ponta a ponta (com o `enqueue` do pedido falhando, a obra continua `DISPONIVEL`).
- Teste de arquitetura automatizado (`src/core/__tests__/Arquitetura.test.ts`): `core/` só importa caminhos relativos dentro de `core/`, sem `expo`, `react`, `react-native`, `drizzle-orm`, `better-sqlite3`, `@supabase/*` ou `uuid`; e `src/app/` não usa `makeFakeProviders`. Substitui o grep manual e vale para os próximos planos.
- Baseline ao fim do plano: 316 testes, `typecheck` limpo, `lint` com 0 erros (11 warnings herdados), `db:check` ok.

### Smoke test no aparelho (Expo Go, 27/10/2026)

Aprovado: login demo com abas vazias; criação de cliente, obra única, obra em série, pedido vinculado, venda direta e evento com coordenada manual; pedido movido para Fazendo e concluído; criação e edição em modo avião; dados persistidos após fechar e reabrir o app; cancelamento de pedido vinculado devolvendo a obra; rollback do executor confirmado no expo-sqlite real.

### Pendências para os próximos planos

- Câmera real e gravação da linha em `fotos` (Plano 2).
- Supabase, RLS e Auth real; os dados de desenvolvimento pertencem ao usuário falso `a1111111-…` e o banco deve ser zerado antes do Plano 4 (Plano 3).
- Envio da fila, pull por cursor e UI reativa via `addDatabaseChangeListener` (Plano 4).
- GPS real e mapa; reabilitar o botão das telas de evento (Plano 5).
