# Plano 1 — Persistência Local Real (SQLite + Drizzle)

> **Registro**: transcrição do Plano 1 concebido em conversa (fase 3, Fase 1 do roadmap de implantação).
> Status: plano aprovado na concepção — aguardando execução (branch `feat/fase3-plano1-sqlite` a partir de `main`).
> Plano 1 de uma série (ordem acordada): **1 SQLite → 2 câmera+imagens → 3 Supabase+auth → 4 sync → 5 fechamento**; GPS+mapa adiado até estudo do material de geolocalização. O plano operacional (com checkboxes de execução, se necessário) acompanha `docs/superpowers`;
> este arquivo é a referência registrada no repositório.

## Objetivo
Substituir as implementações in-memory dos 4 repositórios por SQLite (expo-sqlite + Drizzle), com fila outbox real (`fila_sync`), sem tocar em `domain/` (exceto adição aprovada `restaurar()`), sem mudar contratos, mantendo o app funcional no Expo Go com start vazio (sem seed).

## Arquitetura
- `domain/` e `application/` continuam 100% puros (zero import de SDK). Só `infrastructure/` e `main/` importam expo-sqlite/drizzle.
- Adição aprovada no domain (não é mudança de contrato): método estático `restaurar(props)` nas 4 entidades, para reidratação a partir das linhas do banco (padrão DDD de reidratação; aditivo, não altera `criar` nem comportamentos).
- Repositories SQLite implementam as interfaces existentes (`IPedidoRepository`, `IClienteRepository`, `IObraRepository`, `IEventoRepository`) sem alterá-las.
- `ISyncGateway` continua igual; nova implementação `OutboxSyncGateway` grava na tabela `fila_sync` (antes: `FakeSyncGateway`).
- Composition root: `makeSqliteProviders(db)` substitui `makeFakeProviders` apenas no runtime (`_layout.tsx`). Fakes permanecem como test doubles e nos testes de use case. `FakeAuthGateway` fica no runtime até o Plano 3 (login demo `artesao@email.com` / `123456`). `FakeLocationGateway` fica no runtime como exceção aceita (GPS adiado); botão GPS é desabilitado com aviso.
- `updated_at` (servidor), `foto_*_hash`, `foto_*_url`, `foto_*_status` são colunas **só-de-infraestrutura** (não existem nas entidades). Repositórios fazem upsert **omitindo** essas colunas no `set {}` do `onConflictDoUpdate` → SQLite preserva os valores atuais.
- Tombs (`deleted_at`) ficam nas linhas para sempre (RNF13); leituras de UI filtram `deleted_at IS NULL` (paridade com in-memory).

## Stack
- `expo-sqlite` (via `npx expo install`) + `drizzle-orm` (stable) + `drizzle-kit` (dev) + `better-sqlite3` (dev, testes em Node) + `babel-plugin-inline-import` (dev, para bundling de .sql no Metro).
- SDK 57 / React Native 0.86 / Expo Go.

## Spec
- `docs/ate-fase2.md` §3.3 (ER local), §10.1 (Fase 3 TDD) — DER local e fila outbox.
- `docs/ate-fase1.md` §3 — regras de negócio congeladas: foto de conclusão obrigatória (exceção UC27 venda direta), tombstones para sempre (RNF13), UUID v4 gerado na criação das entidades.
- Desvios aprovados na concepção: sem coluna `version`; LWW/pull/deltas ficam para o Plano 4; payload parcial de fila mantido como diagnóstico (worker do Plano 4 re-lê a linha completa).

## Restrições Globais (RNF)
1. `domain/` e `application/` sem import de SDK — verificar no fim com grep (Tarefa 12).
2. Nenhuma interface/repositório/gateway muda assinatura. Único aditivo domain: `restaurar()`.
3. Baseline por commit: `npm test` + `npx tsc --noEmit` + `npx expo lint` todos verdes.
4. Branch de trabalho: a partir de `main` (`feat/fase3-plano1-sqlite`). Nunca tocar em `demo-fase2`/`demo/fase2`.
5. Expo Go obrigatório funcionar; nada de módulo fora do Go (SQLCipher não; sqlite padrão sim).
6. Web (`react-native-web`) abandonado nesta fase — sem trabalho web; `DatePicker.web.tsx` fica inerte.
7. Banco: arquivo `ate.db` no diretório SQLite de app interno, `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`.
8. Runtime inicia vazio — sem seed; `seedFixtures` permanece só nos testes.

## Review Focus (modos de falha priorizados)
1. **Date/boolean/enum/roundtrip de tipos** entre entidade ↔ linha → testes de roundtrip por entidade (Tarefas 5–8) verificando cada campo, incluindo `obraId` null, `Date` de `dataEntrega`, `vendaDireta` booleano, `quantidadeObra` 0 vs 1 vs N, tombstone `deletedAt`.
2. **Upsert apagando colunas só-de-infra** (`updated_at`, `foto_*_hash/status/url`) → teste: grava hash direto por SQL, chama `save()` da entidade, hash/`updated_at` preservados (Tarefas 6/7).
3. **Tombstone** — invisível em leituras e persistente no banco → teste `findByUsuario`/`findById` exclui; linha continua na tabela com `deleted_at` setado (Tarefas 5–8).
4. **Deriva schema↔migration** → migration gerada por drizzle-kit é commitada e testada por introspecção `sqlite_master` + testes de dupla execução (Tarefa 2).
5. **Balcão** — paridade `findBalcaoByUsuario`/`saveBalcaoIfAbsent` com unique partial index; segundo balcão para o mesmo usuário deve ser impossível (Tarefa 5).

## Tarefa 1 — Instalação de dependências e spike de tooling (Drizzle + Metro)
Files: `package.json`, `babel.config.js` (novo), `metro.config.js` (novo), `drizzle.config.ts` (novo), `jest.config.js` (patch tolerância drizzle), `drizzle/` (gerado, commitado a partir da Tarefa 2).

