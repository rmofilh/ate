# Apresentação ate — Telas + Expo Router + Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar as 5 telas navegáveis do protótipo (Login, Kanban, Novo Pedido/Cliente, Estoque, Mapa de Eventos) consumindo os use cases do Plano 2 via Context API com dados fake pré-populados.

**Architecture:** `app/` (Expo Router) contém as telas completas; `src/presentation/hooks/` provê `AuthContext/DataContext/NetworkContext` instanciados com fakes + `seedFixtures()` em `src/main/factories/makeFakeProviders`; telas chamam use cases, nunca repositórios; testes com React Native Testing Library injetando contexto fake.

**Tech Stack:** Expo Router (tabs + stacks), React Native, Context API, Jest + jest-expo + `@testing-library/react-native`; câmera/geolocalização via `FakeCameraGateway`/`FakeLocationGateway` (nunca SDK real).

**Spec:** `docs/ate-fase2.md` (Seções 2.4 fluxos UC01/UC05/UC07/UC12/UC13, 6.1 Boundary UI, 7.1–7.3 retornos para Tela, 9.1 Presentation consome UseCases, 10.1 presentation/ + main/factories, 10.2 Fase 5 componente/tela) e `docs/ate-fase1.md` (Seção 2 roteamento: pública=auth, logada=tabs Kanban/Estoque/Eventos + stacks; RNF05 labels explícitos; RNF12 permissão só no uso).

## Global Constraints

- Rotas públicas: só autenticação; área logada: Bottom Tabs (Kanban, Estoque, Eventos); fluxos sequenciais (Novo Pedido) em Stacks sobre a tela atual.
- Telas: Login, Dashboard (Kanban A Fazer/Fazendo/Feito), Novo Pedido/Cliente, Estoque (nome, tipo unica/serie, quantidade), Mapa de Eventos (pins; lista + pins cacheados funcionam sem rede).
- Kanban exige foto para Fazendo → Feito sem bypass, exceto venda_direta SERIE; UC05 FA1 cancela e mantém Fazendo com aviso "Foto obrigatória para concluir o pedido."
- Nomes de botões/labels explícitos e confirmações visuais claras (RNF05, letramento básico); ações destrutivas (cancelar pedido, remover obra/evento, remover unidades com dupla confirmação) exigem diálogo explícito.
- Permissões de câmera/localização só no momento do uso; se negadas, aborta com instrução para habilitar nas configurações, sem travar o app (RNF12).
- Telas nunca importam `expo-sqlite`, `drizzle-orm`, `@supabase/supabase-js`, `expo-camera`, `expo-location` diretamente — só `ICameraGateway`/`ILocationGateway` fakes via Context.
- Dados das telas vêm dos fakes pré-populados (`seedFixtures`), nunca hardcoded no componente nem telas vazias.
- Vocabulário: fake = provider in-memory do Plano 2; mock = `jest.mock('expo-camera')` verificando chamada quando necessário; stub = resposta fixa de `capture()`/`getCurrent()`.

## Review Focus

- Toque duplo rápido em "Mover para Feito"/"Confirmar venda" não deveria disparar dois use cases (botão deveria desabilitar em loading).
- Todo botão/ação deveria ter label acessível explícito (`accessibilityLabel`/texto visível) adequado a letramento básico, não só ícone.
- Após deletar o último item, a lista deveria mostrar estado vazio guiado ("Nenhum pedido aqui — toque em Novo"), não tela em branco.
- Sem rede (`isOnline=false`), o banner "Você está offline" deveria aparecer e as ações continuarem funcionando localmente.
- Diálogo destrutivo deveria exigir confirmação explícita e, em remover unidades, dupla confirmação antes de chamar o use case.

---

## File Map (revisão 2026-09-21: telas moram direto em `app/`, sem duplicação em `src/presentation/screens/`)

- `app/_layout.tsx` — Stack raiz: `(auth)` + `(tabs)` + `pedido/novo` + `cliente/novo` + `obra/nova` + `evento/novo`; redireciona por `useAuth().session` (UC01 FA3).
- `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx` — TelaLogin completa (componente mora aqui).
- `app/(tabs)/_layout.tsx` — Tabs `kanban|estoque|eventos` com labels explícitos.
- `app/(tabs)/kanban.tsx`, `app/(tabs)/estoque.tsx`, `app/(tabs)/eventos.tsx` — TelaKanban / TelaEstoque / TelaEventos completas (moram aqui).
- `app/pedido/novo.tsx`, `app/cliente/novo.tsx`, `app/obra/nova.tsx`, `app/evento/novo.tsx` — Stacks de cadastro (componentes moram aqui).
- `src/presentation/hooks/AppProviders.tsx` — `AuthProvider/DataProvider/NetworkProvider` + `useAuth/useData/useNetwork`.
- `src/main/factories/makeFakeProviders.ts` — instancia fakes + `seedFixtures()` e injeta nos use cases (DI da fase protótipo).
- `src/presentation/components/OfflineBanner.tsx` — banner por `isOnline`.
- `src/presentation/components/ConfirmDialog.tsx` — diálogo genérico com `confirmLabel/cancelLabel` + `requireDouble` para RF25.
- `src/presentation/components/PedidoCard.tsx`, `ObraCard.tsx`, `EventoCard.tsx` — cards burros com `accessibilityLabel`.
- `src/presentation/__tests__/*.test.tsx` — um por tela, com RNTL + contexto fake (importam o componente direto de `app/`).

