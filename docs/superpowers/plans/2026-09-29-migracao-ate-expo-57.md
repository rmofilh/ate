# Migração do ate para o scaffold Expo 57 Implementation Plan

> **Execução aprovada:** Nativa nesta sessão, sem subagentes ou skills adicionais de execução. Implementar tarefa por tarefa, com testes, lint e typecheck incrementais. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transportar o protótipo testado de `../ateII` para o scaffold Expo 57 deste repositório, preservando seus fakes e regras de negócio, com IDs criados fora do domínio e publicação sem force-push na `main` existente.

**Architecture:** O scaffold fornece entry point, configuração raiz, aliases e `src/app/`; as quatro camadas antigas entram em `src/core/`, `src/infrastructure/`, `src/presentation/` e `src/main/`. O domínio recebe UUID v4 validado como argumento; a aplicação pede IDs pela interface `IIdGenerator`, cuja implementação concreta usa `uuid` e bytes de `expo-crypto` na borda. As telas preservam os fakes e fluxos atuais; só rotas, imports, testes e safe areas são ajustados para SDK 57.

**Tech Stack:** Expo `~57.0.26`, Expo Router `~57.0.24`, React `19.2.3`, React Native `0.86.3`, TypeScript `~6.0.3`, npm/package-lock, Jest/jest-expo, React Native Testing Library, `uuid@^11` e `expo-crypto`.

**Spec:** `../ateII/docs/ate-fase1.md` e `../ateII/docs/ate-fase2.md`; mapas de implementação em `../ateII/docs/superpowers/plans/2026-09-21-ate-dominio.md`, `2026-09-21-ate-aplicacao.md` e `2026-09-21-ate-apresentacao.md`. Após a Task 1, os originais também estarão no commit ancestral `7042cac0` do GitHub (`git show 7042cac0:docs/ate-fase1.md` e `git show 7042cac0:docs/ate-fase2.md`): quem clonar só este repositório consegue ler a spec.

## Global Constraints

- **Migração somente do protótipo existente:** infraestrutura em memória, autenticação/câmera/localização/sync fake, pins representados por coordenadas textuais; não adicionar SQLite, Supabase, upload, câmera, GPS, mapa visual ou listener de rede reais nesta entrega. Essas partes estão na spec de produto, mas não no código antigo.
- **A configuração de raiz é do projeto novo:** manter `package.json.main = "expo-router/entry"`, `app.json`, a base `expo/tsconfig.base`, o alias `@/* -> ./src/*`, assets e lockfile novos; apenas acrescentar scripts/deps SDK-compatíveis via `npx expo install`. Nunca importar `../ateII/package.json`, `app.json`, `babel.config.js`, `tsconfig.json` ou `jest.config.js`.
- SDK 57 usa React Native 0.86, React 19.2.3 e requer Node >= 22.13.x; manter suporte Android e iOS e New Architecture padrão, sem criar `android/` ou `ios/`.
- IDs são UUID v4 gerados no dispositivo; PK futura do SQLite/Supabase. `Cliente`, `Obra`, `Pedido`, `Evento` recebem `id` explicitamente; `src/core/domain/` não importa `uuid`, React, Expo ou React Native; `src/core/application/` não importa React/Expo.
- Pedidos: `A_FAZER`, `FAZENDO`, `FEITO`; canal `INSTAGRAM`, `WHATSAPP`, `PRESENCIAL`, `TELEFONE`, `OUTROS`; `FAZENDO → FEITO` exige foto não vazia, exceto `vendaDireta=true` para obra `SERIE`.
- Obras: `UNICA` reserva/entrega/restaura; `SERIE` decrementa/restaura quantidade, aceita venda direta e baixa manual com dupla confirmação; ações destrutivas exigem confirmação explícita.
- Todo dado é escopado por `usuarioId` UUID v4; Cliente Avulso é único por usuário e criado sob demanda; soft delete conserva `deletedAt`; nenhuma operação da UI acessa repositórios diretamente.
- Rotas vivem só em `src/app/`: login público, tabs Kanban/Estoque/Eventos protegidas e stacks de cadastro/edição; preservar labels compreensíveis e orientação de estados vazios. Permissões simuladas só são solicitadas no momento da ação; negativa não trava as outras telas.
- Não trazer `@testing-library/jest-native` nem `react-test-renderer` do projeto React 18 (React 19 não suporta o segundo); testes novos usam Jest/jest-expo e RNTL. Não mudar o conteúdo de `.opencode/` (não rastreado) nem `.claude/` do scaffold.
- Após mover **cada** pedaço, rodar o teste dirigido, suíte migrada até então, `npx tsc --noEmit` e `npx expo lint`; revisar falhas antes de mover o próximo pedaço. Nunca rodar `npm install` cru nem copiar `node_modules`/lockfile antigos.

## Review Focus

1. Um `id` fornecido inválido, ausente ou de versão diferente de v4 precisa ser recusado **antes** de salvar/enfileirar; teste de fábrica na Task 2 e teste de caso de uso na Task 3.
2. Falta de Web Crypto global no ambiente React Native não pode impedir geração de UUID v4; teste com `expo-crypto` simulado e `globalThis.crypto` ausente na Task 4.
3. Dois toques em “Mover para Feito” com câmera cancelada não podem mover o pedido nem duplicar chamadas; teste de fluxo de Kanban na Task 5.
4. A primeira confirmação da baixa de unidades em série não pode baixar estoque; apenas a segunda confirma uma vez, mesmo offline; teste de Estoque na Task 6.
5. Um link para ID de edição desconhecido não pode abrir outro registro ou a tela do último ID visitado; teste de rota e estado “não encontrado” na Task 9.

---

## Mapa de arquivos e responsabilidade

| Destino | Origem / operação | Responsabilidade |
| --- | --- | --- |
| `docs/superpowers/plans/2026-09-29-migracao-ate-expo-57.md` | este plano | roteiro e referências à spec preservada no histórico remoto |
| `package.json`, `package-lock.json` | **editar os novos**, pelo CLI do Expo | manter scaffold; acrescentar testes/lint/deps, nunca versões antigas |
| `eslint.config.js`, `jest.config.js` | criar para SDK 57 | configuração atual do lint flat e do preset `jest-expo`, sem herdar configuração do SDK 51 |
| `src/types/css.d.ts` | criar | declarar imports CSS dos exemplos do scaffold sob TypeScript 6 (linha de base) |
| `src/core/domain/{entities,enums,errors,validation,value-objects}/` | `../ateII/src/core/domain/` | transportar entidades e invariantes; substituir todos os `gerarId()` por `args.id`; **não** trazer `ids/gerarId.ts` |
| `src/core/domain/__tests__/` | mesmo diretório antigo; substituir `IdGeneration.test.ts` por `IdInjection.test.ts` | regressão de regras e novo contrato de ID sem polyfill no domínio |
| `src/core/application/{gateways,repositories,usecases}/` | mesmo diretório antigo; criar `gateways/IIdGenerator.ts` | mesmas portas/casos de uso; seis criadores pedem ID ao gateway |
| `src/core/application/__tests__/` | oito suítes antigas | preservar cenários de clientes, pedidos, estoque, venda direta, eventos, auth e fakes, com ID injetado |
| `src/test-support/ids.ts` | criar | IDs v4 determinísticos para testes puros e stub `idsTeste` |
| `src/infrastructure/database/memory/InMemory{Cliente,Pedido,Obra,Evento}Repository.ts` | quatro arquivos homônimos antigos | fakes in-memory, preservados |
| `src/infrastructure/device/Fake{Auth,Camera,Location,Sync}Gateway.ts` | quatro arquivos homônimos antigos | gateways simulados, preservados |
| `src/infrastructure/device/FakeIdGenerator.ts` | criar | IDs de demo determinísticos para fixtures/testes sem módulos nativos |
| `src/infrastructure/device/UuidIdGenerator.ts` | criar | UUID v4 real com `uuid.v4({ random: getRandomBytes(16) })`, fora do core |
| `src/infrastructure/seed/fixtures.ts` | arquivo antigo | mesma amostra Kanban/Estoque/Eventos, recebendo `IIdGenerator` |
| `src/main/factories/makeFakeProviders.ts` | arquivo antigo | composição dos fakes, IDs reais na instância do app, fixture e casos de uso compartilhando gerador |
| `src/infrastructure/device/__tests__/UuidIdGenerator.test.ts`, `src/main/factories/__tests__/makeFakeProviders.test.ts` | criar | teste de adaptação do UUID e da fiação de DI |
| `src/presentation/hooks/AppProviders.tsx`, `src/presentation/utils/date.ts` | arquivos antigos | Contexts e parser de data, sem acesso a SDK real |
| `src/presentation/components/{ActionButton,ConfirmDialog,OfflineBanner,PedidoCard,ObraCard,EventoCard}.tsx` | arquivos antigos, por tela | componentes visuais preservados; wrappers de safe area somente na borda de tela |
| `src/presentation/__tests__/` | 13 suítes antigas, por tela | preservar cenários RNTL, atualizar imports `../../../app/` → `../../app/` |
| `src/app/_layout.tsx`, `src/app/index.tsx` | substituir exemplos novos, sem mudar entry point | Stack protegido e redirecionamento raiz; aproveitar providers antigos |
| `src/app/explore.tsx` | remover **após** montar navegação | rota de exemplo que tornaria a área pública indevidamente acessível |
| `src/app/(auth)/{_layout,login}.tsx`, `src/app/(tabs)/{_layout,kanban,estoque,eventos}.tsx` | antigo `app/` | telas públicas/tabs; reescrever imports relativos antigos para alias `@/` |
| `src/app/pedido/novo.tsx`, `src/app/pedido/[id]/editar.tsx`, `src/app/cliente/novo.tsx`, `src/app/cliente/[id].tsx`, `src/app/obra/nova.tsx`, `src/app/evento/novo.tsx`, `src/app/evento/[id]/editar.tsx` | antigo `app/` | stacks de formulário e edição com props antigas e URLs equivalentes |
| `README.md` | substituir guia genérico do scaffold | comando de uso/testes e transparência de que se trata de demo com fakes |

**Linha de base já conferida (29/09/2026):** antigo `jest --runInBand --silent`: 31 suítes/150 testes verdes; `tsc --noEmit`: verde. Novo `tsc --noEmit`: 2 erros dos imports `./animated-icon.module.css` e `@/global.css` do exemplo; `expo lint` sem config tentou instalar ESLint automaticamente e falhou ao carregá-lo. Os arquivos de raiz alterados por essa tentativa foram restaurados; `eslint.config.js` criado pela tentativa foi retirado. Planejar e criar a configuração explicitamente na Task 2.

## Tarefas

### Task 1: Ancorar a nova `main` na `main` existente

**Files:** Nenhum arquivo da aplicação; este plano é o único arquivo intencionalmente staged antes do merge. Preserve `.opencode/` não rastreado.

**Interfaces:** Consumes: commits locais `248fdde` (scaffold) e remoto `7042cac0` (`origin/main`). Produces: `main` local com `origin/main` como ancestral e árvore atual ainda igual ao scaffold; permite push fast-forward posterior.

- [ ] **Step 1: Conferir árvore, histórico e remoto antes dos commits**

```bash
git status --short --branch
git diff
git log --oneline -10
git -C ../ateII remote -v
git -C ../ateII ls-remote --heads origin main
```