Contratos afetados: nenhum (infra-only).

Passos:
1. Branch: `git checkout main && git pull && git checkout -b feat/fase3-plano1-sqlite`.
2. `npx expo install expo-sqlite` (versão compatível SDK 57).
3. `npm install drizzle-orm` (stable mais recente — não `@rc`); `npm install -D drizzle-kit better-sqlite3 @types/better-sqlite3 babel-plugin-inline-import`.
4. Criar `drizzle.config.ts`:
   ```ts
   import type { Config } from 'drizzle-kit';

   export default {
     schema: './src/infrastructure/database/sqlite/schema.ts',
     out: './drizzle',
     dialect: 'sqlite',
     driver: 'expo',
   } satisfies Config;
   ```
5. Criar `babel.config.js` (o projeto não tem; precisa manter preset do Expo):
   ```js
   module.exports = function (api) {
     api.cache(true);
     return {
       presets: ['babel-preset-expo'],
       plugins: [['inline-import', { extensions: ['.sql'] }]],
     };
   };
   ```
6. Criar `metro.config.js`:
   ```js
   const { getDefaultConfig } = require('@expo/metro-config');

   const config = getDefaultConfig(__dirname);
   config.resolver.sourceExts.push('sql');
   module.exports = config;
   ```
7. Script no `package.json` (junto aos demais): `"db:generate": "drizzle-kit generate"`.
8. Spike de validação (Node, sem app):
   - Criar `src/infrastructure/database/sqlite/schema.ts` **mínimo** contendo apenas a tabela `clientes` completa (com índices e unique parcial da Tarefa 2) — a Tarefa 2 adiciona as demais tabelas como segunda migration.
   - `npx drizzle-kit generate` → confirmar artefatos: `drizzle/0000_*.sql`, `drizzle/meta/_journal.json`, bundle `drizzle/migrations.js` (`ls drizzle/`). Se o bundle tiver outro nome/estrutura, corrigir o import futuro da Tarefa 11 e documentar no commit.
   - Teste `src/infrastructure/database/sqlite/__tests__/migrations.test.ts`:
     ```ts
     import Database from 'better-sqlite3';
     import { drizzle } from 'drizzle-orm/better-sqlite3';
     import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
     import path from 'path';

     import { clientes } from '../schema';

     it('aplica migrations e popula tabela clientes', () => {
       const sqlite = new Database(':memory:');
       const db = drizzle(sqlite);
       migrate(db, { migrationsFolder: path.resolve('drizzle') });

       const tabelas = db.$client.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
       expect(tabelas.map((t) => t.name)).toContain('clientes');

       void db.insert(clientes).values({
         id: 'x', usuarioId: 'u', nome: 'A', contato: 'b',
         statusSync: 'PENDENTE', criadoEmLocal: new Date().toISOString(),
         deletedAt: null, updatedAt: null,
       });
       const linha = db.$client.prepare('SELECT * FROM clientes').get();
       expect(linha).toMatchObject({ nome: 'A' });
     });

     it('aplicar migrations duas vezes é idempotente', () => {
       const sqlite = new Database(':memory:');
       const db = drizzle(sqlite);
       migrate(db, { migrationsFolder: path.resolve('drizzle') });
       expect(() => migrate(db, { migrationsFolder: path.resolve('drizzle') })).not.toThrow();
     });
     ```
     Nota: `path.resolve('drizzle')` funciona porque o jest roda da raiz do repo.
9. `npx jest migrations` → verde. `npm test` completo ainda verde (nada quebra). Commit: `feat(infra): toolchain drizzle+expo-sqlite e spike de migrations`

Troubleshooting: se jest reclamar de `drizzle-orm` (ESM import statement), replicar o patch do `uuid` no `jest.config.js`:
```js
transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
  pattern.replace('standard-navigation)', 'standard-navigation|uuid|drizzle-orm)'),
);
```

## Tarefa 2 — Schema completo + migration test
Files: `src/infrastructure/database/sqlite/schema.ts`, `drizzle/*` (regenerar e commitar), `src/infrastructure/database/sqlite/__tests__/migrations.test.ts` (ampliar).

**Teste primeiro** (expandir `migrations.test.ts`): introspecção de TODAS as tabelas/colunas/índices presentes e validação dos índices parciais/índices esperados; segunda execução idempotente.

Schema (`schema.ts`) — derivado de `docs/ate-fase2.md` §3.3; propriedades camelCase no drizzle, colunas SQL em snake_case:

```ts
import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Infra-only (não são propriedades da entidade): updated_at (servidor), foto_*_url/hash/status
// — preservadas por upsert omitindo-as no set() do onConflictDoUpdate.

export const clientes = sqliteTable('clientes', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull(),
  nome: text('nome').notNull(),
  contato: text('contato').notNull(),
  statusSync: text('status_sync').notNull(),
  criadoEmLocal: text('criado_em_local').notNull(),
  deletedAt: text('deleted_at'),
  updatedAt: text('updated_at'),
}, (t) => [
  index('idx_clientes_usuario').on(t.usuarioId),
  uniqueIndex('idx_cliente_balcao_unico')
    .on(t.usuarioId)
    .where(sql`deleted_at IS NULL AND nome = 'Cliente Avulso' AND contato = ''`),
]);

export const obras = sqliteTable('obras', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull(),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(),
  quantidade: integer('quantidade').notNull(),
  statusObra: text('status_obra').notNull(),
  fotoPath: text('foto_path'),
  fotoUrl: text('foto_url'),           // infra-only
  fotoHash: text('foto_hash'),         // infra-only
  fotoStatus: text('foto_status'),     // infra-only
  statusSync: text('status_sync').notNull(),
  criadoEmLocal: text('criado_em_local').notNull(),
  deletedAt: text('deleted_at'),
  updatedAt: text('updated_at'),
}, (t) => [index('idx_obras_usuario').on(t.usuarioId)]);

export const pedidos = sqliteTable('pedidos', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull(),
  clienteId: text('cliente_id').notNull().references(() => clientes.id),
  obraId: text('obra_id').references(() => obras.id),
  descricao: text('descricao').notNull(),
  canalOrigem: text('canal_origem').notNull(),
  dataEntrega: text('data_entrega').notNull(),
  status: text('status').notNull(),
  fotoConclusaoPath: text('foto_conclusao_path'),
  fotoConclusaoUrl: text('foto_conclusao_url'),   // infra-only
  fotoConclusaoHash: text('foto_conclusao_hash'), // infra-only
  fotoConclusaoStatus: text('foto_conclusao_status'), // infra-only
  vendaDireta: integer('venda_direta', { mode: 'boolean' }).notNull(),
  quantidadeObra: integer('quantidade_obra').notNull(),
  statusSync: text('status_sync').notNull(),
  criadoEmLocal: text('criado_em_local').notNull(),
  deletedAt: text('deleted_at'),
  updatedAt: text('updated_at'),
}, (t) => [index('idx_pedidos_usuario_status').on(t.usuarioId, t.status)]);

export const eventos = sqliteTable('eventos', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull(),
  nome: text('nome').notNull(),
  data: text('data').notNull(),
  endereco: text('endereco').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  observacoes: text('observacoes').notNull().default(''),
  statusSync: text('status_sync').notNull(),
  criadoEmLocal: text('criado_em_local').notNull(),
  deletedAt: text('deleted_at'),
  updatedAt: text('updated_at'),
}, (t) => [index('idx_eventos_usuario').on(t.usuarioId)]);

export const filaSync = sqliteTable('fila_sync', {
  id: text('id').primaryKey(),
  tipoOperacao: text('tipo_operacao').notNull(),
  entidade: text('entidade').notNull(),
  entidadeId: text('entidade_id').notNull(),
  payload: text('payload').notNull(),
  status: text('status').notNull().default('PENDENTE'),
  tentativas: integer('tentativas').notNull().default(0),
  erro: text('erro'),
  criadoEmLocal: text('criado_em_local').notNull(),
}, (t) => [index('idx_fila_sync_status').on(t.status, t.criadoEmLocal)]);
```

Notas de schema:
- Datas/datetime como `text` ISO-8601 (debug-friendly e converte direto para Supabase `timestamptz` no Plano 4).
- `usuario_id` sem FK (tabela de usuários não vive localmente); FKs reais: `pedidos.cliente_id → clientes.id`, `pedidos.obra_id → obras.id` (nullable).
- `quantidade_obra` mantém 0 quando sem obra (entidade atual), 1 quando vinculada, N em venda direta de SÉRIE.
- Partial unique index do balcão encaixa a garantia `saveBalcaoIfAbsent`.

Passos:
1. Escrever/ampliar teste de introspecção antes de rodar generate; vermelho.
2. Criar `src/infrastructure/database/sqlite/DrizzleDb.ts` (type-only module — SEM runtime import de expo):
   ```ts
   import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
   import type { schema } from './schema';

   /**
    * Tipagem única para os repositórios SQLite. Uso no app com driver expo;
    * nos testes, better-sqlite3 produz a mesma API de query-builder em runtime
    * (cast único no helper bancoDeTeste — documentado lá).
    */
   export type DrizzleAppDb = ExpoSQLiteDatabase<typeof schema>;
   ```
   e `src/infrastructure/database/sqlite/index.ts` (agregador):
   ```ts
   export { clientes, eventos, filaSync, obras, pedidos, schema } from './schema';
   ```
   Com `export const schema = { clientes, obras, pedidos, eventos, filaSync };` no final de `schema.ts`.
3. `npm run db:generate`; ler o SQL gerado; verificar `idx_cliente_balcao_unico` presente com `CREATE UNIQUE INDEX ... WHERE`; vermelho→verde.
4. Commit: `feat(infra): schema sqlite completo + migrations de clientes/obras/pedidos/eventos/fila_sync`

## Tarefa 3 — `restaurar()` nas entidades (aditivo ao domain)
Files: `src/core/domain/entities/{Pedido,Cliente,Obra,Evento}.ts` + `src/core/domain/__tests__/Rehidratacao.test.ts` (novo).

**Teste primeiro** (`Rehidratacao.test.ts`), para cada entidade:
- `restaurar(props válidos)` retorna entidade com TODOS os getters iguais (exatamente os props passados, inclusive `deletedAt` não-nulo, `status`/`statusSync` variados, `quantidadeObra` 0/1/N).
- `restaurar` aceita estado que seria inválido para `criar` (ex.: `FAZENDO` → `FAZENDO`, dado que veio do banco) sem errar.
- Invalidações estruturais: id/usuarioId não-UUID → `*InvalidoError`; enum fora do conjunto (cast via `as`) `StatusPedido/CanalOrigem/StatusObra/TipoObra/StatusSync` → `*InvalidoError`; `Date` inválida → `*InvalidoError`; `quantidade` não-inteira → `*InvalidoError`; `Coordenada` inválida (latitude 91) → `CoordenadaInvalidaError` (no Evento, reutilizando o próprio VO).
- `restaurar` não muta o objeto original de props (cópia defensiva como no construtor privado: `data: new Date(props.data.getTime())`).

Implementação exata por entidade (mesmo caminho que construtor privado já segue):