---

### Task 1: Shell Router + Providers + Banner (base de todas as telas)

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `src/presentation/hooks/AppProviders.tsx`
- Create: `src/main/factories/makeFakeProviders.ts`
- Create: `src/presentation/components/OfflineBanner.tsx`
- Test: `src/presentation/__tests__/Shell.test.tsx`

**Interfaces:**
- Consumes: fakes + `seedFixtures()` + use cases do Plano 2 (mesmos `execute()`); `Coordenada`, entities para tipar contexto.
- Produces: `useAuth(): {session, login(email,password): Promise<void>, logout(): Promise<void>}`, `useData(): {pedidos: Pedido[], obras: Obra[], eventos: Evento[], clientes: Cliente[], reload(): Promise<void>}`, `useNetwork(): {isOnline: boolean, setOnline(b:boolean): void}` e `makeFakeProviders()` que Tasks 2–6 consomem para injetar contexto fake nos testes.

- [ ] **Step 1: Instalar RNTL e escrever teste de shell**

Run: `npm install -D @testing-library/react-native @testing-library/jest-native react-test-renderer`
Expected: instala sem erro.

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FakeProviders } from '../main/factories/makeFakeProviders';
import { OfflineBanner } from '../presentation/components/OfflineBanner';

describe('shell', () => {
  it('banner aparece offline e some online', () => {
    const { rerender } = render(<OfflineBanner isOnline={false} />);
    expect(screen.getByLabelText('banner-offline')).toBeTruthy();
    rerender(<OfflineBanner isOnline={true} />);
    expect(screen.queryByLabelText('banner-offline')).toBeNull();
  });

  it('FakeProviders expõe Kanban não-vazio (fixtures)', async () => {
    const bag = FakeProviders.harness();
    expect(bag.pedidos.length).toBeGreaterThanOrEqual(3);
  });
});
```

Salvar em `src/presentation/__tests__/Shell.test.tsx`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/presentation/__tests__/Shell.test.tsx --verbose`
Expected: FAIL "Cannot find module '../main/factories/makeFakeProviders'".

- [ ] **Step 3: Criar AppProviders.tsx (Context API)**

```tsx
import React, { createContext, useContext, useState } from 'react';
import type { Pedido } from '../../core/domain/entities/Pedido';
import type { Obra } from '../../core/domain/entities/Obra';
import type { Evento } from '../../core/domain/entities/Evento';
import type { Cliente } from '../../core/domain/entities/Cliente';

export interface AuthCtx { session: { userId: string; token: string } | null; login(email: string, password: string): Promise<void>; logout(): Promise<void>; }
export interface DataCtx { pedidos: Pedido[]; obras: Obra[]; eventos: Evento[]; clientes: Cliente[]; reload(): Promise<void>; }
export interface NetCtx { isOnline: boolean; setOnline(b: boolean): void; }

export const AuthContext = createContext<AuthCtx>({ session: null, login: async () => {}, logout: async () => {} });
export const DataContext = createContext<DataCtx>({ pedidos: [], obras: [], eventos: [], clientes: [], reload: async () => {} });
export const NetworkContext = createContext<NetCtx>({ isOnline: true, setOnline: () => {} });

export function useAuth(): AuthCtx { return useContext(AuthContext); }
export function useData(): DataCtx { return useContext(DataContext); }
export function useNetwork(): NetCtx { return useContext(NetworkContext); }
```

Salvar em `src/presentation/hooks/AppProviders.tsx`.

- [ ] **Step 4: Criar makeFakeProviders.ts (DI fake + seed)**

```ts
import { seedFixtures } from '../../infrastructure/seed/fixtures';

export const FakeProviders = {
  harness() {
    const seed = seedFixtures();
    return { pedidos: seed.pedidos, obras: seed.obras, eventos: seed.eventos, clientes: seed.clientes, usuarioId: seed.usuarioId };
  },
};
```

Salvar em `src/main/factories/makeFakeProviders.ts`. (Na implementação real da task, o executor expande para instanciar `InMemory*` + use cases e provedores React; o harness acima é o mínimo que o teste trava.)