Expected: repositório novo em `master`, sem `origin`, apenas `.opencode/` e este plano não rastreados; `main` remota é `7042cac0`. Se a hash tiver avançado, ler o diff remoto antes de escolher a base do merge.

- [ ] **Step 2: Versionar somente o plano e renomear o branch local**

```bash
git add docs/superpowers/plans/2026-09-29-migracao-ate-expo-57.md
git diff --cached --check
git commit -m "docs: plan Expo 57 migration"
git branch -m main
```

Expected: `.opencode/` permanece fora do commit; o conteúdo e a configuração raiz do scaffold permanecem iguais.

- [ ] **Step 3: Buscar a `main` remota e integrar a ancestralidade sem copiar a árvore antiga**

```bash
git remote add origin https://github.com/rmofilh/ate.git
git fetch origin main
git merge --allow-unrelated-histories -s ours origin/main -m "chore: connect Expo scaffold to existing main history"
git merge-base --is-ancestor origin/main HEAD
git status --short --branch
git show 7042cac0:docs/ate-fase1.md
```

Expected: merge-base retorna código 0; árvore atual ainda contém `src/app/`, `expo ~57` e `app.json` novo; spec antiga acessível pelo commit ancestral. Não usar `git mv ../ateII/...`: Git não move arquivos rastreados entre dois repositórios independentes. Não fazer push antes da revisão da migração completa.

### Task 2: Harness SDK 57 e domínio com ID fornecido

**Files:** Create `jest.config.js`, `eslint.config.js`, `src/types/css.d.ts`, `src/test-support/ids.ts`, `src/core/domain/**` exceto `ids/gerarId.ts`, `src/core/domain/__tests__/IdInjection.test.ts`; Modify `package.json` somente scripts/deps via Expo; Test as 10 suítes de `src/core/domain/__tests__/` (trocar `IdGeneration.test.ts`).

**Interfaces:** Consumes: código do domínio antigo e aliases do scaffold. Produces: `Cliente.criar({id,usuarioId,nome,contato})`, `Cliente.balcao({id,usuarioId})`, `Obra.criar({id,usuarioId,nome,tipo,quantidade?,fotoPath?})`, `Pedido.criar({id,usuarioId,clienteId,descricao,canalOrigem,dataEntrega,obraId?})`, `Pedido.criarVendaDireta({id,usuarioId,clienteId,obraId,quantidade,descricao,canalOrigem})`, `Evento.criar({id,usuarioId,nome,data,endereco,localizacao,observacoes?})`, retornando as entidades existentes; `gerarIdTeste(): string` para testes posteriores.

- [ ] **Step 1: Instalar harness sem sobrescrever configuração raiz e corrigir somente os imports CSS da linha de base**

```bash
npx expo install jest-expo jest @types/jest @testing-library/react-native eslint eslint-config-expo --dev
```

Acrescentar ao objeto `scripts` do `package.json` **novo** (sem substituir os scripts do Expo):

```json
"test": "jest --runInBand",
"typecheck": "tsc --noEmit"
```

Criar `jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  testTimeout: 10000,
};
```

Criar `eslint.config.js` seguindo a configuração flat do SDK 57:

```js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([expoConfig, { ignores: ['dist/*', 'coverage/*'] }]);
```

Criar `src/types/css.d.ts` (sem substituir `tsconfig.json`):

```ts
declare module '*.css' {
  const classes: Record<string, string>;
  export default classes;
}
```

Run: `npx tsc --noEmit && npx expo lint`. Expected: sem os dois erros de CSS; configuração ESLint carrega sem instalador interativo.

- [ ] **Step 2: Trazer o domínio e as suítes antigas antes de mexer na lógica**

```bash
mkdir -p src/core
cp -R ../ateII/src/core/domain src/core/domain
git status --short
```

Remover **somente na cópia nova** `src/core/domain/ids/gerarId.ts` e `src/core/domain/__tests__/IdGeneration.test.ts`. Manter `validation/uuid.ts`, os quatro arquivos de entities, VO `Coordenada`, enums, erros e as outras nove suítes. O diretório antigo não recebe nenhuma alteração.

- [ ] **Step 3: Escrever teste vermelho para ID explícito v4 e para entrada inválida**

Criar `src/test-support/ids.ts`:

```ts
let proximoId = 0;

export function gerarIdTeste(): string {
  proximoId += 1;
  return `11111111-1111-4111-8111-${proximoId.toString(16).padStart(12, '0')}`;
}
```

Criar `src/core/domain/__tests__/IdInjection.test.ts`:

```ts
import { Cliente } from '../entities/Cliente';
import { Obra } from '../entities/Obra';
import { Pedido } from '../entities/Pedido';
import { Evento } from '../entities/Evento';
import { Coordenada } from '../value-objects/Coordenada';
import { gerarIdTeste } from '../../../test-support/ids';

const usuarioId = 'a1111111-1111-4111-8111-111111111111';
const clienteId = 'b2222222-2222-4222-8222-222222222222';

it('mantém exatamente o UUID v4 fornecido nas quatro entidades', () => {
  const ids = Array.from({ length: 4 }, gerarIdTeste);
  const c = Cliente.criar({ id: ids[0], usuarioId, nome: 'João', contato: 'zap' });
  const o = Obra.criar({ id: ids[1], usuarioId, nome: 'Coruja', tipo: 'UNICA' });
  const p = Pedido.criar({ id: ids[2], usuarioId, clienteId: c.id,
    descricao: 'Encomenda', canalOrigem: 'WHATSAPP', dataEntrega: new Date('2026-11-01') });
  const e = Evento.criar({ id: ids[3], usuarioId, nome: 'Feira',
    data: new Date('2026-11-01'), endereco: 'Rua Um', localizacao: new Coordenada(0, 0) });
  expect([c.id, o.id, p.id, e.id]).toEqual(ids);
  for (const item of [c, o, p, e]) expect(item.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

it('rejeita ID vazio, v1 e não-UUID sem construir entidades', () => {
  expect(() => Cliente.criar({ id: '', usuarioId, nome: 'João', contato: 'zap' })).toThrow(/id.*uuid/i);
  expect(() => Obra.criar({ id: '00000000-0000-1000-8000-000000000001', usuarioId,
    nome: 'Coruja', tipo: 'UNICA' })).toThrow(/id.*uuid/i);
  expect(() => Pedido.criar({ id: 'xxx', usuarioId, clienteId, descricao: 'Peça',
    canalOrigem: 'OUTROS', dataEntrega: new Date('2026-11-01') })).toThrow(/id.*uuid/i);
  expect(() => Evento.criar({ id: '', usuarioId, nome: 'Feira',
    data: new Date('2026-11-01'), endereco: 'Rua Um', localizacao: new Coordenada(0, 0) })).toThrow(/id.*uuid/i);
});

it('aceita o ID externo também no Cliente Avulso e na venda direta', () => {
  const idBalcao = gerarIdTeste();
  const idVenda = gerarIdTeste();
  const obraId = gerarIdTeste();
  const balcao = Cliente.balcao({ id: idBalcao, usuarioId });
  const venda = Pedido.criarVendaDireta({ id: idVenda, usuarioId, clienteId: balcao.id,
    obraId, quantidade: 2, descricao: 'Coruja', canalOrigem: 'PRESENCIAL' });
  expect(balcao.id).toBe(idBalcao);
  expect(venda.id).toBe(idVenda);
  expect(() => Cliente.balcao({ id: '', usuarioId })).toThrow(/id.*uuid/i);
  expect(() => Pedido.criarVendaDireta({ id: '', usuarioId, clienteId: balcao.id,
    obraId, quantidade: 1, descricao: 'Coruja', canalOrigem: 'PRESENCIAL' })).toThrow(/id.*uuid/i);
});
```

- [ ] **Step 4: Rodar só o teste novo e confirmar falha pelo contrato antigo**

Run: `npx jest src/core/domain/__tests__/IdInjection.test.ts --runInBand`. Expected: FAIL: factory antiga ignora `id` ou não rejeita o ID inválido; nunca aceitar PASS antes da alteração.

- [ ] **Step 5: Mudar apenas o limite das factories, sem reescrever regras de negócio**

Em `Cliente.ts` retirar o import `../ids/gerarId`; mudar `criar` para aceitar `id: string` no mesmo objeto; validar com `if (!isUuidV4(args.id)) throw new ClienteInvalidoError('id deve ser UUID v4')`; trocar `id: gerarId()` por `id: args.id`. Mudar a outra factory para `static balcao(args: { id: string; usuarioId: string }): Cliente`, validar `args.id` e `args.usuarioId`, atribuir `id: args.id`, `usuarioId: args.usuarioId` e preservar nome/contato existentes. Os outros três arquivos recebem a mesma validação e atribuição, usando seus erros correspondentes:

```diff
@@ src/core/domain/entities/Obra.ts
-import { gerarId } from '../ids/gerarId';
@@ static criar(args)
+id: string;
+if (!isUuidV4(args.id)) throw new ObraInvalidaError('id deve ser UUID v4');
@@ new Obra para UNICA
-id: gerarId(),
+id: args.id,
@@ new Obra para SERIE
-id: gerarId(),
+id: args.id,
@@ src/core/domain/entities/Pedido.ts
-import { gerarId } from '../ids/gerarId';
@@ static criar(args)
+id: string;
+if (!isUuidV4(args.id)) throw new PedidoInvalidoError('id deve ser UUID v4');
-id: gerarId(),
+id: args.id,
@@ static criarVendaDireta(args)
+id: string;
+if (!isUuidV4(args.id)) throw new PedidoInvalidoError('id deve ser UUID v4');
-id: gerarId(),
+id: args.id,
@@ src/core/domain/entities/Evento.ts
-import { gerarId } from '../ids/gerarId';
@@ static criar(args)
+id: string;
+if (!isUuidV4(args.id)) throw new EventoInvalidoError('id deve ser UUID v4');
-id: gerarId(),
+id: args.id,
```

Em `Cliente.balcao` manter o contrato especial de contato vazio; `criadoEmLocal`, `deletedAt` e todos os métodos de mutação permanecem como no original.

- [ ] **Step 6: Atualizar os testes antigos para passar ID no ponto de criação**

Nos arquivos `src/core/domain/__tests__/{Cliente,Obra,Pedido,Evento,Identifiers,Constructors}.test.ts`, importar `gerarIdTeste` de `../../../test-support/ids` quando há chamadas a factories. Em **todas** as invocações válidas de `Cliente.criar`, `Obra.criar`, `Pedido.criar`, `Pedido.criarVendaDireta`, `Evento.criar`, acrescentar `id: gerarIdTeste()`; para `Cliente.balcao(usuarioId)`, usar `Cliente.balcao({ id: gerarIdTeste(), usuarioId })`. Exemplo de teste de regra que deve continuar verificando a mesma coisa:

```ts
const cliente = Cliente.criar({ id: gerarIdTeste(), usuarioId, nome: 'João', contato: 'zap' });
expect(cliente.statusSync).toBe('PENDENTE');
```

Em testes de UUID inválido de `Identifiers.test.ts`, fornecer **ID válido** quando a entrada sob teste for `usuarioId`, `clienteId` ou `obraId`; testar `id` inválido separadamente em `IdInjection.test.ts`. Os construtores privados de `Constructors.test.ts` continuam privados.