```ts
// Pedido.ts — acrescentar após criarVendaDireta
static restaurar(props: PedidoProps): Pedido {
  Pedido.validarEstrutura(props);
  return new Pedido({ ...props, dataEntrega: new Date(props.dataEntrega.getTime()) });
}

private static validarEstrutura(p: PedidoProps): void {
  if (!isUuidV4(p.id) || !isUuidV4(p.usuarioId) || !isUuidV4(p.clienteId)) {
    throw new PedidoInvalidoError('restaurar() exige ids UUID v4');
  }
  if (p.obraId && !isUuidV4(p.obraId)) throw new PedidoInvalidoError('obraId deve ser UUID v4');
  if (!CANAIS_ORIGEM.includes(p.canalOrigem)) throw new PedidoInvalidoError('canalOrigem inválido');
  if (!STATUS_PEDIDO.includes(p.status)) throw new PedidoInvalidoError('status inválido');
  if (!STATUS_SYNC.includes(p.statusSync)) throw new PedidoInvalidoError('statusSync inválido');
  assertDataValida(p.dataEntrega);
  if (!(p.criadoEmLocal instanceof Date) || Number.isNaN(p.criadoEmLocal.getTime())) {
    throw new PedidoInvalidoError('criadoEmLocal inválida');
  }
  if (!Number.isInteger(p.quantidadeObra) || p.quantidadeObra < 0) {
    throw new PedidoInvalidoError('quantidadeObra deve ser inteiro >= 0');
  }
  if (typeof p.vendaDireta !== 'boolean') throw new PedidoInvalidoError('vendaDireta inválida');
}
```
Precisa criar em `src/core/domain/enums/` os arrays de valores dos enums onde não existem (só `CanalOrigem` já tem `CANAIS_ORIGEM`; adicionar `STATUS_PEDIDO`, `STATUS_SYNC`, `STATUS_OBRA`, `TIPO_OBRA` como `const` arrays exportados — aditivo puro, sem mudar os types). Reusar nas restantes:
- `Cliente`: validarEstrutura com ids uuid + strings `nome`/`contato` (sem re-trim/revalidar regra de negócio — dados já validados na criação), `statusSync` no conjunto e `criadoEmLocal` Date válida.
- `Obra`: ids uuid + `statusObra`/`tipo`/`statusSync` no conjunto + `quantidade` inteiro ≥ 0 + Dates válidas; `fotoPath` string|null.
- `Evento`: como Cliente + Dates válidas (`data`/`criadoEmLocal`) + `localizacao` validado por `Coordenada.validar(lat, lon)` e re-instanciado (`new Coordenada(...)`) na cópia — mantém imutabilidade do VO.

Commit: `feat(domain): reidratação restaurar() nas entidades (aditivo puro, sem SDKs)`

## Tarefa 4 — OutboxSyncGateway real (fila_sync)
Files: `src/infrastructure/sync/OutboxSyncGateway.ts` (novo, pasta `src/infrastructure/sync/`), `src/infrastructure/sync/__tests__/OutboxSyncGateway.test.ts` (novo).

Contrato inalterado:
```ts
enqueue(tipo: TipoOperacao, entidade: string, entidadeId: string, payload: string): Promise<void>;
```
Construtor: `new OutboxSyncGateway(db: DrizzleAppDb, ids: IIdGenerator)`.

Implementação:
```ts
import type { IIdGenerator } from '../../core/application/gateways/IIdGenerator';
import type { ISyncGateway } from '../../core/application/gateways/ISyncGateway';
import type { TipoOperacao } from '../../core/domain/enums/TipoOperacao';
import type { DrizzleAppDb } from '../database/sqlite/DrizzleDb';
import { filaSync } from '../database/sqlite/schema';

export class OutboxSyncGateway implements ISyncGateway {
  constructor(
    private readonly db: DrizzleAppDb,
    private readonly geradorId: IIdGenerator,
  ) {}

  async enqueue(tipo: TipoOperacao, entidade: string, entidadeId: string, payload: string): Promise<void> {
    await this.db.insert(filaSync).values({
      id: this.geradorId.gerar(),
      tipoOperacao: tipo,
      entidade,
      entidadeId,
      payload,
      status: 'PENDENTE',
      tentativas: 0,
      criadoEmLocal: new Date().toISOString(),
    });
  }
}
```
Testes:
1. enqueue grava linha com campos corretos e `status = 'PENDENTE'`, `tentativas = 0`, `erro = null`.
2. payload verbatim (string que entra é a que fica gravada, JSON intacta).
3. Dois enqueues para a mesma entidade → duas linhas (coalescing fica para o worker do Plano 4).
Setup helper (novo arquivo `src/infrastructure/database/sqlite/__tests__/bancoDeTeste.ts`):

```ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

import type { DrizzleAppDb } from '../DrizzleDb';
import { schema } from '../index';

export function bancoDeTeste(): DrizzleAppDb {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve('drizzle') });
  // Cast somente de driver: better-sqlite3 é sync, expo é async; a API de query-builder é idêntica em runtime.
  return db as unknown as DrizzleAppDb;
}
```

Commit: `feat(infra): OutboxSyncGateway grava fila_sync real`

## Tarefa 5 — SQLiteClienteRepository
Files: `src/infrastructure/database/sqlite/SQLiteClienteRepository.ts`, `src/infrastructure/database/sqlite/__tests__/SQLiteClienteRepository.test.ts`.

Contrato igual: `save/findById/findByUsuario/findBalcaoByUsuario/saveBalcaoIfAbsent`.

**Teste primeiro:**
1. `save` + `findById` roundtrip — todos os getters idênticos (nome, contato, usuarioId, statusSync, criadoEmLocal Date, deletedAt null).
2. Update: `save` em id existente → substitui valores (upsert), mantém `updated_at`/foto hash (não se aplicam em cliente — aqui só updated_at: grava direto por SQL `UPDATE clientes SET updated_at = '2026-01-01T00:00:00Z'`, depois save por entidade e assert updated_at preservado).
3. `findById` de cliente com tomb (`deletedAt`) → null.
4. `findByUsuario` — só do usuário, exclui tomb; ignora outros usuários.
5. `findBalcaoByUsuario` — retorna o cliente `nome='Cliente Avulso', contato=''` do usuário; null se o usuário não tem; tomb não conta.
6. `saveBalcaoIfAbsent`: primeiro salva + `created=true`; segunda chamada para o mesmo usuário com id DIFERENTE → retorna a existente + `created=false` (sem segunda linha no banco), o id retornado é o original.
7. Unique parcial: `save()` de segundo balcão para mesmo usuário lança (SQLite error) — atenção: o use case chama `saveBalcaoIfAbsent` (nunca `save()` direto para balcão), logo o throw só sinaliza erro de programação.
8. Linha persiste `deleted_at` ISO na tabela mesmo após delete lógico (save de cliente após `marcarRemovido()`; assert `deleted_at` não-nulo no SQL e `findByUsuario` vazio).