- [ ] **Step 5: Criar OfflineBanner.tsx**

```tsx
import React from 'react';
import { Text, View } from 'react-native';

export function OfflineBanner({ isOnline }: { isOnline: boolean }) {
  if (isOnline) return null;
  return (
    <View accessibilityLabel="banner-offline">
      <Text>Você está offline — ações serão salvas no aparelho</Text>
    </View>
  );
}
```

- [ ] **Step 6: Criar layouts Expo Router (telas completas vêm nas Tasks 2–6, direto em `app/`)**

`app/_layout.tsx`:
```tsx
import { Stack } from 'expo-router';
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: true }} />;
}
```

`app/(tabs)/_layout.tsx`:
```tsx
import { Tabs } from 'expo-router';
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="kanban" options={{ title: 'Pedidos' }} />
      <Tabs.Screen name="estoque" options={{ title: 'Estoque' }} />
      <Tabs.Screen name="eventos" options={{ title: 'Eventos' }} />
    </Tabs>
  );
}
```

`app/(auth)/login.tsx` — TelaLogin completa (código do Step 3 mora aqui).
`app/(tabs)/kanban.tsx` — TelaKanban completa.
`app/(tabs)/estoque.tsx` — TelaEstoque completa.
`app/(tabs)/eventos.tsx` — TelaEventos completa.
`app/(auth)/_layout.tsx`: Stack com `login` sem header de tabs.

- [ ] **Step 7: Rodar e ver passar + commit**

Run: `npx jest src/presentation/__tests__/Shell.test.tsx --verbose`
Expected: PASS (2 passed).

```bash
git add app src/presentation/hooks/AppProviders.tsx src/main/factories/makeFakeProviders.ts src/presentation/components/OfflineBanner.tsx src/presentation/__tests__/Shell.test.tsx
git commit -m "feat(ui): add shell router providers banner"
```

---

### Task 2: TelaLogin (UC01/UC02)

**Files:**
- Create: `app/(auth)/login.tsx` (TelaLogin completa)
- Test: `src/presentation/__tests__/TelaLogin.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 1) cujo `login` delega a `LoginUseCase.execute({email,password})` do Plano 2.
- Produces: default export `TelaLogin` com inputs `e-mail`/`senha`, botão `Entrar`, erro `E-mail ou senha incorretos`, redireciono via Router quando `session !== null`.

- [ ] **Step 1: Escrever teste RNTL**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TelaLogin from '../../../app/(auth)/login';
import { AuthContext } from '../hooks/AppProviders';

describe('TelaLogin', () => {
  it('loga com credencial válida e mostra erro com inválida', async () => {
    const login = jest.fn(async (email: string, password: string) => {
      if (email === 'artesao@email.com' && password === '123456') return;
      throw new Error('E-mail ou senha incorretos');
    });
    render(
      <AuthContext.Provider value={{ session: null, login, logout: async () => {} }}>
        <TelaLogin />
      </AuthContext.Provider>
    );
    fireEvent.changeText(screen.getByLabelText('campo-email'), 'artesao@email.com');
    fireEvent.changeText(screen.getByLabelText('campo-senha'), '123456');
    fireEvent.press(screen.getByLabelText('botao-entrar'));
    await waitFor(() => expect(login).toHaveBeenCalledWith('artesao@email.com', '123456'));

    fireEvent.changeText(screen.getByLabelText('campo-senha'), 'errada');
    fireEvent.press(screen.getByLabelText('botao-entrar'));
    await waitFor(() => expect(screen.getByLabelText('erro-login')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/presentation/__tests__/TelaLogin.test.tsx --verbose`
Expected: FAIL "Cannot find module '../../../app/(auth)/login'".

- [ ] **Step 3: Implementação mínima (labels explícitos RNF05)**