- [ ] **Step 7: Suíte de domínio + arquitetura + lint/typecheck**

```bash
npx jest src/core/domain --runInBand
npx tsc --noEmit
npx expo lint
rg -n "from ['\"](uuid|react|react-native|expo)|gerarId|react-native-get-random-values" src/core/domain --glob '!**/__tests__/**'
```

Expected: todos os testes migrados verdes; TypeScript/lint verdes; `rg` não encontra imports proibidos nem `gerarId` no código de domínio (exit code 1 é o resultado esperado apenas do último comando). Testar ID ausente também com `// @ts-expect-error` no arquivo de teste para travar o contrato em typecheck:

```ts
// @ts-expect-error id é obrigatório na factory.
const criarSemId = () => Cliente.criar({ usuarioId, nome: 'X', contato: 'zap' });
expect(criarSemId).toBeInstanceOf(Function);
```

- [ ] **Step 8: Commit do limite puro de domínio**

```bash
git add package.json package-lock.json jest.config.js eslint.config.js src/types/css.d.ts src/test-support/ids.ts src/core/domain
git diff --cached --check
git commit -m "feat: migrate pure domain with externally supplied ids"
```

### Task 3: Application e fakes com gerador injetado

**Files:** Create `src/core/application/{gateways,repositories,usecases,__tests__}/**`, `src/core/application/gateways/IIdGenerator.ts`, `src/infrastructure/database/memory/*.ts`, `src/infrastructure/device/Fake{Auth,Camera,Location,Sync}Gateway.ts`, `src/infrastructure/device/FakeIdGenerator.ts`, `src/infrastructure/seed/fixtures.ts`; Modify `src/test-support/ids.ts`; Test `src/core/application/__tests__/*.test.ts` e suítes de domínio.

**Interfaces:** Consumes: factories com `id` da Task 2; `IIdGenerator.gerar(): string`. Produces: construtores `CadastrarClienteUseCase(repo,sync,ids)`, `CadastrarObraUseCase(obras,sync,ids)`, `CadastrarPedidoUseCase(pedidos,obras,clientes,sync,ids)`, `CadastrarEventoUseCase(eventos,sync,gps,ids)`, `ResolverClienteBalcaoUseCase(repo,sync,ids)`, `VendaDiretaUseCase(obras,pedidos,clientes,sync,ids)`; `CadastrarClienteUseCase.execute({usuarioId,nome,contato}): Promise<Cliente>`, `CadastrarObraUseCase.execute({usuarioId,nome,tipo,quantidade?,fotoPath?}): Promise<Obra>`, `CadastrarPedidoUseCase.execute({usuarioId,clienteId,descricao,canalOrigem,dataEntrega,obraId?}): Promise<Pedido>`, `CadastrarEventoUseCase.execute({usuarioId,nome,data,endereco,localizacao?,usarGps?,observacoes?}): Promise<Evento>`, `ResolverClienteBalcaoUseCase.execute({usuarioId}): Promise<Cliente>`, `VendaDiretaUseCase.execute({usuarioId,obraId,qtd,descricao?}): Promise<Pedido>`; outros casos de uso preservam as assinaturas existentes. `seedFixtures(ids?: IIdGenerator): {usuarioId,clientes,obras,pedidos,eventos}` continua exportada; repos/gateways fake mantêm os contratos antigos.

- [ ] **Step 1: Mover aplicação, repositórios/gateways fake, fixture e oito suítes existentes**

```bash
cp -R ../ateII/src/core/application src/core/application
mkdir -p src/infrastructure/database src/infrastructure/device src/infrastructure/seed
cp -R ../ateII/src/infrastructure/database/memory src/infrastructure/database/memory
cp ../ateII/src/infrastructure/device/FakeAuthGateway.ts ../ateII/src/infrastructure/device/FakeCameraGateway.ts ../ateII/src/infrastructure/device/FakeLocationGateway.ts ../ateII/src/infrastructure/device/FakeSyncGateway.ts src/infrastructure/device/
cp ../ateII/src/infrastructure/seed/fixtures.ts src/infrastructure/seed/fixtures.ts
```

Não copiar `babel.config.js`, `node_modules`, testes/config do SDK 51 nem implementar adaptadores reais.

- [ ] **Step 2: Acrescentar teste vermelho de ID fornecido ao caso de uso (sem perda dos asserts antigos)**

Adicionar em `src/core/application/__tests__/ClienteUseCases.test.ts`:

```ts
import { gerarIdTeste } from '../../../test-support/ids';
import { CadastrarClienteUseCase } from '../usecases/CadastrarClienteUseCase';
import { InMemoryClienteRepository } from '../../../infrastructure/database/memory/InMemoryClienteRepository';
import { FakeSyncGateway } from '../../../infrastructure/device/FakeSyncGateway';

it('pede um ID v4 ao gerador e usa o mesmo ID no registro e na fila', async () => {
  const id = gerarIdTeste();
  const ids = { gerar: jest.fn(() => id) };
  const clientes = new InMemoryClienteRepository();
  const sync = new FakeSyncGateway();
  const caso = new CadastrarClienteUseCase(clientes, sync, ids);
  const cliente = await caso.execute({ usuarioId: 'a1111111-1111-4111-8111-111111111111',
    nome: 'Maria', contato: 'zap' });
  expect(ids.gerar).toHaveBeenCalledTimes(1);
  expect(cliente.id).toBe(id);
  expect(sync.queue[0].entidadeId).toBe(id);
});

it('não salva nem enfileira quando o gerador devolve ID inválido', async () => {
  const clientes = new InMemoryClienteRepository();
  const sync = new FakeSyncGateway();
  const caso = new CadastrarClienteUseCase(clientes, sync, { gerar: () => 'errado' });
  const usuarioId = 'a1111111-1111-4111-8111-111111111111';
  await expect(caso.execute({ usuarioId, nome: 'Maria', contato: 'zap' })).rejects.toThrow(/id.*uuid/i);
  expect(await clientes.findByUsuario(usuarioId)).toEqual([]);
  expect(sync.queue).toEqual([]);
});
```

Run: `npx jest src/core/application/__tests__/ClienteUseCases.test.ts --runInBand`. Expected: FAIL com ID não passado para a factory ou contrato do gerador não conectado.

- [ ] **Step 3: Criar a porta de ID puro e o fake determinístico das fixtures**

`src/core/application/gateways/IIdGenerator.ts`:

```ts
export interface IIdGenerator {
  gerar(): string;
}
```

`src/infrastructure/device/FakeIdGenerator.ts`:

```ts
import type { IIdGenerator } from '../../core/application/gateways/IIdGenerator';

export class FakeIdGenerator implements IIdGenerator {
  private sequencia = 0;

  gerar(): string {
    this.sequencia += 1;
    return `00000000-0000-4000-8000-${this.sequencia.toString(16).padStart(12, '0')}`;
  }
}
```

Acrescentar em `src/test-support/ids.ts` (colocar o import no topo, antes de `let proximoId`):

```ts
import type { IIdGenerator } from '../core/application/gateways/IIdGenerator';

export const idsTeste: IIdGenerator = { gerar: gerarIdTeste };
```

Preservar no mesmo arquivo a função `gerarIdTeste` da Task 2.

- [ ] **Step 4: Injetar `ids` nos seis criadores sem mudar suas assinaturas de `execute`**

Adicionar import type de `IIdGenerator` e parâmetro `private readonly ids: IIdGenerator` ao **fim** dos seis construtores indicados no bloco Interfaces. Em cada criação, substituir a chamada antiga pelo argumento `id`:

```ts
// CadastrarClienteUseCase.execute
const cliente = Cliente.criar({ ...args, id: this.ids.gerar() });
// CadastrarObraUseCase.execute
const obra = Obra.criar({ ...args, id: this.ids.gerar() });
// CadastrarPedidoUseCase.execute (preservar os campos atuais)
const pedido = Pedido.criar({
  id: this.ids.gerar(), usuarioId: args.usuarioId, clienteId: args.clienteId,
  descricao: args.descricao, canalOrigem: args.canalOrigem, dataEntrega: args.dataEntrega,
});
// CadastrarEventoUseCase.execute: manter a escolha GPS/manual antes da criação
const evento = Evento.criar({
  id: this.ids.gerar(), usuarioId: args.usuarioId, nome: args.nome, data: args.data,
  endereco: args.endereco, localizacao: ponto, observacoes: args.observacoes,
});
// ResolverClienteBalcaoUseCase.execute: só gerar se findBalcaoByUsuario não achou
const candidato = Cliente.balcao({ id: this.ids.gerar(), usuarioId: args.usuarioId });
// VendaDiretaUseCase.execute: passar a mesma instância para ResolverClienteBalcaoUseCase
const resolverBalcao = new ResolverClienteBalcaoUseCase(this.clientes, this.sync, this.ids);
const pedido = Pedido.criarVendaDireta({
  id: this.ids.gerar(), usuarioId: args.usuarioId, clienteId: cliente.id,
  obraId: obra.id, quantidade: args.qtd,
  descricao: args.descricao?.trim() || `Venda direta - ${obra.nome}`,
  canalOrigem: 'PRESENCIAL',
});
```

Os outros 16 casos de uso, contratos de Auth/Camera/Location/Sync e quatro repositórios in-memory continuam com a implementação antiga; não introduzir geração de ID em `domain/` nem dependência de SDK em `application/`.

- [ ] **Step 5: Alimentar a fixture por uma só instância do gerador**

Em `src/infrastructure/seed/fixtures.ts`, importar a porta e o fake, criar uma instância default compartilhada e declarar `seedFixtures(gerador: IIdGenerator = demoIds)`; assim chamadas consecutivas à fixture não repetem IDs. Nas oito criações existentes, passar `id: gerador.gerar()` para `Cliente.criar`, `Cliente.balcao({ usuarioId, id: gerador.gerar() })`, `Obra.criar` (2x), `Pedido.criar` (2x), `Pedido.criarVendaDireta`, `Evento.criar`. Todas usam a mesma instância de `gerador`. Conteúdo resultante:

