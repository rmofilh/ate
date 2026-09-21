# Aplicação ate — Use Cases + Repositórios/Gateways Fake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Orquestrar as entities do Plano 1 em use cases testados contra repositórios/gateways fake in-memory pré-populados com fixtures.

**Architecture:** `src/core/application/` contém só interfaces (`repositories/`, `gateways/`) e use cases puros; `src/infrastructure/database/memory/` e `src/infrastructure/device/fake-*` fornecem fakes; `src/infrastructure/seed/fixtures.ts` popula Kanban/Estoque/Mapa; use cases nunca importam SDK real.

**Tech Stack:** TypeScript strict + Jest + jest-expo; fakes com `Map<string, Entity>`; UUID v4 via entities; sem `expo-sqlite`, sem `@supabase/supabase-js`.

**Spec:** `docs/ate-fase2.md` (Seções 3.1 regras de métodos, 5.1/5.2 transições, 6.1 BCE Control, 7.1–7.3 sequências, 10.1 pastas application/gateways + infrastructure, 10.2 Fases 2–3, 10.3 Repository/Gateway/DI) e `docs/ate-fase1.md` (Decisões #7, #8, #13).

## Global Constraints

- IDs são UUID v4 gerados no dispositivo, usados como PK tanto no SQLite quanto no Supabase.
- `canal_origem` valores fixos: `INSTAGRAM`, `WHATSAPP`, `PRESENCIAL`, `TELEFONE`, `OUTROS`.
- `status` de Pedido valores: `A_FAZER`, `FAZENDO`, `FEITO`.
- `tipo` de Obra valores: `UNICA`, `SERIE`.
- `status_obra` valores: `DISPONIVEL`, `RESERVADA`, `ENTREGUE`, `ARQUIVADA`; `RESERVADA` válido somente para `tipo = UNICA`.
- `status_sync` valores: `PENDENTE`, `SINCRONIZADO`, `ERRO`.
- Foto obrigatória Fazendo → Feito sem bypass, exceto `venda_direta=true` + `SERIE` (UC27/RF26).
- Todo dado escopado por `usuario_id`; um usuário; sem `negocio`.
- Nenhum arquivo em `src/core/application/` importa `expo-camera`, `expo-location`, `expo-sqlite`, `drizzle-orm`, `@supabase/supabase-js` ou `react`.
- Nesta fase nenhum repositório/gateway real: só fakes in-memory; `SyncGateway` fake só enfileira (worker real é fase futura).
- Vocabulário: fake = in-memory, mock = `jest.mock` de SDK verificando chamada, stub = resposta fixa; câmera/geolocalização nunca exercitadas de verdade.

## Review Focus

- `confirmado=false` (ou dupla confirmação incompleta) em cancelar/remover deveria abortar sem tocar em estoque nem `deletedAt`.
- `obraId` apontando para obra de outro `usuarioId` deveria ser rejeitado como não-encontrado, não vazar dado entre usuários.
- Concluir pedido já `FEITO` (duplo clique) deveria lançar erro em vez de duplicar baixa de estoque.
- `qtd` como string (`"2"`) vinda de `TextInput` deveria ser rejeitada/convertida explicitamente, nunca silenciosamente aceita.
- Login com e-mail com espaços/caixa alta (`"  ARTESAO@Email.com  "`) deveria normalizar (trim+lower) ou rejeitar com mensagem clara, não falhar misteriosamente.

---

## File Map

- `src/core/application/repositories/IClienteRepository.ts` — `save/findById/findByUsuario/findBalcaoByUsuario`.
- `src/core/application/repositories/IPedidoRepository.ts` — `save/findById/findByUsuario/findByStatus`.
- `src/core/application/repositories/IObraRepository.ts` — `save/findById/findByUsuario`.
- `src/core/application/repositories/IEventoRepository.ts` — `save/findById/findByUsuario`.
- `src/core/application/gateways/ICameraGateway.ts` — `capture(): Promise<string|null>` (null = cancelou).
- `src/core/application/gateways/ILocationGateway.ts` — `getCurrent(): Promise<Coordenada>`.
- `src/core/application/gateways/IAuthGateway.ts` — `login/logout/getSession`.
- `src/core/application/gateways/ISyncGateway.ts` — `enqueue(tipo,entidade,id,payload): Promise<void>; queue: lido pelo teste`.
- `src/core/application/usecases/*.ts` — um arquivo por use case (ver Tasks).
- `src/infrastructure/database/memory/InMemory*.ts` — 4 fakes com `Map`, filtrando `deletedAt !== null` nas listagens.
- `src/infrastructure/device/FakeCameraGateway.ts`, `FakeLocationGateway.ts`, `FakeAuthGateway.ts`, `FakeSyncGateway.ts`.
- `src/infrastructure/seed/fixtures.ts` — `seedFixtures()` retorna `{usuarioId, clientes, pedidos, obras, eventos}` no cenário do §4 (João, pedido101 FAZENDO+Águia RESERVADA, pedido Coruja SERIE qtd 4, +1 A_FAZER e +1 FEITO para Kanban não vazio).
- `src/core/application/__tests__/*.test.ts` — um por grupo de use case, injetando fakes.

> Nota de alinhamento Clean (revisão 2026-09-21): a §10.1 não tem pasta `src/adapters/` — os Interface Adapters moram em `src/presentation/` (UI) + `src/infrastructure/` (implementações dos contratos) e as portas em `src/core/application/repositories|gateways/`. Não criar `src/adapters/` nesta fase.

---

### Task 1: Interfaces + Fakes in-memory + Fixtures

**Files:**
- Create: `src/core/application/repositories/IClienteRepository.ts`, `IPedidoRepository.ts`, `IObraRepository.ts`, `IEventoRepository.ts`
- Create: `src/core/application/gateways/ICameraGateway.ts`, `ILocationGateway.ts`, `IAuthGateway.ts`, `ISyncGateway.ts`
- Create: `src/infrastructure/database/memory/InMemoryClienteRepository.ts`, `InMemoryPedidoRepository.ts`, `InMemoryObraRepository.ts`, `InMemoryEventoRepository.ts`
- Create: `src/infrastructure/device/FakeCameraGateway.ts`, `FakeLocationGateway.ts`, `FakeAuthGateway.ts`, `FakeSyncGateway.ts`
- Create: `src/infrastructure/seed/fixtures.ts`
- Test: `src/core/application/__tests__/Fakes.test.ts`

**Interfaces:**
- Consumes: `Cliente, Pedido, Obra, Evento, Coordenada` do Plano 1 (mesmos nomes/props).
- Produces: interfaces abaixo + fakes + `seedFixtures()` que Tasks 2–8 consomem:
  `IClienteRepository.save(c: Cliente): Promise<void>; findById(id: string): Promise<Cliente|null>; findByUsuario(u: string): Promise<Cliente[]>; findBalcaoByUsuario(u: string): Promise<Cliente|null>`
  `IPedidoRepository.save(p: Pedido): Promise<void>; findById(id: string): Promise<Pedido|null>; findByUsuario(u: string): Promise<Pedido[]>; findByStatus(u: string, s: StatusPedido): Promise<Pedido[]>`
  `IObraRepository.save(o: Obra): Promise<void>; findById(id: string): Promise<Obra|null>; findByUsuario(u: string): Promise<Obra[]>`
  `IEventoRepository.save(e: Evento): Promise<void>; findById(id: string): Promise<Evento|null>; findByUsuario(u: string): Promise<Evento[]>`
  `ICameraGateway.capture(): Promise<string|null>`
  `ILocationGateway.getCurrent(): Promise<Coordenada>`
  `IAuthGateway.login(email: string, password: string): Promise<{userId: string; token: string}>; logout(): Promise<void>; getSession(): Promise<{userId: string; token: string} | null>`
  `ISyncGateway.enqueue(tipo: TipoOperacao, entidade: string, entidadeId: string, payload: string): Promise<void>`

- [ ] **Step 1: Escrever teste de fakes + fixtures (falha sem arquivos)**

```ts
import { Cliente } from '../../core/domain/entities/Cliente';
import { InMemoryClienteRepository } from '../../infrastructure/database/memory/InMemoryClienteRepository';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('fakes + fixtures', () => {
  it('InMemory filtra soft-deleted', async () => {
    const repo = new InMemoryClienteRepository();
    const c = Cliente.criar({ usuarioId: 'u1', nome: 'João', contato: 'x' });
    await repo.save(c);
    expect(await repo.findByUsuario('u1')).toHaveLength(1);
    c.marcarRemovido();
    await repo.save(c);
    expect(await repo.findByUsuario('u1')).toHaveLength(0);
  });

  it('seed popula Kanban (3 colunas), Estoque e Mapa não-vazios', async () => {
    const seed = seedFixtures();
    expect(seed.pedidos.filter(p => p.status === 'A_FAZER').length).toBeGreaterThanOrEqual(1);
    expect(seed.pedidos.filter(p => p.status === 'FAZENDO').length).toBeGreaterThanOrEqual(1);
    expect(seed.pedidos.filter(p => p.status === 'FEITO').length).toBeGreaterThanOrEqual(1);
    expect(seed.obras.length).toBeGreaterThanOrEqual(2);
    expect(seed.eventos.length).toBeGreaterThanOrEqual(1);
  });
});
```

Salvar em `src/core/application/__tests__/Fakes.test.ts`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/core/application/__tests__/Fakes.test.ts --verbose`
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Criar as 4 interfaces de repositório**

`IClienteRepository.ts`:
```ts
import type { Cliente } from '../../domain/entities/Cliente';
export interface IClienteRepository {
  save(c: Cliente): Promise<void>;
  findById(id: string): Promise<Cliente | null>;
  findByUsuario(usuarioId: string): Promise<Cliente[]>;
  findBalcaoByUsuario(usuarioId: string): Promise<Cliente | null>;
}
```

`IPedidoRepository.ts`:
```ts
import type { Pedido } from '../../domain/entities/Pedido';
import type { StatusPedido } from '../../domain/enums/StatusPedido';
export interface IPedidoRepository {
  save(p: Pedido): Promise<void>;
  findById(id: string): Promise<Pedido | null>;
  findByUsuario(usuarioId: string): Promise<Pedido[]>;
  findByStatus(usuarioId: string, status: StatusPedido): Promise<Pedido[]>;
}
```

`IObraRepository.ts`:
```ts
import type { Obra } from '../../domain/entities/Obra';
export interface IObraRepository {
  save(o: Obra): Promise<void>;
  findById(id: string): Promise<Obra | null>;
  findByUsuario(usuarioId: string): Promise<Obra[]>;
}
```

`IEventoRepository.ts`:
```ts
import type { Evento } from '../../domain/entities/Evento';
export interface IEventoRepository {
  save(e: Evento): Promise<void>;
  findById(id: string): Promise<Evento | null>;
  findByUsuario(usuarioId: string): Promise<Evento[]>;
}
```

- [ ] **Step 4: Criar as 4 interfaces de gateway**

`ICameraGateway.ts`: `export interface ICameraGateway { capture(): Promise<string | null>; }`
`ILocationGateway.ts`:
```ts
import type { Coordenada } from '../../domain/value-objects/Coordenada';
export interface ILocationGateway { getCurrent(): Promise<Coordenada>; }
```
`IAuthGateway.ts`:
```ts
export interface AuthSession { userId: string; token: string; }
export interface IAuthGateway {
  login(email: string, password: string): Promise<AuthSession>;
  logout(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
}
```
`ISyncGateway.ts`:
```ts
import type { TipoOperacao } from '../../domain/enums/TipoOperacao';
export interface ISyncGateway {
  enqueue(tipo: TipoOperacao, entidade: string, entidadeId: string, payload: string): Promise<void>;
}
```

- [ ] **Step 5: Criar os 4 fakes de repositório (Map + filtro deletedAt)**

`InMemoryClienteRepository.ts`:
```ts
import type { Cliente } from '../../../core/domain/entities/Cliente';
import type { IClienteRepository } from '../../../core/application/repositories/IClienteRepository';

export class InMemoryClienteRepository implements IClienteRepository {
  private store = new Map<string, Cliente>();
  async save(c: Cliente): Promise<void> { this.store.set(c.id, c); }
  async findById(id: string): Promise<Cliente | null> {
    const c = this.store.get(id) ?? null;
    return c && c.deletedAt === null ? c : null;
  }
  async findByUsuario(usuarioId: string): Promise<Cliente[]> {
    return [...this.store.values()].filter(c => c.usuarioId === usuarioId && c.deletedAt === null);
  }
  async findBalcaoByUsuario(usuarioId: string): Promise<Cliente | null> {
    const found = [...this.store.values()].find(c => c.usuarioId === usuarioId && c.nome === 'Cliente Avulso' && c.deletedAt === null);
    return found ?? null;
  }
}
```

Repetir o padrão para Pedido/Obra/Evento (mesmo `Map`, `save` sobrescreve, `findById` retorna null se `deletedAt !== null`, listagens filtram por `usuarioId` + `deletedAt === null`; `InMemoryPedidoRepository` adiciona `findByStatus(u, s)` filtrando `p.status === s`).

- [ ] **Step 6: Criar os 4 fakes de gateway**

```ts
// FakeCameraGateway.ts
import type { ICameraGateway } from '../../../core/application/gateways/ICameraGateway';
export class FakeCameraGateway implements ICameraGateway {
  constructor(public mode: 'granted' | 'denied' | 'cancel' = 'granted', public nextPath = '/tmp/foto-fake.jpg') {}
  async capture(): Promise<string | null> {
    if (this.mode === 'denied') throw new Error('Permissão de câmera negada — habilite nas configurações do dispositivo');
    if (this.mode === 'cancel') return null;
    return this.nextPath;
  }
}

// FakeLocationGateway.ts
import type { ILocationGateway } from '../../../core/application/gateways/ILocationGateway';
import { Coordenada } from '../../../core/domain/value-objects/Coordenada';
export class FakeLocationGateway implements ILocationGateway {
  constructor(private coord = new Coordenada(-23.5505, -46.6333), private denied = false) {}
  async getCurrent(): Promise<Coordenada> {
    if (this.denied) throw new Error('Localização negada — posicione o pin manualmente no mapa');
    return this.coord;
  }
}

// FakeAuthGateway.ts
import type { IAuthGateway, AuthSession } from '../../../core/application/gateways/IAuthGateway';
export class FakeAuthGateway implements IAuthGateway {
  private session: AuthSession | null = null;
  constructor(private users = new Map<string, { password: string; userId: string }>([['artesao@email.com', { password: '123456', userId: 'a1111111-1111-4111-8111-111111111111' }]])) {}
  async login(email: string, password: string): Promise<AuthSession> {
    const key = email.trim().toLowerCase();
    const u = this.users.get(key);
    if (!u || u.password !== password) throw new Error('E-mail ou senha incorretos');
    this.session = { userId: u.userId, token: `fake-token-${u.userId}` };
    return this.session;
  }
  async logout(): Promise<void> { this.session = null; }
  async getSession(): Promise<AuthSession | null> { return this.session; }
}

// FakeSyncGateway.ts
import type { ISyncGateway } from '../../../core/application/gateways/ISyncGateway';
import type { TipoOperacao } from '../../../core/domain/enums/TipoOperacao';
export class FakeSyncGateway implements ISyncGateway {
  queue: Array<{ tipo: TipoOperacao; entidade: string; entidadeId: string; payload: string }> = [];
  async enqueue(tipo: TipoOperacao, entidade: string, entidadeId: string, payload: string): Promise<void> {
    this.queue.push({ tipo, entidade, entidadeId, payload });
  }
}
```

- [ ] **Step 7: Criar fixtures.ts (cenário §4 + Kanban completo)**

```ts
import { Cliente } from '../../core/domain/entities/Cliente';
import { Pedido } from '../../core/domain/entities/Pedido';
import { Obra } from '../../core/domain/entities/Obra';
import { Evento } from '../../core/domain/entities/Evento';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';

export function seedFixtures() {
  const usuarioId = 'a1111111-1111-4111-8111-111111111111';
  const clienteJoao = Cliente.criar({ usuarioId, nome: 'João da Silva', contato: '(11) 99999-9999' });
  const obraAguia = Obra.criar({ usuarioId, nome: 'Águia de Asas Abertas', tipo: 'UNICA' });
  obraAguia.reservar();
  const obraCoruja = Obra.criar({ usuarioId, nome: 'Coruja Pequena', tipo: 'SERIE', quantidade: 4, fotoPath: '/tmp/coruja.jpg' });
  const pedidoAFazer = Pedido.criar({ usuarioId, clienteId: clienteJoao.id, descricao: 'Escultura de Onça', canalOrigem: 'INSTAGRAM', dataEntrega: new Date('2026-11-01') });
  const pedido101 = Pedido.criar({ usuarioId, clienteId: clienteJoao.id, descricao: 'Escultura de Águia personalizada', canalOrigem: 'WHATSAPP', dataEntrega: new Date('2026-10-05'), obraId: obraAguia.id });
  pedido101.moverParaFazendo();
  const pedidoFeito = Pedido.criarVendaDireta({ usuarioId, clienteId: clienteJoao.id, obraId: obraCoruja.id, descricao: 'Coruja de prateleira (pronta entrega)', canalOrigem: 'PRESENCIAL' });
  const evento = Evento.criar({ usuarioId, nome: 'Feira da Praça', data: new Date('2026-10-12'), endereco: 'Praça Central, banca 5', localizacao: new Coordenada(-23.5505, -46.6333), observacoes: 'Levar corujas' });
  return { usuarioId, clientes: [clienteJoao], obras: [obraAguia, obraCoruja], pedidos: [pedidoAFazer, pedido101, pedidoFeito], eventos: [evento] };
}
```

- [ ] **Step 8: Rodar e ver passar + typecheck + commit**

Run: `npx jest src/core/application/__tests__/Fakes.test.ts --verbose`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/core/application/repositories src/core/application/gateways src/infrastructure/database/memory src/infrastructure/device src/infrastructure/seed src/core/application/__tests__/Fakes.test.ts
git commit -m "feat(app): add interfaces fakes e fixtures in-memory"
```

---

### Task 2: Cliente Use Cases (Cadastrar / Editar + Cliente Avulso sob demanda)

**Files:**
- Create: `src/core/application/usecases/CadastrarClienteUseCase.ts`
- Create: `src/core/application/usecases/EditarClienteUseCase.ts`
- Create: `src/core/application/usecases/ResolverClienteBalcaoUseCase.ts`
- Test: `src/core/application/__tests__/ClienteUseCases.test.ts`

**Interfaces:**
- Consumes: `IClienteRepository, ISyncGateway` (Task 1), `Cliente` (Plano 1).
- Produces: `CadastrarClienteUseCase.execute({usuarioId,nome,contato}): Promise<Cliente>`; `EditarClienteUseCase.execute({clienteId,nome,contato}): Promise<Cliente>`; `ResolverClienteBalcaoUseCase.execute({usuarioId}): Promise<Cliente>`.

- [ ] **Step 1: Escrever testes**

```ts
import { InMemoryClienteRepository } from '../../infrastructure/database/memory/InMemoryClienteRepository';
import { FakeSyncGateway } from '../../infrastructure/device/FakeSyncGateway';
import { CadastrarClienteUseCase } from '../usecases/CadastrarClienteUseCase';
import { EditarClienteUseCase } from '../usecases/EditarClienteUseCase';
import { ResolverClienteBalcaoUseCase } from '../usecases/ResolverClienteBalcaoUseCase';

describe('Cliente use cases', () => {
  it('cadastrar persiste + enfileira CRIAR', async () => {
    const repo = new InMemoryClienteRepository(); const sync = new FakeSyncGateway();
    const uc = new CadastrarClienteUseCase(repo, sync);
    const c = await uc.execute({ usuarioId: 'u1', nome: 'Maria', contato: 'zap' });
    expect((await repo.findByUsuario('u1'))).toHaveLength(1);
    expect(sync.queue[0]).toMatchObject({ tipo: 'CRIAR', entidade: 'Cliente', entidadeId: c.id });
  });

  it('editar cliente inexistente lança', async () => {
    const repo = new InMemoryClienteRepository(); const sync = new FakeSyncGateway();
    const uc = new EditarClienteUseCase(repo, sync);
    await expect(uc.execute({ clienteId: 'inexistente', nome: 'x', contato: 'y' })).rejects.toThrow();
  });

  it('resolver Cliente Avulso cria sob demanda e reusa na 2ª chamada', async () => {
    const repo = new InMemoryClienteRepository(); const sync = new FakeSyncGateway();
    const uc = new ResolverClienteBalcaoUseCase(repo, sync);
    const b1 = await uc.execute({ usuarioId: 'u1' });
    const b2 = await uc.execute({ usuarioId: 'u1' });
    expect(b1.id).toBe(b2.id);
    expect(b1.nome).toBe('Cliente Avulso');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/core/application/__tests__/ClienteUseCases.test.ts --verbose`
Expected: FAIL "Cannot find module '../usecases/CadastrarClienteUseCase'".

- [ ] **Step 3: Implementar os 3 use cases**

```ts
// CadastrarClienteUseCase.ts
import { Cliente } from '../../domain/entities/Cliente';
import type { IClienteRepository } from '../repositories/IClienteRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';

export class CadastrarClienteUseCase {
  constructor(private repo: IClienteRepository, private sync: ISyncGateway) {}
  async execute(args: { usuarioId: string; nome: string; contato: string }): Promise<Cliente> {
    const c = Cliente.criar(args);
    await this.repo.save(c);
    await this.sync.enqueue('CRIAR', 'Cliente', c.id, JSON.stringify({ nome: c.nome }));
    return c;
  }
}

// EditarClienteUseCase.ts
import { Cliente } from '../../domain/entities/Cliente';
import type { IClienteRepository } from '../repositories/IClienteRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';

export class EditarClienteUseCase {
  constructor(private repo: IClienteRepository, private sync: ISyncGateway) {}
  async execute(args: { clienteId: string; nome: string; contato: string }): Promise<Cliente> {
    const c = await this.repo.findById(args.clienteId);
    if (!c) throw new Error('Cliente não encontrado');
    if (c.nome === 'Cliente Avulso') throw new Error('Cliente Avulso não pode ser editado');
    c.editar(args.nome, args.contato);
    await this.repo.save(c);
    await this.sync.enqueue('EDITAR', 'Cliente', c.id, JSON.stringify({ nome: c.nome }));
    return c;
  }
}

// ResolverClienteBalcaoUseCase.ts
import { Cliente } from '../../domain/entities/Cliente';
import type { IClienteRepository } from '../repositories/IClienteRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';

export class ResolverClienteBalcaoUseCase {
  constructor(private repo: IClienteRepository, private sync: ISyncGateway) {}
  async execute(args: { usuarioId: string }): Promise<Cliente> {
    const existente = await this.repo.findBalcaoByUsuario(args.usuarioId);
    if (existente) return existente;
    const b = Cliente.balcao(args.usuarioId);
    await this.repo.save(b);
    await this.sync.enqueue('CRIAR', 'Cliente', b.id, JSON.stringify({ nome: 'Cliente Avulso' }));
    return b;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/core/application/__tests__/ClienteUseCases.test.ts --verbose`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/core/application/usecases/CadastrarClienteUseCase.ts src/core/application/usecases/EditarClienteUseCase.ts src/core/application/usecases/ResolverClienteBalcaoUseCase.ts src/core/application/__tests__/ClienteUseCases.test.ts
git commit -m "feat(app): add cliente usecases com Balcao sob demanda"
```

---

### Task 3: Pedido — Cadastrar / Editar / Consultar / Iniciar Produção

**Files:**
- Create: `src/core/application/usecases/CadastrarPedidoUseCase.ts`
- Create: `src/core/application/usecases/EditarPedidoUseCase.ts`
- Create: `src/core/application/usecases/ConsultarPedidosUseCase.ts`
- Create: `src/core/application/usecases/IniciarProducaoUseCase.ts`
- Test: `src/core/application/__tests__/PedidoWrite.test.ts`

**Interfaces:**
- Consumes: `IPedidoRepository, IObraRepository, IClienteRepository, ISyncGateway` (Task 1).
- Produces: `CadastrarPedidoUseCase.execute({usuarioId,clienteId,descricao,canalOrigem,dataEntrega,obraId?}): Promise<Pedido>` (com bifurcação UNICA→reservar / SERIE→decrementar, sequência 7.2); `EditarPedidoUseCase.execute({pedidoId,descricao,dataEntrega}): Promise<Pedido>`; `ConsultarPedidosUseCase.execute({usuarioId,status?}): Promise<Pedido[]>`; `IniciarProducaoUseCase.execute({pedidoId}): Promise<Pedido>`.

- [ ] **Step 1: Escrever testes (inclui obra de outro usuário rejeitada — Review Focus)**

```ts
import { InMemoryPedidoRepository } from '../../infrastructure/database/memory/InMemoryPedidoRepository';
import { InMemoryObraRepository } from '../../infrastructure/database/memory/InMemoryObraRepository';
import { InMemoryClienteRepository } from '../../infrastructure/database/memory/InMemoryClienteRepository';
import { FakeSyncGateway } from '../../infrastructure/device/FakeSyncGateway';
import { CadastrarPedidoUseCase } from '../usecases/CadastrarPedidoUseCase';
import { IniciarProducaoUseCase } from '../usecases/IniciarProducaoUseCase';
import { Cliente } from '../../core/domain/entities/Cliente';
import { Obra } from '../../core/domain/entities/Obra';

describe('Pedido write', () => {
  it('cadastrar sem obra cria A_FAZER + enfileira', async () => {
    const pedidos = new InMemoryPedidoRepository(); const obras = new InMemoryObraRepository();
    const clientes = new InMemoryClienteRepository(); const sync = new FakeSyncGateway();
    const cli = Cliente.criar({ usuarioId: 'u1', nome: 'J', contato: 'x' });
    await clientes.save(cli);
    const uc = new CadastrarPedidoUseCase(pedidos, obras, clientes, sync);
    const p = await uc.execute({ usuarioId: 'u1', clienteId: cli.id, descricao: 'Onça', canalOrigem: 'INSTAGRAM', dataEntrega: new Date('2026-11-01') });
    expect(p.status).toBe('A_FAZER');
    expect(sync.queue[0].entidade).toBe('Pedido');
  });

  it('cadastrar com SERIE decrementa estoque (sequência 7.2)', async () => {
    const pedidos = new InMemoryPedidoRepository(); const obras = new InMemoryObraRepository();
    const clientes = new InMemoryClienteRepository(); const sync = new FakeSyncGateway();
    const cli = Cliente.criar({ usuarioId: 'u1', nome: 'J', contato: 'x' });
    await clientes.save(cli);
    const obra = Obra.criar({ usuarioId: 'u1', nome: 'Coruja', tipo: 'SERIE', quantidade: 4 });
    await obras.save(obra);
    const uc = new CadastrarPedidoUseCase(pedidos, obras, clientes, sync);
    await uc.execute({ usuarioId: 'u1', clienteId: cli.id, descricao: 'p', canalOrigem: 'PRESENCIAL', dataEntrega: new Date('2026-11-01'), obraId: obra.id });
    expect((await obras.findById(obra.id))!.quantidade).toBe(3);
  });

  it('rejeita obra de outro usuario (Review Focus isolamento)', async () => {
    const pedidos = new InMemoryPedidoRepository(); const obras = new InMemoryObraRepository();
    const clientes = new InMemoryClienteRepository(); const sync = new FakeSyncGateway();
    const cli = Cliente.criar({ usuarioId: 'u1', nome: 'J', contato: 'x' });
    await clientes.save(cli);
    const obraOutro = Obra.criar({ usuarioId: 'u2', nome: 'X', tipo: 'SERIE', quantidade: 5 });
    await obras.save(obraOutro);
    const uc = new CadastrarPedidoUseCase(pedidos, obras, clientes, sync);
    await expect(uc.execute({ usuarioId: 'u1', clienteId: cli.id, descricao: 'p', canalOrigem: 'PRESENCIAL', dataEntrega: new Date(), obraId: obraOutro.id })).rejects.toThrow(/não encontrad/i);
  });

  it('iniciar produção move A_FAZER→FAZENDO', async () => {
    const pedidos = new InMemoryPedidoRepository(); const obras = new InMemoryObraRepository();
    const clientes = new InMemoryClienteRepository(); const sync = new FakeSyncGateway();
    const cli = Cliente.criar({ usuarioId: 'u1', nome: 'J', contato: 'x' });
    await clientes.save(cli);
    const cad = new CadastrarPedidoUseCase(pedidos, obras, clientes, sync);
    const p = await cad.execute({ usuarioId: 'u1', clienteId: cli.id, descricao: 'p', canalOrigem: 'WHATSAPP', dataEntrega: new Date('2026-11-01') });
    const ini = new IniciarProducaoUseCase(pedidos, sync);
    const movido = await ini.execute({ pedidoId: p.id });
    expect(movido.status).toBe('FAZENDO');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/core/application/__tests__/PedidoWrite.test.ts --verbose`
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implementar**

```ts
// CadastrarPedidoUseCase.ts
import { Pedido } from '../../domain/entities/Pedido';
import type { CanalOrigem } from '../../domain/enums/CanalOrigem';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';
import type { IObraRepository } from '../repositories/IObraRepository';
import type { IClienteRepository } from '../repositories/IClienteRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';

export class CadastrarPedidoUseCase {
  constructor(private pedidos: IPedidoRepository, private obras: IObraRepository, private clientes: IClienteRepository, private sync: ISyncGateway) {}
  async execute(args: { usuarioId: string; clienteId: string; descricao: string; canalOrigem: CanalOrigem; dataEntrega: Date; obraId?: string | null }): Promise<Pedido> {
    const cli = await this.clientes.findById(args.clienteId);
    if (!cli || cli.usuarioId !== args.usuarioId) throw new Error('Cliente não encontrado');
    const p = Pedido.criar({ usuarioId: args.usuarioId, clienteId: args.clienteId, descricao: args.descricao, canalOrigem: args.canalOrigem, dataEntrega: args.dataEntrega });
    if (args.obraId) {
      const obra = await this.obras.findById(args.obraId);
      if (!obra || obra.usuarioId !== args.usuarioId) throw new Error('Obra não encontrada');
      if (obra.tipo === 'UNICA') obra.reservar();
      else obra.decrementarUnidades();
      p.vincularObra(obra.id);
      await this.obras.save(obra);
      await this.sync.enqueue('EDITAR', 'Obra', obra.id, JSON.stringify({ statusObra: obra.statusObra, quantidade: obra.quantidade }));
    }
    await this.pedidos.save(p);
    await this.sync.enqueue('CRIAR', 'Pedido', p.id, JSON.stringify({ descricao: p.descricao }));
    return p;
  }
}

// EditarPedidoUseCase.ts
import { Pedido } from '../../domain/entities/Pedido';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';

export class EditarPedidoUseCase {
  constructor(private pedidos: IPedidoRepository, private sync: ISyncGateway) {}
  async execute(args: { pedidoId: string; descricao: string; dataEntrega: Date }): Promise<Pedido> {
    const p = await this.pedidos.findById(args.pedidoId);
    if (!p) throw new Error('Pedido não encontrado');
    p.editar(args.descricao, args.dataEntrega);
    await this.pedidos.save(p);
    await this.sync.enqueue('EDITAR', 'Pedido', p.id, JSON.stringify({ descricao: p.descricao }));
    return p;
  }
}

// ConsultarPedidosUseCase.ts
import type { Pedido } from '../../domain/entities/Pedido';
import type { StatusPedido } from '../../domain/enums/StatusPedido';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';

export class ConsultarPedidosUseCase {
  constructor(private pedidos: IPedidoRepository) {}
  async execute(args: { usuarioId: string; status?: StatusPedido }): Promise<Pedido[]> {
    if (args.status) return this.pedidos.findByStatus(args.usuarioId, args.status);
    return this.pedidos.findByUsuario(args.usuarioId);
  }
}

// IniciarProducaoUseCase.ts
import type { IPedidoRepository } from '../repositories/IPedidoRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { Pedido } from '../../domain/entities/Pedido';

export class IniciarProducaoUseCase {
  constructor(private pedidos: IPedidoRepository, private sync: ISyncGateway) {}
  async execute(args: { pedidoId: string }): Promise<Pedido> {
    const p = await this.pedidos.findById(args.pedidoId);
    if (!p) throw new Error('Pedido não encontrado');
    p.moverParaFazendo();
    await this.pedidos.save(p);
    await this.sync.enqueue('EDITAR', 'Pedido', p.id, JSON.stringify({ status: p.status }));
    return p;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/core/application/__tests__/PedidoWrite.test.ts --verbose`
Expected: PASS (4 passed).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/core/application/usecases/CadastrarPedidoUseCase.ts src/core/application/usecases/EditarPedidoUseCase.ts src/core/application/usecases/ConsultarPedidosUseCase.ts src/core/application/usecases/IniciarProducaoUseCase.ts src/core/application/__tests__/PedidoWrite.test.ts
git commit -m "feat(app): add pedido cadastrar editar consultar iniciar"
```

---

### Task 4: Concluir (foto rígida) / Cancelar (compensação) / Vincular

**Files:**
- Create: `src/core/application/usecases/ConcluirPedidoUseCase.ts`
- Create: `src/core/application/usecases/CancelarPedidoUseCase.ts`
- Create: `src/core/application/usecases/VincularObraAoPedidoUseCase.ts`
- Test: `src/core/application/__tests__/PedidoClose.test.ts`

**Interfaces:**
- Consumes: `IPedidoRepository, IObraRepository, ISyncGateway` + entities.
- Produces: `ConcluirPedidoUseCase.execute({pedidoId,fotoPath}): Promise<Pedido>` (sequência 7.1: UNICA→darBaixa); `CancelarPedidoUseCase.execute({pedidoId,confirmado}): Promise<void>` (UNICA→liberar / SERIE→incrementar + soft-delete + DELETAR); `VincularObraAoPedidoUseCase.execute({pedidoId,obraId}): Promise<Pedido>`.

- [ ] **Step 1: Escrever testes (foto null, duplo concluir, confirmado=false)**

```ts
import { InMemoryPedidoRepository } from '../../infrastructure/database/memory/InMemoryPedidoRepository';
import { InMemoryObraRepository } from '../../infrastructure/database/memory/InMemoryObraRepository';
import { FakeSyncGateway } from '../../infrastructure/device/FakeSyncGateway';
import { ConcluirPedidoUseCase } from '../usecases/ConcluirPedidoUseCase';
import { CancelarPedidoUseCase } from '../usecases/CancelarPedidoUseCase';
import { Pedido } from '../../core/domain/entities/Pedido';
import { Obra } from '../../core/domain/entities/Obra';
import { Cliente } from '../../core/domain/entities/Cliente';
import { InMemoryClienteRepository } from '../../infrastructure/database/memory/InMemoryClienteRepository';

async function setupComObraUnica() {
  const pedidos = new InMemoryPedidoRepository(); const obras = new InMemoryObraRepository();
  const clientes = new InMemoryClienteRepository(); const sync = new FakeSyncGateway();
  const cli = Cliente.criar({ usuarioId: 'u1', nome: 'J', contato: 'x' });
  await clientes.save(cli);
  const obra = Obra.criar({ usuarioId: 'u1', nome: 'Águia', tipo: 'UNICA' });
  obra.reservar(); await obras.save(obra);
  const p = Pedido.criar({ usuarioId: 'u1', clienteId: cli.id, descricao: 'Águia', canalOrigem: 'WHATSAPP', dataEntrega: new Date('2026-10-05'), obraId: obra.id });
  p.moverParaFazendo(); await pedidos.save(p);
  return { pedidos, obras, sync, p, obra };
}

describe('concluir/cancelar', () => {
  it('concluir sem foto lança e mantém FAZENDO (RNF11)', async () => {
    const { pedidos, obras, sync, p } = await setupComObraUnica();
    const uc = new ConcluirPedidoUseCase(pedidos, obras, sync);
    await expect(uc.execute({ pedidoId: p.id, fotoPath: null })).rejects.toThrow(/foto/i);
    expect((await pedidos.findById(p.id))!.status).toBe('FAZENDO');
  });

  it('concluir com foto move a FEITO e dá baixa na UNICA (sequência 7.1)', async () => {
    const { pedidos, obras, sync, p, obra } = await setupComObraUnica();
    const uc = new ConcluirPedidoUseCase(pedidos, obras, sync);
    const feito = await uc.execute({ pedidoId: p.id, fotoPath: '/tmp/foto.jpg' });
    expect(feito.status).toBe('FEITO');
    expect((await obras.findById(obra.id))!.statusObra).toBe('ENTREGUE');
  });

  it('duplo concluir lança (Review Focus duplo clique)', async () => {
    const { pedidos, obras, sync, p } = await setupComObraUnica();
    const uc = new ConcluirPedidoUseCase(pedidos, obras, sync);
    await uc.execute({ pedidoId: p.id, fotoPath: '/tmp/a.jpg' });
    await expect(uc.execute({ pedidoId: p.id, fotoPath: '/tmp/b.jpg' })).rejects.toThrow();
  });

  it('cancelar com confirmado=false aborta sem tocar estoque (Review Focus)', async () => {
    const { pedidos, obras, sync, p, obra } = await setupComObraUnica();
    const uc = new CancelarPedidoUseCase(pedidos, obras, sync);
    await uc.execute({ pedidoId: p.id, confirmado: false });
    expect(await pedidos.findById(p.id)).not.toBeNull();
    expect((await obras.findById(obra.id))!.statusObra).toBe('RESERVADA');
  });

  it('cancelar confirmado libera UNICA + enfileira DELETAR', async () => {
    const { pedidos, obras, sync, p, obra } = await setupComObraUnica();
    const uc = new CancelarPedidoUseCase(pedidos, obras, sync);
    await uc.execute({ pedidoId: p.id, confirmado: true });
    expect(await pedidos.findById(p.id)).toBeNull();
    expect((await obras.findById(obra.id)) === null || (await obras.findById(obra.id))!.statusObra === 'DISPONIVEL').toBe(true);
    expect(sync.queue.some(e => e.tipo === 'DELETAR' && e.entidade === 'Pedido')).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/core/application/__tests__/PedidoClose.test.ts --verbose`
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implementar**

```ts
// ConcluirPedidoUseCase.ts
import type { IPedidoRepository } from '../repositories/IPedidoRepository';
import type { IObraRepository } from '../repositories/IObraRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { Pedido } from '../../domain/entities/Pedido';

export class ConcluirPedidoUseCase {
  constructor(private pedidos: IPedidoRepository, private obras: IObraRepository, private sync: ISyncGateway) {}
  async execute(args: { pedidoId: string; fotoPath: string | null }): Promise<Pedido> {
    const p = await this.pedidos.findById(args.pedidoId);
    if (!p) throw new Error('Pedido não encontrado');
    p.concluir(args.fotoPath);
    if (p.obraId) {
      const obra = await this.obras.findById(p.obraId);
      if (obra && obra.tipo === 'UNICA') {
        obra.darBaixa();
        await this.obras.save(obra);
        await this.sync.enqueue('EDITAR', 'Obra', obra.id, JSON.stringify({ statusObra: obra.statusObra }));
      }
    }
    await this.pedidos.save(p);
    await this.sync.enqueue('EDITAR', 'Pedido', p.id, JSON.stringify({ status: p.status }));
    return p;
  }
}

// CancelarPedidoUseCase.ts
import type { IPedidoRepository } from '../repositories/IPedidoRepository';
import type { IObraRepository } from '../repositories/IObraRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';

export class CancelarPedidoUseCase {
  constructor(private pedidos: IPedidoRepository, private obras: IObraRepository, private sync: ISyncGateway) {}
  async execute(args: { pedidoId: string; confirmado: boolean }): Promise<void> {
    if (!args.confirmado) return;
    const p = await this.pedidos.findById(args.pedidoId);
    if (!p) throw new Error('Pedido não encontrado');
    if (p.obraId) {
      const obra = await this.obras.findById(p.obraId);
      if (obra) {
        if (obra.tipo === 'UNICA' && obra.statusObra === 'RESERVADA') obra.liberar();
        if (obra.tipo === 'SERIE') obra.incrementarUnidades();
        await this.obras.save(obra);
      }
    }
    p.cancelar();
    await this.pedidos.save(p);
    await this.sync.enqueue('DELETAR', 'Pedido', p.id, JSON.stringify({ deletedAt: p.deletedAt }));
  }
}

// VincularObraAoPedidoUseCase.ts
import type { IPedidoRepository } from '../repositories/IPedidoRepository';
import type { IObraRepository } from '../repositories/IObraRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { Pedido } from '../../domain/entities/Pedido';

export class VincularObraAoPedidoUseCase {
  constructor(private pedidos: IPedidoRepository, private obras: IObraRepository, private sync: ISyncGateway) {}
  async execute(args: { pedidoId: string; obraId: string }): Promise<Pedido> {
    const p = await this.pedidos.findById(args.pedidoId);
    if (!p) throw new Error('Pedido não encontrado');
    const obra = await this.obras.findById(args.obraId);
    if (!obra || obra.usuarioId !== p.usuarioId) throw new Error('Obra não encontrada');
    if (obra.tipo === 'UNICA') obra.reservar();
    else obra.decrementarUnidades();
    p.vincularObra(obra.id);
    await this.obras.save(obra);
    await this.pedidos.save(p);
    await this.sync.enqueue('EDITAR', 'Pedido', p.id, JSON.stringify({ obraId: p.obraId }));
    return p;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/core/application/__tests__/PedidoClose.test.ts --verbose`
Expected: PASS (5 passed).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/core/application/usecases/ConcluirPedidoUseCase.ts src/core/application/usecases/CancelarPedidoUseCase.ts src/core/application/usecases/VincularObraAoPedidoUseCase.ts src/core/application/__tests__/PedidoClose.test.ts
git commit -m "feat(app): add concluir cancelar vincular com compensacao"
```

---

### Task 5: Obra Use Cases (Cadastrar / Consultar / Adicionar / Arquivar / RemoverUnidades)

**Files:**
- Create: `src/core/application/usecases/CadastrarObraUseCase.ts`
- Create: `src/core/application/usecases/ConsultarEstoqueUseCase.ts`
- Create: `src/core/application/usecases/AdicionarUnidadesUseCase.ts`
- Create: `src/core/application/usecases/RemoverObraUseCase.ts`
- Create: `src/core/application/usecases/RemoverUnidadesUseCase.ts`
- Test: `src/core/application/__tests__/ObraUseCases.test.ts`

**Interfaces:**
- Consumes: `IObraRepository, IPedidoRepository, ISyncGateway`.
- Produces: `CadastrarObraUseCase.execute({usuarioId,nome,tipo,quantidade?,fotoPath?}): Promise<Obra>`; `ConsultarEstoqueUseCase.execute({usuarioId}): Promise<Obra[]>`; `AdicionarUnidadesUseCase.execute({obraId,qtd}): Promise<Obra>`; `RemoverObraUseCase.execute({obraId,confirmado}): Promise<void>` (bloqueia se vinculada a pedido aberto — RF22); `RemoverUnidadesUseCase.execute({obraId,qtd,confirmado,duplaConfirmacao}): Promise<Obra>` (RF25 dupla confirmação).

- [ ] **Step 1: Escrever testes**

```ts
import { InMemoryObraRepository } from '../../infrastructure/database/memory/InMemoryObraRepository';
import { InMemoryPedidoRepository } from '../../infrastructure/database/memory/InMemoryPedidoRepository';
import { FakeSyncGateway } from '../../infrastructure/device/FakeSyncGateway';
import { CadastrarObraUseCase } from '../usecases/CadastrarObraUseCase';
import { RemoverObraUseCase } from '../usecases/RemoverObraUseCase';
import { RemoverUnidadesUseCase } from '../usecases/RemoverUnidadesUseCase';
import { AdicionarUnidadesUseCase } from '../usecases/AdicionarUnidadesUseCase';
import { Pedido } from '../../core/domain/entities/Pedido';
import { Cliente } from '../../core/domain/entities/Cliente';
import { InMemoryClienteRepository } from '../../infrastructure/database/memory/InMemoryClienteRepository';

describe('Obra use cases', () => {
  it('cadastrar SERIE + adicionar unidades', async () => {
    const obras = new InMemoryObraRepository(); const sync = new FakeSyncGateway();
    const cad = new CadastrarObraUseCase(obras, sync);
    const o = await cad.execute({ usuarioId: 'u1', nome: 'Coruja', tipo: 'SERIE', quantidade: 2 });
    const add = new AdicionarUnidadesUseCase(obras, sync);
    const atual = await add.execute({ obraId: o.id, qtd: 3 });
    expect(atual.quantidade).toBe(5);
  });

  it('remover obra vinculada a pedido aberto bloqueia (RF22)', async () => {
    const obras = new InMemoryObraRepository(); const pedidos = new InMemoryPedidoRepository();
    const clientes = new InMemoryClienteRepository(); const sync = new FakeSyncGateway();
    const cli = Cliente.criar({ usuarioId: 'u1', nome: 'J', contato: 'x' });
    await clientes.save(cli);
    const cad = new CadastrarObraUseCase(obras, sync);
    const obra = await cad.execute({ usuarioId: 'u1', nome: 'Águia', tipo: 'UNICA' });
    obra.reservar(); await obras.save(obra);
    const p = Pedido.criar({ usuarioId: 'u1', clienteId: cli.id, descricao: 'p', canalOrigem: 'WHATSAPP', dataEntrega: new Date('2026-10-01'), obraId: obra.id });
    await pedidos.save(p);
    const rem = new RemoverObraUseCase(obras, pedidos, sync);
    await expect(rem.execute({ obraId: obra.id, confirmado: true })).rejects.toThrow(/vinculada/i);
  });

  it('RF25 exige confirmado + duplaConfirmacao', async () => {
    const obras = new InMemoryObraRepository(); const sync = new FakeSyncGateway();
    const cad = new CadastrarObraUseCase(obras, sync);
    const o = await cad.execute({ usuarioId: 'u1', nome: 'C', tipo: 'SERIE', quantidade: 5 });
    const uc = new RemoverUnidadesUseCase(obras, sync);
    await expect(uc.execute({ obraId: o.id, qtd: 1, confirmado: false, duplaConfirmacao: true })).rejects.toThrow(/confirma/i);
    await expect(uc.execute({ obraId: o.id, qtd: 1, confirmado: true, duplaConfirmacao: false })).rejects.toThrow(/dupla/i);
    const atual = await uc.execute({ obraId: o.id, qtd: 2, confirmado: true, duplaConfirmacao: true });
    expect(atual.quantidade).toBe(3);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/core/application/__tests__/ObraUseCases.test.ts --verbose`
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implementar os 5 use cases**

```ts
// CadastrarObraUseCase.ts
import { Obra } from '../../domain/entities/Obra';
import type { TipoObra } from '../../domain/enums/TipoObra';
import type { IObraRepository } from '../repositories/IObraRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';

export class CadastrarObraUseCase {
  constructor(private obras: IObraRepository, private sync: ISyncGateway) {}
  async execute(args: { usuarioId: string; nome: string; tipo: TipoObra; quantidade?: number; fotoPath?: string | null }): Promise<Obra> {
    const o = Obra.criar(args);
    await this.obras.save(o);
    await this.sync.enqueue('CRIAR', 'Obra', o.id, JSON.stringify({ nome: o.nome }));
    return o;
  }
}

// ConsultarEstoqueUseCase.ts
import type { Obra } from '../../domain/entities/Obra';
import type { IObraRepository } from '../repositories/IObraRepository';

export class ConsultarEstoqueUseCase {
  constructor(private obras: IObraRepository) {}
  async execute(args: { usuarioId: string }): Promise<Obra[]> {
    return this.obras.findByUsuario(args.usuarioId);
  }
}

// AdicionarUnidadesUseCase.ts
import type { IObraRepository } from '../repositories/IObraRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { Obra } from '../../domain/entities/Obra';

export class AdicionarUnidadesUseCase {
  constructor(private obras: IObraRepository, private sync: ISyncGateway) {}
  async execute(args: { obraId: string; qtd: number }): Promise<Obra> {
    const o = await this.obras.findById(args.obraId);
    if (!o) throw new Error('Obra não encontrada');
    o.adicionarUnidades(args.qtd);
    await this.obras.save(o);
    await this.sync.enqueue('EDITAR', 'Obra', o.id, JSON.stringify({ quantidade: o.quantidade }));
    return o;
  }
}

// RemoverObraUseCase.ts
import type { IObraRepository } from '../repositories/IObraRepository';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';

export class RemoverObraUseCase {
  constructor(private obras: IObraRepository, private pedidos: IPedidoRepository, private sync: ISyncGateway) {}
  async execute(args: { obraId: string; confirmado: boolean }): Promise<void> {
    if (!args.confirmado) throw new Error('Remoção não confirmada');
    const o = await this.obras.findById(args.obraId);
    if (!o) throw new Error('Obra não encontrada');
    const vinculados = (await this.pedidos.findByUsuario(o.usuarioId)).filter(p => p.obraId === o.id && p.deletedAt === null);
    if (vinculados.length > 0) throw new Error('Obra vinculada a pedido aberto não pode ser removida');
    o.arquivar();
    o.marcarRemovido();
    await this.obras.save(o);
    await this.sync.enqueue('DELETAR', 'Obra', o.id, JSON.stringify({}));
  }
}

// RemoverUnidadesUseCase.ts
import type { IObraRepository } from '../repositories/IObraRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { Obra } from '../../domain/entities/Obra';

export class RemoverUnidadesUseCase {
  constructor(private obras: IObraRepository, private sync: ISyncGateway) {}
  async execute(args: { obraId: string; qtd: number; confirmado: boolean; duplaConfirmacao: boolean }): Promise<Obra> {
    if (!args.confirmado) throw new Error('Remoção não confirmada');
    if (!args.duplaConfirmacao) throw new Error('Dupla confirmação obrigatória para baixa manual');
    const o = await this.obras.findById(args.obraId);
    if (!o) throw new Error('Obra não encontrada');
    o.removerUnidades(args.qtd);
    await this.obras.save(o);
    await this.sync.enqueue('EDITAR', 'Obra', o.id, JSON.stringify({ quantidade: o.quantidade }));
    return o;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/core/application/__tests__/ObraUseCases.test.ts --verbose`
Expected: PASS (3 passed).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/core/application/usecases/CadastrarObraUseCase.ts src/core/application/usecases/ConsultarEstoqueUseCase.ts src/core/application/usecases/AdicionarUnidadesUseCase.ts src/core/application/usecases/RemoverObraUseCase.ts src/core/application/usecases/RemoverUnidadesUseCase.ts src/core/application/__tests__/ObraUseCases.test.ts
git commit -m "feat(app): add obra usecases com RF22 e RF25"
```

---

### Task 6: VendaDiretaUseCase (RF26 — 5 casos do §10.2)

**Files:**
- Create: `src/core/application/usecases/VendaDiretaUseCase.ts`
- Test: `src/core/application/__tests__/VendaDireta.test.ts`

**Interfaces:**
- Consumes: `IObraRepository, IPedidoRepository, IClienteRepository, ISyncGateway` + `ResolverClienteBalcaoUseCase` (Task 2) + `Pedido.criarVendaDireta` (Plano 1).
- Produces: `VendaDiretaUseCase.execute({usuarioId,obraId,qtd,descricao?}): Promise<Pedido>` — SERIE + qtd>0 + estoque suficiente; baixa via `removerUnidades`; pedido `FEITO` + `vendaDireta=true` + Cliente Avulso; enfileira `CRIAR`; sem foto (exceção RNF11).

- [ ] **Step 1: Escrever os 5 casos como testes**

```ts
import { InMemoryObraRepository } from '../../infrastructure/database/memory/InMemoryObraRepository';
import { InMemoryPedidoRepository } from '../../infrastructure/database/memory/InMemoryPedidoRepository';
import { InMemoryClienteRepository } from '../../infrastructure/database/memory/InMemoryClienteRepository';
import { FakeSyncGateway } from '../../infrastructure/device/FakeSyncGateway';
import { VendaDiretaUseCase } from '../usecases/VendaDiretaUseCase';
import { CadastrarObraUseCase } from '../usecases/CadastrarObraUseCase';

describe('VendaDireta (RF26)', () => {
  it('caso 3 válido: cria FEITO com Cliente Avulso e dá baixa', async () => {
    const obras = new InMemoryObraRepository(); const pedidos = new InMemoryPedidoRepository();
    const clientes = new InMemoryClienteRepository(); const sync = new FakeSyncGateway();
    const cad = new CadastrarObraUseCase(obras, sync);
    const obra = await cad.execute({ usuarioId: 'u1', nome: 'Coruja', tipo: 'SERIE', quantidade: 4 });
    const uc = new VendaDiretaUseCase(obras, pedidos, clientes, sync);
    const p = await uc.execute({ usuarioId: 'u1', obraId: obra.id, qtd: 2 });
    expect(p.status).toBe('FEITO');
    expect(p.vendaDireta).toBe(true);
    expect((await obras.findById(obra.id))!.quantidade).toBe(2);
    expect(sync.queue.some(e => e.entidade === 'Pedido' && e.tipo === 'CRIAR')).toBe(true);
  });

  it('caso 4 inválido: UNICA / qtd<=0 / sem estoque lança sem criar', async () => {
    const obras = new InMemoryObraRepository(); const pedidos = new InMemoryPedidoRepository();
    const clientes = new InMemoryClienteRepository(); const sync = new FakeSyncGateway();
    const cad = new CadastrarObraUseCase(obras, sync);
    const unica = await cad.execute({ usuarioId: 'u1', nome: 'Águia', tipo: 'UNICA' });
    const uc = new VendaDiretaUseCase(obras, pedidos, clientes, sync);
    await expect(uc.execute({ usuarioId: 'u1', obraId: unica.id, qtd: 1 })).rejects.toThrow();
    const serie = await cad.execute({ usuarioId: 'u1', nome: 'C', tipo: 'SERIE', quantidade: 1 });
    await expect(uc.execute({ usuarioId: 'u1', obraId: serie.id, qtd: 0 })).rejects.toThrow();
    await expect(uc.execute({ usuarioId: 'u1', obraId: serie.id, qtd: 5 })).rejects.toThrow();
    expect(await pedidos.findByUsuario('u1')).toHaveLength(0);
  });

  it('caso 5 orquestração: Cliente Avulso único reutilizado', async () => {
    const obras = new InMemoryObraRepository(); const pedidos = new InMemoryPedidoRepository();
    const clientes = new InMemoryClienteRepository(); const sync = new FakeSyncGateway();
    const cad = new CadastrarObraUseCase(obras, sync);
    const obra = await cad.execute({ usuarioId: 'u1', nome: 'C', tipo: 'SERIE', quantidade: 10 });
    const uc = new VendaDiretaUseCase(obras, pedidos, clientes, sync);
    const p1 = await uc.execute({ usuarioId: 'u1', obraId: obra.id, qtd: 1 });
    const p2 = await uc.execute({ usuarioId: 'u1', obraId: obra.id, qtd: 1 });
    expect(p1.clienteId).toBe(p2.clienteId);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/core/application/__tests__/VendaDireta.test.ts --verbose`
Expected: FAIL "Cannot find module '../usecases/VendaDiretaUseCase'".

- [ ] **Step 3: Implementar**

```ts
import { Pedido } from '../../domain/entities/Pedido';
import type { IObraRepository } from '../repositories/IObraRepository';
import type { IPedidoRepository } from '../repositories/IPedidoRepository';
import type { IClienteRepository } from '../repositories/IClienteRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import { ResolverClienteBalcaoUseCase } from './ResolverClienteBalcaoUseCase';

export class VendaDiretaUseCase {
  constructor(private obras: IObraRepository, private pedidos: IPedidoRepository, private clientes: IClienteRepository, private sync: ISyncGateway) {}

  async execute(args: { usuarioId: string; obraId: string; qtd: number; descricao?: string }): Promise<Pedido> {
    if (!Number.isInteger(args.qtd) || args.qtd <= 0) throw new Error('Quantidade deve ser inteiro > 0');
    const obra = await this.obras.findById(args.obraId);
    if (!obra || obra.usuarioId !== args.usuarioId) throw new Error('Obra não encontrada');
    if (obra.tipo !== 'SERIE') throw new Error('Venda direta só para obra SERIE');
    if (args.qtd > obra.quantidade) throw new Error('Estoque insuficiente para venda direta');
    const balcao = new ResolverClienteBalcaoUseCase(this.clientes, this.sync);
    const cliente = await balcao.execute({ usuarioId: args.usuarioId });
    obra.removerUnidades(args.qtd);
    await this.obras.save(obra);
    await this.sync.enqueue('EDITAR', 'Obra', obra.id, JSON.stringify({ quantidade: obra.quantidade }));
    const pedido = Pedido.criarVendaDireta({ usuarioId: args.usuarioId, clienteId: cliente.id, obraId: obra.id, descricao: args.descricao?.trim() || `Venda direta — ${obra.nome}`, canalOrigem: 'PRESENCIAL' });
    await this.pedidos.save(pedido);
    await this.sync.enqueue('CRIAR', 'Pedido', pedido.id, JSON.stringify({ vendaDireta: true }));
    return pedido;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/core/application/__tests__/VendaDireta.test.ts --verbose`
Expected: PASS (3 passed).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/core/application/usecases/VendaDiretaUseCase.ts src/core/application/__tests__/VendaDireta.test.ts
git commit -m "feat(app): add VendaDiretaUseCase RF26 com Balcao"
```

---

### Task 7: Evento Use Cases (+ LocationGateway fake)

**Files:**
- Create: `src/core/application/usecases/CadastrarEventoUseCase.ts`
- Create: `src/core/application/usecases/EditarEventoUseCase.ts`
- Create: `src/core/application/usecases/RemoverEventoUseCase.ts`
- Create: `src/core/application/usecases/ListarEventosUseCase.ts`
- Test: `src/core/application/__tests__/EventoUseCases.test.ts`

**Interfaces:**
- Consumes: `IEventoRepository, ILocationGateway, ISyncGateway` + `Evento, Coordenada`.
- Produces: `CadastrarEventoUseCase.execute({usuarioId,nome,data,endereco,localizacao?,usarGps?,observacoes?}): Promise<Evento>` (se `usarGps=true`, resolve via `ILocationGateway.getCurrent()`; se gateway negar, lança instrução manual — UC13 FA1); `EditarEventoUseCase.execute({eventoId,nome,data,endereco,localizacao,observacoes}): Promise<Evento>`; `RemoverEventoUseCase.execute({eventoId,confirmado}): Promise<void>`; `ListarEventosUseCase.execute({usuarioId}): Promise<Evento[]>`.

- [ ] **Step 1: Escrever testes**

```ts
import { InMemoryEventoRepository } from '../../infrastructure/database/memory/InMemoryEventoRepository';
import { FakeSyncGateway } from '../../infrastructure/device/FakeSyncGateway';
import { FakeLocationGateway } from '../../infrastructure/device/FakeLocationGateway';
import { CadastrarEventoUseCase } from '../usecases/CadastrarEventoUseCase';
import { RemoverEventoUseCase } from '../usecases/RemoverEventoUseCase';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';

describe('Evento use cases', () => {
  it('cadastrar com pin manual + enfileira', async () => {
    const repo = new InMemoryEventoRepository(); const sync = new FakeSyncGateway();
    const gps = new FakeLocationGateway();
    const uc = new CadastrarEventoUseCase(repo, sync, gps);
    const e = await uc.execute({ usuarioId: 'u1', nome: 'Feira', data: new Date('2026-10-12'), endereco: 'Praça', localizacao: new Coordenada(0, 0) });
    expect(e.nome).toBe('Feira');
    expect(sync.queue[0]).toMatchObject({ entidade: 'Evento', tipo: 'CRIAR' });
  });

  it('cadastrar com GPS resolve coordenada via gateway', async () => {
    const repo = new InMemoryEventoRepository(); const sync = new FakeSyncGateway();
    const gps = new FakeLocationGateway(new Coordenada(1, 1));
    const uc = new CadastrarEventoUseCase(repo, sync, gps);
    const e = await uc.execute({ usuarioId: 'u1', nome: 'Feira GPS', data: new Date('2026-10-12'), endereco: 'x', usarGps: true });
    expect(e.localizacao.latitude).toBe(1);
  });

  it('remover sem confirmado aborta (Review Focus)', async () => {
    const repo = new InMemoryEventoRepository(); const sync = new FakeSyncGateway();
    const gps = new FakeLocationGateway();
    const cad = new CadastrarEventoUseCase(repo, sync, gps);
    const e = await cad.execute({ usuarioId: 'u1', nome: 'F', data: new Date('2026-10-12'), endereco: 'x', localizacao: new Coordenada(0, 0) });
    const rem = new RemoverEventoUseCase(repo, sync);
    await expect(rem.execute({ eventoId: e.id, confirmado: false })).rejects.toThrow(/confirma/i);
    expect(await repo.findById(e.id)).not.toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/core/application/__tests__/EventoUseCases.test.ts --verbose`
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implementar**

```ts
// CadastrarEventoUseCase.ts
import { Evento } from '../../domain/entities/Evento';
import { Coordenada } from '../../domain/value-objects/Coordenada';
import type { IEventoRepository } from '../repositories/IEventoRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { ILocationGateway } from '../gateways/ILocationGateway';

export class CadastrarEventoUseCase {
  constructor(private eventos: IEventoRepository, private sync: ISyncGateway, private gps: ILocationGateway) {}
  async execute(args: { usuarioId: string; nome: string; data: Date; endereco: string; localizacao?: Coordenada; usarGps?: boolean; observacoes?: string }): Promise<Evento> {
    let ponto = args.localizacao;
    if (args.usarGps) ponto = await this.gps.getCurrent();
    if (!ponto) throw new Error('Localização do evento é obrigatória (use GPS ou posicione o pin)');
    const e = Evento.criar({ usuarioId: args.usuarioId, nome: args.nome, data: args.data, endereco: args.endereco, localizacao: ponto, observacoes: args.observacoes });
    await this.eventos.save(e);
    await this.sync.enqueue('CRIAR', 'Evento', e.id, JSON.stringify({ nome: e.nome }));
    return e;
  }
}

// EditarEventoUseCase.ts
import { Coordenada } from '../../domain/value-objects/Coordenada';
import type { IEventoRepository } from '../repositories/IEventoRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';
import type { Evento } from '../../domain/entities/Evento';

export class EditarEventoUseCase {
  constructor(private eventos: IEventoRepository, private sync: ISyncGateway) {}
  async execute(args: { eventoId: string; nome: string; data: Date; endereco: string; localizacao: Coordenada; observacoes: string }): Promise<Evento> {
    const e = await this.eventos.findById(args.eventoId);
    if (!e) throw new Error('Evento não encontrado');
    e.editar(args.nome, args.data, args.endereco, args.localizacao, args.observacoes);
    await this.eventos.save(e);
    await this.sync.enqueue('EDITAR', 'Evento', e.id, JSON.stringify({ nome: e.nome }));
    return e;
  }
}

// RemoverEventoUseCase.ts
import type { IEventoRepository } from '../repositories/IEventoRepository';
import type { ISyncGateway } from '../gateways/ISyncGateway';

export class RemoverEventoUseCase {
  constructor(private eventos: IEventoRepository, private sync: ISyncGateway) {}
  async execute(args: { eventoId: string; confirmado: boolean }): Promise<void> {
    if (!args.confirmado) throw new Error('Remoção não confirmada');
    const e = await this.eventos.findById(args.eventoId);
    if (!e) throw new Error('Evento não encontrado');
    e.cancelar();
    await this.eventos.save(e);
    await this.sync.enqueue('DELETAR', 'Evento', e.id, JSON.stringify({}));
  }
}

// ListarEventosUseCase.ts
import type { Evento } from '../../domain/entities/Evento';
import type { IEventoRepository } from '../repositories/IEventoRepository';

export class ListarEventosUseCase {
  constructor(private eventos: IEventoRepository) {}
  async execute(args: { usuarioId: string }): Promise<Evento[]> {
    return this.eventos.findByUsuario(args.usuarioId);
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/core/application/__tests__/EventoUseCases.test.ts --verbose`
Expected: PASS (3 passed).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/core/application/usecases/CadastrarEventoUseCase.ts src/core/application/usecases/EditarEventoUseCase.ts src/core/application/usecases/RemoverEventoUseCase.ts src/core/application/usecases/ListarEventosUseCase.ts src/core/application/__tests__/EventoUseCases.test.ts
git commit -m "feat(app): add evento usecases com GPS fake"
```

---

### Task 8: Auth Use Cases (Login / Logout / Sessão)

**Files:**
- Create: `src/core/application/usecases/LoginUseCase.ts`
- Create: `src/core/application/usecases/LogoutUseCase.ts`
- Test: `src/core/application/__tests__/AuthUseCases.test.ts`

**Interfaces:**
- Consumes: `IAuthGateway` (Task 1, `FakeAuthGateway` com `artesao@email.com/123456`).
- Produces: `LoginUseCase.execute({email,password}): Promise<{userId,token}>` (normaliza trim+lower — Review Focus); `LogoutUseCase.execute(): Promise<void>`; sessão lida via `gateway.getSession()` (UC01 FA3).

- [ ] **Step 1: Escrever testes**

```ts
import { FakeAuthGateway } from '../../infrastructure/device/FakeAuthGateway';
import { LoginUseCase } from '../usecases/LoginUseCase';
import { LogoutUseCase } from '../usecases/LogoutUseCase';

describe('Auth use cases', () => {
  it('login válido retorna sessão (UC01 fluxo principal)', async () => {
    const gw = new FakeAuthGateway();
    const uc = new LoginUseCase(gw);
    const s = await uc.execute({ email: 'artesao@email.com', password: '123456' });
    expect(s.userId).toBeTruthy();
    expect(await gw.getSession()).not.toBeNull();
  });

  it('normaliza e-mail com espaços/caixa (Review Focus)', async () => {
    const gw = new FakeAuthGateway();
    const uc = new LoginUseCase(gw);
    const s = await uc.execute({ email: '  ARTESAO@Email.com  ', password: '123456' });
    expect(s.userId).toBeTruthy();
  });

  it('credencial inválida lança mensagem UC01 FA1', async () => {
    const gw = new FakeAuthGateway();
    const uc = new LoginUseCase(gw);
    await expect(uc.execute({ email: 'artesao@email.com', password: 'errada' })).rejects.toThrow(/incorretos/i);
  });

  it('logout limpa sessão (UC02)', async () => {
    const gw = new FakeAuthGateway();
    await new LoginUseCase(gw).execute({ email: 'artesao@email.com', password: '123456' });
    await new LogoutUseCase(gw).execute();
    expect(await gw.getSession()).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/core/application/__tests__/AuthUseCases.test.ts --verbose`
Expected: FAIL "Cannot find module".

- [ ] **Step 3: Implementar**

```ts
// LoginUseCase.ts
import type { IAuthGateway, AuthSession } from '../gateways/IAuthGateway';

export class LoginUseCase {
  constructor(private auth: IAuthGateway) {}
  async execute(args: { email: string; password: string }): Promise<AuthSession> {
    const email = args.email.trim().toLowerCase();
    if (!email || !args.password) throw new Error('E-mail e senha são obrigatórios');
    return this.auth.login(email, args.password);
  }
}

// LogoutUseCase.ts
import type { IAuthGateway } from '../gateways/IAuthGateway';

export class LogoutUseCase {
  constructor(private auth: IAuthGateway) {}
  async execute(): Promise<void> {
    await this.auth.logout();
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/core/application/__tests__/AuthUseCases.test.ts --verbose`
Expected: PASS (4 passed).

- [ ] **Step 5: Rodar suíte application completa + checagem de arquitetura**

Run: `npx jest src/core/application --verbose`
Expected: PASS (7 arquivos).

Run: `npm run typecheck && ! grep -r "expo-camera\|expo-location\|expo-sqlite\|supabase-js\|drizzle-orm\|from 'react'" src/core/application || echo "VIOLACAO"`
Expected: grep não acha nada.

- [ ] **Step 6: Commit**

```bash
git add src/core/application/usecases/LoginUseCase.ts src/core/application/usecases/LogoutUseCase.ts src/core/application/__tests__/AuthUseCases.test.ts
git commit -m "feat(app): add auth usecases login logout"
```
