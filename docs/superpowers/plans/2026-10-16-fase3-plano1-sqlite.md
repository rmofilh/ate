# Plano 1 — Persistência Local Real (SQLite + Drizzle)

> **Revisão 2 (27/10/2026)** — substitui a versão de 16/10. Mudanças principais: atomicidade registro + fila por transação, tipo comum dos drivers (sem cast), schema com `CHECK`, tabela `fotos` (padrão do material), `sync_meta` e campos de retentativa, correção do teste da Tarefa 1, tipagem da `ProviderBag` sem quebrar os testes atuais, teste automatizado de arquitetura e registro de decisões em `docs/ate-fase3.md`.
> Trechos marcados como **[validado]** foram executados num clone do repositório (Expo SDK 57, Node 22): `drizzle-kit generate`, testes com better-sqlite3 no Jest e `npx expo export --platform android` com as migrations embutidas.
> Série da fase 3 e requisitos dos próximos planos: `docs/superpowers/plans/2026-10-27-fase3-roteiro.md`.

## Objetivo

Substituir os 4 repositórios em memória por SQLite (expo-sqlite + Drizzle) e o `FakeSyncGateway` por uma fila outbox real (`fila_sync`), garantindo que **registro e fila sejam gravados na mesma transação** (RNF02). O app continua rodando no Expo Go, inicia vazio e sobrevive a fechar/reabrir.

Fora deste plano: câmera real (Plano 2), Supabase/Auth (Plano 3), envio da fila (Plano 4), GPS/mapa (Plano 6).

## Arquitetura

- `core/domain` e `core/application` continuam sem import de SDK. Só `infrastructure/`, `main/` e `app/` importam `expo-sqlite`/`drizzle-orm`.
- **Única adição ao domínio:** método estático `reidratar(props)` nas 4 entidades, para reconstruir a entidade a partir da linha do banco. Não altera `criar` nem comportamentos. **Pendente de aprovação do usuário** (ver Tarefa 3).
- Os repositórios SQLite implementam as interfaces existentes sem alterá-las. `OutboxSyncGateway` implementa `ISyncGateway` gravando em `fila_sync`.
- **Atomicidade sem mudar contratos:** `ExecutorDeTransacao` (infra) abre `BEGIN IMMEDIATE`/`COMMIT`/`ROLLBACK` na conexão única e serializa os trabalhos. No composition root, cada caso de uso que escreve é decorado por `transacional(...)`. Um caso de uso que falha no meio não deixa obra reservada sem pedido nem registro sem fila.
  - Por que não `db.transaction(async (tx) => …)` do material: no driver `drizzle-orm/expo-sqlite` (0.45) a transação é **síncrona**. Com callback `async` ela faz `COMMIT` assim que o callback devolve a Promise, e as escritas depois do primeiro `await` ficam **fora** da transação, sem erro algum (lido no código-fonte do driver). No better-sqlite3 o mesmo código lança `Transaction function cannot return a promise`. O executor resolve os dois casos com o mesmo código.
- Coluna **só de infraestrutura** nas tabelas de domínio: `updated_at` (timestamp do servidor, preenchido no Plano 4). O upsert só escreve as colunas da entidade, então ela é preservada **[validado]**.
- **Fotos em tabela própria (`fotos`)**, como no material ("arquivo no filesystem; no SQLite só caminho, status e hash"): `pedidos.foto_conclusao_path` e `obras.foto_path` guardam o caminho **relativo** do arquivo, que também é a chave única de `fotos`. Hash, status de upload e caminho remoto ficam em `fotos`, fora das entidades e fora do upsert. O Plano 2 grava a linha de `fotos`; o Plano 4 faz o upload.
- Tombstones (`deleted_at`) ficam para sempre (RNF13). Toda leitura de UI filtra `deleted_at IS NULL`, igual aos repositórios em memória.
- Composition root: `makeSqliteProviders(db, executor)` substitui `makeFakeProviders` **só no runtime** (`_layout.tsx`). Os fakes continuam como test doubles. `FakeAuthGateway` fica até o Plano 3, `FakeCameraGateway` até o Plano 2 e `FakeLocationGateway` até o Plano 6 (com botão GPS desabilitado).

## Stack (versões conferidas no npm em 27/10)