Implementação (esqueleto estrutural que as outras entidades seguem, mapeando camelCase↔_snake):

```ts
import type { IClienteRepository } from '../../core/application/repositories/IClienteRepository';
import type { Cliente } from '../../core/domain/entities/Cliente';
import type { DrizzleAppDb } from './DrizzleDb';
import { clientes } from './schema';

export class SQLiteClienteRepository implements IClienteRepository {
  constructor(private readonly db: DrizzleAppDb) {}

  async save(cliente: Cliente): Promise<void> {
    await this.db.insert(clientes).values({
      id: cliente.id,
      usuarioId: cliente.usuarioId,
      nome: cliente.nome,
      contato: cliente.contato,
      statusSync: cliente.statusSync,
      criadoEmLocal: cliente.criadoEmLocal.toISOString(),
      deletedAt: cliente.deletedAt?.toISOString() ?? null,
      // updated_at/foto_url/hash/status OMITIDOS de propósito — preserva valores atuais no upsert
    }).onConflictDoUpdate({
      target: clientes.id,
      set: {
        nome: cliente.nome,
        contato: cliente.contato,
        statusSync: cliente.statusSync,
        deletedAt: cliente.deletedAt?.toISOString() ?? null,
        // updated_at omitido de propósito — preserva
      },
    });
  }

  private paraEntidade(r: typeof clientes.$inferSelect): Cliente {
    return Cliente.restaurar({
      id: r.id,
      usuarioId: r.usuarioId,
      nome: r.nome,
      contato: r.contato,
      statusSync: r.statusSync as StatusSync,
      criadoEmLocal: new Date(r.criadoEmLocal),
      deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
    });
  }

  async findById(id: string): Promise<Cliente | null> {
    const [r] = await this.db.select().from(clientes).where(eq(clientes.id, id));
    return r ? this.paraEntidade(r) : null;
  }

  async findByUsuario(usuarioId: string): Promise<Cliente[]> {
    const rs = await this.db.select().from(clientes)
      .where(and(eq(clientes.usuarioId, usuarioId), isNull(clientes.deletedAt)))
      .orderBy(clientes.criadoEmLocal);
    return rs.map((r) => this.paraEntidade(r));
  }

  async findBalcaoByUsuario(usuarioId: string): Promise<Cliente | null> {
    const [r] = await this.db.select().from(clientes).where(and(
      eq(clientes.usuarioId, usuarioId),
      eq(clientes.nome, 'Cliente Avulso'),
      eq(clientes.contato, ''),
      isNull(clientes.deletedAt),
    )).limit(1);
    return r ? this.paraEntidade(r) : null;
  }

  async saveBalcaoIfAbsent(cliente: Cliente): Promise<{ cliente: Cliente; created: boolean }> {
    const balcao = await this.findBalcaoByUsuario(cliente.usuarioId);
    if (balcao) return { cliente: balcao, created: false };
    await this.save(cliente);
    return { cliente, created: true };
  }
}
```
Ajustes que DEVEM aparecer: imports `eq/and/isNull` de `drizzle-orm`; order by `criadoEmLocal`: SQLite ordena ISO strings lexicograficamente (ISO ok).

Commit: `feat(infra): SQLiteClienteRepository com upsert e semântica balcão`

## Tarefa 6 — SQLitePedidoRepository
Files: `src/infrastructure/database/sqlite/SQLitePedidoRepository.ts`, `__tests__/SQLitePedidoRepository.test.ts`.

Contrato: `save/findById/findByUsuario/findByStatus(usuarioId, status)`.

**Teste primeiro:**
1. Roundtrip completo cada campo: descricao, canalOrigem, dataEntrega Date, status, fotoConclusaoPath (null e não-null), vendaDireta true/false, quantidadeObra 0/1/n, statusSync, criadoEmLocal, deletedAt, obraId null/vinculado.
2. `criar()` (A_FAZER → PENDENTE) → `save` → `findById` → `moverParaFazendo()` → `save` → assert persista FAZENDO + statusSync PENDENTE.
3. `concluir(pathFake)` → save → foto_conclusao_path persiste.
4. Infra-preserve: `UPDATE pedidos SET updated_at='2026-01-01T00:00:00Z', foto_conclusao_hash='abc', foto_conclusao_status='AGUARDANDO_UPLOAD', foto_conclusao_url='https://x'` → `save(entidade)` → as quatro preservadas (upsert NÃO toca).
5. Delete lógico: `cancelar()` → save → `findByUsuario`/`findByStatus` não trazem; SQL `deleted_at` não-nulo na linha; `findById` null.
6. findByStatus filtra status EXATO + usuário.
7. FK: save de pedido com clienteId inexistente → SQLite error (FK enforcement ON) — usar o helper `bancoDeTeste()` (Tarefa 4), que já abre com `PRAGMA foreign_keys = ON`.

Implementação espelha a do Cliente; mapeamento extra:
- `vendaDireta: pedido.vendaDireta` (drizzle mode boolean ↔ SQLite 1/0).
- `obraId: pedido.obraId` (null ok).
- `dataEntrega: pedido.dataEntrega.toISOString()` / `new Date(r.dataEntrega)` no paraEntidade.
- FKs para obras/clientes conforme schema.

Commit: `feat(infra): SQLitePedidoRepository com roundtrip e preservação de updated_at/foto_*`

