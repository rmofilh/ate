# Domínio ate — Entities + Value Objects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o núcleo puro de domínio do app ate (Cliente, Pedido, Obra, Evento, Coordenada, enums, erros) com TDD, sem nenhuma dependência externa.

**Architecture:** Domain puro em TypeScript sob `src/core/domain/`; cada entity é classe com factories estáticas (`criar`, `criarVendaDireta`, `balcao`) e métodos que lançam erros de domínio ao violar regras; nenhum import fora de `domain/`; testes Jest puros sem mock.

**Tech Stack:** Expo (blank-typescript) + TypeScript strict + Jest + jest-expo + `uuid` (v4) para IDs client-generated.

**Spec:** `docs/ate-fase2.md` (Seções 3.1, 3.2, 5.1, 5.2, 10.1, 10.2 Fase 1 + 5 casos RF25/RF26) e `docs/ate-fase1.md` (Seções 1, 5, Decisões #7, #8, #13).

## Global Constraints

- IDs são UUID v4 gerados no dispositivo, usados como PK tanto no SQLite quanto no Supabase.
- `canal_origem` valores fixos: `INSTAGRAM`, `WHATSAPP`, `PRESENCIAL`, `TELEFONE`, `OUTROS`.
- `status` de Pedido valores: `A_FAZER`, `FAZENDO`, `FEITO`.
- `tipo` de Obra valores: `UNICA`, `SERIE`.
- `status_obra` valores: `DISPONIVEL`, `RESERVADA`, `ENTREGUE`, `ARQUIVADA`; `RESERVADA` válido somente para `tipo = UNICA`.
- `status_sync` valores: `PENDENTE`, `SINCRONIZADO`, `ERRO`.
- `tipo_operacao` valores: `CRIAR`, `EDITAR`, `DELETAR`.
- Foto obrigatória para mover Fazendo → Feito é regra rígida sem bypass, exceto `venda_direta=true` + `SERIE` em venda direta (UC27/RF26, Decisão #13).
- `Coordenada` valida `latitude` ∈ [-90, 90] e `longitude` ∈ [-180, 180], persistida como colunas embutidas `latitude`/`longitude`.
- Todo dado operacional é escopado por `usuario_id` (`auth.uid()`); exatamente um usuário autenticado; sem entidade `negocio`/workspace.
- Nenhum arquivo em `src/core/domain/` importa `expo-camera`, `expo-location`, `expo-sqlite`, `drizzle-orm`, `@supabase/supabase-js` ou `react`.
- Volume estimado < 30 obras/ano; sem paginação; sem rotina de limpeza automática (RNF13).
- Vocabulário de test double: fake = implementação em memória, mock = substitui SDK e verifica chamada, stub = resposta fixa (este plano usa nenhum double — só asserts puros).

## Review Focus

- Strings só-espaços (`"   "`) em nome/descrição/endereço/contato deveriam ser rejeitadas como vazias, não aceitas silenciosamente.
- Quantidade `NaN`, `Infinity` ou float (ex: `1.5`) em `adicionarUnidades`/`removerUnidades` deveria lançar erro em vez de corromper o estoque.
- `dataEntrega` inválida (`new Date('invalida')`, `NaN` time) deveria lançar erro em vez de persistir data quebrada.
- Chamar `moverParaFazendo`/`concluir`/`editar`/`vincularObra` após `cancelar()` (soft-delete com `deletedAt` preenchido) deveria lançar erro em vez de ressuscitar o registro.
- `Coordenada` com `NaN`, `Infinity` ou `-0` disfarçado deveria ser inválida mesmo que a comparação de range pareça passar.

---

## File Map (o que cada arquivo é responsável por)

- `package.json` — deps: `expo`, `jest-expo`, `jest`, `typescript`, `uuid`. Scripts `test`, `typecheck`.
- `tsconfig.json` — strict true, `moduleResolution: bundler`, inclui `src/**/*`.
- `jest.config.js` — `preset: 'jest-expo'`, `testMatch: ['**/__tests__/**/*.test.ts']`.
- `src/core/domain/enums/CanalOrigem.ts` — `export type CanalOrigem = 'INSTAGRAM'|'WHATSAPP'|'PRESENCIAL'|'TELEFONE'|'OUTROS'`.
- `src/core/domain/enums/StatusPedido.ts` — `export type StatusPedido = 'A_FAZER'|'FAZENDO'|'FEITO'`.
- `src/core/domain/enums/TipoObra.ts` — `export type TipoObra = 'UNICA'|'SERIE'`.
- `src/core/domain/enums/StatusObra.ts` — `export type StatusObra = 'DISPONIVEL'|'RESERVADA'|'ENTREGUE'|'ARQUIVADA'`.
- `src/core/domain/enums/StatusSync.ts` — `export type StatusSync = 'PENDENTE'|'SINCRONIZADO'|'ERRO'`.
- `src/core/domain/enums/TipoOperacao.ts` — `export type TipoOperacao = 'CRIAR'|'EDITAR'|'DELETAR'`.
- `src/core/domain/errors/DomainErrors.ts` — `DomainError`, `ObraInvalidaError`, `PedidoInvalidoError`, `ClienteInvalidoError`, `EventoInvalidoError`, `CoordenadaInvalidaError`.
- `src/core/domain/value-objects/Coordenada.ts` — VO imutável `{latitude, longitude}`, `static validar(lat,lng): boolean`, constructor lança `CoordenadaInvalidaError`.
- `src/core/domain/entities/Cliente.ts` — `Cliente.criar()`, `Cliente.balcao()`, `editar()`, soft-delete via `marcarRemovido()`.
- `src/core/domain/entities/Obra.ts` — `Obra.criar()`, `reservar/liberar/darBaixa/adicionarUnidades/decrementarUnidades/incrementarUnidades/removerUnidades/arquivar/editar`.
- `src/core/domain/entities/Pedido.ts` — `Pedido.criar()`, `Pedido.criarVendaDireta()`, `moverParaFazendo/concluir/editar/vincularObra/cancelar`.
- `src/core/domain/entities/Evento.ts` — `Evento.criar()`, `editar()`, `cancelar()` (soft-delete).
- `src/core/domain/__tests__/EnumsErrors.test.ts` — trava valores literais dos enums e herança dos erros.
- `src/core/domain/__tests__/Coordenada.test.ts` — range, NaN/Infinity, construtor.
- `src/core/domain/__tests__/Cliente.test.ts` — criar/editar/Cliente Avulso/whitespace/soft-delete.
- `src/core/domain/__tests__/Obra.test.ts` — todas as transições 5.2 + RF25.
- `src/core/domain/__tests__/Pedido.test.ts` — todas as transições 5.1 + RF26 + guarda de foto.
- `src/core/domain/__tests__/Evento.test.ts` — criar/editar/cancelar + Coordenada integrada.

---

### Task 1: Setup Expo + TypeScript + Jest

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `jest.config.js`
- Test: `src/core/domain/__tests__/smoke.test.ts` (trava que o setup funciona)

**Interfaces:**
- Consumes: nada (primeira tarefa).
- Produces: scripts `npm test` (`jest --verbose`) e `npm run typecheck` (`tsc --noEmit`) que as Tasks 2–7 usam.

- [ ] **Step 1: Criar package.json com deps mínimas**

```json
{
  "name": "ate",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "test": "jest --verbose",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "expo": "~51.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/jest": "^29.5.0",
    "@types/uuid": "^9.0.0",
    "jest": "^29.7.0",
    "jest-expo": "~51.0.0"
  }
}
```

- [ ] **Step 2: Criar tsconfig.json strict**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-native",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Criar jest.config.js com preset jest-expo**

```js
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts'],
  testTimeout: 10000,
};
```

- [ ] **Step 4: Escrever smoke test que falha sem setup**

```ts
describe('setup', () => {
  it('executa Jest com TypeScript', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Salvar em `src/core/domain/__tests__/smoke.test.ts`.

- [ ] **Step 5: Instalar e rodar para ver falhar/passar**

Run: `npm install && npx jest src/core/domain/__tests__/smoke.test.ts --verbose`
Expected: PASS (se FAIL por preset ausente, corrigir versão do `jest-expo` para a do `expo` instalado e repetir).

- [ ] **Step 6: Rodar typecheck**

Run: `npm run typecheck`
Expected: PASS sem erros.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json jest.config.js src/core/domain/__tests__/smoke.test.ts
git commit -m "chore: setup expo typescript jest-expo"
```

---

### Task 2: Enums + Erros de domínio

**Files:**
- Create: `src/core/domain/enums/CanalOrigem.ts`
- Create: `src/core/domain/enums/StatusPedido.ts`
- Create: `src/core/domain/enums/TipoObra.ts`
- Create: `src/core/domain/enums/StatusObra.ts`
- Create: `src/core/domain/enums/StatusSync.ts`
- Create: `src/core/domain/enums/TipoOperacao.ts`
- Create: `src/core/domain/errors/DomainErrors.ts`
- Test: `src/core/domain/__tests__/EnumsErrors.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: tipos literais e classes de erro que Tasks 3–7 importam com estes nomes exatos:
  `CanalOrigem, StatusPedido, TipoObra, StatusObra, StatusSync, TipoOperacao, DomainError, ObraInvalidaError, PedidoInvalidoError, ClienteInvalidoError, EventoInvalidoError, CoordenadaInvalidaError`.

- [ ] **Step 1: Escrever teste travando literais e herança**

```ts
import { DomainError, ObraInvalidaError, PedidoInvalidoError, CoordenadaInvalidaError } from '../errors/DomainErrors';

describe('enums + errors', () => {
  it('canal origem aceita os 5 valores fixos', () => {
    const valores: string[] = ['INSTAGRAM', 'WHATSAPP', 'PRESENCIAL', 'TELEFONE', 'OUTROS'];
    expect(valores).toHaveLength(5);
  });

  it('erros de domínio herdam de DomainError e Error', () => {
    const e = new ObraInvalidaError('x');
    expect(e).toBeInstanceOf(DomainError);
    expect(e).toBeInstanceOf(Error);
    expect(new PedidoInvalidoError('y').name).toBe('PedidoInvalidoError');
    expect(new CoordenadaInvalidaError('z').name).toBe('CoordenadaInvalidaError');
  });
});
```

Salvar em `src/core/domain/__tests__/EnumsErrors.test.ts`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/core/domain/__tests__/EnumsErrors.test.ts --verbose`
Expected: FAIL com "Cannot find module '../errors/DomainErrors'".

- [ ] **Step 3: Criar os 6 arquivos de enum (conteúdo literal)**

`src/core/domain/enums/CanalOrigem.ts`:
```ts
export type CanalOrigem = 'INSTAGRAM' | 'WHATSAPP' | 'PRESENCIAL' | 'TELEFONE' | 'OUTROS';
export const CANAIS_ORIGEM: CanalOrigem[] = ['INSTAGRAM', 'WHATSAPP', 'PRESENCIAL', 'TELEFONE', 'OUTROS'];
```

`src/core/domain/enums/StatusPedido.ts`:
```ts
export type StatusPedido = 'A_FAZER' | 'FAZENDO' | 'FEITO';
```

`src/core/domain/enums/TipoObra.ts`:
```ts
export type TipoObra = 'UNICA' | 'SERIE';
```

`src/core/domain/enums/StatusObra.ts`:
```ts
export type StatusObra = 'DISPONIVEL' | 'RESERVADA' | 'ENTREGUE' | 'ARQUIVADA';
```

`src/core/domain/enums/StatusSync.ts`:
```ts
export type StatusSync = 'PENDENTE' | 'SINCRONIZADO' | 'ERRO';
```

`src/core/domain/enums/TipoOperacao.ts`:
```ts
export type TipoOperacao = 'CRIAR' | 'EDITAR' | 'DELETAR';
```

- [ ] **Step 4: Criar DomainErrors.ts**

```ts
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
export class ObraInvalidaError extends DomainError {}
export class PedidoInvalidoError extends DomainError {}
export class ClienteInvalidoError extends DomainError {}
export class EventoInvalidoError extends DomainError {}
export class CoordenadaInvalidaError extends DomainError {}
```

Salvar em `src/core/domain/errors/DomainErrors.ts`.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx jest src/core/domain/__tests__/EnumsErrors.test.ts --verbose`
Expected: PASS (2 passed).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/domain/enums src/core/domain/errors src/core/domain/__tests__/EnumsErrors.test.ts
git commit -m "feat(domain): add enums e erros de dominio"
```

---

### Task 3: Value Object Coordenada

**Files:**
- Create: `src/core/domain/value-objects/Coordenada.ts`
- Test: `src/core/domain/__tests__/Coordenada.test.ts`

**Interfaces:**
- Consumes: `CoordenadaInvalidaError` da Task 2.
- Produces: `Coordenada` com `constructor(latitude:number, longitude:number)`, `readonly latitude/longitude`, `static validar(lat:number,lng:number): boolean` — consumido pela Task 7 (Evento).

- [ ] **Step 1: Escrever teste failing (range + NaN/Infinity + Review Focus)**

```ts
import { Coordenada } from '../value-objects/Coordenada';

describe('Coordenada', () => {
  it('aceita ponto válido de feira', () => {
    const c = new Coordenada(-23.5505, -46.6333);
    expect(c.latitude).toBe(-23.5505);
    expect(c.longitude).toBe(-46.6333);
  });

  it('validar() rejeita latitude fora de [-90,90]', () => {
    expect(Coordenada.validar(-91, 0)).toBe(false);
    expect(Coordenada.validar(90.0001, 0)).toBe(false);
    expect(Coordenada.validar(90, 180)).toBe(true);
  });

  it('construtor lança em longitude fora de [-180,180]', () => {
    expect(() => new Coordenada(0, 181)).toThrow(/longitude/i);
  });

  it('Review Focus: rejeita NaN e Infinity', () => {
    expect(Coordenada.validar(NaN, 0)).toBe(false);
    expect(Coordenada.validar(0, Infinity)).toBe(false);
    expect(() => new Coordenada(NaN, 0)).toThrow();
    expect(() => new Coordenada(0, Infinity)).toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/core/domain/__tests__/Coordenada.test.ts --verbose`
Expected: FAIL "Cannot find module '../value-objects/Coordenada'".

- [ ] **Step 3: Implementação mínima (com guarda Number.isFinite)**

```ts
import { CoordenadaInvalidaError } from '../errors/DomainErrors';

export class Coordenada {
  readonly latitude: number;
  readonly longitude: number;

  constructor(latitude: number, longitude: number) {
    if (!Coordenada.validar(latitude, longitude)) {
      throw new CoordenadaInvalidaError(
        `Coordenada inválida: latitude ${String(latitude)} longitude ${String(longitude)}`
      );
    }
    this.latitude = latitude;
    this.longitude = longitude;
  }

  static validar(latitude: number, longitude: number): boolean {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/core/domain/__tests__/Coordenada.test.ts --verbose`
Expected: PASS (4 passed).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/core/domain/value-objects/Coordenada.ts src/core/domain/__tests__/Coordenada.test.ts
git commit -m "feat(domain): add Coordenada com validacao de range"
```

---

### Task 4: Entity Cliente (+ Cliente Avulso)

**Files:**
- Create: `src/core/domain/entities/Cliente.ts`
- Test: `src/core/domain/__tests__/Cliente.test.ts`

**Interfaces:**
- Consumes: `StatusSync` (Task 2).
- Produces: `ClienteProps`, `Cliente` com `static criar({usuarioId,nome,contato}): Cliente`, `static balcao(usuarioId): Cliente`, `editar(nome,contato): void`, `marcarRemovido(): void`, getters `id/usuarioId/nome/contato/statusSync/criadoEmLocal/deletedAt` — consumido pelo Plano 2 (`CadastrarClienteUseCase`, `VendaDiretaUseCase` via `findBalcaoByUsuario`).

- [ ] **Step 1: Escrever testes (criar, whitespace, editar, Cliente Avulso, soft-delete)**

```ts
import { Cliente } from '../entities/Cliente';

const usuarioId = 'a1111111-1111-4111-8111-111111111111';

describe('Cliente', () => {
  it('cria com PENDENTE e sem deletedAt', () => {
    const c = Cliente.criar({ usuarioId, nome: 'João da Silva', contato: '(11) 99999-9999' });
    expect(c.nome).toBe('João da Silva');
    expect(c.statusSync).toBe('PENDENTE');
    expect(c.deletedAt).toBeNull();
    expect(c.usuarioId).toBe(usuarioId);
  });

  it('rejeita nome vazio ou só-espaços (Review Focus)', () => {
    expect(() => Cliente.criar({ usuarioId, nome: '', contato: 'x' })).toThrow(/nome/i);
    expect(() => Cliente.criar({ usuarioId, nome: '   ', contato: 'x' })).toThrow(/nome/i);
  });

  it('editar() troca nome/contato e volta para PENDENTE', () => {
    const c = Cliente.criar({ usuarioId, nome: 'João', contato: 'a' });
    c.editar('João Editado', '(11) 98888-8888');
    expect(c.nome).toBe('João Editado');
    expect(c.statusSync).toBe('PENDENTE');
  });

  it('balcao() cria Cliente Avulso único por usuario', () => {
    const b = Cliente.balcao(usuarioId);
    expect(b.nome).toBe('Cliente Avulso');
    expect(b.usuarioId).toBe(usuarioId);
  });

  it('marcarRemovido() preenche deletedAt (soft delete)', () => {
    const c = Cliente.criar({ usuarioId, nome: 'X', contato: 'y' });
    expect(c.deletedAt).toBeNull();
    c.marcarRemovido();
    expect(c.deletedAt).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/core/domain/__tests__/Cliente.test.ts --verbose`
Expected: FAIL "Cannot find module '../entities/Cliente'".

- [ ] **Step 3: Implementação mínima**

```ts
import { v4 as uuidv4 } from 'uuid';
import type { StatusSync } from '../enums/StatusSync';
import { ClienteInvalidoError } from '../errors/DomainErrors';

export interface ClienteProps {
  id: string;
  usuarioId: string;
  nome: string;
  contato: string;
  statusSync: StatusSync;
  criadoEmLocal: Date;
  deletedAt: Date | null;
}

export class Cliente {
  private _props: ClienteProps;

  constructor(props: ClienteProps) {
    this._props = { ...props };
  }

  static criar(args: { usuarioId: string; nome: string; contato: string }): Cliente {
    const nome = args.nome.trim();
    if (!nome) throw new ClienteInvalidoError('Nome do cliente é obrigatório');
    if (!args.usuarioId.trim()) throw new ClienteInvalidoError('usuarioId é obrigatório');
    return new Cliente({
      id: uuidv4(),
      usuarioId: args.usuarioId,
      nome,
      contato: args.contato,
      statusSync: 'PENDENTE',
      criadoEmLocal: new Date(),
      deletedAt: null,
    });
  }

  static balcao(usuarioId: string): Cliente {
    return Cliente.criar({ usuarioId, nome: 'Cliente Avulso', contato: '' });
  }

  get id(): string { return this._props.id; }
  get usuarioId(): string { return this._props.usuarioId; }
  get nome(): string { return this._props.nome; }
  get contato(): string { return this._props.contato; }
  get statusSync(): StatusSync { return this._props.statusSync; }
  get criadoEmLocal(): Date { return this._props.criadoEmLocal; }
  get deletedAt(): Date | null { return this._props.deletedAt; }

  editar(nome: string, contato: string): void {
    this.assertVivo();
    const n = nome.trim();
    if (!n) throw new ClienteInvalidoError('Nome do cliente é obrigatório');
    this._props.nome = n;
    this._props.contato = contato;
    this._props.statusSync = 'PENDENTE';
  }

  marcarRemovido(): void {
    this._props.deletedAt = new Date();
    this._props.statusSync = 'PENDENTE';
  }

  private assertVivo(): void {
    if (this._props.deletedAt !== null) throw new ClienteInvalidoError('Cliente removido não pode ser editado');
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/core/domain/__tests__/Cliente.test.ts --verbose`
Expected: PASS (5 passed).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/core/domain/entities/Cliente.ts src/core/domain/__tests__/Cliente.test.ts
git commit -m "feat(domain): add Cliente com Balcao e soft delete"
```

---

### Task 5: Entity Obra (ciclo de vida + RF25 removerUnidades)

**Files:**
- Create: `src/core/domain/entities/Obra.ts`
- Test: `src/core/domain/__tests__/Obra.test.ts`

**Interfaces:**
- Consumes: `TipoObra, StatusObra, StatusSync` + `ObraInvalidaError` (Task 2).
- Produces: `ObraProps`, `Obra` com `static criar({usuarioId,nome,tipo,quantidade?,fotoPath?})`, `reservar/liberar/darBaixa/adicionarUnidades/decrementarUnidades/incrementarUnidades/removerUnidades/arquivar/editar/marcarRemovido` + getters — consumido pelo Plano 2 (estoque, vincular, venda direta). Regras verbatim da Seção 3.1.

- [ ] **Step 1: Escrever testes de criação e tipo**

```ts
import { Obra } from '../entities/Obra';

const usuarioId = 'a1111111-1111-4111-8111-111111111111';

describe('Obra criar', () => {
  it('UNICA nasce DISPONIVEL com quantidade 1', () => {
    const o = Obra.criar({ usuarioId, nome: 'Águia', tipo: 'UNICA' });
    expect(o.statusObra).toBe('DISPONIVEL');
    expect(o.quantidade).toBe(1);
  });

  it('SERIE exige quantidade > 0', () => {
    expect(() => Obra.criar({ usuarioId, nome: 'Coruja', tipo: 'SERIE', quantidade: 0 })).toThrow(/quantidade/i);
    const o = Obra.criar({ usuarioId, nome: 'Coruja', tipo: 'SERIE', quantidade: 5 });
    expect(o.quantidade).toBe(5);
  });

  it('rejeita nome só-espaços e quantidade float/NaN (Review Focus)', () => {
    expect(() => Obra.criar({ usuarioId, nome: '   ', tipo: 'UNICA' })).toThrow(/nome/i);
    expect(() => Obra.criar({ usuarioId, nome: 'C', tipo: 'SERIE', quantidade: 1.5 })).toThrow();
    expect(() => Obra.criar({ usuarioId, nome: 'C', tipo: 'SERIE', quantidade: NaN })).toThrow();
  });
});
```

- [ ] **Step 2: Escrever testes de transição UNICA**

```ts
describe('Obra UNICA', () => {
  it('reservar() só de DISPONIVEL; liberar() só de RESERVADA; darBaixa() vai a ENTREGUE', () => {
    const o = Obra.criar({ usuarioId, nome: 'A', tipo: 'UNICA' });
    o.reservar();
    expect(o.statusObra).toBe('RESERVADA');
    expect(() => o.reservar()).toThrow();
    o.liberar();
    expect(o.statusObra).toBe('DISPONIVEL');
    o.reservar();
    o.darBaixa();
    expect(o.statusObra).toBe('ENTREGUE');
  });

  it('reservar SERIE lança; decrementar UNICA lança', () => {
    const s = Obra.criar({ usuarioId, nome: 'S', tipo: 'SERIE', quantidade: 3 });
    expect(() => s.reservar()).toThrow();
    const u = Obra.criar({ usuarioId, nome: 'U', tipo: 'UNICA' });
    expect(() => u.decrementarUnidades()).toThrow();
  });
});
```

- [ ] **Step 3: Escrever testes SERIE + RF25 removerUnidades**

```ts
describe('Obra SERIE estoque', () => {
  it('decrementar/incrementar/adicionar operam quantidade', () => {
    const o = Obra.criar({ usuarioId, nome: 'C', tipo: 'SERIE', quantidade: 4 });
    o.decrementarUnidades();
    expect(o.quantidade).toBe(3);
    o.incrementarUnidades();
    expect(o.quantidade).toBe(4);
    o.adicionarUnidades(2);
    expect(o.quantidade).toBe(6);
    expect(() => o.adicionarUnidades(0)).toThrow();
  });

  it('RF25 válido: removerUnidades decrementa e mantém DISPONIVEL mesmo zerando', () => {
    const o = Obra.criar({ usuarioId, nome: 'C', tipo: 'SERIE', quantidade: 2 });
    o.removerUnidades(2);
    expect(o.quantidade).toBe(0);
    expect(o.statusObra).toBe('DISPONIVEL');
  });

  it('RF25 inválido: qtd<=0, qtd>atual ou tipo UNICA lança sem alterar', () => {
    const o = Obra.criar({ usuarioId, nome: 'C', tipo: 'SERIE', quantidade: 2 });
    expect(() => o.removerUnidades(0)).toThrow();
    expect(() => o.removerUnidades(3)).toThrow();
    expect(o.quantidade).toBe(2);
    const u = Obra.criar({ usuarioId, nome: 'U', tipo: 'UNICA' });
    expect(() => u.removerUnidades(1)).toThrow();
  });
});
```

Todos os blocos acima vivem no mesmo arquivo `src/core/domain/__tests__/Obra.test.ts`.

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx jest src/core/domain/__tests__/Obra.test.ts --verbose`
Expected: FAIL "Cannot find module '../entities/Obra'".

- [ ] **Step 5: Implementação mínima completa**

```ts
import { v4 as uuidv4 } from 'uuid';
import type { TipoObra } from '../enums/TipoObra';
import type { StatusObra } from '../enums/StatusObra';
import type { StatusSync } from '../enums/StatusSync';
import { ObraInvalidaError } from '../errors/DomainErrors';

export interface ObraProps {
  id: string;
  usuarioId: string;
  nome: string;
  tipo: TipoObra;
  quantidade: number;
  statusObra: StatusObra;
  fotoPath: string | null;
  statusSync: StatusSync;
  criadoEmLocal: Date;
  deletedAt: Date | null;
}

function assertQtdInteira(qtd: number, campo = 'quantidade'): void {
  if (!Number.isInteger(qtd)) throw new ObraInvalidaError(`${campo} deve ser inteiro`);
}

export class Obra {
  private _props: ObraProps;
  constructor(props: ObraProps) { this._props = { ...props }; }

  static criar(args: { usuarioId: string; nome: string; tipo: TipoObra; quantidade?: number; fotoPath?: string | null }): Obra {
    const nome = args.nome.trim();
    if (!nome) throw new ObraInvalidaError('Nome da obra é obrigatório');
    if (!args.usuarioId.trim()) throw new ObraInvalidaError('usuarioId é obrigatório');
    if (args.tipo === 'UNICA') {
      return new Obra({ id: uuidv4(), usuarioId: args.usuarioId, nome, tipo: 'UNICA', quantidade: 1, statusObra: 'DISPONIVEL', fotoPath: args.fotoPath ?? null, statusSync: 'PENDENTE', criadoEmLocal: new Date(), deletedAt: null });
    }
    const qtd = args.quantidade ?? 0;
    assertQtdInteira(qtd);
    if (qtd <= 0) throw new ObraInvalidaError('Obra em série exige quantidade > 0');
    return new Obra({ id: uuidv4(), usuarioId: args.usuarioId, nome, tipo: 'SERIE', quantidade: qtd, statusObra: 'DISPONIVEL', fotoPath: args.fotoPath ?? null, statusSync: 'PENDENTE', criadoEmLocal: new Date(), deletedAt: null });
  }

  get id(): string { return this._props.id; }
  get usuarioId(): string { return this._props.usuarioId; }
  get nome(): string { return this._props.nome; }
  get tipo(): TipoObra { return this._props.tipo; }
  get quantidade(): number { return this._props.quantidade; }
  get statusObra(): StatusObra { return this._props.statusObra; }
  get fotoPath(): string | null { return this._props.fotoPath; }
  get statusSync(): StatusSync { return this._props.statusSync; }
  get criadoEmLocal(): Date { return this._props.criadoEmLocal; }
  get deletedAt(): Date | null { return this._props.deletedAt; }

  reservar(): void {
    this.assertViva();
    if (this._props.tipo !== 'UNICA' || this._props.statusObra !== 'DISPONIVEL') throw new ObraInvalidaError('reservar() válido somente para UNICA DISPONIVEL');
    this._props.statusObra = 'RESERVADA';
    this._props.statusSync = 'PENDENTE';
  }

  liberar(): void {
    this.assertViva();
    if (this._props.tipo !== 'UNICA' || this._props.statusObra !== 'RESERVADA') throw new ObraInvalidaError('liberar() válido somente para UNICA RESERVADA');
    this._props.statusObra = 'DISPONIVEL';
    this._props.statusSync = 'PENDENTE';
  }

  darBaixa(): void {
    this.assertViva();
    if (this._props.tipo !== 'UNICA') throw new ObraInvalidaError('darBaixa() válido somente para UNICA');
    this._props.statusObra = 'ENTREGUE';
    this._props.statusSync = 'PENDENTE';
  }

  adicionarUnidades(qtd: number): void {
    this.assertViva();
    if (this._props.tipo !== 'SERIE') throw new ObraInvalidaError('adicionarUnidades() válido somente para SERIE');
    assertQtdInteira(qtd, 'qtd');
    if (qtd <= 0) throw new ObraInvalidaError('qtd deve ser > 0');
    this._props.quantidade += qtd;
    this._props.statusSync = 'PENDENTE';
  }

  decrementarUnidades(): void {
    this.assertViva();
    if (this._props.tipo !== 'SERIE') throw new ObraInvalidaError('decrementarUnidades() válido somente para SERIE');
    if (this._props.quantidade <= 0) throw new ObraInvalidaError('Sem estoque para baixa');
    this._props.quantidade -= 1;
    this._props.statusSync = 'PENDENTE';
  }

  incrementarUnidades(): void {
    this.assertViva();
    if (this._props.tipo !== 'SERIE') throw new ObraInvalidaError('incrementarUnidades() válido somente para SERIE');
    this._props.quantidade += 1;
    this._props.statusSync = 'PENDENTE';
  }

  removerUnidades(qtd: number): void {
    this.assertViva();
    if (this._props.tipo !== 'SERIE') throw new ObraInvalidaError('removerUnidades() válido somente para SERIE');
    assertQtdInteira(qtd, 'qtd');
    if (qtd <= 0 || qtd > this._props.quantidade) throw new ObraInvalidaError('qtd deve satisfazer 0 < qtd <= quantidade');
    this._props.quantidade -= qtd;
    this._props.statusObra = 'DISPONIVEL';
    this._props.statusSync = 'PENDENTE';
  }

  arquivar(): void {
    this.assertViva();
    this._props.statusObra = 'ARQUIVADA';
    this._props.statusSync = 'PENDENTE';
  }

  editar(nome: string): void {
    this.assertViva();
    const n = nome.trim();
    if (!n) throw new ObraInvalidaError('Nome da obra é obrigatório');
    this._props.nome = n;
    this._props.statusSync = 'PENDENTE';
  }

  marcarRemovido(): void {
    this._props.deletedAt = new Date();
    this._props.statusSync = 'PENDENTE';
  }

  private assertViva(): void {
    if (this._props.deletedAt !== null) throw new ObraInvalidaError('Obra removida não pode transicionar');
  }
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx jest src/core/domain/__tests__/Obra.test.ts --verbose`
Expected: PASS (7 passed).

- [ ] **Step 7: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/core/domain/entities/Obra.ts src/core/domain/__tests__/Obra.test.ts
git commit -m "feat(domain): add Obra com ciclo UNICA/SERIE e removerUnidades"
```

---

### Task 6: Entity Pedido (Kanban + foto rígida + RF26 venda direta)

**Files:**
- Create: `src/core/domain/entities/Pedido.ts`
- Test: `src/core/domain/__tests__/Pedido.test.ts`

**Interfaces:**
- Consumes: `CanalOrigem, StatusPedido, StatusSync` + `PedidoInvalidoError` (Task 2).
- Produces: `PedidoProps`, `Pedido` com `static criar({usuarioId,clienteId,descricao,canalOrigem,dataEntrega,obraId?})`, `static criarVendaDireta({usuarioId,clienteId,obraId,descricao,canalOrigem})`, `moverParaFazendo/concluir/editar/vincularObra/cancelar` + getters — consumido pelo Plano 2 (`CadastrarPedidoUseCase`, `ConcluirPedidoUseCase`, `VendaDiretaUseCase`).

- [ ] **Step 1: Escrever testes de criação e Kanban básico**

```ts
import { Pedido } from '../entities/Pedido';

const usuarioId = 'a1111111-1111-4111-8111-111111111111';
const clienteId = 'b2222222-2222-4222-8222-222222222222';

function novoPedido() {
  return Pedido.criar({ usuarioId, clienteId, descricao: 'Águia personalizada', canalOrigem: 'WHATSAPP', dataEntrega: new Date('2026-10-01') });
}

describe('Pedido criar + mover', () => {
  it('nasce A_FAZER sem foto e sem venda direta', () => {
    const p = novoPedido();
    expect(p.status).toBe('A_FAZER');
    expect(p.fotoConclusaoPath).toBeNull();
    expect(p.vendaDireta).toBe(false);
  });

  it('rejeita descrição só-espaços e data inválida (Review Focus)', () => {
    expect(() => Pedido.criar({ usuarioId, clienteId, descricao: '   ', canalOrigem: 'WHATSAPP', dataEntrega: new Date('2026-10-01') })).toThrow(/descri/i);
    expect(() => Pedido.criar({ usuarioId, clienteId, descricao: 'ok', canalOrigem: 'WHATSAPP', dataEntrega: new Date('invalida') })).toThrow(/data/i);
  });

  it('moverParaFazendo só de A_FAZER', () => {
    const p = novoPedido();
    p.moverParaFazendo();
    expect(p.status).toBe('FAZENDO');
    expect(() => p.moverParaFazendo()).toThrow();
  });
});
```

- [ ] **Step 2: Escrever testes da guarda de foto (RNF11 rígida)**

```ts
describe('Pedido concluir (foto rígida)', () => {
  it('exige foto não-nula/não-vazia e status FAZENDO', () => {
    const p = novoPedido();
    expect(() => p.concluir('/tmp/foto.jpg')).toThrow();
    p.moverParaFazendo();
    expect(() => p.concluir(null)).toThrow(/foto/i);
    expect(() => p.concluir('   ')).toThrow(/foto/i);
    p.concluir('/tmp/foto.jpg');
    expect(p.status).toBe('FEITO');
  });
});
```

- [ ] **Step 3: Escrever testes editar/vincular/cancelar + Review Focus pós-delete**

```ts
describe('Pedido editar/vincular/cancelar', () => {
  it('editar só em A_FAZER', () => {
    const p = novoPedido();
    p.editar('Nova desc', new Date('2026-11-01'));
    expect(p.descricao).toBe('Nova desc');
    p.moverParaFazendo();
    expect(() => p.editar('x', new Date('2026-11-01'))).toThrow();
  });

  it('vincularObra só em A_FAZER e uma única vez', () => {
    const p = novoPedido();
    p.vincularObra('d5555555-5555-4555-8555-555555555555');
    expect(p.obraId).toBe('d5555555-5555-4555-8555-555555555555');
    expect(() => p.vincularObra('outra')).toThrow();
  });

  it('cancelar preenche deletedAt; transição após delete lança (Review Focus)', () => {
    const p = novoPedido();
    p.cancelar();
    expect(p.deletedAt).toBeInstanceOf(Date);
    expect(() => p.moverParaFazendo()).toThrow(/removido/i);
    expect(() => p.editar('x', new Date())).toThrow();
  });

  it('criarVendaDireta nasce FEITO com vendaDireta=true sem exigir foto', () => {
    const v = Pedido.criarVendaDireta({ usuarioId, clienteId, obraId: 'd6666666-6666-4666-8666-666666666666', descricao: 'Coruja pronta entrega', canalOrigem: 'PRESENCIAL' });
    expect(v.status).toBe('FEITO');
    expect(v.vendaDireta).toBe(true);
    expect(() => Pedido.criarVendaDireta({ usuarioId, clienteId, obraId: '', descricao: 'x', canalOrigem: 'PRESENCIAL' })).toThrow();
  });
});
```

Todos os blocos no mesmo `src/core/domain/__tests__/Pedido.test.ts`.

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx jest src/core/domain/__tests__/Pedido.test.ts --verbose`
Expected: FAIL "Cannot find module '../entities/Pedido'".

- [ ] **Step 5: Implementação mínima**

```ts
import { v4 as uuidv4 } from 'uuid';
import type { CanalOrigem } from '../enums/CanalOrigem';
import type { StatusPedido } from '../enums/StatusPedido';
import type { StatusSync } from '../enums/StatusSync';
import { PedidoInvalidoError } from '../errors/DomainErrors';

export interface PedidoProps {
  id: string;
  usuarioId: string;
  clienteId: string;
  obraId: string | null;
  descricao: string;
  canalOrigem: CanalOrigem;
  dataEntrega: Date;
  status: StatusPedido;
  fotoConclusaoPath: string | null;
  vendaDireta: boolean;
  statusSync: StatusSync;
  criadoEmLocal: Date;
  deletedAt: Date | null;
}

function assertDataValida(d: Date): void {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) throw new PedidoInvalidoError('dataEntrega inválida');
}

export class Pedido {
  private _props: PedidoProps;
  constructor(props: PedidoProps) { this._props = { ...props }; }

  static criar(args: { usuarioId: string; clienteId: string; descricao: string; canalOrigem: CanalOrigem; dataEntrega: Date; obraId?: string | null }): Pedido {
    const descricao = args.descricao.trim();
    if (!descricao) throw new PedidoInvalidoError('Descrição do pedido é obrigatória');
    if (!args.usuarioId.trim() || !args.clienteId.trim()) throw new PedidoInvalidoError('usuarioId e clienteId são obrigatórios');
    assertDataValida(args.dataEntrega);
    return new Pedido({ id: uuidv4(), usuarioId: args.usuarioId, clienteId: args.clienteId, obraId: args.obraId ?? null, descricao, canalOrigem: args.canalOrigem, dataEntrega: args.dataEntrega, status: 'A_FAZER', fotoConclusaoPath: null, vendaDireta: false, statusSync: 'PENDENTE', criadoEmLocal: new Date(), deletedAt: null });
  }

  static criarVendaDireta(args: { usuarioId: string; clienteId: string; obraId: string; descricao: string; canalOrigem: CanalOrigem }): Pedido {
    if (!args.obraId.trim()) throw new PedidoInvalidoError('vendaDireta exige obraId SERIE');
    const descricao = args.descricao.trim();
    if (!descricao) throw new PedidoInvalidoError('Descrição do pedido é obrigatória');
    return new Pedido({ id: uuidv4(), usuarioId: args.usuarioId, clienteId: args.clienteId, obraId: args.obraId, descricao, canalOrigem: args.canalOrigem, dataEntrega: new Date(), status: 'FEITO', fotoConclusaoPath: null, vendaDireta: true, statusSync: 'PENDENTE', criadoEmLocal: new Date(), deletedAt: null });
  }

  get id(): string { return this._props.id; }
  get usuarioId(): string { return this._props.usuarioId; }
  get clienteId(): string { return this._props.clienteId; }
  get obraId(): string | null { return this._props.obraId; }
  get descricao(): string { return this._props.descricao; }
  get canalOrigem(): CanalOrigem { return this._props.canalOrigem; }
  get dataEntrega(): Date { return this._props.dataEntrega; }
  get status(): StatusPedido { return this._props.status; }
  get fotoConclusaoPath(): string | null { return this._props.fotoConclusaoPath; }
  get vendaDireta(): boolean { return this._props.vendaDireta; }
  get statusSync(): StatusSync { return this._props.statusSync; }
  get criadoEmLocal(): Date { return this._props.criadoEmLocal; }
  get deletedAt(): Date | null { return this._props.deletedAt; }

  moverParaFazendo(): void {
    this.assertVivo();
    if (this._props.status !== 'A_FAZER') throw new PedidoInvalidoError('moverParaFazendo() válido somente de A_FAZER');
    this._props.status = 'FAZENDO';
    this._props.statusSync = 'PENDENTE';
  }

  concluir(fotoPath: string | null | undefined): void {
    this.assertVivo();
    if (this._props.status !== 'FAZENDO') throw new PedidoInvalidoError('concluir() válido somente de FAZENDO');
    if (!fotoPath || !fotoPath.trim()) throw new PedidoInvalidoError('Foto de conclusão é obrigatória (regra rígida)');
    this._props.fotoConclusaoPath = fotoPath;
    this._props.status = 'FEITO';
    this._props.statusSync = 'PENDENTE';
  }

  editar(descricao: string, dataEntrega: Date): void {
    this.assertVivo();
    if (this._props.status !== 'A_FAZER') throw new PedidoInvalidoError('editar() válido somente em A_FAZER');
    const d = descricao.trim();
    if (!d) throw new PedidoInvalidoError('Descrição do pedido é obrigatória');
    assertDataValida(dataEntrega);
    this._props.descricao = d;
    this._props.dataEntrega = dataEntrega;
    this._props.statusSync = 'PENDENTE';
  }

  vincularObra(obraId: string): void {
    this.assertVivo();
    if (this._props.status !== 'A_FAZER') throw new PedidoInvalidoError('vincularObra() válido somente em A_FAZER');
    if (!obraId.trim()) throw new PedidoInvalidoError('obraId é obrigatório');
    if (this._props.obraId !== null) throw new PedidoInvalidoError('pedido já possui obra vinculada');
    this._props.obraId = obraId;
    this._props.statusSync = 'PENDENTE';
  }

  cancelar(): void {
    if (this._props.deletedAt !== null) return;
    this._props.deletedAt = new Date();
    this._props.statusSync = 'PENDENTE';
  }

  private assertVivo(): void {
    if (this._props.deletedAt !== null) throw new PedidoInvalidoError('Pedido removido não pode transicionar');
  }
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx jest src/core/domain/__tests__/Pedido.test.ts --verbose`
Expected: PASS (7 passed).

- [ ] **Step 7: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/core/domain/entities/Pedido.ts src/core/domain/__tests__/Pedido.test.ts
git commit -m "feat(domain): add Pedido com foto rigida e vendaDireta"
```

---

### Task 7: Entity Evento (+ editar/cancelar)

**Files:**
- Create: `src/core/domain/entities/Evento.ts`
- Test: `src/core/domain/__tests__/Evento.test.ts`

**Interfaces:**
- Consumes: `Coordenada` (Task 3), `StatusSync` + `EventoInvalidoError` (Task 2).
- Produces: `EventoProps`, `Evento` com `static criar({usuarioId,nome,data,endereco,localizacao,observacoes?})`, `editar(nome,data,endereco,localizacao,obs)`, `cancelar()` — consumido pelo Plano 2 (`CadastrarEventoUseCase`).

- [ ] **Step 1: Escrever testes**

```ts
import { Evento } from '../entities/Evento';
import { Coordenada } from '../value-objects/Coordenada';

const usuarioId = 'a1111111-1111-4111-8111-111111111111';
const ponto = () => new Coordenada(-23.5505, -46.6333);

describe('Evento', () => {
  it('cria com coordenadas e PENDENTE', () => {
    const e = Evento.criar({ usuarioId, nome: 'Feira da Praça', data: new Date('2026-10-12'), endereco: 'Praça Central, banca 5', localizacao: ponto(), observacoes: 'Levar corujas' });
    expect(e.nome).toBe('Feira da Praça');
    expect(e.localizacao.latitude).toBe(-23.5505);
    expect(e.statusSync).toBe('PENDENTE');
    expect(e.deletedAt).toBeNull();
  });

  it('rejeita nome só-espaços e data inválida', () => {
    expect(() => Evento.criar({ usuarioId, nome: '   ', data: new Date('2026-10-12'), endereco: 'x', localizacao: ponto() })).toThrow(/nome/i);
    expect(() => Evento.criar({ usuarioId, nome: 'F', data: new Date('invalida'), endereco: 'x', localizacao: ponto() })).toThrow(/data/i);
  });

  it('editar() troca todos os campos e cancelar() soft-deleta', () => {
    const e = Evento.criar({ usuarioId, nome: 'F', data: new Date('2026-10-12'), endereco: 'x', localizacao: ponto() });
    e.editar('Feira Nova', new Date('2026-11-01'), 'Rua B, 10', new Coordenada(0, 0), 'obs');
    expect(e.nome).toBe('Feira Nova');
    e.cancelar();
    expect(e.deletedAt).toBeInstanceOf(Date);
    expect(() => e.editar('y', new Date(), 'z', ponto(), '')).toThrow(/removido/i);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/core/domain/__tests__/Evento.test.ts --verbose`
Expected: FAIL "Cannot find module '../entities/Evento'".

- [ ] **Step 3: Implementação mínima**

```ts
import { v4 as uuidv4 } from 'uuid';
import type { StatusSync } from '../enums/StatusSync';
import { EventoInvalidoError } from '../errors/DomainErrors';
import { Coordenada } from '../value-objects/Coordenada';

export interface EventoProps {
  id: string;
  usuarioId: string;
  nome: string;
  data: Date;
  endereco: string;
  localizacao: Coordenada;
  observacoes: string;
  statusSync: StatusSync;
  criadoEmLocal: Date;
  deletedAt: Date | null;
}

export class Evento {
  private _props: EventoProps;
  constructor(props: EventoProps) { this._props = { ...props }; }

  static criar(args: { usuarioId: string; nome: string; data: Date; endereco: string; localizacao: Coordenada; observacoes?: string }): Evento {
    const nome = args.nome.trim();
    if (!nome) throw new EventoInvalidoError('Nome do evento é obrigatório');
    if (!args.usuarioId.trim()) throw new EventoInvalidoError('usuarioId é obrigatório');
    if (!(args.data instanceof Date) || Number.isNaN(args.data.getTime())) throw new EventoInvalidoError('Data do evento inválida');
    if (!(args.localizacao instanceof Coordenada)) throw new EventoInvalidoError('Localização inválida');
    return new Evento({ id: uuidv4(), usuarioId: args.usuarioId, nome, data: args.data, endereco: args.endereco, localizacao: args.localizacao, observacoes: args.observacoes ?? '', statusSync: 'PENDENTE', criadoEmLocal: new Date(), deletedAt: null });
  }

  get id(): string { return this._props.id; }
  get usuarioId(): string { return this._props.usuarioId; }
  get nome(): string { return this._props.nome; }
  get data(): Date { return this._props.data; }
  get endereco(): string { return this._props.endereco; }
  get localizacao(): Coordenada { return this._props.localizacao; }
  get observacoes(): string { return this._props.observacoes; }
  get statusSync(): StatusSync { return this._props.statusSync; }
  get criadoEmLocal(): Date { return this._props.criadoEmLocal; }
  get deletedAt(): Date | null { return this._props.deletedAt; }

  editar(nome: string, data: Date, endereco: string, localizacao: Coordenada, observacoes: string): void {
    if (this._props.deletedAt !== null) throw new EventoInvalidoError('Evento removido não pode ser editado');
    const n = nome.trim();
    if (!n) throw new EventoInvalidoError('Nome do evento é obrigatório');
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) throw new EventoInvalidoError('Data do evento inválida');
    if (!(localizacao instanceof Coordenada)) throw new EventoInvalidoError('Localização inválida');
    this._props.nome = n;
    this._props.data = data;
    this._props.endereco = endereco;
    this._props.localizacao = localizacao;
    this._props.observacoes = observacoes;
    this._props.statusSync = 'PENDENTE';
  }

  cancelar(): void {
    if (this._props.deletedAt !== null) return;
    this._props.deletedAt = new Date();
    this._props.statusSync = 'PENDENTE';
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/core/domain/__tests__/Evento.test.ts --verbose`
Expected: PASS (3 passed).

- [ ] **Step 5: Rodar suíte completa do domínio**

Run: `npx jest src/core/domain --verbose`
Expected: PASS (todos os 6 arquivos, ~26 testes).

- [ ] **Step 6: Checagem de arquitetura (nenhum import proibido)**

Run: `npx tsc --noEmit && ! grep -r "expo-camera\|expo-location\|expo-sqlite\|supabase-js\|drizzle-orm\|from 'react'" src/core/domain || echo "VIOLACAO"`
Expected: imprime `VIOLACAO` invertido — ou seja, grep não acha nada (exit 1) e o `echo` não roda; se imprimir VIOLACAO, corrigir imports.

- [ ] **Step 7: Commit**

```bash
git add src/core/domain/entities/Evento.ts src/core/domain/__tests__/Evento.test.ts
git commit -m "feat(domain): add Evento com Coordenada e soft delete"
```