| Pacote | Versão | Tipo |
|---|---|---|
| `expo-sqlite` | `~57.0.4` (via `npx expo install`) | dependência |
| `drizzle-orm` | `^0.45.4` (estável, não `@rc`) | dependência |
| `drizzle-kit` | `^0.31.11` | dev |
| `better-sqlite3` + `@types/better-sqlite3` | `^13.0.3` | dev (só testes) |
| `babel-plugin-inline-import` | `^3.0.0` | dev (embute `.sql` no bundle) |
| `expo-drizzle-studio-plugin` | `^0.2.1` | dev, opcional (inspecionar o banco no smoke test) |

## Restrições globais

1. Nenhuma interface de repositório ou gateway muda assinatura.
2. Baseline por commit: `npm test`, `npm run typecheck` e `npm run lint` com **0 erros** (o lint atual já tem 12 warnings; não aumentar).
3. Branch `feat/fase3-plano1-sqlite` a partir de `main`. Nunca tocar em `demo/fase2` nem na tag `demo-fase2`.
4. Só módulos que rodam no Expo Go (sem SQLCipher).
5. Web (`react-native-web`) fora do escopo; `DatePicker.web.tsx` fica inerte.
6. Banco `ate.db`, `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`.
7. Runtime inicia vazio; `seedFixtures` só nos testes.

## Convenções de persistência

- Datas como `text` ISO-8601 (`toISOString()`). As datas de calendário já chegam da UI como meio-dia UTC (`presentation/utils/date.ts`), então não há risco de mudar de dia. No Plano 4, colunas `date` do Postgres recebem `slice(0, 10)`.
- `entidade` na `fila_sync` usa os nomes que os casos de uso já gravam: `'Cliente'`, `'Pedido'`, `'Obra'`, `'Evento'`.
- O payload da fila continua parcial (diagnóstico). O worker do Plano 4 relê a linha completa.
- Enums validados duas vezes: no domínio (`reidratar`) e no banco (`CHECK`).

## Modos de falha priorizados (foco da revisão)

1. Escrita parcial: registro sem fila, ou obra alterada sem pedido → testes de rollback (Tarefas 4 e 10).
2. Ida e volta de tipos entidade ↔ linha (Date, boolean, `null`, `quantidadeObra` 0/1/N, `Coordenada`) → teste de roundtrip campo a campo (Tarefas 5–8).
3. Upsert apagando `updated_at` → teste com `UPDATE` direto antes do `save()` (Tarefas 5–8).
4. Tombstone visível na UI ou apagado do banco (Tarefas 5–8).
5. Schema e migration fora de sincronia → migration gerada pelo drizzle-kit, commitada e testada (Tarefa 2).
6. Segundo cliente balcão para o mesmo usuário (Tarefa 5).

---

## Tarefa 1 — Dependências e toolchain

Arquivos: `package.json`, `babel.config.js` (novo), `metro.config.js` (novo), `drizzle.config.ts` (novo).

1. `git checkout main && git pull && git checkout -b feat/fase3-plano1-sqlite`
2. `npx expo install expo-sqlite`
3. `npm install drizzle-orm` e `npm install -D drizzle-kit better-sqlite3 @types/better-sqlite3 babel-plugin-inline-import`
4. `drizzle.config.ts`:
   ```ts
   import type { Config } from 'drizzle-kit';

   export default {
     schema: './src/infrastructure/database/sqlite/schema.ts',
     out: './drizzle',
     dialect: 'sqlite',
     driver: 'expo',
   } satisfies Config;
   ```
5. `babel.config.js` (o projeto ainda não tem; mantém o preset do Expo) **[validado: suíte do domínio passa com ele]**:
   ```js
   module.exports = function (api) {
     api.cache(true);
     return {
       presets: ['babel-preset-expo'],
       plugins: [['inline-import', { extensions: ['.sql'] }]],
     };
   };
   ```
6. `metro.config.js` — usar `expo/metro-config` (o `@expo/metro-config` é só dependência transitiva):
   ```js
   const { getDefaultConfig } = require('expo/metro-config');

   const config = getDefaultConfig(__dirname);
   config.resolver.sourceExts.push('sql');
   module.exports = config;
   ```
7. Scripts no `package.json`: `"db:generate": "drizzle-kit generate"` e `"db:check": "drizzle-kit check"`.
8. Não é preciso alterar `transformIgnorePatterns` do Jest: `drizzle-orm` e `better-sqlite3` rodam no `jest-expo` sem patch **[validado]**.
9. Baseline verde. Commit: `chore(infra): toolchain drizzle + expo-sqlite`

## Tarefa 2 — Schema completo e teste de migrations