## Tarefa 7 — SQLiteObraRepository
Files: análogo à Tarefa 6. Contrato: `save/findById/findByUsuario`.
Testes: roundtrip incl. `tipo`, `quantidade`, `statusObra`, `fotoPath` null/não-null, `statusSync`, tomb; infra-preserve de `updated_at`, `foto_hash`, `foto_status`, `foto_url` (grava direto por SQL, depois `save()` e assert presença); `findByUsuario` exclui tomb.
Commit: `feat(infra): SQLiteObraRepository`

## Tarefa 8 — SQLiteEventoRepository
Files: análogo. Contrato: `save/findById/findByUsuario`.
Testes: roundtrip de `Coordenada` (latitude/longitude reais — `-23.5505, -46.6333`), `data`, `observacoes` (string vazia e com texto), status/tomb.
Commit: `feat(infra): SQLiteEventoRepository`

## Tarefa 9 — Desabilitar GPS nos formulários de evento (decisão de concepção: GPS adiado)
Files: `src/app/evento/novo.tsx`, `src/app/evento/[id]/editar.tsx`.

Contrato igual: `ILocationGateway.getCurrent()` continua definido, mas passa a **não ser chamado** na UI nesta fase. O fake continua injetado na bag.

Passos (por arquivo):
- Trocar botão "Usar GPS" por botão **disabled** que, ao tocar (ou como texto de apoio), mostra `Alert.alert('GPS indisponível nesta fase', 'A localização em mapa chega em breve. Informe as coordenadas manualmente.')` — não invocar `services.gateways.location.getCurrent()`. Se o código atual chama, remover a chamada (o gateway segue injetado na bag, só sem uso).
- Manter as coordenadas manuais funcionando.
- `npx expo lint` + `npx tsc --noEmit` + `npm test` verde.
Commit: `feat(presentation): botões GPS desabilitados — GPS adiado na fase 3`

## Tarefa 10 — Artifact ProviderBag + makeSqliteProviders + wiring de sessão
Files: `src/main/factories/ProviderBag.ts` (novo), `src/main/factories/makeFakeProviders.ts` (ajuste leve de tipagem), `src/main/factories/makeSqliteProviders.ts` (novo), `src/presentation/hooks/AppProviders.tsx` (ajuste leve), `src/main/factories/__tests__/makeSqliteProviders.test.ts` (novo).

`ProviderBag.ts` — módulo **apenas de tipos** (type-only):
```ts
import type { AuthSession, IAuthGateway } from '../../core/application/gateways/IAuthGateway';
import type { ICameraGateway } from '../../core/application/gateways/ICameraGateway';
import type { ILocationGateway } from '../../core/application/gateways/ILocationGateway';
import type { ISyncGateway } from '../../core/application/gateways/ISyncGateway';
import type { IClienteRepository } from '../../core/application/repositories/IClienteRepository';
import type { IEventoRepository } from '../../core/application/repositories/IEventoRepository';
import type { IObraRepository } from '../../core/application/repositories/IObraRepository';
import type { IPedidoRepository } from '../../core/application/repositories/IPedidoRepository';
import type { Cliente } from '../../core/domain/entities/Cliente';
import type { Evento } from '../../core/domain/entities/Evento';
import type { Obra } from '../../core/domain/entities/Obra';
import type { Pedido } from '../../core/domain/entities/Pedido';
import type { LoginUseCase } from '../../core/application/usecases/LoginUseCase';
/* importar os outros 18 use cases da mesma pasta (assim como já faz makeFakeProviders) */

export type DadosCarregados = {
  pedidos: Pedido[];
  obras: Obra[];
  eventos: Evento[];
  clientes: Cliente[];
};

export interface ProviderBag {
  /** Registrada pelo AuthProvider quando a sessão muda (login/logout/getSession). */
  registrarSessao?(sessao: AuthSession | null): void;
  gateways: {
    auth: IAuthGateway;
    camera: ICameraGateway;
    location: ILocationGateway;
    sync: ISyncGateway;
  };
  repositories: {
    clientes: IClienteRepository;
    pedidos: IPedidoRepository;
    obras: IObraRepository;
    eventos: IEventoRepository;
  };
  useCases: {
    login: LoginUseCase;
    logout: LogoutUseCase;
    consultarPedidos: ConsultarPedidosUseCase;
    iniciarProducao: IniciarProducaoUseCase;
    concluirPedido: ConcluirPedidoUseCase;
    cancelarPedido: CancelarPedidoUseCase;
    cadastrarPedido: CadastrarPedidoUseCase;
    editarPedido: EditarPedidoUseCase;
    cadastrarCliente: CadastrarClienteUseCase;
    editarCliente: EditarClienteUseCase;
    consultarEstoque: ConsultarEstoqueUseCase;
    cadastrarObra: CadastrarObraUseCase;
    adicionarUnidades: AdicionarUnidadesUseCase;
    removerUnidades: RemoverUnidadesUseCase;
    removerObra: RemoverObraUseCase;
    vendaDireta: VendaDiretaUseCase;
    listarEventos: ListarEventosUseCase;
    cadastrarEvento: CadastrarEventoUseCase;
    editarEvento: EditarEventoUseCase;
    removerEvento: RemoverEventoUseCase;
  };
  /** userId dinâmico: getter que aponta para a sessão corrente (registrada via registrarSessao). Telas só acessam pós-login (guards de rota). */
  readonly usuarioId: string;
  loadData(): Promise<DadosCarregados>;
  /** seed opcional (apenas fakes): arrays iniciais para render sem reload; ausente no runtime SQLite */
  readonly pedidos?: Pedido[];
  readonly obras?: Obra[];
  readonly eventos?: Evento[];
  readonly clientes?: Cliente[];
}
```

`makeFakeProviders.ts` — só o final muda (mantém implementação): tipar retorno como `ProviderBag` + manter alias de compat (testes antigos continuam compilando):
```ts
export function makeFakeProviders(): ProviderBag { /* corpo idem atual */ }
export type FakeProviderBag = ProviderBag;
```
(`makeFakeProviders` mantém `FakeProviders.harness` e qualquer uso externo — testes não mudam.)