```tsx
import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { useAuth } from '../hooks/AppProviders';

export default function TelaLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function entrar() {
    setLoading(true);
    setErro(null);
    try {
      await login(email, password);
    } catch {
      setErro('E-mail ou senha incorretos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Text accessibilityLabel="titulo-login">Entrar no ate</Text>
      <Text>E-mail</Text>
      <TextInput accessibilityLabel="campo-email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Text>Senha</Text>
      <TextInput accessibilityLabel="campo-senha" value={password} onChangeText={setPassword} secureTextEntry />
      {erro ? <Text accessibilityLabel="erro-login">{erro}</Text> : null}
      <View accessibilityLabel="botao-entrar">
        <Button title={loading ? 'Entrando...' : 'Entrar'} onPress={entrar} disabled={loading} />
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/presentation/__tests__/TelaLogin.test.tsx --verbose`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/login.tsx src/presentation/__tests__/TelaLogin.test.tsx
git commit -m "feat(ui): add TelaLogin com erro FA1"
```

---

### Task 3: TelaKanban — Dashboard (UC03/UC04/UC05 + PedidoCard)

**Files:**
- Create: `src/presentation/components/PedidoCard.tsx`
- Create: `app/(tabs)/kanban.tsx` (TelaKanban completa)
- Test: `src/presentation/__tests__/TelaKanban.test.tsx`

**Interfaces:**
- Consumes: `useData()` (Task 1) + `ConcluirPedidoUseCase.execute({pedidoId,fotoPath})` via `FakeCameraGateway.capture()` (Plano 2 Task 1) + `IniciarProducaoUseCase`.
- Produces: `TelaKanban` com 3 colunas `coluna-a-fazer/fazendo/feito`, cards `pedido-<id>`, botões `mover-<id>-fazendo` e `mover-<id>-feito`, aviso `aviso-foto-obrigatoria` (UC05 FA1), desabilita botão em loading (Review Focus duplo clique).

- [ ] **Step 1: Escrever testes (colunas, concluir com foto fake, cancela câmera)**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TelaKanban from '../../../app/(tabs)/kanban';
import { DataContext } from '../hooks/AppProviders';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('TelaKanban', () => {
  it('exibe 3 colunas com cards das fixtures', () => {
    const seed = seedFixtures();
    render(
      <DataContext.Provider value={{ pedidos: seed.pedidos, obras: seed.obras, eventos: [], clientes: seed.clientes, reload: async () => {} }}>
        <TelaKanban onIniciar={async () => {}} onConcluir={async () => {}} />
      </DataContext.Provider>
    );
    expect(screen.getByLabelText('coluna-a-fazer')).toBeTruthy();
    expect(screen.getByLabelText('coluna-fazendo')).toBeTruthy();
    expect(screen.getByLabelText('coluna-feito')).toBeTruthy();
    expect(screen.getAllByLabelText(/pedido-/).length).toBeGreaterThanOrEqual(3);
  });

  it('cancelar câmera mantém FAZENDO com aviso (UC05 FA1)', async () => {
    const seed = seedFixtures();
    const fazendo = seed.pedidos.find(p => p.status === 'FAZENDO')!;
    const onConcluir = jest.fn(async () => { throw new Error('Foto obrigatória para concluir o pedido.'); });
    render(
      <DataContext.Provider value={{ pedidos: seed.pedidos, obras: seed.obras, eventos: [], clientes: seed.clientes, reload: async () => {} }}>
        <TelaKanban onIniciar={async () => {}} onConcluir={onConcluir} pedidoAlvo={fazendo.id} />
      </DataContext.Provider>
    );
    fireEvent.press(screen.getByLabelText(`mover-${fazendo.id}-feito`));
    await waitFor(() => expect(screen.getByLabelText('aviso-foto-obrigatoria')).toBeTruthy());
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/presentation/__tests__/TelaKanban.test.tsx --verbose`
Expected: FAIL "Cannot find module '../../../app/(tabs)/kanban'".

- [ ] **Step 3: Criar PedidoCard.tsx**

```tsx
import React from 'react';
import { Button, Text, View } from 'react-native';
import type { Pedido } from '../../core/domain/entities/Pedido';

export function PedidoCard({ pedido, onIniciar, onConcluir, loading }: {
  pedido: Pedido; onIniciar(): void; onConcluir(): void; loading: boolean;
}) {
  return (
    <View accessibilityLabel={`pedido-${pedido.id}`}>
      <Text>{pedido.descricao}</Text>
      {pedido.status === 'A_FAZER' ? (
        <View accessibilityLabel={`mover-${pedido.id}-fazendo`}>
          <Button title="Começar a fazer" onPress={onIniciar} disabled={loading} />
        </View>
      ) : null}
      {pedido.status === 'FAZENDO' ? (
        <View accessibilityLabel={`mover-${pedido.id}-feito`}>
          <Button title={loading ? 'Salvando...' : 'Mover para Feito (tirar foto)'} onPress={onConcluir} disabled={loading} />
        </View>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Criar TelaKanban.tsx**

```tsx
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useData } from '../hooks/AppProviders';
import { PedidoCard } from '../components/PedidoCard';
import { OfflineBanner } from '../components/OfflineBanner';
import { useNetwork } from '../hooks/AppProviders';