```ts
import { Cliente } from '../../core/domain/entities/Cliente';
import { Evento } from '../../core/domain/entities/Evento';
import { Obra } from '../../core/domain/entities/Obra';
import { Pedido } from '../../core/domain/entities/Pedido';
import { Coordenada } from '../../core/domain/value-objects/Coordenada';
import type { IIdGenerator } from '../../core/application/gateways/IIdGenerator';
import { FakeIdGenerator } from '../device/FakeIdGenerator';

const demoIds = new FakeIdGenerator();

export function seedFixtures(gerador: IIdGenerator = demoIds) {
  const usuarioId = 'a1111111-1111-4111-8111-111111111111';
  const clienteJoao = Cliente.criar({ id: gerador.gerar(), usuarioId,
    nome: 'Joao da Silva', contato: '(11) 99999-9999' });
  const clienteBalcao = Cliente.balcao({ id: gerador.gerar(), usuarioId });
  const obraAguia = Obra.criar({ id: gerador.gerar(), usuarioId,
    nome: 'Aguia de Asas Abertas', tipo: 'UNICA' });
  obraAguia.reservar();
  const obraCoruja = Obra.criar({ id: gerador.gerar(), usuarioId,
    nome: 'Coruja Pequena', tipo: 'SERIE', quantidade: 4, fotoPath: '/tmp/coruja.jpg' });
  const pedidoAFazer = Pedido.criar({ id: gerador.gerar(), usuarioId,
    clienteId: clienteJoao.id, descricao: 'Escultura de Onca', canalOrigem: 'INSTAGRAM',
    dataEntrega: new Date('2026-11-01') });
  const pedido101 = Pedido.criar({ id: gerador.gerar(), usuarioId,
    clienteId: clienteJoao.id, descricao: 'Escultura de Aguia personalizada',
    canalOrigem: 'WHATSAPP', dataEntrega: new Date('2026-10-05'), obraId: obraAguia.id });
  pedido101.moverParaFazendo();
  const pedidoFeito = Pedido.criarVendaDireta({ id: gerador.gerar(), usuarioId,
    clienteId: clienteBalcao.id, obraId: obraCoruja.id, quantidade: 1,
    descricao: 'Coruja de prateleira (pronta entrega)', canalOrigem: 'PRESENCIAL' });
  const evento = Evento.criar({ id: gerador.gerar(), usuarioId, nome: 'Feira da Praca',
    data: new Date('2026-10-12'), endereco: 'Praca Central, banca 5',
    localizacao: new Coordenada(-23.5505, -46.6333), observacoes: 'Levar corujas' });
  return {
    usuarioId,
    clientes: [clienteJoao, clienteBalcao],
    obras: [obraAguia, obraCoruja],
    pedidos: [pedidoAFazer, pedido101, pedidoFeito],
    eventos: [evento],
  };
}
```

- [ ] **Step 6: Adaptar as oito suítes de application e rodar vermelho→verde**

Nos testes copiados em `src/core/application/__tests__/{AuthUseCases,ClienteUseCases,EventoUseCases,Fakes,ObraUseCases,PedidoClose,PedidoWrite,VendaDireta}.test.ts`, cada chamada direta às factories recebe `id: gerarIdTeste()` (import `../../../test-support/ids`). Cada criação de um dos seis use cases modificados recebe o **último** argumento `idsTeste` (mesmo import); os outros construtores continuam iguais. Exemplo do fluxo que deve conservar asserts de estoque:

```ts
const obra = Obra.criar({ id: gerarIdTeste(), usuarioId, nome: 'Coruja',
  tipo: 'SERIE', quantidade: 4 });
const caso = new CadastrarPedidoUseCase(pedidos, obras, clientes, sync, idsTeste);
const pedido = await caso.execute({ usuarioId, clienteId, descricao: 'Coruja',
  canalOrigem: 'PRESENCIAL', dataEntrega: new Date('2026-11-01'), obraId: obra.id });
expect(pedido.obraId).toBe(obra.id);
expect((await obras.findById(obra.id))?.quantidade).toBe(3);
```

Run: `npx jest src/core/application --runInBand`. Expected: PASS nas oito suítes; os testes preservados de cancelamento, obra de outro usuário, foto obrigatória, venda direta e Cliente Balcão continuam verdes. Checar especialmente que duas chamadas ao resolver reusam o mesmo Cliente Avulso sem consumir um segundo ID.

- [ ] **Step 7: Rodar regressão acumulada, typecheck, lint e commit**

```bash
npx jest src/core --runInBand
npx tsc --noEmit
npx expo lint
rg -n "from ['\"](expo|react|react-native|uuid|@supabase)" src/core --glob '!**/__tests__/**'
git add src/core/application src/infrastructure/database/memory src/infrastructure/device src/infrastructure/seed src/test-support/ids.ts
git diff --cached --check
git commit -m "feat: migrate use cases and in-memory adapters with injected ids"
```

Expected: todas as suítes `src/core` verdes; nenhum SDK ou React importado do core (exit 1 esperado só no `rg`); commit contém somente essa fatia e não mexe em configuração do SDK 51.

### Task 4: UUID real na borda e composição dos fakes

**Files:** Create `src/infrastructure/device/UuidIdGenerator.ts`, `src/infrastructure/device/__tests__/UuidIdGenerator.test.ts`, `src/main/factories/makeFakeProviders.ts`, `src/main/factories/__tests__/makeFakeProviders.test.ts`, `jest.setup.js`; Modify `jest.config.js`; Test dois testes novos + todas as suítes de core.

**Interfaces:** Consumes: `IIdGenerator.gerar(): string`, `seedFixtures(ids?: IIdGenerator)`, os seis construtores alterados na Task 3. Produces: `UuidIdGenerator implements IIdGenerator`, `makeFakeProviders(): FakeProviderBag` e `FakeProviders.harness` com mesmo formato antigo; `providers.gateways`, `providers.repositories`, `providers.useCases`, `providers.loadData()` preservados para UI.

- [ ] **Step 1: Instalar UUID e a fonte nativa de bytes compatível com Expo Go**

```bash
npx expo install expo-crypto 'uuid@^11'
npx expo install --check
```