Arquivos: `src/infrastructure/database/sqlite/schema.ts`, `drizzle/*` (gerado e commitado), `src/infrastructure/database/sqlite/__tests__/migrations.test.ts`.

**Teste primeiro** (vermelho antes do `db:generate`):
- Aplica as migrations num banco em memória e confere por `sqlite_master` as 7 tabelas, os índices e o índice único parcial do balcão.
- Aplicar duas vezes não falha (idempotência).
- `CHECK` barra valor fora do enum (ex.: `status_sync = 'QUALQUER'`) e latitude 91.
- Atenção: todo insert do Drizzle precisa de `await` (ou `.run()`). Um `void db.insert(...)` **não executa** **[validado: o teste da revisão 1 falhava por isso]**.

Schema **[validado: gera a migration e passa nos testes]**:

```ts
import { sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const STATUS_SYNC = `'PENDENTE','SINCRONIZADO','ERRO'`;

/** Colunas comuns das tabelas sincronizáveis. updated_at é só de infra (timestamp do servidor, Plano 4). */
const colunasSync = {
  statusSync: text('status_sync').notNull(),
  criadoEmLocal: text('criado_em_local').notNull(),
  deletedAt: text('deleted_at'),
  updatedAt: text('updated_at'),
};

export const clientes = sqliteTable('clientes', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull(),
  nome: text('nome').notNull(),
  contato: text('contato').notNull(),
  ...colunasSync,
}, (t) => [
  index('idx_clientes_usuario').on(t.usuarioId),
  uniqueIndex('idx_cliente_balcao_unico').on(t.usuarioId)
    .where(sql`deleted_at IS NULL AND nome = 'Cliente Avulso' AND contato = ''`),
  check('ck_clientes_status_sync', sql.raw(`status_sync IN (${STATUS_SYNC})`)),
]);

export const obras = sqliteTable('obras', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull(),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(),
  quantidade: integer('quantidade').notNull(),
  statusObra: text('status_obra').notNull(),
  fotoPath: text('foto_path'), // caminho relativo; metadados em `fotos`
  ...colunasSync,
}, (t) => [
  index('idx_obras_usuario').on(t.usuarioId),
  check('ck_obras_tipo', sql`tipo IN ('UNICA','SERIE')`),
  check('ck_obras_status', sql`status_obra IN ('DISPONIVEL','RESERVADA','ENTREGUE','ARQUIVADA')`),
  check('ck_obras_quantidade', sql`quantidade >= 0`),
  check('ck_obras_status_sync', sql.raw(`status_sync IN (${STATUS_SYNC})`)),
]);

export const pedidos = sqliteTable('pedidos', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull(),
  clienteId: text('cliente_id').notNull().references(() => clientes.id),
  obraId: text('obra_id').references(() => obras.id),
  descricao: text('descricao').notNull(),
  canalOrigem: text('canal_origem').notNull(),
  dataEntrega: text('data_entrega').notNull(),
  status: text('status').notNull(),
  fotoConclusaoPath: text('foto_conclusao_path'), // caminho relativo; metadados em `fotos`
  vendaDireta: integer('venda_direta', { mode: 'boolean' }).notNull(),
  quantidadeObra: integer('quantidade_obra').notNull(),
  ...colunasSync,
}, (t) => [
  index('idx_pedidos_usuario_status').on(t.usuarioId, t.status),
  index('idx_pedidos_cliente').on(t.clienteId),
  index('idx_pedidos_obra').on(t.obraId),
  check('ck_pedidos_status', sql`status IN ('A_FAZER','FAZENDO','FEITO')`),
  check('ck_pedidos_canal', sql`canal_origem IN ('INSTAGRAM','WHATSAPP','PRESENCIAL','TELEFONE','OUTROS')`),
  check('ck_pedidos_qtd', sql`quantidade_obra >= 0`),
  check('ck_pedidos_status_sync', sql.raw(`status_sync IN (${STATUS_SYNC})`)),
]);

export const eventos = sqliteTable('eventos', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull(),
  nome: text('nome').notNull(),
  data: text('data').notNull(),
  endereco: text('endereco').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  observacoes: text('observacoes').notNull().default(''),
  ...colunasSync,
}, (t) => [
  index('idx_eventos_usuario').on(t.usuarioId),
  check('ck_eventos_lat', sql`latitude BETWEEN -90 AND 90`),
  check('ck_eventos_lng', sql`longitude BETWEEN -180 AND 180`),
  check('ck_eventos_status_sync', sql.raw(`status_sync IN (${STATUS_SYNC})`)),
]);

/** Outbox local (não existe no Supabase). Campos de retentativa já previstos para o Plano 4. */
export const filaSync = sqliteTable('fila_sync', {
  id: text('id').primaryKey(),
  tipoOperacao: text('tipo_operacao').notNull(),
  entidade: text('entidade').notNull(),
  entidadeId: text('entidade_id').notNull(),
  payload: text('payload').notNull(),
  status: text('status').notNull().default('PENDENTE'),
  tentativas: integer('tentativas').notNull().default(0),
  proximaTentativaEm: text('proxima_tentativa_em'),
  erro: text('erro'),
  criadoEmLocal: text('criado_em_local').notNull(),
}, (t) => [
  index('idx_fila_sync_status').on(t.status, t.criadoEmLocal),
  check('ck_fila_tipo', sql`tipo_operacao IN ('CRIAR','EDITAR','DELETAR')`),
  check('ck_fila_status', sql`status IN ('PENDENTE','ENVIANDO','FALHA')`),
]);

/**
 * Metadados das fotos (o arquivo fica no filesystem, nunca BLOB). Linha criada pelo Plano 2
 * ao aceitar a foto; upload e caminho remoto pelo Plano 4. caminho_local é relativo ao
 * diretório de documentos do app (o caminho absoluto muda entre builds/reinstalações).
 */
export const fotos = sqliteTable('fotos', {
  id: text('id').primaryKey(),
  caminhoLocal: text('caminho_local').notNull().unique(),
  hash: text('hash').notNull(),
  status: text('status').notNull().default('PENDENTE_UPLOAD'),
  caminhoRemoto: text('caminho_remoto'),
  tentativas: integer('tentativas').notNull().default(0),
  erro: text('erro'),
  criadoEmLocal: text('criado_em_local').notNull(),
}, () => [
  check('ck_fotos_status', sql`status IN ('PENDENTE_UPLOAD','ENVIADA','FALHA')`),
]);

/** Chave/valor de controle do sync (ex.: cursor do pull por tabela, Plano 4). */
export const syncMeta = sqliteTable('sync_meta', {
  chave: text('chave').primaryKey(),
  valor: text('valor').notNull(),
});

export const schema = { clientes, obras, pedidos, eventos, filaSync, fotos, syncMeta };
```