export default function TelaKanban({ onIniciar, onConcluir, pedidoAlvo }: {
  onIniciar(pedidoId: string): Promise<void>; onConcluir(pedidoId: string): Promise<void>; pedidoAlvo?: string;
}) {
  const { pedidos } = useData();
  const { isOnline } = useNetwork();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function concluir(id: string) {
    setLoadingId(id);
    setAviso(null);
    try {
      await onConcluir(id);
    } catch {
      setAviso('Foto obrigatória para concluir o pedido.');
    } finally {
      setLoadingId(null);
    }
  }

  function coluna(status: 'A_FAZER' | 'FAZENDO' | 'FEITO', label: string) {
    return (
      <View accessibilityLabel={label}>
        <Text>{status === 'A_FAZER' ? 'A Fazer' : status === 'FAZENDO' ? 'Fazendo' : 'Feito'}</Text>
        {pedidos.filter(p => p.status === status).map(p => (
          <PedidoCard key={p.id} pedido={p} loading={loadingId === p.id}
            onIniciar={() => onIniciar(p.id)} onConcluir={() => concluir(p.id)} />
        ))}
        {pedidos.filter(p => p.status === status).length === 0 ? <Text>Nenhum pedido aqui — toque em Novo Pedido</Text> : null}
      </View>
    );
  }

  return (
    <View>
      <OfflineBanner isOnline={isOnline} />
      <Text accessibilityLabel="titulo-kanban">Meus Pedidos</Text>
      {aviso ? <Text accessibilityLabel="aviso-foto-obrigatoria">{aviso}</Text> : null}
      {coluna('A_FAZER', 'coluna-a-fazer')}
      {coluna('FAZENDO', 'coluna-fazendo')}
      {coluna('FEITO', 'coluna-feito')}
    </View>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx jest src/presentation/__tests__/TelaKanban.test.tsx --verbose`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit**

```bash
git add src/presentation/components/PedidoCard.tsx app/(tabs)/kanban.tsx src/presentation/__tests__/TelaKanban.test.tsx
git commit -m "feat(ui): add Kanban 3 colunas com foto obrigatoria"
```

---

### Task 4: Novo Pedido / Novo Cliente (Stacks UC07/UC08/UC09 + RF19 editar)

**Files:**
- Create: `app/pedido/novo.tsx` (TelaNovoPedido completa)
- Create: `app/cliente/novo.tsx` (TelaNovoCliente completa)
- Test: `src/presentation/__tests__/TelaNovoPedido.test.tsx`

**Interfaces:**
- Consumes: `useData()` + `CadastrarPedidoUseCase.execute` / `CadastrarClienteUseCase.execute` (Plano 2); props `clientes: Cliente[]`, `obras: Obra[]`.
- Produces: `TelaNovoPedido` com campos `campo-descricao/canal/data/cliente/obra`, botão `botao-salvar-pedido`, erro `erro-pedido`; `TelaNovoCliente` com `campo-nome/contato` + `botao-salvar-cliente`; wrappers `app/pedido/novo.tsx`, `app/cliente/novo.tsx`.

- [ ] **Step 1: Escrever teste (salva + cliente novo via extend UC09)**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TelaNovoPedido from '../../../app/pedido/novo';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('TelaNovoPedido', () => {
  it('preenche e salva chamando onSalvar', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {});
    render(<TelaNovoPedido clientes={seed.clientes} obras={seed.obras} onSalvar={onSalvar} />);
    fireEvent.changeText(screen.getByLabelText('campo-descricao'), 'Onça de madeira');
    fireEvent.press(screen.getByLabelText('botao-salvar-pedido'));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ descricao: 'Onça de madeira' })));
  });

  it('descrição vazia mostra erro sem chamar onSalvar', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {});
    render(<TelaNovoPedido clientes={seed.clientes} obras={seed.obras} onSalvar={onSalvar} />);
    fireEvent.press(screen.getByLabelText('botao-salvar-pedido'));
    await waitFor(() => expect(screen.getByLabelText('erro-pedido')).toBeTruthy());
    expect(onSalvar).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/presentation/__tests__/TelaNovoPedido.test.tsx --verbose`
Expected: FAIL "Cannot find module '../../../app/pedido/novo'".

- [ ] **Step 3: Implementar telas mínimas**

```tsx
// TelaNovoPedido.tsx
import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import type { Cliente } from '../../core/domain/entities/Cliente';
import type { Obra } from '../../core/domain/entities/Obra';

export default function TelaNovoPedido({ clientes, obras, onSalvar }: {
  clientes: Cliente[]; obras: Obra[]; onSalvar(args: { descricao: string; clienteId: string; obraId: string | null }): Promise<void>;
}) {
  const [descricao, setDescricao] = useState('');
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? '');
  const [obraId, setObraId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!descricao.trim() || !clienteId) {
      setErro('Preencha a descrição e escolha o cliente');
      return;
    }
    await onSalvar({ descricao, clienteId, obraId });
  }

  return (
    <View>
      <Text accessibilityLabel="titulo-novo-pedido">Novo Pedido</Text>
      <Text>Descrição da peça</Text>
      <TextInput accessibilityLabel="campo-descricao" value={descricao} onChangeText={setDescricao} />
      <Text>Cliente: {clientes.find(c => c.id === clienteId)?.nome ?? 'escolha'}</Text>
      <Text>Obras: {obras.length} no estoque (obra opcional)</Text>
      {erro ? <Text accessibilityLabel="erro-pedido">{erro}</Text> : null}
      <View accessibilityLabel="botao-salvar-pedido">
        <Button title="Salvar Pedido" onPress={salvar} />
      </View>
    </View>
  );
}
```

`TelaNovoCliente.tsx` (mesmo padrão: `campo-nome`, `campo-contato`, `botao-salvar-cliente`, `erro-cliente`).

- [ ] **Step 4: Criar wrappers de rota**

`app/pedido/novo.tsx` — TelaNovoPedido completa (código do Step 3 mora aqui).
`app/cliente/novo.tsx` — TelaNovoCliente completa.

- [ ] **Step 5: Rodar e ver passar + commit**

Run: `npx jest src/presentation/__tests__/TelaNovoPedido.test.tsx --verbose`
Expected: PASS.

```bash
git add app/pedido/novo.tsx app/cliente/novo.tsx src/presentation/__tests__/TelaNovoPedido.test.tsx
git commit -m "feat(ui): add Novo Pedido e Novo Cliente stacks"
```

---

### Task 5: TelaEstoque (UC11/UC12/UC22/UC23/UC26/UC27 + ObraCard)

**Files:**
- Create: `src/presentation/components/ObraCard.tsx`
- Create: `src/presentation/components/ConfirmDialog.tsx`
- Create: `app/(tabs)/estoque.tsx` (TelaEstoque completa)
- Create: `app/obra/nova.tsx` (TelaNovaObra completa)
- Test: `src/presentation/__tests__/TelaEstoque.test.tsx`

**Interfaces:**
- Consumes: `useData()` + `CadastrarObraUseCase/AdicionarUnidadesUseCase/RemoverUnidadesUseCase/RemoverObraUseCase/VendaDiretaUseCase` (Plano 2).
- Produces: `TelaEstoque` com lista `obra-<id>`, badge `qtd-<id>`, botões `venda-<id>`, `add-<id>`, `remover-unidades-<id>`, `remover-obra-<id>`; `ConfirmDialog` com `confirmLabel/cancelLabel` e modo `dupla` (RF25); `TelaNovaObra` com `campo-nome-obra/tipo/quantidade` + `botao-salvar-obra`.

- [ ] **Step 1: Escrever testes (lista fixtures, venda direta, dupla confirmação)**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TelaEstoque from '../../../app/(tabs)/estoque';
import { DataContext } from '../hooks/AppProviders';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('TelaEstoque', () => {
  it('lista obras das fixtures com quantidade', () => {
    const seed = seedFixtures();
    render(
      <DataContext.Provider value={{ pedidos: [], obras: seed.obras, eventos: [], clientes: [], reload: async () => {} }}>
        <TelaEstoque onVenda={async () => {}} onAdicionar={async () => {}} onRemoverUnidades={async () => {}} onRemoverObra={async () => {}} />
      </DataContext.Provider>
    );
    expect(screen.getAllByLabelText(/obra-/).length).toBeGreaterThanOrEqual(2);
  });

  it('venda direta chama onVenda com qtd (UC27)', async () => {
    const seed = seedFixtures();
    const serie = seed.obras.find(o => o.tipo === 'SERIE')!;
    const onVenda = jest.fn(async () => {});
    render(
      <DataContext.Provider value={{ pedidos: [], obras: seed.obras, eventos: [], clientes: [], reload: async () => {} }}>
        <TelaEstoque onVenda={onVenda} onAdicionar={async () => {}} onRemoverUnidades={async () => {}} onRemoverObra={async () => {}} />
      </DataContext.Provider>
    );
    fireEvent.press(screen.getByLabelText(`venda-${serie.id}`));
    await waitFor(() => expect(onVenda).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/presentation/__tests__/TelaEstoque.test.tsx --verbose`
Expected: FAIL "Cannot find module '../../../app/(tabs)/estoque'".

- [ ] **Step 3: Criar ConfirmDialog.tsx + ObraCard.tsx**

```tsx
// ConfirmDialog.tsx
import React from 'react';
import { Button, Text, View } from 'react-native';

export function ConfirmDialog({ titulo, onConfirm, onCancel, dupla = false, onConfirmDupla }: {
  titulo: string; onConfirm(): void; onCancel(): void; dupla?: boolean; onConfirmDupla?(): void;
}) {
  return (
    <View accessibilityLabel="dialog-confirm">
      <Text>{titulo}</Text>
      <View accessibilityLabel="dialog-cancel"><Button title="Cancelar" onPress={onCancel} /></View>
      <View accessibilityLabel="dialog-confirm-btn"><Button title="Confirmar" onPress={onConfirm} /></View>
      {dupla ? (
        <View accessibilityLabel="dialog-confirm-dupla">
          <Button title="Confirmar de novo (baixa definitiva)" onPress={onConfirmDupla ?? onConfirm} />
        </View>
      ) : null}
    </View>
  );
}
```

```tsx
// ObraCard.tsx
import React from 'react';
import { Button, Text, View } from 'react-native';
import type { Obra } from '../../core/domain/entities/Obra';

export function ObraCard({ obra, onVenda, onAdicionar }: { obra: Obra; onVenda(): void; onAdicionar(): void }) {
  return (
    <View accessibilityLabel={`obra-${obra.id}`}>
      <Text>{obra.nome} ({obra.tipo})</Text>
      <Text accessibilityLabel={`qtd-${obra.id}`}>Qtd: {obra.quantidade}{obra.quantidade === 0 ? ' (Esgotada)' : ''}</Text>
      <View accessibilityLabel={`venda-${obra.id}`}><Button title="Venda direta" onPress={onVenda} /></View>
      <View accessibilityLabel={`add-${obra.id}`}><Button title="Adicionar unidades" onPress={onAdicionar} /></View>
    </View>
  );
}
```

- [ ] **Step 4: Criar TelaEstoque.tsx + TelaNovaObra.tsx**

```tsx
import React from 'react';
import { Text, View } from 'react-native';
import { useData } from '../hooks/AppProviders';
import { ObraCard } from '../components/ObraCard';

export default function TelaEstoque({ onVenda, onAdicionar, onRemoverUnidades, onRemoverObra }: {
  onVenda(obraId: string): Promise<void>; onAdicionar(obraId: string): Promise<void>; onRemoverUnidades(obraId: string): Promise<void>; onRemoverObra(obraId: string): Promise<void>;
}) {
  const { obras } = useData();
  return (
    <View>
      <Text accessibilityLabel="titulo-estoque">Estoque de Obras</Text>
      {obras.length === 0 ? <Text>Nenhuma obra — toque em Nova Obra</Text> : null}
      {obras.map(o => <ObraCard key={o.id} obra={o} onVenda={() => onVenda(o.id)} onAdicionar={() => onAdicionar(o.id)} />)}
    </View>
  );
}
```

`TelaNovaObra.tsx`: campos `campo-nome-obra`, `campo-tipo-obra` (UNICA/SERIE), `campo-qtd-obra` (só SERIE), `botao-salvar-obra`, `erro-obra`; valida `qtd>0` quando SERIE (UC12 passo 4).
`app/obra/nova.tsx` — TelaNovaObra completa.

- [ ] **Step 5: Rodar e ver passar + commit**

Run: `npx jest src/presentation/__tests__/TelaEstoque.test.tsx --verbose`
Expected: PASS.

```bash
git add src/presentation/components/ObraCard.tsx src/presentation/components/ConfirmDialog.tsx app/(tabs)/estoque.tsx app/obra/nova.tsx src/presentation/__tests__/TelaEstoque.test.tsx
git commit -m "feat(ui): add Estoque com venda direta e dialog"
```

---

### Task 6: TelaEventos + Novo Evento (UC13/UC15/UC24/UC25 + pins)

**Files:**
- Create: `src/presentation/components/EventoCard.tsx`
- Create: `app/(tabs)/eventos.tsx` (TelaEventos completa)
- Create: `app/evento/novo.tsx` (TelaNovoEvento completa)
- Test: `src/presentation/__tests__/TelaEventos.test.tsx`

**Interfaces:**
- Consumes: `useData()` + `CadastrarEventoUseCase/EditarEventoUseCase/RemoverEventoUseCase` (Plano 2) + `FakeLocationGateway.getCurrent()`.
- Produces: `TelaEventos` com lista `evento-<id>` + `pin-<id>` (latitude/longitude como texto — mapa real é fase futura, pins cacheados via fixtures), botão `novo-evento`; `TelaNovoEvento` com `campo-nome-evento/data/endereco/obs` + `botao-usar-gps` + `botao-salvar-evento`.

- [ ] **Step 1: Escrever testes**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TelaEventos from '../../../app/(tabs)/eventos';
import { DataContext } from '../hooks/AppProviders';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('TelaEventos', () => {
  it('lista eventos com pins das fixtures', () => {
    const seed = seedFixtures();
    render(
      <DataContext.Provider value={{ pedidos: [], obras: [], eventos: seed.eventos, clientes: [], reload: async () => {} }}>
        <TelaEventos onNovo={() => {}} onRemover={async () => {}} />
      </DataContext.Provider>
    );
    expect(screen.getAllByLabelText(/evento-/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByLabelText(/pin-/).length).toBeGreaterThanOrEqual(1);
  });

  it('remover pede confirmação antes de chamar onRemover', async () => {
    const seed = seedFixtures();
    const onRemover = jest.fn(async () => {});
    render(
      <DataContext.Provider value={{ pedidos: [], obras: [], eventos: seed.eventos, clientes: [], reload: async () => {} }}>
        <TelaEventos onNovo={() => {}} onRemover={onRemover} />
      </DataContext.Provider>
    );
    const id = seed.eventos[0].id;
    fireEvent.press(screen.getByLabelText(`remover-${id}`));
    expect(screen.getByLabelText('dialog-confirm')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('dialog-confirm-btn'));
    await waitFor(() => expect(onRemover).toHaveBeenCalledWith(id));
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/presentation/__tests__/TelaEventos.test.tsx --verbose`
Expected: FAIL "Cannot find module '../../../app/(tabs)/eventos'".

- [ ] **Step 3: Criar EventoCard.tsx + TelaEventos.tsx**

```tsx
// EventoCard.tsx
import React from 'react';
import { Button, Text, View } from 'react-native';
import type { Evento } from '../../core/domain/entities/Evento';

export function EventoCard({ evento, onRemover }: { evento: Evento; onRemover(): void }) {
  return (
    <View accessibilityLabel={`evento-${evento.id}`}>
      <Text>{evento.nome} — {evento.endereco}</Text>
      <Text accessibilityLabel={`pin-${evento.id}`}>
        Pin: {evento.localizacao.latitude}, {evento.localizacao.longitude}
      </Text>
      <View accessibilityLabel={`remover-${evento.id}`}>
        <Button title="Remover evento" onPress={onRemover} />
      </View>
    </View>
  );
}
```

```tsx
// TelaEventos.tsx
import React, { useState } from 'react';
import { Button, Text, View } from 'react-native';
import { useData } from '../hooks/AppProviders';
import { EventoCard } from '../components/EventoCard';
import { ConfirmDialog } from '../components/ConfirmDialog';

export default function TelaEventos({ onNovo, onRemover }: { onNovo(): void; onRemover(eventoId: string): Promise<void> }) {
  const { eventos } = useData();
  const [alvo, setAlvo] = useState<string | null>(null);

  return (
    <View>
      <Text accessibilityLabel="titulo-eventos">Mapa de Eventos</Text>
      <View accessibilityLabel="novo-evento"><Button title="Novo Evento" onPress={onNovo} /></View>
      {eventos.length === 0 ? <Text>Nenhum evento — toque em Novo Evento</Text> : null}
      {eventos.map(e => (
        <EventoCard key={e.id} evento={e} onRemover={() => setAlvo(e.id)} />
      ))}
      {alvo ? (
        <ConfirmDialog titulo="Remover evento cancelado?" onCancel={() => setAlvo(null)} onConfirm={() => { const id = alvo; setAlvo(null); void onRemover(id); }} />
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Criar TelaNovoEvento.tsx + rota**

```tsx
import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';

export default function TelaNovoEvento({ onGps, onSalvar }: {
  onGps(): Promise<{ latitude: number; longitude: number }>; onSalvar(args: { nome: string; endereco: string }): Promise<void>;
}) {
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [ponto, setPonto] = useState<string | null>(null);

  return (
    <View>
      <Text accessibilityLabel="titulo-novo-evento">Novo Evento</Text>
      <Text>Nome da feira</Text>
      <TextInput accessibilityLabel="campo-nome-evento" value={nome} onChangeText={setNome} />
      <Text>Endereço</Text>
      <TextInput accessibilityLabel="campo-endereco-evento" value={endereco} onChangeText={setEndereco} />
      <View accessibilityLabel="botao-usar-gps">
        <Button title="Usar minha localização" onPress={() => onGps().then(c => setPonto(`${c.latitude},${c.longitude}`))} />
      </View>
      {ponto ? <Text accessibilityLabel="ponto-selecionado">{ponto}</Text> : null}
      <View accessibilityLabel="botao-salvar-evento">
        <Button title="Salvar Evento" onPress={() => onSalvar({ nome, endereco })} />
      </View>
    </View>
  );
}
```

`app/evento/novo.tsx` — TelaNovoEvento completa.

- [ ] **Step 5: Rodar suíte presentation completa + checagem de arquitetura**

Run: `npx jest src/presentation --verbose`
Expected: PASS (6 arquivos).

Run: `npm run typecheck && ! grep -r "expo-sqlite\|supabase-js\|expo-camera\|expo-location" src/presentation app || echo "VIOLACAO"`
Expected: grep não acha nada (telas usam só fakes via Context).

- [ ] **Step 6: Commit**

```bash
git add src/presentation/components/EventoCard.tsx app/(tabs)/eventos.tsx app/evento/novo.tsx src/presentation/__tests__/TelaEventos.test.tsx
git commit -m "feat(ui): add Eventos com pins e confirmacao"
```