Expected: `uuid` 11 com tipos próprios/CommonJS para Jest; `expo-crypto` selecionado pelo SDK 57. Não acrescentar `react-native-get-random-values`, não editar `package.json.main`, não exigir build nativa só para gerar ID. Documentação: [Expo Crypto SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/crypto.md#cryptogetrandombytesbytecount) e [uuid v4 random bytes](https://github.com/uuidjs/uuid#uuidv4options-buffer-offset).

- [ ] **Step 2: Teste vermelho com Web Crypto ausente no runtime de teste**

`src/infrastructure/device/__tests__/UuidIdGenerator.test.ts`:

```ts
import { getRandomBytes } from 'expo-crypto';
import { UuidIdGenerator } from '../UuidIdGenerator';

it('gera UUID v4 com 16 bytes nativos mesmo sem globalThis.crypto', () => {
  const anterior = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
  try {
    const id = new UuidIdGenerator().gerar();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(getRandomBytes).toHaveBeenCalledWith(16);
  } finally {
    if (anterior) Object.defineProperty(globalThis, 'crypto', anterior);
    else Reflect.deleteProperty(globalThis, 'crypto');
  }
});
```

Run: `npx jest src/infrastructure/device/__tests__/UuidIdGenerator.test.ts --runInBand`. Expected: FAIL porque `UuidIdGenerator.ts` não existe.

- [ ] **Step 3: Criar adaptador real de IDs e mock isolado de bytes só para Jest**

`src/infrastructure/device/UuidIdGenerator.ts`:

```ts
import { getRandomBytes } from 'expo-crypto';
import { v4 as uuidv4 } from 'uuid';

import type { IIdGenerator } from '../../core/application/gateways/IIdGenerator';

export class UuidIdGenerator implements IIdGenerator {
  gerar(): string {
    return uuidv4({ random: getRandomBytes(16) });
  }
}
```

`jest.setup.js` (mock de bytes **variáveis**; os IDs da fixture não podem colidir):

```js
jest.mock('expo-crypto', () => {
  let sequencia = 0;
  return {
    getRandomBytes: jest.fn((tamanho) => {
      sequencia += 1;
      const bytes = new Uint8Array(tamanho);
      bytes[12] = (sequencia >>> 24) & 255;
      bytes[13] = (sequencia >>> 16) & 255;
      bytes[14] = (sequencia >>> 8) & 255;
      bytes[15] = sequencia & 255;
      return bytes;
    }),
  };
});
```

Em `jest.config.js`, acrescentar:

```js
setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
```

Run: `npx jest src/infrastructure/device/__tests__/UuidIdGenerator.test.ts --runInBand`. Expected: PASS sem polyfill e sem importar UUID no core.

- [ ] **Step 4: Testar composição: fixture e novo cliente usam IDs diferentes**

`src/main/factories/__tests__/makeFakeProviders.test.ts`:

```ts
import { makeFakeProviders } from '../makeFakeProviders';

it('injeta o mesmo gerador na fixture e no cadastro posterior', async () => {
  const app = makeFakeProviders();
  const idsExistentes = new Set([
    ...app.clientes, ...app.obras, ...app.pedidos, ...app.eventos,
  ].map((entidade) => entidade.id));
  const novo = await app.useCases.cadastrarCliente.execute({ usuarioId: app.usuarioId,
    nome: 'Maria', contato: 'WhatsApp' });
  expect(idsExistentes.has(novo.id)).toBe(false);
  expect((await app.repositories.clientes.findById(novo.id))?.id).toBe(novo.id);
  expect(app.gateways.sync.queue.at(-1)?.entidadeId).toBe(novo.id);
});
```

Copiar `../ateII/src/main/factories/makeFakeProviders.ts` para `src/main/factories/makeFakeProviders.ts`. Run: `npx jest src/main/factories/__tests__/makeFakeProviders.test.ts --runInBand`. Expected: FAIL: gerador não foi conectado aos novos construtores (ou novo cadastro gera ID colidente).

- [ ] **Step 5: Conectar a única instância de UUID ao grafo antigo**

No começo de `makeFakeProviders()`:

```ts
const ids = new UuidIdGenerator();
const seed = seedFixtures(ids);
```

Importar `UuidIdGenerator` de `../../infrastructure/device/UuidIdGenerator`. Manter os quatro repositórios, os quatro fakes e `loadData()` idênticos ao original; passar `ids` como argumento **final** somente nos seis casos de uso criadores:

```ts
cadastrarPedido: new CadastrarPedidoUseCase(pedidos, obras, clientes, sync, ids),
cadastrarCliente: new CadastrarClienteUseCase(clientes, sync, ids),
cadastrarObra: new CadastrarObraUseCase(obras, sync, ids),
vendaDireta: new VendaDiretaUseCase(obras, pedidos, clientes, sync, ids),
cadastrarEvento: new CadastrarEventoUseCase(eventos, sync, location, ids),
```

`ResolverClienteBalcaoUseCase` não é criado diretamente nessa factory: `VendaDiretaUseCase` passa **sua** instância de `ids` ao resolver (Task 3). Preservar `FakeProviders.harness = seedFixtures` para os testes existentes.

- [ ] **Step 6: Verificar domínio, aplicação, adapter e composição; commit**

```bash
npx jest src/core src/infrastructure/device src/main/factories --runInBand
npx tsc --noEmit
npx expo lint
npx expo install --check
git add package.json package-lock.json jest.config.js jest.setup.js src/infrastructure/device/UuidIdGenerator.ts src/infrastructure/device/__tests__ src/main
git diff --cached --check
git commit -m "feat: generate device ids at composition boundary"
```

Expected: testes verdes, quatro camadas compilam; `uuid` e `expo-crypto` aparecem apenas na borda, nenhum `react-test-renderer` na árvore de deps do projeto.

### Task 5: Shell de login, rota protegida e Kanban

**Files:** Modify `src/app/{_layout,index}.tsx`, delete `src/app/explore.tsx`; Create `src/app/(auth)/{_layout,login}.tsx`, `src/app/(tabs)/{_layout,kanban}.tsx`, `src/presentation/hooks/AppProviders.tsx`, `src/presentation/components/{ActionButton,OfflineBanner,ConfirmDialog,PedidoCard}.tsx`, `src/presentation/__tests__/{Shell,TelaLogin,TelaKanban,Accessibility}.test.tsx`, `src/presentation/__tests__/RouterGuards.test.tsx`.

**Interfaces:** Consumes: `FakeProviderBag` / `makeFakeProviders()` (Task 4), `LoginUseCase.execute`, `ConcluirPedidoUseCase.execute`, `CancelarPedidoUseCase.execute`, `ICameraGateway.capture(): Promise<string|null>`. Produces: `useAuth/useData/useNetwork/useServices/useAppNavigation/useRouteParams/usePedidoDraft` com assinaturas do arquivo antigo; URLs `/`, `/login`, `/kanban`; root Stack com login público e tab Kanban protegida, mantendo `NavigationContext` para stacks posteriores.

- [ ] **Step 1: Mover apenas os arquivos de apresentação necessários e seus testes, preservando assertions**

```bash
mkdir -p src/presentation/components src/presentation/hooks src/presentation/__tests__ "src/app/(auth)" "src/app/(tabs)"
cp ../ateII/src/presentation/hooks/AppProviders.tsx src/presentation/hooks/AppProviders.tsx
cp ../ateII/src/presentation/components/ActionButton.tsx ../ateII/src/presentation/components/OfflineBanner.tsx ../ateII/src/presentation/components/ConfirmDialog.tsx ../ateII/src/presentation/components/PedidoCard.tsx src/presentation/components/
cp ../ateII/src/presentation/__tests__/Shell.test.tsx ../ateII/src/presentation/__tests__/TelaLogin.test.tsx ../ateII/src/presentation/__tests__/TelaKanban.test.tsx ../ateII/src/presentation/__tests__/Accessibility.test.tsx src/presentation/__tests__/
cp "../ateII/app/(auth)/_layout.tsx" "../ateII/app/(auth)/login.tsx" "src/app/(auth)/"
cp "../ateII/app/(tabs)/_layout.tsx" "../ateII/app/(tabs)/kanban.tsx" "src/app/(tabs)/"
```

Nos quatro testes que importam telas de `../../../app/`, trocar só o prefixo por `../../app/`; por exemplo:

```ts
import TelaLogin from '../../app/(auth)/login';
import TelaKanban from '../../app/(tabs)/kanban';
```

Nas telas antigas, trocar imports antigos `../../src/presentation/...` por `@/presentation/...` e `../../src/core/...` por `@/core/...`. Não inserir nada em `app/` na raiz: o Router SDK 57 usa **apenas** `src/app/` quando ela existe.

- [ ] **Step 2: Teste vermelho de proteção real da rota de Kanban**

`src/presentation/__tests__/RouterGuards.test.tsx`:

```tsx
import { renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '../../app/_layout';
import Index from '../../app/index';
import AuthLayout from '../../app/(auth)/_layout';
import Login from '../../app/(auth)/login';
import TabsLayout from '../../app/(tabs)/_layout';
import Kanban from '../../app/(tabs)/kanban';

it('link direto ao Kanban sem login termina na rota pública', async () => {
  renderRouter({
    _layout: RootLayout, index: Index,
    '(auth)/_layout': AuthLayout, '(auth)/login': Login,
    '(tabs)/_layout': TabsLayout, '(tabs)/kanban': Kanban,
  }, { initialUrl: '/kanban' });
  await screen.findByText('Entrar no ate');
  expect(screen).toHavePathname('/login');
});
```

Run: `npx jest src/presentation/__tests__/RouterGuards.test.tsx --runInBand`. Expected: FAIL: layout raiz ainda é o exemplo do scaffold e não protege o Kanban.

- [ ] **Step 3: Substituir apenas o layout/índice de exemplo pela navegação antiga protegida no SDK 57**

`src/app/_layout.tsx` (preservar `src/presentation/hooks/AppProviders.tsx` como copiado):

```tsx
import { Stack, type Href, useGlobalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { makeFakeProviders } from '@/main/factories/makeFakeProviders';
import { AppProviders, NavigationContext, RouteParamsContext, useAuth } from '@/presentation/hooks/AppProviders';

function RootNavigator() {
  const { session } = useAuth();
  const router = useRouter();
  const { id } = useGlobalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(id) ? id[0] : id;
  return (
    <RouteParamsContext.Provider value={{ id: routeId }}>
      <NavigationContext.Provider value={{
        novoPedido: () => router.push('/pedido/novo' as Href),
        novoCliente: () => router.push('/cliente/novo' as Href),
        novaObra: () => router.push('/obra/nova' as Href),
        novoEvento: () => router.push('/evento/novo' as Href),
        editarCliente: (clienteId) => router.push({ pathname: '/cliente/[id]', params: { id: clienteId } } as Href),
        editarPedido: (pedidoId) => router.push({ pathname: '/pedido/[id]/editar', params: { id: pedidoId } } as Href),
        editarEvento: (eventoId) => router.push({ pathname: '/evento/[id]/editar', params: { id: eventoId } } as Href),
        voltar: () => router.back(),
      }}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </NavigationContext.Provider>
    </RouteParamsContext.Provider>
  );
}

export default function RootLayout() {
  const [providers] = useState(makeFakeProviders);
  return <AppProviders providers={providers}><RootNavigator /></AppProviders>;
}
```

`src/app/index.tsx`:

```tsx
import { Redirect } from 'expo-router';
import { useAuth } from '@/presentation/hooks/AppProviders';

export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? '/(tabs)/kanban' : '/(auth)/login'} />;
}
```

Em `src/app/(tabs)/_layout.tsx`, registrar somente a tab já migrada; nas Tasks 6–7 acrescentar as outras:

```tsx
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: true }}>
    <Tabs.Screen name="kanban" options={{ title: 'Pedidos' }} />
  </Tabs>;
}
```

Manter `src/app/(auth)/_layout.tsx` do projeto antigo (`Stack` com login), e excluir somente `src/app/explore.tsx` dos exemplos para não deixar rota pública lateral. Os casts `as Href` acima permitem typecheck enquanto os destinos ainda não foram migrados; removê-los assim que os arquivos de destino existirem nas Tasks 6–9 e conferir URLs pelos testes. Não copiar `../ateII/app/_layout.tsx` por cima do layout novo.

- [ ] **Step 4: Ajustar login e Kanban ao alias e às safe areas, sem trocar ações existentes**

Em `src/app/(auth)/login.tsx`, `src/app/(tabs)/kanban.tsx`, usar imports de `@/presentation/...`; a tela de login está sem header próprio, então acrescentar safe area em todas as bordas:

```diff
@@ src/app/(auth)/login.tsx
+import { SafeAreaView } from 'react-native-safe-area-context';
@@ return (
-    <View>
+    <SafeAreaView style={{ flex: 1, paddingHorizontal: 16 }} edges={['top', 'bottom', 'left', 'right']}>
@@ fim do JSX de TelaLogin
-    </View>
+    </SafeAreaView>
```

Esses são dois hunks independentes (tag de abertura e tag de fechamento), mantendo todos os filhos do `View` antigo; retirar `View` do import de `react-native` se ficar sem uso. No Kanban, preservar o `ScrollView` original, mas cercá-lo pela safe area (o header das tabs já cobre o topo):

```diff
@@ src/app/(tabs)/kanban.tsx
+import { SafeAreaView } from 'react-native-safe-area-context';
@@ return (
-    <ScrollView testID="scroll-kanban">
+    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
+      <ScrollView testID="scroll-kanban" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
@@ fim do JSX de TelaKanban
-    </ScrollView>
+      </ScrollView>
+    </SafeAreaView>
```

Não envolver a tela em `SafeAreaView` do core `react-native`, pois no Android edge-to-edge do SDK 57 os insets vêm de `react-native-safe-area-context`. As ações `iniciar`, `concluir`, `cancelar` e aviso continuam como no antigo.

- [ ] **Step 5: Teste de regressão de câmera cancelada + toque duplo sem pedido concluído**

Adicionar a `src/presentation/__tests__/TelaKanban.test.tsx` usando os imports antigos já movidos:

```tsx
it('câmera cancelada em dois toques não conclui nem duplica baixa', async () => {
  const providers = makeFakeProviders();
  const pedido = providers.pedidos.find((item) => item.status === 'FAZENDO')!;
  providers.gateways.camera.mode = 'cancel';
  const capturar = jest.spyOn(providers.gateways.camera, 'capture');
  render(<AppProviders providers={providers}><TelaKanban /></AppProviders>);
  fireEvent.press(screen.getByTestId(`mover-${pedido.id}-feito`));
  fireEvent.press(screen.getByTestId(`mover-${pedido.id}-feito`));
  await waitFor(() => expect(screen.getByTestId('aviso-foto-obrigatoria')).toHaveTextContent(/foto obrigatória/i));
  expect(capturar).toHaveBeenCalledTimes(1);
  expect(providers.gateways.sync.queue).toEqual([]);
  expect((await providers.repositories.pedidos.findById(pedido.id))?.status).toBe('FAZENDO');
});
```

Importar `render`, `screen`, `fireEvent`, `waitFor`, `makeFakeProviders`, `AppProviders`, `TelaKanban` dos mesmos caminhos usados pela suíte antiga; `toHaveTextContent` é provido pelo `jest-expo`/RNTL atual, sem `@testing-library/jest-native`. Verificar também o teste antigo de banner offline (`Shell.test.tsx`) e login inválido (`TelaLogin.test.tsx`).

- [ ] **Step 6: Suíte acumulada, typecheck, lint e commit**

```bash
npx jest src/core src/infrastructure/device src/main/factories src/presentation/__tests__/Shell.test.tsx src/presentation/__tests__/TelaLogin.test.tsx src/presentation/__tests__/TelaKanban.test.tsx src/presentation/__tests__/Accessibility.test.tsx src/presentation/__tests__/RouterGuards.test.tsx --runInBand
npx tsc --noEmit
npx expo lint
rg -n "from ['\"]\.\./.*src/|@react-navigation/" src/app
git add src/app src/presentation
git diff --cached --check
git commit -m "feat: migrate protected router login and Kanban to Expo 57"
```

Expected: testes e verificações verdes; `rg` não acha imports antigos (exit 1 só nele). Android e iOS exibem o header e o fim da lista sem sobrepor barras do sistema.

### Task 6: Estoque, venda direta e baixa com dupla confirmação

**Files:** Create `src/app/(tabs)/estoque.tsx`, `src/app/obra/nova.tsx`, `src/presentation/components/ObraCard.tsx`, `src/presentation/__tests__/TelaEstoque.test.tsx`; Modify `src/app/{_layout,(tabs)/_layout}.tsx`; Test `TelaEstoque.test.tsx` e suíte acumulada.

**Interfaces:** Consumes: `useData/useServices/useAppNavigation/useNetwork`, `VendaDiretaUseCase.execute({usuarioId,obraId,qtd,descricao?}): Promise<Pedido>`, `RemoverUnidadesUseCase.execute({obraId,qtd,confirmado,duplaConfirmacao}): Promise<Obra>`, `ConfirmDialog({requireDouble,onFirstConfirm,onConfirm})`. Produces: `/estoque` e `/obra/nova` protegidas; botões `venda-<id>`, `remover-unidades-<id>` e `dialog-confirm-dupla` existentes.

- [ ] **Step 1: Copiar tela, cadastro, card e suíte; corrigir imports**

```bash
cp ../ateII/src/presentation/__tests__/TelaEstoque.test.tsx src/presentation/__tests__/TelaEstoque.test.tsx
```

Trocar `../../../app/(tabs)/estoque` do teste por `../../app/(tabs)/estoque` e `../../../app/obra/nova` por `../../app/obra/nova`; as telas ainda não estão no destino novo.

- [ ] **Step 2: Escrever teste vermelho: só a segunda confirmação baixa estoque uma vez**

Acrescentar a `src/presentation/__tests__/TelaEstoque.test.tsx`:

```tsx
it('dupla confirmação preserva estoque antes da segunda confirmação, inclusive offline', async () => {
  const providers = makeFakeProviders();
  const serie = providers.obras.find((obra) => obra.tipo === 'SERIE')!;
  const original = serie.quantidade;
  const onRemoverUnidades = jest.fn(async (obraId: string, qtd: number) => {
    await providers.useCases.removerUnidades.execute({ obraId, qtd, confirmado: true, duplaConfirmacao: true });
  });
  render(
    <NetworkContext.Provider value={{ isOnline: false, setOnline: () => {} }}>
      <DataContext.Provider value={{ ...providers, reload: async () => {} }}>
        <TelaEstoque onRemoverUnidades={onRemoverUnidades} />
      </DataContext.Provider>
    </NetworkContext.Provider>,
  );
  fireEvent.press(screen.getByTestId(`remover-unidades-${serie.id}`));
  fireEvent.press(screen.getByTestId('dialog-confirm-btn'));
  expect(onRemoverUnidades).not.toHaveBeenCalled();
  expect((await providers.repositories.obras.findById(serie.id))?.quantidade).toBe(original);
  fireEvent.press(screen.getByTestId('dialog-confirm-dupla'));
  await waitFor(() => expect(onRemoverUnidades).toHaveBeenCalledTimes(1));
  expect(onRemoverUnidades).toHaveBeenCalledWith(serie.id, 1);
  expect((await providers.repositories.obras.findById(serie.id))?.quantidade).toBe(original - 1);
  expect(screen.getByTestId('banner-offline')).toBeTruthy();
});
```

Usar imports já presentes do teste antigo (`DataContext`, `NetworkContext`, `TelaEstoque`, RNTL) e acrescentar `makeFakeProviders` de `../../main/factories/makeFakeProviders`. Run: `npx jest src/presentation/__tests__/TelaEstoque.test.tsx --runInBand`. Expected: FAIL: as rotas ainda não existem.

- [ ] **Step 3: Aplicar safe areas e manter filtros/quantidades do Estoque antigo**

Copiar as telas e o card:

```bash
mkdir -p src/app/obra
cp "../ateII/app/(tabs)/estoque.tsx" "src/app/(tabs)/estoque.tsx"
cp ../ateII/app/obra/nova.tsx src/app/obra/nova.tsx
cp ../ateII/src/presentation/components/ObraCard.tsx src/presentation/components/ObraCard.tsx
```

Trocar `../../src/` da tab e da rota `/obra/nova` por `@/`. Acrescentar `<Tabs.Screen name="estoque" options={{ title: 'Estoque' }} />` em `src/app/(tabs)/_layout.tsx` e `<Stack.Screen name="obra/nova" />` **dentro** do `Stack.Protected guard={!!session}` em `src/app/_layout.tsx`. Em `src/app/(tabs)/estoque.tsx`, manter `quantidadeValida`, `busyKeys`, texto de estoque esgotado, venda `SERIE`, caixa de quantidade e `onFirstConfirm={prepararRemocaoUnidades}`. Só envolver o `<ScrollView testID="scroll-estoque">` existente:

```diff
@@ src/app/(tabs)/estoque.tsx
+import { SafeAreaView } from 'react-native-safe-area-context';
@@ return (
-    <ScrollView testID="scroll-estoque">
+    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
+      <ScrollView testID="scroll-estoque" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
@@ fim do JSX de TelaEstoque
-    </ScrollView>
+      </ScrollView>
+    </SafeAreaView>
```

Os dois hunks preservam os filhos JSX do `ScrollView` original, inclusive `ConfirmDialog requireDouble`. Em `src/app/obra/nova.tsx`, envolver o ScrollView do cadastro com a borda segura:

```diff
@@ src/app/obra/nova.tsx
+import { SafeAreaView } from 'react-native-safe-area-context';
@@ return (
-    <ScrollView>
+    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
+      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
@@ fim do JSX de Nova Obra
-    </ScrollView>
+      </ScrollView>
+    </SafeAreaView>
```

Na UI, confirmar que quantidade vazia, decimal e acima do estoque continua rejeitada pela validação antiga antes de invocar os casos de uso.

- [ ] **Step 4: Testar somente Estoque e depois a suíte acumulada; commit**

```bash
npx jest src/presentation/__tests__/TelaEstoque.test.tsx --runInBand
npx jest src/core src/infrastructure/device src/main/factories src/presentation --runInBand
npx tsc --noEmit
npx expo lint
git add src/app src/presentation/components/ObraCard.tsx src/presentation/__tests__/TelaEstoque.test.tsx
git diff --cached --check
git commit -m "feat: migrate stock and direct-sale screens"
```

Expected: `ObraCard` só oferece venda direta para `SERIE`; primeira confirmação não altera quantidade; a segunda produz no máximo uma chamada. Nenhum código de persistência real adicionado.

### Task 7: Eventos textuais, GPS fake e edição de feira

**Files:** Create `src/app/(tabs)/eventos.tsx`, `src/app/evento/novo.tsx`, `src/app/evento/[id]/editar.tsx`, `src/presentation/components/EventoCard.tsx`, `src/presentation/utils/date.ts`, `src/presentation/__tests__/{TelaEventos,TelaEditarEvento}.test.tsx`; Modify `src/app/{_layout,(tabs)/_layout}.tsx`; Test suítes de eventos e acumulada.

**Interfaces:** Consumes: `ILocationGateway.getCurrent(): Promise<Coordenada>` fake, `CadastrarEventoUseCase.execute({usuarioId,nome,data,endereco,localizacao?,usarGps?,observacoes?}): Promise<Evento>`, `EditarEventoUseCase.execute({eventoId,nome,data,endereco,localizacao,observacoes}): Promise<Evento>`, `RemoverEventoUseCase.execute({eventoId,confirmado}): Promise<void>`, `parseCalendarDate(texto: string): Date|null`. Produces: tabs `/eventos`, stacks `/evento/novo` e `/evento/[id]/editar`, lista/pins textuais offline e entrada manual de latitude/longitude.

- [ ] **Step 1: Trazer testes de Eventos primeiro**

```bash
cp ../ateII/src/presentation/__tests__/TelaEventos.test.tsx ../ateII/src/presentation/__tests__/TelaEditarEvento.test.tsx src/presentation/__tests__/
```

Nos testes, atualizar imports de `../../../app/` para `../../app/`. Acrescentar teste de evento sem GPS, com coordenadas manuais zero (válidas) e usuário offline a `TelaEventos.test.tsx`:

```tsx
it('GPS fake negado permite usar coordenadas manuais zero', async () => {
  const onSalvar = jest.fn(async () => {});
  render(<TelaNovoEvento onGps={async () => { throw new Error('Permissão negada'); }} onSalvar={onSalvar} />);
  fireEvent.press(screen.getByTestId('botao-usar-gps'));
  await waitFor(() => expect(screen.getByTestId('erro-evento')).toHaveTextContent(/configurações/i));
  fireEvent.changeText(screen.getByTestId('campo-nome-evento'), 'Feira Equador');
  fireEvent.changeText(screen.getByTestId('campo-data-evento'), '2026-12-11');
  fireEvent.changeText(screen.getByTestId('campo-endereco-evento'), 'Rua Um');
  fireEvent.changeText(screen.getByTestId('campo-latitude-manual'), '0');
  fireEvent.changeText(screen.getByTestId('campo-longitude-manual'), '0');
  fireEvent.press(screen.getByTestId('usar-localizacao-manual'));
  fireEvent.press(screen.getByTestId('botao-salvar-evento'));
  await waitFor(() => expect(onSalvar).toHaveBeenCalledWith(
    expect.objectContaining({ localizacao: expect.objectContaining({ latitude: 0, longitude: 0 }) }),
  ));
});
```

- [ ] **Step 2: Executar teste novo vermelho com rota ainda ausente**

Run: `npx jest src/presentation/__tests__/TelaEventos.test.tsx --runInBand`. Expected: FAIL por falta de `src/app/(tabs)/eventos.tsx`/`src/app/evento/novo.tsx`.

- [ ] **Step 3: Mover telas/card/validador de data e ligar rotas**

```bash
mkdir -p "src/app/evento/[id]" src/presentation/utils
cp "../ateII/app/(tabs)/eventos.tsx" "src/app/(tabs)/eventos.tsx"
cp ../ateII/app/evento/novo.tsx src/app/evento/novo.tsx
cp "../ateII/app/evento/[id]/editar.tsx" "src/app/evento/[id]/editar.tsx"
cp ../ateII/src/presentation/components/EventoCard.tsx src/presentation/components/EventoCard.tsx
cp ../ateII/src/presentation/utils/date.ts src/presentation/utils/date.ts
```

Reescrever imports relativos `../../src/` e `../../../src/` por `@/` nas três rotas. Acrescentar `<Tabs.Screen name="eventos" options={{ title: 'Eventos' }} />` à tab e `<Stack.Screen name="evento/novo" />`/`<Stack.Screen name="evento/[id]/editar" />` dentro da guarda logada no root Stack. Na tab, envolver o `ScrollView testID="scroll-eventos"`; nos dois formulários, envolver seu `ScrollView` sem testID, sempre preservando os filhos atuais:

```diff
@@ src/app/(tabs)/eventos.tsx, src/app/evento/novo.tsx, src/app/evento/[id]/editar.tsx
+import { SafeAreaView } from 'react-native-safe-area-context';
@@ abertura do return de cada tela
-    <ScrollView>
+    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
+      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
@@ fim do return de cada tela
-    </ScrollView>
+      </ScrollView>
+    </SafeAreaView>
```

Na tab de Eventos, conservar `testID="scroll-eventos"` no ScrollView. A lista preserva `<Text testID={\`pin-${evento.id}\`}>Pin: {evento.localizacao.latitude}, {evento.localizacao.longitude}</Text>` do `EventoCard` antigo, pois a integração de mapa está fora da migração.

- [ ] **Step 4: Validar fluxo simulado, suíte acumulada e commit**

```bash
npx jest src/presentation/__tests__/TelaEventos.test.tsx src/presentation/__tests__/TelaEditarEvento.test.tsx --runInBand
npx jest src/core src/infrastructure/device src/main/factories src/presentation --runInBand
npx tsc --noEmit
npx expo lint
git add src/app src/presentation/components/EventoCard.tsx src/presentation/utils/date.ts src/presentation/__tests__/TelaEventos.test.tsx src/presentation/__tests__/TelaEditarEvento.test.tsx
git diff --cached --check
git commit -m "feat: migrate offline-demo event screens"
```

Expected: renderiza pins textuais da fixture offline, permissão GPS fake negada oferece campo manual e evento com coordenada válida salva sem depender de internet.

### Task 8: Cadastro de pedido, cliente e obra por stacks

**Files:** Create `src/app/pedido/novo.tsx`, `src/app/cliente/novo.tsx`, `src/presentation/__tests__/TelaNovoPedido.test.tsx`; Modify `src/app/_layout.tsx` para proteger as duas novas stacks. `src/app/obra/nova.tsx` já foi transportado e protegido na Task 6.

**Interfaces:** Consumes: `usePedidoDraft(): {clienteId:string|null,selecionarCliente(id:string):void,limpar():void}`, `CadastrarPedidoUseCase.execute({usuarioId,clienteId,descricao,canalOrigem,dataEntrega,obraId?}): Promise<Pedido>` e `CadastrarClienteUseCase.execute({usuarioId,nome,contato}): Promise<Cliente>`. Produces: `/pedido/novo`, `/cliente/novo` protegidas; seleção de cliente recém-criado após voltar ao pedido; formulário de obra existente na Task 6.

- [ ] **Step 1: Mover a suíte do formulário antes das rotas**

```bash
cp ../ateII/src/presentation/__tests__/TelaNovoPedido.test.tsx src/presentation/__tests__/TelaNovoPedido.test.tsx
```

No teste, mudar `../../../app/pedido/novo` para `../../app/pedido/novo` e a importação da tela Novo Cliente para `../../app/cliente/novo`. Adicionar caso de dados inválidos do formulário:

```tsx
it('não registra pedido com data impossível ou cliente ausente', async () => {
  const onSalvar = jest.fn(async () => {});
  render(<TelaNovoPedido clientes={[]} obras={[]} onSalvar={onSalvar} />);
  fireEvent.changeText(screen.getByTestId('campo-descricao'), 'Águia');
  fireEvent.changeText(screen.getByTestId('campo-data-entrega'), '2026-02-31');
  fireEvent.press(screen.getByTestId('botao-salvar-pedido'));
  await waitFor(() => expect(screen.getByTestId('erro-pedido')).toBeTruthy());
  expect(onSalvar).not.toHaveBeenCalled();
});
```

Run: `npx jest src/presentation/__tests__/TelaNovoPedido.test.tsx --runInBand`. Expected: FAIL por ausência das duas telas.

- [ ] **Step 2: Mover telas de cadastro e conectar links via Router já preservado**

```bash
mkdir -p src/app/pedido src/app/cliente
cp ../ateII/app/pedido/novo.tsx src/app/pedido/novo.tsx
cp ../ateII/app/cliente/novo.tsx src/app/cliente/novo.tsx
```

Trocar em ambas `../../src/core/` → `@/core/`, `../../src/presentation/` → `@/presentation/`, mantendo `parseCalendarDate` em `@/presentation/utils/date`. Acrescentar no Stack protegido de `src/app/_layout.tsx`:

```tsx
<Stack.Screen name="pedido/novo" />
<Stack.Screen name="cliente/novo" />
```

Envolver os ScrollViews dos dois formulários no inset das bordas laterais e inferior:

```diff
@@ src/app/pedido/novo.tsx, src/app/cliente/novo.tsx
+import { SafeAreaView } from 'react-native-safe-area-context';
@@ return (
-    <ScrollView>
+    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
+      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
@@ fim do JSX
-    </ScrollView>
+      </ScrollView>
+    </SafeAreaView>
```

No Novo Pedido, manter `testID="scroll-novo-pedido"` no ScrollView; preservar `usePedidoDraft` e o `reload()` após salvar cliente para reabrir Novo Pedido com o cliente selecionado; manter `CANAIS_ORIGEM` e filtro `DISPONIVEL && quantidade > 0` do pedido antigo. Nenhum seletor nativo adicional é necessário.

- [ ] **Step 3: Verificar testes de cadastro e fluxo fake sem rede; commit**

```bash
npx jest src/presentation/__tests__/TelaNovoPedido.test.tsx --runInBand
npx jest src/core src/infrastructure/device src/main/factories src/presentation --runInBand
npx tsc --noEmit
npx expo lint
git add src/app src/presentation/__tests__/TelaNovoPedido.test.tsx
git diff --cached --check
git commit -m "feat: migrate order and client creation stacks"
```

Expected: pedido é cadastrado na fixture com UUID da borda e aparece em `A_FAZER`; formulário oferece novo cliente, impede data inválida e não tenta salvar sem cliente.

### Task 9: Edição, parâmetros locais e navegação integral

**Files:** Create `src/app/cliente/[id].tsx`, `src/app/pedido/[id]/editar.tsx`, `src/presentation/__tests__/{TelaEditarCliente,TelaEditarPedido,RoteamentoEdicao,Navegacao,DateValidation}.test.tsx`; Modify `src/presentation/hooks/AppProviders.tsx`, `src/app/_layout.tsx`, `src/presentation/__tests__/RouterGuards.test.tsx`. Tela `src/app/evento/[id]/editar.tsx` e seu teste vieram da Task 7.

**Interfaces:** Consumes: `useLocalSearchParams` do Expo Router SDK 57, `useRouteParams(): {id?:string}` mantido para testes de componente, `EditarClienteUseCase.execute({clienteId,nome,contato})`, `EditarPedidoUseCase.execute({pedidoId,descricao,dataEntrega})`, `EditarEventoUseCase` antigo. Produces: `/cliente/[id]`, `/pedido/[id]/editar`, `/evento/[id]/editar` resolvidas pelo parâmetro da rota em foco, com fallback explícito de Context apenas nos testes antigos.

- [ ] **Step 1: Trazer os testes das edições e da navegação, antes das duas telas faltantes**

```bash
cp ../ateII/src/presentation/__tests__/TelaEditarCliente.test.tsx ../ateII/src/presentation/__tests__/TelaEditarPedido.test.tsx ../ateII/src/presentation/__tests__/RoteamentoEdicao.test.tsx ../ateII/src/presentation/__tests__/Navegacao.test.tsx ../ateII/src/presentation/__tests__/DateValidation.test.tsx src/presentation/__tests__/
```

Em cada arquivo novo, mudar o prefixo dos imports de telas de `../../../app/` para `../../app/`. Nos poucos `Cliente.criar`, `Pedido.criar`, `Evento.criar` diretos desses testes, importar `gerarIdTeste` de `../../test-support/ids` e passar `id: gerarIdTeste()`, preservando todas as asserções antigas.

- [ ] **Step 2: Teste vermelho de deep link desconhecido, inclusive após outro ID**

Acrescentar a `src/presentation/__tests__/RouterGuards.test.tsx`:

```tsx
import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import TelaEditarCliente from '../../app/cliente/[id]';
import { DataContext } from '../hooks/AppProviders';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

it('troca parâmetro da rota de cliente sem exibir dados do cliente anterior', async () => {
  const seed = seedFixtures();
  renderRouter({
    'cliente/[id]': () => (
      <DataContext.Provider value={{ ...seed, reload: async () => {} }}>
        <TelaEditarCliente onSalvar={async () => {}} />
      </DataContext.Provider>
    ),
  }, { initialUrl: `/cliente/${seed.clientes[0].id}` });
  expect(screen.getByTestId('campo-nome').props.value).toBe(seed.clientes[0].nome);
  act(() => router.push('/cliente/00000000-0000-4000-8000-000000000000'));
  expect(await screen.findByText('Cliente não encontrado')).toBeTruthy();
  expect(screen.queryByText(seed.clientes[0].nome)).toBeNull();
});
```

Run: `npx jest src/presentation/__tests__/RouterGuards.test.tsx --runInBand`. Expected: FAIL enquanto a rota não existe ou enquanto ela usa somente o `id` global do layout raiz.

- [ ] **Step 3: Mover as duas telas e ler o ID da rota em foco**

```bash
mkdir -p "src/app/pedido/[id]"
cp "../ateII/app/cliente/[id].tsx" "src/app/cliente/[id].tsx"
cp "../ateII/app/pedido/[id]/editar.tsx" "src/app/pedido/[id]/editar.tsx"
```

Trocar imports relativos `../../src/`/`../../../src/` pelo alias `@/` nas duas. Em `AppProviders.tsx`, manter `RouteParamsContext` como override dos testes antigos, mas preferir os parâmetros locais do Router em produção:

```tsx
import { useLocalSearchParams } from 'expo-router';

export function useRouteParams(): RouteParamsCtx {
  const override = useContext(RouteParamsContext);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  return { id: override.id ?? routeId };
}
```

No `src/app/_layout.tsx`, deixar `RouteParamsContext.Provider` **sem id** em produção: `<RouteParamsContext.Provider value={{}}>`, retirando `useGlobalSearchParams` e `routeId`. Assim um ID da rota anterior nunca prevalece sobre a tela atual; os testes antigos ainda podem injetar `id` no contexto para renderização isolada. Dentro da guarda logada, registrar:

```tsx
<Stack.Screen name="cliente/[id]" />
<Stack.Screen name="pedido/[id]/editar" />
```

Aplicar `SafeAreaView` em volta dos ScrollViews de edição de cliente e pedido (a edição de evento já foi ajustada na Task 7):

```diff
@@ src/app/cliente/[id].tsx, src/app/pedido/[id]/editar.tsx
+import { SafeAreaView } from 'react-native-safe-area-context';
@@ return (
-    <ScrollView>
+    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
+      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
@@ fim do JSX
-    </ScrollView>
+      </ScrollView>
+    </SafeAreaView>
```

Manter mensagens originais de cliente/pedido/evento não encontrado e filtro de edição somente para pedido `A_FAZER`.

- [ ] **Step 4: Corrigir dependência de hook em testes isolados e aferir integração Router**

`useLocalSearchParams()` deve retornar o parâmetro local do `renderRouter` para deep links. Nos testes antigos sem navigator, o contexto de override tem prioridade; em testes que passam a entity por prop, a prop continua prioridade (`pedidoRecebido ?? pedidos.find((item) => item.id === id)`). Nas suítes de tela isolada (`TelaEditarCliente`, `TelaEditarPedido`, `TelaEditarEvento`, `RoteamentoEdicao`, `DateValidation`) que não montam Router, simular só a API de parâmetros, preservando `RouteParamsContext` de cada teste:

```tsx
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => ({}),
}));
```

`RouterGuards.test.tsx` usa o hook real via `renderRouter` e não recebe esse mock. Verificar os dois tipos de renderização explicitamente:

```bash
npx jest src/presentation/__tests__/RoteamentoEdicao.test.tsx src/presentation/__tests__/RouterGuards.test.tsx src/presentation/__tests__/TelaEditarCliente.test.tsx src/presentation/__tests__/TelaEditarPedido.test.tsx src/presentation/__tests__/TelaEditarEvento.test.tsx src/presentation/__tests__/Navegacao.test.tsx src/presentation/__tests__/DateValidation.test.tsx --runInBand
```

Expected: PASS; rota dinâmica com ID desconhecido não mostra a entity anterior; os três formulários de edição e as datas impossíveis continuam cobertos.

- [ ] **Step 5: Suite completa, lint, typecheck, imports e commit**

Retirar os sete casts temporários `as Href` de `src/app/_layout.tsx` e o import `type Href` antes de executar os comandos (todos os destinos já existem). Exemplo concreto:

```tsx
novoPedido: () => router.push('/pedido/novo'),
editarCliente: (clienteId) => router.push({ pathname: '/cliente/[id]', params: { id: clienteId } }),
```

Aplicar a mesma troca às ações `novoCliente`, `novaObra`, `novoEvento`, `editarPedido` e `editarEvento` do layout da Task 5.

```bash
npx jest --runInBand
npx tsc --noEmit
npx expo lint
rg -n "\.\./\.\./src/|from ['\"]@react-navigation/|from ['\"]uuid" src/app src/presentation src/core
rg -n "as Href" src/app/_layout.tsx
git add src/app src/presentation
git diff --cached --check
git commit -m "feat: migrate edit stacks and focused route params"
```

Expected: pelo menos 31 suítes/150 casos legados (mais as regressões adicionadas) verdes; ambos `rg` sem resultados (exit 1 só neles). `npx expo start` gera tipos das rotas ao iniciar; repetir `npx tsc --noEmit` depois da geração na Task 10.

### Task 10: Diagnóstico final, README e envio fast-forward à `main` existente

**Files:** Modify `README.md` (somente comandos do novo scaffold + o que funciona em demo); `package.json` apenas se for necessário retirar o script `reset-project` que move as rotas novas; delete `scripts/reset-project.js` apenas se esse script for retirado; não tocar `app.json`, `babel.config.js` ou `tsconfig.json` herdados.

**Interfaces:** Consumes: todas as rotas e suites das Tasks 2–9, `origin/main` ancestral da Task 1. Produces: README fiel ao protótipo, bundle Android/iOS SDK 57, último commit revisado e push **normal** à mesma `origin/main` que hoje hospeda `ateII`.

- [ ] **Step 1: Documentar o demo e tornar o reset do exemplo indisponível**

Substituir `README.md` pelo conteúdo concreto:

````md
# ate — protótipo Expo SDK 57

Aplicativo de gestão para artesãos. Esta versão demonstra Kanban, clientes,
estoque e eventos com dados e gateways simulados em memória. Os dados reiniciam
quando o aplicativo reinicia; login, câmera, localização e sincronização são fakes.

## Desenvolvimento

Node >= 22.13, npm, Android/iOS com Expo Go compatível com SDK 57.

```sh
npm ci
npx expo start
```

Conta fake: `artesao@email.com` / `123456`.

## Verificações

```sh
npx jest --runInBand
npx tsc --noEmit
npx expo lint
npx expo install --check
npx expo-doctor
```

Especificação de produto e planos originais estão no commit `7042cac0`:
`git show 7042cac0:docs/ate-fase1.md` e
`git show 7042cac0:docs/ate-fase2.md`.
````

Em `package.json` novo, remover apenas a chave `"reset-project": "node ./scripts/reset-project.js"` e apagar `scripts/reset-project.js`, para evitar que alguém execute o comando de exemplo e mova as telas migradas.

- [ ] **Step 2: Executar diagnóstico e build de bundles sem dependências antigas**

```bash
npx jest --runInBand
npx tsc --noEmit
npx expo lint
npx expo install --check
npx expo-doctor
npx expo export --platform android
npx expo export --platform ios
```

Expected: suites/verificações verdes; as duas exports Metro criam `dist/` ignorado, usando o `expo-router/entry` do scaffold. O plano não requer configuração nativa de Camera/Maps/SQLite porque a demo usa fakes. Confirmar que `react`, `react-native`, `expo`, `expo-router`, `jest-expo` exibem versões do SDK 57 pelo `expo install --check`.

- [ ] **Step 3: Verificação manual da demo em Android e iOS**

```bash
npx expo start
```

Em cada plataforma: abrir sem sessão → Login; logar com conta fake → Kanban; percorrer três tabs; criar cliente, pedido e obra; iniciar produção e concluir com a foto simulada → `FEITO`; vender `SERIE` → quantidade reduzida, Cliente Avulso, pedido `FEITO`; adicionar e remover unidades (dois toques de confirmação); cadastrar feira pelo GPS simulado e por coordenadas manuais; editar e remover evento. Conferir que cabeçalho, primeira ação e última confirmação/scroll não ficam atrás das barras Android edge-to-edge ou do home indicator iOS. Cancelamento/negação dos gateways e modo offline são exercitados nos testes automatizados por injeção dos fakes (não há câmera, localização ou listener de rede reais na demo). Registrar resultados das verificações Android/iOS na revisão, sem criar snapshot de tela.

- [ ] **Step 4: Revisar diferença e commitar documentação/limpeza**

```bash
git status --short --branch
git diff
git diff --check
git log --oneline -10
git add README.md package.json scripts/reset-project.js
git diff --cached --check
git commit -m "docs: describe Expo 57 fake-backed prototype"
```

Expected: nenhum arquivo do repositório antigo foi importado para raiz; `app.json`, entry point e `tsconfig.json` do scaffold continuam intactos; `.opencode/` não foi incluído por acidente. Se `package-lock.json` só mudou nos passos `expo install`, já estará nos commits correspondentes.

- [ ] **Step 5: Confirmar base remota e publicar sem sobrescrever história**

```bash
git fetch origin main
git merge-base --is-ancestor origin/main HEAD
git diff --stat origin/main...HEAD
git status --short --branch
git push -u origin main
git ls-remote --heads origin main
```

Expected: `merge-base` código 0; push fast-forward na mesma `main` que antes apontava para `ateII`; o `ls-remote` final aponta ao novo `HEAD`. Se alguém tiver avançado `origin/main`, parar **antes** do push, examinar commits novos e integrá-los normalmente na branch local; nunca usar `--force` ou reescrever a história remota.

---

## Links de documentação para os executores

- [SDK 57 e versões de RN/React/Node](https://docs.expo.dev/versions/v57.0.0/), [índice de correções Expo](https://docs.expo.dev/llms.txt), [Router em `src/app`](https://docs.expo.dev/router/reference/src-directory.md).
- [Rotas protegidas do Expo Router](https://docs.expo.dev/router/advanced/protected.md) (SDK 57 usa `Stack.Protected`; não usar `redirectTo`, que é de SDK 58), [testes de integração Router](https://docs.expo.dev/router/reference/testing.md), [parâmetros locais](https://docs.expo.dev/router/reference/url-parameters.md).
- [Jest/jest-expo/RNTL](https://docs.expo.dev/develop/unit-testing.md), [ESLint flat Expo](https://docs.expo.dev/guides/using-eslint.md), [safe areas](https://docs.expo.dev/develop/user-interface/safe-areas.md), [Android edge-to-edge](https://docs.expo.dev/develop/user-interface/system-bars.md).
- [UUID v4 com random bytes](https://github.com/uuidjs/uuid#uuidv4options-buffer-offset) e [`expo-crypto.getRandomBytes`](https://docs.expo.dev/versions/v57.0.0/sdk/crypto.md#cryptogetrandombytesbytecount).

## Auto-revisão do escopo

- Os arquivos de lógica existentes (quatro entidades, VO/enums, 22 use cases, portas, quatro repositórios fake, quatro gateways fake, fixtures, providers, seis componentes, treze rotas e 31 suítes) têm origem, destino e task atribuídos no mapa acima; a geração de UUID sai inteiramente do domínio e continua com validação v4 em todas as quatro entidades.
- Requisitos do documento de produto que não existem no projeto antigo (SQLite, Supabase/RLS, Storage, câmera/localização reais, mapa visual, sync automático) não são parte da migração de protótipo confirmada pelo solicitante; o README informa essa fronteira. Interfaces, validações, telas e comportamento fake representativos desses requisitos são mantidos.
- Os cinco riscos do Review Focus estão associados a testes novos nas Tasks 2/3, 4, 5, 6 e 9. Cada task de migração executa teste dirigido, suíte acumulada, typecheck e lint antes do commit.
- Nenhum `git mv` pode preservar automaticamente histórico por arquivo entre estes repositórios; o merge `-s ours` preserva ancestralidade remota e deixa o novo scaffold como proprietário da árvore, habilitando push fast-forward para `main` sem force.

## Registro da execução nativa — 29/09/2026

- [x] Task 1: `main` conectada ao histórico remoto pelo merge `d39ed8b`; nenhuma árvore/configuração antiga importada para a raiz.
- [x] Task 2: domínio com ID externo, harness SDK 57 e testes de contrato (`2544199`).
- [x] Task 3: aplicação, repositórios/gateways fake e fixtures (`8a5f313`).
- [x] Task 4: UUID na borda e composição dos fakes (`9bd2435`).
- [x] Task 5: shell/login/Kanban protegidos em `src/app` (`0d30db7`).
- [x] Task 6: Estoque, venda direta e dupla confirmação (`c2ac6de`).
- [x] Task 7: Eventos textuais/GPS fake/edição (`883e9ad`).
- [x] Task 8: pedido/cliente por stacks (`4575266`).
- [x] Task 9: edições, parâmetros locais e reinicialização dos campos por identidade (`46a9df3`).
- [x] Task 10: README atualizado, reset e código dos exemplos removidos; verificação automatizada e bundles concluídos.
- [ ] Verificação visual/manual em aparelhos Android e iOS: indisponível neste ambiente Linux, sem `adb`/emulador e sem `xcrun`/simulador. Os testes de navegação usam o Router real com RNTL; os bundles nativos foram exportados, mas isso não substitui o teste visual dos insets no aparelho.

### Ajustes confirmados durante a execução

1. O SDK 57 requer tipos Jest explicitamente disponíveis: criado `src/test-support/jest.d.ts`, mantendo `tsconfig.json` do scaffold.
2. RNTL instalado pelo Expo é 14.0.1: todas as chamadas `render`, `fireEvent` e `rerender` das suítes migradas foram adaptadas para `await`. Instalado `test-renderer@1.2.0` via Expo para acompanhar React 19.2 (1.3.0 exigia React 19.3).
3. O preset Jest do SDK 57 resolve o UUID pela exportação browser ESM: o allowlist de transformação foi estendido só para `uuid`, usando o preset atual como base.
4. `renderRouter` do SDK 57 acrescenta helpers ao resultado assíncrono, não ao `screen` do RNTL 14: os testes conferem `app.getPathname()` após aguardar o render.
5. A nova regra de lint do React encontrou atualização síncrona no efeito do draft do pedido; seleção do cliente recém-criado agora sincroniza pelo draft com guarda, e o fluxo UC09 continua testado.
6. O teste de troca de `id` na mesma rota expôs campos do registro anterior. Os três formulários de edição agora são reinicializados pela chave da entidade; cliente, pedido e evento possuem testes de troca do parâmetro em foco, além do ID desconhecido.
7. Removidos apenas os componentes/hooks/CSS e script de reset dos exemplos depois de montar as rotas do ate. A declaração CSS temporária também foi removida; o scaffold gerou seus tipos ao iniciar Metro. Assets/configuração do novo scaffold e `.opencode/` local foram preservados.

### Evidências finais

| Verificação | Resultado |
| --- | --- |
| `npx jest --runInBand` | 34 suítes, 166 testes aprovados; nenhum snapshot |
| `npx tsc --noEmit` | aprovado, inclusive depois da geração de tipos do Expo Router |
| `npx expo lint` | aprovado, sem erros ou avisos |
| `npx expo install --check` | dependências alinhadas |
| `npx expo-doctor` | 21/21 checks aprovados |
| `npx expo export --platform android` | bundle Hermes exportado, 1328 módulos |
| `npx expo export --platform ios` | bundle Hermes exportado, 1193 módulos |
| `npx expo start --offline --port 8087` | Metro iniciou e escutou; encerrado após smoke test |
| Configuração raiz | `app.json` e `tsconfig.json` idênticos ao scaffold `248fdde`; entry point continua `expo-router/entry` |
| Arquitetura | sem imports React/Expo/UUID no código de domínio/application; geração somente na borda |

A ampliação para quatro Value Objects fica para uma entrega própria, conforme decisão do solicitante antes da execução.