Notas:
- `usuario_id` sem FK local (a tabela de usuários só existe no Supabase). FKs reais: `pedidos.cliente_id` e `pedidos.obra_id` (nulável).
- Diferenças em relação ao DER local da fase 2: `fila_sync` com `tentativas`, `proxima_tentativa_em` e `erro`; tabelas novas `fotos` e `sync_meta`; `foto_conclusao_url`/`foto_url` deixam de existir localmente (o caminho remoto fica em `fotos`); `updated_at` também local. Registrar em `docs/ate-fase3.md` (Tarefa 12).
- `quantidade_obra`: 0 sem obra, 1 com obra vinculada, N em venda direta.

Passos: teste vermelho → `npm run db:generate` → ler o SQL gerado → verde → `npm run db:check`. Commit: `feat(infra): schema sqlite e migrations`

## Tarefa 3 — `reidratar()` nas entidades (domínio, aditivo)

> **Pendente de aprovação do usuário.** Não executar antes do "ok". É a forma padrão de reconstituir entidades persistidas em DDD; sem ela, o construtor privado impede montar a entidade a partir do banco. Nome `reidratar` (e não `restaurar`) para não confundir com `Obra.restaurarAposCancelamento()`.

Arquivos: `src/core/domain/entities/{Cliente,Obra,Pedido,Evento}.ts`, `src/core/domain/enums/*.ts`, `src/core/domain/__tests__/Reidratacao.test.ts`.

**Teste primeiro**, para cada entidade:
- `reidratar(props)` devolve entidade com todos os getters iguais aos props, inclusive `deletedAt` não nulo, `statusSync` `SINCRONIZADO`/`ERRO` e `quantidadeObra` 0/1/N.
- Aceita estados que `criar` não produz (ex.: pedido `FEITO` com foto, obra `ARQUIVADA`), porque vieram do banco.
- Rejeita dados estruturalmente inválidos: id não UUID v4, enum fora do conjunto, `Date` inválida, quantidade não inteira ou negativa, `Coordenada` fora do intervalo.
- Não guarda referência aos objetos recebidos (cópia defensiva de `Date`; `Coordenada` recriada).