`makeSqliteProviders.ts`:
```ts
import { AdicionarUnidadesUseCase } from '../../core/application/usecases/AdicionarUnidadesUseCase';
/* ... mesmos imports de use cases do makeFakeProviders (sem os InMemory) ... */
import type { AuthSession } from '../../core/application/gateways/IAuthGateway';
import { FakeCameraGateway } from '../../infrastructure/device/FakeCameraGateway';
import { SQLiteClienteRepository } from '../../infrastructure/database/sqlite/SQLiteClienteRepository';
import { SQLiteEventoRepository } from '../../infrastructure/database/sqlite/SQLiteEventoRepository';
import { SQLiteObraRepository } from '../../infrastructure/database/sqlite/SQLiteObraRepository';
import { SQLitePedidoRepository } from '../../infrastructure/database/sqlite/SQLitePedidoRepository';
import { FakeAuthGateway } from '../../infrastructure/device/FakeAuthGateway';
import { FakeLocationGateway } from '../../infrastructure/device/FakeLocationGateway';
import { OutboxSyncGateway } from '../../infrastructure/sync/OutboxSyncGateway';
import type { DrizzleAppDb } from '../../infrastructure/database/sqlite/DrizzleDb';
import type { ProviderBag } from './ProviderBag';
import { UuidIdGenerator } from '../../infrastructure/device/UuidIdGenerator';

export class SessaoNaoDisponivelError extends Error {}

export function makeSqliteProviders(db: DrizzleAppDb): ProviderBag {
  const ids = new UuidIdGenerator();
  const clientes = new SQLiteClienteRepository(db);
  const pedidos = new SQLitePedidoRepository(db);
  const obras = new SQLiteObraRepository(db);
  const eventos = new SQLiteEventoRepository(db);
  const auth = new FakeAuthGateway();
  const camera = new FakeCameraGateway();
  const location = new FakeLocationGateway();
  const sync = new OutboxSyncGateway(db, ids);

  let sessao: AuthSession | null = null;

  const useCases = { /* os mesmos 20 use cases do makeFakeProviders, trocando repos in-memory → SQLite e FakeSyncGateway → OutboxSyncGateway */ };

  return {
    gateways: { auth, camera, location, sync },
    repositories: { clientes, pedidos, obras, eventos },
    useCases,
    registrarSessao(nova) { sessao = nova; },
    get usuarioId(): string {
      if (!sessao) throw new SessaoNaoDisponivelError('Usuario logado requerido — chamar registrarSessao');
      return sessao.userId;
    },
    async loadData() {
      if (!sessao) return { pedidos: [], obras: [], eventos: [], clientes: [] };
      const [ps, os, es, cs] = await Promise.all([
        useCases.consultarPedidos.execute({ usuarioId: sessao.userId }),
        useCases.consultarEstoque.execute({ usuarioId: sessao.userId }),
        useCases.listarEventos.execute({ usuarioId: sessao.userId }),
        clientes.findByUsuario(sessao.userId),
      ]);
      return { pedidos: ps, obras: os, eventos: es, clientes: cs };
    },
  };
}
```
(A assinatura do `useCases` segue idêntica à do `makeFakeProviders` — todos os 20 use cases, trocando os repositórios in-memory pelos SQLite e o `FakeSyncGateway` pelo `OutboxSyncGateway`. O `FakeCameraGateway` do device continua no runtime até o Plano 2.)

`AppProviders.tsx` — 3 mudanças cirúrgicas:
1. Trocar import de tipo: `import type { ProviderBag } from '@/main/factories/ProviderBag';` (ajustar caminho relativo) e usar `ProviderBag` em AuthProvider/DataProvider/AppProviders/ServicesContext/useServices.
2. `AuthProvider.login/getSession` — após definir sessão, chamar `providers.registrarSessao?.(next)`; logout chama `providers.registrarSessao?.(null)` ANTES do setSession.
3. `DataProvider` passa a usar `useAuth()` para reset de dados quando sessão muda:
```tsx
export function DataProvider({ providers, children }: React.PropsWithChildren<{ providers: ProviderBag }>) {
  const { session } = useAuth();
  const [data, setData] = useState(() => ({
    pedidos: providers.pedidos ?? [],
    obras: providers.obras ?? [],
    eventos: providers.eventos ?? [],
    clientes: providers.clientes ?? [],
  }));

  useEffect(() => {
    if (!session) {
      setData({ pedidos: [], obras: [], eventos: [], clientes: [] });
      return;
    }
    let vivo = true;
    providers.loadData().then((dados) => { if (vivo) setData(dados); }).catch(() => {});
    return () => { vivo = false; };
  }, [providers, session]);

  async function reload(): Promise<void> {
    setData(await providers.loadData());
  }

  return <DataContext.Provider value={{ ...data, reload }}>{children}</DataContext.Provider>;
}
```
Nota: o reset manual do `reload()` fica igual (somente chamada explícita), o effect reflete mudança de login.

`makeSqliteProviders.test.ts` (integração, better-sqlite3):
1. `bancoDeTeste()` (helper da Tarefa 4) → `const bag = makeSqliteProviders(db)`;
2. `bag.registrarSessao({ userId: USER_ID_FIXO, token: 'x' })` (`USER_ID_FIXO` = qualquer UUID v4 de teste no arquivo, ex. `'a1111111-1111-4111-8111-111111111111'`);
3. cadastrar cliente via `bag.useCases.cadastrarCliente.execute({ usuarioId: bag.usuarioId, nome: 'João', canalOrigem: 'WHATSAPP', ... })` — copiar assinatura real do use case (ler arquivo ao implementar);
4. `bag.loadData()` → cliente presente, 1 linha em `fila_sync` com `entidade='CLIENTE'`;
5. `bag.usuarioId` sem sessão lança `SessaoNaoDisponivelError`;
6. via raw SQL: `UPDATE clientes SET updated_at = '2026-01-01T00:00:00Z' WHERE ...` → `bag.loadData()` → a linha lida continua com `updated_at` preservado (repo não sobrescreve colunas só-de-infra em reads; e um novo `save()` da mesma entidade também não apaga o `updated_at`).