Implementação:
- Adicionar arrays `as const` aos enums que não têm (`STATUS_PEDIDO`, `STATUS_SYNC`, `STATUS_OBRA`, `TIPO_OBRA`, `TIPO_OPERACAO`). Aditivo puro, os tipos não mudam.
- Validação estrutural privada por entidade (`validarEstrutura`), sem reaplicar regra de negócio de criação (trim, nome obrigatório etc.).

```ts
// Pedido.ts
static reidratar(props: PedidoProps): Pedido {
  Pedido.validarEstrutura(props);
  return new Pedido({
    ...props,
    dataEntrega: new Date(props.dataEntrega.getTime()),
    criadoEmLocal: new Date(props.criadoEmLocal.getTime()),
    deletedAt: props.deletedAt ? new Date(props.deletedAt.getTime()) : null,
  });
}
```

Commit: `feat(domain): reidratar() nas entidades`

## Tarefa 4 — Base de infra: tipo do banco, banco de teste, transação e outbox

Arquivos:
- `src/infrastructure/database/sqlite/DrizzleDb.ts`
- `src/infrastructure/database/sqlite/ExecutorDeTransacao.ts` + `__tests__/ExecutorDeTransacao.test.ts`
- `src/test-support/bancoDeTeste.ts` (a pasta já existe)
- `src/infrastructure/sync/OutboxSyncGateway.ts` + `__tests__/OutboxSyncGateway.test.ts`

**Tipo comum dos drivers** **[validado: `tsc` aceita better-sqlite3 e expo-sqlite sem cast]**. Os dois drivers do Drizzle são `'sync'`; diferem só no tipo do resultado de `run`:

```ts
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type { schema } from './schema';

/** Tipo comum aos drivers expo-sqlite (app) e better-sqlite3 (testes). */
export type DrizzleAppDb = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
```

**Banco de teste** (SQLite real em memória com as mesmas migrations; é a camada "Repository (SQLite real in-memory)" da pirâmide de testes do material):

```ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

import type { DrizzleAppDb } from '../infrastructure/database/sqlite/DrizzleDb';
import { schema } from '../infrastructure/database/sqlite/schema';

export function bancoDeTeste(): DrizzleAppDb {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON'); // explícito, igual ao app
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle') });
  return db;
}
```

**Executor de transação e decorator** **[validado: commit, rollback, serialização e preservação de `instanceof`]**:

```ts
import { sql } from 'drizzle-orm';

import type { DrizzleAppDb } from './DrizzleDb';

/**
 * Roda um trabalho assíncrono entre BEGIN/COMMIT/ROLLBACK na conexão única do app
 * e serializa os trabalhos. Não aninhar: um trabalho não pode chamar executar() de novo.
 */
export class ExecutorDeTransacao {
  private fila: Promise<unknown> = Promise.resolve();

  constructor(private readonly db: DrizzleAppDb) {}

  executar<T>(trabalho: () => Promise<T>): Promise<T> {
    const execucao = this.fila.then(async () => {
      this.db.run(sql`BEGIN IMMEDIATE`);
      try {
        const resultado = await trabalho();
        this.db.run(sql`COMMIT`);
        return resultado;
      } catch (erro) {
        this.db.run(sql`ROLLBACK`);
        throw erro;
      }
    });
    this.fila = execucao.catch(() => undefined);
    return execucao;
  }
}

type ComExecute = { execute(...args: never[]): Promise<unknown> };

/** Mesmo tipo e mesmo protótipo do caso de uso; execute() passa a rodar em transação. */
export function transacional<U extends ComExecute>(casoDeUso: U, executor: ExecutorDeTransacao): U {
  const original = casoDeUso.execute.bind(casoDeUso) as (...args: unknown[]) => Promise<unknown>;
  const decorado = Object.create(Object.getPrototypeOf(casoDeUso)) as U;
  Object.assign(decorado, casoDeUso);
  (decorado as unknown as { execute: unknown }).execute = (...args: unknown[]) =>
    executor.executar(() => original(...args));
  return decorado;
}
```

Testes do executor: commit grava registro e fila; falha entre as duas escritas não deixa nada; três chamadas concorrentes (uma falhando) resultam só nas duas bem-sucedidas; o decorado continua `instanceof` da classe original.

Limites conhecidos (documentar no arquivo):
- Leituras feitas durante a transação (ex.: `loadData` da UI) podem ver dados ainda não confirmados. Inofensivo aqui: usuário único e dados pequenos.
- Nenhum caso de uso decorado chama outro decorado. Hoje `VendaDireta` instancia `ResolverClienteBalcao` diretamente (sem decorator), o que é correto.
- A confirmação no aparelho (expo-sqlite) fica para o smoke test da Tarefa 11.

**OutboxSyncGateway** (contrato `enqueue(tipo, entidade, entidadeId, payload)` inalterado). Construtor `(db: DrizzleAppDb, ids: IIdGenerator, relogio = () => new Date())`. Grava `status = 'PENDENTE'`, `tentativas = 0`, `criadoEmLocal = relogio().toISOString()`.
Testes: campos gravados; payload intacto; dois enqueues da mesma entidade geram duas linhas (a coalescência é do worker, Plano 4); dentro de uma transação que falha, o enqueue também é desfeito.

Commit: `feat(infra): executor de transação, banco de teste e OutboxSyncGateway`

## Tarefas 5 a 8 — Repositórios SQLite

Ordem: Cliente → Obra → Pedido (depende das FKs de cliente e obra) → Evento.
Arquivos: `src/infrastructure/database/sqlite/SQLite{Cliente,Obra,Pedido,Evento}Repository.ts` + testes em `__tests__/`.

Padrão comum (um mapeador `paraLinha`/`paraEntidade` por repositório; o `set` do upsert é a própria linha sem `id`, o que preserva as colunas só de infra **[validado]**):

```ts
export class SQLiteClienteRepository implements IClienteRepository {
  constructor(private readonly db: DrizzleAppDb) {}

  async save(cliente: Cliente): Promise<void> {
    const { id, ...resto } = paraLinha(cliente);
    await this.db.insert(clientes).values({ id, ...resto })
      .onConflictDoUpdate({ target: clientes.id, set: resto });
  }

  async findById(id: string): Promise<Cliente | null> {
    const [linha] = await this.db.select().from(clientes)
      .where(and(eq(clientes.id, id), isNull(clientes.deletedAt)));
    return linha ? paraEntidade(linha) : null;
  }

  async findByUsuario(usuarioId: string): Promise<Cliente[]> {
    const linhas = await this.db.select().from(clientes)
      .where(and(eq(clientes.usuarioId, usuarioId), isNull(clientes.deletedAt)))
      .orderBy(clientes.criadoEmLocal);
    return linhas.map(paraEntidade);
  }
  // findBalcaoByUsuario / saveBalcaoIfAbsent: ver abaixo
}

function paraLinha(c: Cliente): typeof clientes.$inferInsert {
  return {
    id: c.id, usuarioId: c.usuarioId, nome: c.nome, contato: c.contato,
    statusSync: c.statusSync, criadoEmLocal: c.criadoEmLocal.toISOString(),
    deletedAt: c.deletedAt?.toISOString() ?? null,
  };
}

function paraEntidade(l: typeof clientes.$inferSelect): Cliente {
  return Cliente.reidratar({
    id: l.id, usuarioId: l.usuarioId, nome: l.nome, contato: l.contato,
    statusSync: l.statusSync as StatusSync,
    criadoEmLocal: new Date(l.criadoEmLocal),
    deletedAt: l.deletedAt ? new Date(l.deletedAt) : null,
  });
}
```

Antes de escrever cada repositório, conferir o comportamento do equivalente em `infrastructure/database/memory/` (ex.: se `findById` devolve ou não tombstone) e manter **paridade exata**: os casos de uso e telas dependem dele.

Testes obrigatórios por repositório:
1. Roundtrip campo a campo (`save` → `findById`), incluindo `null`, `Date`, boolean e enums em todos os valores relevantes.
2. Update por upsert altera os campos e **preserva** `updated_at` gravado antes por SQL direto.
3. Tombstone: some de `findById`/`findByUsuario` (conforme a paridade) e a linha continua no banco com `deleted_at` preenchido.
4. Isolamento por usuário: `findByUsuario` não traz linhas de outro `usuario_id`.

Específicos:
- **Cliente:** `findBalcaoByUsuario` (nome `'Cliente Avulso'`, contato `''`, sem tombstone); `saveBalcaoIfAbsent` devolve o existente com `created = false` e não cria segunda linha; um `save()` direto de segundo balcão viola o índice único (sinal de erro de programação).
- **Obra:** `tipo`, `quantidade`, `statusObra` em todos os valores; `fotoPath` nulo e preenchido.
- **Pedido:** `findByStatus` filtra status e usuário; FK: pedido com `clienteId` inexistente falha; `vendaDireta` true/false; `obraId` nulo e vinculado; fluxo `criar → save → moverParaFazendo → save` persiste.
- **Evento:** `Coordenada` com casas decimais reais (`-23.5505, -46.6333`); `observacoes` vazia e preenchida.