Confirmar contratos dos use cases acima (ler arquivos de use case ao implementar — copiar os nomes de parâmetros reais dos arquivos; a assinatura do useCases ficou oculta no esqueleto porque é idêntica à já existente no makeFakeProviders).

Commit: `feat(main): makeSqliteProviders e ProviderBag neutro (wiring sessão → getter usuarioId)`

## Tarefa 11 — Bootstrap real no `_layout.tsx` (openDatabaseSync + useMigrations + provider real)
Files: `src/app/_layout.tsx`, `src/main/database/openAppDatabase.ts` (novo opcional).

Seguindo a documentação do Drizzle para Expo (`useMigrations(db, migrations)` hook). Código proposto:

```tsx
import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../../drizzle/migrations'; // bundle do drizzle-kit (ajustar caminho conforme Tarefa 1, passo 8)
import { makeSqliteProviders } from '@/main/factories/makeSqliteProviders';

export default function RootLayout() {
  const [sqlite] = useState(() => {
    const bd = openDatabaseSync('ate.db');
    bd.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    return bd;
  });
  const [db] = useState(() => drizzle(sqlite, { schema })); // schema p/ tipagem
  const { success, error } = useMigrations(db, migrations);
  const [providers] = useState(() => makeSqliteProviders(db));

  if (error) {
    return <Text style={{}}>Não foi possível abrir o banco local. Reinstale o aplicativo.</Text>; // estilizar com o tema do projeto
  }
  if (!success) {
    return <ActivityIndicator style={{}} />; // splash/loading mínimo
  }
  return (
    <FontLoader>
      <AppProviders providers={providers}><RootNavigator /></AppProviders>
    </FontLoader>
  );
}
```
Notas:
- O import de `makeFakeProviders` sai de `_layout.tsx` (entra o `makeSqliteProviders`).
- `drizzle(sqlite, { schema })` — importar `schema` de `@/infrastructure/database/sqlite/index` (re-export da Tarefa 2).
- `openDatabaseSync` e `execSync` de PRAGMA precisam estar no `useState` initializer (roda uma vez por montagem).
- Estilizar loading/erro com o tema do projeto (`useDesignTheme`/`textStyles`) — não usar estilo hardcoded fora do tema.

Smoke test Expo Go (checklist manual):
1. `npx expo start` + abrir no Expo Go (emulador Android ou dispositivo).
2. Login: `artesao@email.com` / `123456` (FakeAuthGateway ainda).
3. Abas/Kanban aparecem VAZIOS — runtime inicia sem seed.
4. Criar: cliente, obra, pedido (vinculado), evento com coordenada manual.
5. Concluir pedido: câmera fake gera fotoPath e avança para FEITO (FakeCameraGateway entra na bag agora).
6. Forçar fechamento do app (fechar dos recentes), reabrir → dados persistem; login demo de novo; dados aparecem.
7. Contagem de `fila_sync` == quantidade de entidades criadas (Shift+M no devtools → SQLite inspector → `SELECT * FROM fila_sync;`).
8. Ainda no app: alterar `dataEntrega` de um pedido via editar → reabrir e confirmar que persistiu.

Commit: `feat(app): bootstrap sqlite real (openDatabaseSync+useMigrations) e provider sqlite no runtime`

## Tarefa 12 — Verificação de conformidade e fechamento
1. `npm test` completo verde (todos os testes antigos incl. fakes/provider bag continuam).
2. `npx tsc --noEmit` verde.
3. `npx expo lint` verde.
4. Grep de conformidade: `grep -rn "from 'expo" src/core/` (deve ser vazia) e `grep -rn "from 'expo" src/core/application` vazia; idem `react-native`, `better-sqlite3` na infra de domain/application.
5. Grep anti-fake no runtime: `grep -rn "makeFakeProviders" src/` deve aparecer APENAS em arquivos de teste/factories (nunca em `_layout.tsx`).
6. `git status` limpo, lockfile commitado (`package-lock.json` com as dependências novas).
7. Reportar divergências código↔docs encontradas durante a execução (ex.: payload parcial de fila da fase 1, que fica como diagnóstico até o Plano 4).

## Revisão do plano (conformidade verificada por esta escrita)
- Contratos: nenhuma interface alterada (IPedidoRepository/IClienteRepository/IObraRepository/IEventoRepository/AUTH/etc. intocados; novidade = `restaurar()` static nas entidades aprovada na concepção).
- `domain/` e `application/` nas tarefas 3/10: **nada de SDK** (só arrays de enums puros e reidratação pura).
- RNF13: tombs preservados nas linhas para sempre (sem hard delete).
- Guardas anti-regressão: baseline rodando por tarefa.
- Expo Go: tudo dentro (expo-sqlite, better-sqlite3 só-em-teste/bundler, inline-import plugin no dev-bundle do Metro).
- Payload parcial de fila: mantido como está (divergência conhecida, fica como diagnóstico); o worker do Plano 4 re-lê a linha completa.
- FakeLocationGateway ficou no runtime (exceção acordada); botões GPS desabilitados (Tarefa 9).
- FakeAuthGateway permanece no runtime (Plano 3 troca); login demo segue funcionando.

## Ordem de execução e checkpoints
- Executar em ordem Tarefa 1 → 12, commit por tarefa, rodando o baseline (`npm test`, `npx tsc --noEmit`, `npx expo lint`) ao fim de cada uma.
- Tarefas 5–8 são independentes entre si, desde que a Tarefa 4 (Outbox) e o `DrizzleAppDb` (Tarefa 2) estejam prontos; ordem linear é a recomendada.
- Plano 2 (câmera + pipeline de imagens) vem depois e pode reutilizar `bancoDeTeste()`, `restaurar()` e as colunas `foto_*` já prontas.