Commits: um por repositório, `feat(infra): SQLite<Entidade>Repository`.

## Tarefa 9 — Desabilitar GPS nos formulários de evento

Arquivos: `src/app/evento/novo.tsx`, `src/app/evento/[id]/editar.tsx` e testes de tela afetados.

- O botão "Usar GPS" fica desabilitado com texto de apoio: "Localização automática chega em breve. Informe as coordenadas manualmente."
- Remover a chamada a `services.gateways.location.getCurrent()` nas telas, para nunca gravar a coordenada fixa do fake como se fosse real. O gateway continua na bag (contrato intacto).
- A entrada manual de coordenadas continua funcionando; atualizar os testes de tela que exercitavam o GPS.

Commit: `feat(presentation): GPS desabilitado até o plano de geolocalização`

## Tarefa 10 — `ProviderBag`, `makeSqliteProviders` e sessão

Arquivos: `src/main/factories/ProviderBag.ts` (novo, só tipos), `src/main/factories/makeSqliteProviders.ts` (novo), `src/presentation/hooks/AppProviders.tsx`, `src/main/factories/__tests__/makeSqliteProviders.test.ts`.

**`ProviderBag` é o tipo estrutural que o `AppProviders` aceita**: `gateways` (4 interfaces), `repositories` (4 interfaces), `useCases` (as 20 classes), `usuarioId`, `loadData()`, `registrarSessao?()` e os arrays opcionais de seed.
- **Não** mudar o retorno de `makeFakeProviders` nem `FakeProviderBag = ReturnType<typeof makeFakeProviders>`. Os testes de tela usam `providers.gateways.sync.queue` e `providers.gateways.camera.mode`, que só existem nos fakes concretos. A bag fake satisfaz `ProviderBag` estruturalmente, e o próprio uso em `<AppProviders providers={makeFakeProviders()}>` nos testes prova isso no `tsc`.
- Em `AppProviders.tsx`, trocar `FakeProviderBag` por `ProviderBag` em `ServicesContext`, `useServices` e nos providers.

**`makeSqliteProviders(db, executor)`**:
- Repositórios SQLite, `OutboxSyncGateway`, `UuidIdGenerator`; `FakeAuthGateway`, `FakeCameraGateway` e `FakeLocationGateway` temporários.
- Casos de uso **que escrevem** decorados com `transacional(...)`: iniciarProducao, concluirPedido, cancelarPedido, cadastrarPedido, editarPedido, cadastrarCliente, editarCliente, cadastrarObra, adicionarUnidades, removerUnidades, removerObra, vendaDireta, cadastrarEvento, editarEvento, removerEvento. Leituras e login/logout ficam sem decorator.
- Sessão: `registrarSessao(sessao)` guarda a sessão; `usuarioId` é um getter que lança `SessaoNaoDisponivelError` sem sessão; `loadData()` devolve listas vazias sem sessão.

**`AppProviders.tsx`**:
1. `AuthProvider`: após `getSession`/`login`, chama `providers.registrarSessao?.(sessao)`; no `logout`, chama `registrarSessao?.(null)` antes de limpar o estado.
2. `DataProvider`: recarrega quando a sessão muda e zera os dados no logout. **Não engolir erro**: guardar `erro: string | null` no contexto (`DataCtx` ganha esse campo) e exibir uma mensagem simples na área logada. Hoje um `.catch(() => {})` esconderia falha de leitura do banco.

**Teste de integração** (better-sqlite3):
1. `const bag = makeSqliteProviders(bancoDeTeste(), executor)`; `registrarSessao({ userId: USUARIO, token: 'x' })`.
2. Fluxo real: cadastrar cliente → cadastrar obra única → cadastrar pedido vinculado → `loadData()` traz os três; `fila_sync` tem `CRIAR Cliente`, `CRIAR Obra`, `EDITAR Obra` e `CRIAR Pedido` (entidades com a grafia do código).
3. **Atomicidade de ponta a ponta:** com o `enqueue` forçado a falhar na gravação do pedido (spy no `OutboxSyncGateway`), `cadastrarPedido` rejeita e a obra **continua `DISPONIVEL`**, sem pedido nem fila nova.
4. `usuarioId` sem sessão lança `SessaoNaoDisponivelError`; `loadData()` sem sessão devolve vazio.
5. Venda direta cria o balcão uma única vez, mesmo chamada duas vezes em paralelo.

Commit: `feat(main): makeSqliteProviders transacional e ProviderBag`

## Tarefa 11 — Bootstrap no `_layout.tsx` e smoke test

Arquivos: `src/main/database/openAppDatabase.ts` (novo), `src/app/_layout.tsx`.

```ts
// src/main/database/openAppDatabase.ts
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { schema } from '../../infrastructure/database/sqlite/schema';

export function openAppDatabase() {
  // enableChangeListener: base para a UI reagir às escritas do sync (Plano 4)
  const sqlite = openDatabaseSync('ate.db', { enableChangeListener: true });
  sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return { sqlite, db: drizzle(sqlite, { schema }) };
}
```

```tsx
// _layout.tsx (trecho) — [validado: tsc e export Android com as migrations embutidas]
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../../drizzle/migrations';

export default function RootLayout() {
  const [conexao] = useState(openAppDatabase);
  const { success, error } = useMigrations(conexao.db, migrations);
  const [providers] = useState(() =>
    makeSqliteProviders(conexao.db, new ExecutorDeTransacao(conexao.db)));

  if (error) return <TelaErroBanco mensagem={error.message} />;
  if (!success) return <TelaCarregando />;
  return (
    <FontLoader>
      <AppProviders providers={providers}><RootNavigator /></AppProviders>
    </FontLoader>
  );
}
```

- `TelaErroBanco`/`TelaCarregando`: componentes pequenos em `presentation/components`, com o tema do projeto (`useDesignTheme`).
- Opcional em desenvolvimento: `useDrizzleStudio(conexao.sqlite)` do `expo-drizzle-studio-plugin` dentro de `if (__DEV__)`, para inspecionar as tabelas pelo DevTools (tecla `Shift+M` no terminal do Expo).

**Smoke test no Expo Go** (registrar o resultado no PR/commit):
1. Login demo (`artesao@email.com` / `123456`). Abas vazias.
2. Criar cliente, obra única, obra em série, pedido vinculado, venda direta e evento com coordenada manual.
3. Mover pedido para Fazendo e concluir (câmera fake por enquanto).
4. **Modo avião**: repetir criação e edição; tudo funciona.
5. Fechar o app pelos recentes, reabrir, logar: tudo persiste.
6. Conferir `fila_sync` (Drizzle Studio ou consulta de debug): uma linha por operação.
7. Cancelar um pedido vinculado: a obra volta e o pedido some da UI (tombstone no banco).

Commit: `feat(app): bootstrap sqlite no runtime`

## Tarefa 12 — Conformidade e registro

1. **Teste de arquitetura automatizado** (`src/core/__tests__/Arquitetura.test.ts`): percorre `src/core/**/*.ts` (fora de `__tests__`) e falha se algum import não for relativo ou for de `expo`, `expo-*`, `react`, `react-native`, `drizzle-orm`, `better-sqlite3`, `@supabase/*` ou `uuid`. Substitui o grep manual e vale para os próximos planos.
2. `makeFakeProviders` não aparece em `src/app/` (pode virar asserção no mesmo teste).
3. Baseline: `npm test`, `npm run typecheck`, `npm run lint` (0 erros), `npm run db:check`.
4. Criar `docs/ate-fase3.md` com a seção "Plano 1": decisões e divergências em relação à fase 2 —
   - `fila_sync` com `tentativas`, `proxima_tentativa_em` e `erro`; tabelas novas `fotos` e `sync_meta`; `updated_at` também local; URL remota da foto só em `fotos`;
   - tombstone mantido localmente para sempre (diverge do §3.3 da fase 2, alinhado ao RNF13);
   - sem coluna `version` (usuário único, um dispositivo, servidor vence);
   - transação por caso de uso via decorator (e por que não `db.transaction(async)`);
   - `reidratar()` no domínio (se aprovado).
5. `git status` limpo, lockfile commitado.

---

## Ordem de execução e checkpoints

- Tarefas 1 → 12, um commit por tarefa, baseline ao fim de cada uma.
- **Checkpoint com o usuário** antes da Tarefa 3 (aprovação do `reidratar`) e ao fim da Tarefa 11 (resultado do smoke test no aparelho, principalmente o rollback do executor no expo-sqlite).
- Ao concluir: abrir PR `feat/fase3-plano1-sqlite` → `main` com o checklist do smoke test.
