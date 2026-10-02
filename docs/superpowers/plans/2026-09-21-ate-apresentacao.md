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
- `app/cliente/[id].tsx`, `app/pedido/[id]/editar.tsx`, `app/evento/[id]/editar.tsx` — Stacks de edição (UC19/UC20/UC24; componentes moram aqui, autocontidos, sem refatorar as telas de cadastro).
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
- Produces: `useAuth(): {session, login(email,password): Promise<void>, logout(): Promise<void>}`, `useData(): {pedidos: Pedido[], obras: Obra[], eventos: Evento[], clientes: Cliente[], reload(): Promise<void>}`, `useNetwork(): {isOnline: boolean, setOnline(b:boolean): void}` e `makeFakeProviders()` que Tasks 2–9 consomem para injetar contexto fake nos testes.

- [ ] **Step 1: Instalar Router + RNTL e escrever teste de shell**

Run: `npx expo install expo-router`
Expected: instala a versão compatível com o SDK 51 sem erro.

Run: `npm install -D @testing-library/react-native @testing-library/jest-native react-test-renderer`
Expected: instala sem erro.

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FakeProviders } from '../../main/factories/makeFakeProviders';
import { OfflineBanner } from '../components/OfflineBanner';

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

- [ ] **Step 2: Liberar `.tsx` no Jest e `app/` no TypeScript**

Em `jest.config.js`, trocar o `testMatch` por:

```js
testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
```

Em `tsconfig.json`, trocar `"include": ["src/**/*"]` por `"include": ["src/**/*", "app/**/*"]`.

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx jest src/presentation/__tests__/Shell.test.tsx --verbose`
Expected: FAIL "Cannot find module '../../main/factories/makeFakeProviders'".

- [ ] **Step 4: Criar AppProviders.tsx (Context API)**

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

- [ ] **Step 5: Criar makeFakeProviders.ts (DI fake + seed)**

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

- [ ] **Step 6: Criar OfflineBanner.tsx**

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

- [ ] **Step 7: Criar layouts Expo Router (telas completas vêm nas Tasks 2–9, direto em `app/`)**

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

- [ ] **Step 8: Rodar e ver passar + commit**

Run: `npx jest src/presentation/__tests__/Shell.test.tsx --verbose`
Expected: PASS (2 passed).

```bash
git add app src/presentation/hooks/AppProviders.tsx src/main/factories/makeFakeProviders.ts src/presentation/components/OfflineBanner.tsx src/presentation/__tests__/Shell.test.tsx jest.config.js tsconfig.json package.json
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
import { useAuth } from '../../src/presentation/hooks/AppProviders';

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
- Produces: `TelaKanban` com 3 colunas `coluna-a-fazer/fazendo/feito`, cards `pedido-<id>`, botões `mover-<id>-fazendo`, `mover-<id>-feito`, `cancelar-<id>` e `botao-sair` (UC02/RF02), diálogo `dialog-confirm` para cancelar (UC21), aviso `aviso-foto-obrigatoria` com a mensagem real do erro (UC05 FA1, RNF12), erro `erro-cancelar`, desabilita botão em loading (Review Focus duplo clique).

- [ ] **Step 1: Escrever testes (colunas, concluir com foto fake, cancela câmera, cancelar, negada)**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TelaKanban from '../../../app/(tabs)/kanban';
import { AuthContext, DataContext } from '../hooks/AppProviders';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('TelaKanban', () => {
  it('exibe 3 colunas com cards das fixtures', () => {
    const seed = seedFixtures();
    render(
      <DataContext.Provider value={{ pedidos: seed.pedidos, obras: seed.obras, eventos: [], clientes: seed.clientes, reload: async () => {} }}>
        <TelaKanban onIniciar={async () => {}} onConcluir={async () => {}} onCancelar={async () => {}} />
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
        <TelaKanban onIniciar={async () => {}} onConcluir={onConcluir} onCancelar={async () => {}} pedidoAlvo={fazendo.id} />
      </DataContext.Provider>
    );
    fireEvent.press(screen.getByLabelText(`mover-${fazendo.id}-feito`));
    await waitFor(() => expect(screen.getByLabelText('aviso-foto-obrigatoria')).toBeTruthy());
  });

  it('cancelar pedido pede confirmação antes de chamar onCancelar (UC21)', async () => {
    const seed = seedFixtures();
    const onCancelar = jest.fn(async () => {});
    render(
      <DataContext.Provider value={{ pedidos: seed.pedidos, obras: seed.obras, eventos: [], clientes: seed.clientes, reload: async () => {} }}>
        <TelaKanban onIniciar={async () => {}} onConcluir={async () => {}} onCancelar={onCancelar} />
      </DataContext.Provider>
    );
    const id = seed.pedidos[0].id;
    fireEvent.press(screen.getByLabelText(`cancelar-${id}`));
    expect(screen.getByLabelText('dialog-confirm')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('dialog-confirm-btn'));
    await waitFor(() => expect(onCancelar).toHaveBeenCalledWith(id));
  });

  it('abortar o diálogo não chama onCancelar', async () => {
    const seed = seedFixtures();
    const onCancelar = jest.fn(async () => {});
    render(
      <DataContext.Provider value={{ pedidos: seed.pedidos, obras: seed.obras, eventos: [], clientes: seed.clientes, reload: async () => {} }}>
        <TelaKanban onIniciar={async () => {}} onConcluir={async () => {}} onCancelar={onCancelar} />
      </DataContext.Provider>
    );
    fireEvent.press(screen.getByLabelText(`cancelar-${seed.pedidos[0].id}`));
    fireEvent.press(screen.getByLabelText('dialog-cancel'));
    expect(onCancelar).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('dialog-confirm')).toBeNull();
  });

  it('botão sair chama logout (UC02/RF02)', async () => {
    const seed = seedFixtures();
    const logout = jest.fn(async () => {});
    render(
      <AuthContext.Provider value={{ session: { userId: seed.usuarioId, token: 'fake' }, login: async () => {}, logout }}>
        <DataContext.Provider value={{ pedidos: seed.pedidos, obras: seed.obras, eventos: [], clientes: seed.clientes, reload: async () => {} }}>
          <TelaKanban onIniciar={async () => {}} onConcluir={async () => {}} onCancelar={async () => {}} />
        </DataContext.Provider>
      </AuthContext.Provider>
    );
    fireEvent.press(screen.getByLabelText('botao-sair'));
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });

  it('permissão negada exibe a instrução do gateway (RNF12)', async () => {
    const seed = seedFixtures();
    const fazendo = seed.pedidos.find(p => p.status === 'FAZENDO')!;
    const onConcluir = jest.fn(async () => { throw new Error('Permissão de câmera negada — habilite nas configurações do dispositivo'); });
    render(
      <DataContext.Provider value={{ pedidos: seed.pedidos, obras: seed.obras, eventos: [], clientes: seed.clientes, reload: async () => {} }}>
        <TelaKanban onIniciar={async () => {}} onConcluir={onConcluir} onCancelar={async () => {}} />
      </DataContext.Provider>
    );
    fireEvent.press(screen.getByLabelText(`mover-${fazendo.id}-feito`));
    await waitFor(() => expect(screen.getByLabelText('aviso-foto-obrigatoria').props.children).toMatch(/configurações/));
  });

  it('desabilita o botão durante o salvamento (duplo clique)', async () => {
    const seed = seedFixtures();
    const fazendo = seed.pedidos.find(p => p.status === 'FAZENDO')!;
    let liberar!: () => void;
    const onConcluir = jest.fn(() => new Promise<void>(res => { liberar = res; }));
    render(
      <DataContext.Provider value={{ pedidos: seed.pedidos, obras: seed.obras, eventos: [], clientes: seed.clientes, reload: async () => {} }}>
        <TelaKanban onIniciar={async () => {}} onConcluir={onConcluir} onCancelar={async () => {}} />
      </DataContext.Provider>
    );
    fireEvent.press(screen.getByLabelText(`mover-${fazendo.id}-feito`));
    await waitFor(() => expect(screen.getByText('Salvando...')).toBeTruthy());
    liberar();
  });

  it('coluna vazia mostra estado guiado (Review Focus)', () => {
    render(
      <DataContext.Provider value={{ pedidos: [], obras: [], eventos: [], clientes: [], reload: async () => {} }}>
        <TelaKanban onIniciar={async () => {}} onConcluir={async () => {}} onCancelar={async () => {}} />
      </DataContext.Provider>
    );
    expect(screen.getAllByText('Nenhum pedido aqui — toque em Novo Pedido').length).toBe(3);
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

export function PedidoCard({ pedido, onIniciar, onConcluir, onCancelar, loading }: {
  pedido: Pedido; onIniciar(): void; onConcluir(): void; onCancelar(): void; loading: boolean;
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
      <View accessibilityLabel={`cancelar-${pedido.id}`}>
        <Button title="Cancelar pedido" onPress={onCancelar} disabled={loading} />
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Criar TelaKanban.tsx**

```tsx
import React, { useState } from 'react';
import { Button, Text, View } from 'react-native';
import { useData } from '../../src/presentation/hooks/AppProviders';
import { PedidoCard } from '../../src/presentation/components/PedidoCard';
import { OfflineBanner } from '../../src/presentation/components/OfflineBanner';
import { ConfirmDialog } from '../../src/presentation/components/ConfirmDialog';
import { useNetwork, useAuth } from '../../src/presentation/hooks/AppProviders';

export default function TelaKanban({ onIniciar, onConcluir, onCancelar, pedidoAlvo }: {
  onIniciar(pedidoId: string): Promise<void>; onConcluir(pedidoId: string): Promise<void>; onCancelar(pedidoId: string): Promise<void>; pedidoAlvo?: string;
}) {
  const { pedidos } = useData();
  const { isOnline } = useNetwork();
  const { logout } = useAuth();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [alvoCancel, setAlvoCancel] = useState<string | null>(null);
  const [erroCancel, setErroCancel] = useState<string | null>(null);

  async function concluir(id: string) {
    setLoadingId(id);
    setAviso(null);
    try {
      await onConcluir(id);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'Foto obrigatória para concluir o pedido.');
    } finally {
      setLoadingId(null);
    }
  }

  async function cancelarConfirmado() {
    if (!alvoCancel) return;
    const id = alvoCancel;
    setAlvoCancel(null);
    setErroCancel(null);
    setLoadingId(id);
    try {
      await onCancelar(id);
    } catch (e) {
      setErroCancel(e instanceof Error ? e.message : 'Não foi possível cancelar o pedido');
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
            onIniciar={() => onIniciar(p.id)} onConcluir={() => concluir(p.id)} onCancelar={() => setAlvoCancel(p.id)} />
        ))}
        {pedidos.filter(p => p.status === status).length === 0 ? <Text>Nenhum pedido aqui — toque em Novo Pedido</Text> : null}
      </View>
    );
  }

  return (
    <View>
      <OfflineBanner isOnline={isOnline} />
      <Text accessibilityLabel="titulo-kanban">Meus Pedidos</Text>
      <View accessibilityLabel="botao-sair"><Button title="Sair" onPress={() => { void logout(); }} /></View>
      {aviso ? <Text accessibilityLabel="aviso-foto-obrigatoria">{aviso}</Text> : null}
      {erroCancel ? <Text accessibilityLabel="erro-cancelar">{erroCancel}</Text> : null}
      {coluna('A_FAZER', 'coluna-a-fazer')}
      {coluna('FAZENDO', 'coluna-fazendo')}
      {coluna('FEITO', 'coluna-feito')}
      {alvoCancel ? (
        <ConfirmDialog titulo="Cancelar este pedido? O estoque vinculado será devolvido." onCancel={() => setAlvoCancel(null)} onConfirm={cancelarConfirmado} />
      ) : null}
    </View>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx jest src/presentation/__tests__/TelaKanban.test.tsx --verbose`
Expected: PASS (8 passed).

- [ ] **Step 6: Commit**

```bash
git add src/presentation/components/PedidoCard.tsx app/(tabs)/kanban.tsx src/presentation/__tests__/TelaKanban.test.tsx
git commit -m "feat(ui): add Kanban 3 colunas com foto obrigatoria e cancelar"
```

---

### Task 4: Novo Pedido / Novo Cliente (Stacks UC07/UC08/UC09)

**Files:**
- Create: `app/pedido/novo.tsx` (TelaNovoPedido completa)
- Create: `app/cliente/novo.tsx` (TelaNovoCliente completa)
- Test: `src/presentation/__tests__/TelaNovoPedido.test.tsx`

**Interfaces:**
- Consumes: `useData()` + `CadastrarPedidoUseCase.execute` / `CadastrarClienteUseCase.execute` (Plano 2); props `clientes: Cliente[]`, `obras: Obra[]`.
- Produces: `TelaNovoPedido` com `campo-descricao`, seletores `escolher-cliente-<id>` (UC08) e `escolher-obra-<id>` (UC10), botão `botao-salvar-pedido`, erro `erro-pedido`; `TelaNovoCliente` com `campo-nome/contato` + `botao-salvar-cliente`; rotas `app/pedido/novo.tsx`, `app/cliente/novo.tsx`. (Edição de pedido é a Task 8; edição de cliente é a Task 7.)

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

  it('escolhe cliente e obra antes de salvar (UC08/UC10)', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {});
    render(<TelaNovoPedido clientes={seed.clientes} obras={seed.obras} onSalvar={onSalvar} />);
    const cli = seed.clientes[0];
    const obra = seed.obras[0];
    fireEvent.changeText(screen.getByLabelText('campo-descricao'), 'Peca com obra');
    fireEvent.press(screen.getByLabelText(`escolher-cliente-${cli.id}`));
    fireEvent.press(screen.getByLabelText(`escolher-obra-${obra.id}`));
    fireEvent.press(screen.getByLabelText('botao-salvar-pedido'));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ clienteId: cli.id, obraId: obra.id })));
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
import type { Cliente } from '../../src/core/domain/entities/Cliente';
import type { Obra } from '../../src/core/domain/entities/Obra';

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
      {clientes.map(c => (
        <View key={c.id} accessibilityLabel={`escolher-cliente-${c.id}`}>
          <Button title={c.id === clienteId ? `✓ ${c.nome}` : c.nome} onPress={() => setClienteId(c.id)} />
        </View>
      ))}
      <Text>Obras: {obras.length} no estoque (obra opcional)</Text>
      {obras.map(o => (
        <View key={o.id} accessibilityLabel={`escolher-obra-${o.id}`}>
          <Button title={o.id === obraId ? `✓ ${o.nome}` : o.nome} onPress={() => setObraId(o.id)} />
        </View>
      ))}
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
Expected: PASS (3 passed).

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

  it('remover unidades exige dupla confirmação (RF25)', async () => {
    const seed = seedFixtures();
    const serie = seed.obras.find(o => o.tipo === 'SERIE')!;
    const onRemoverUnidades = jest.fn(async () => {});
    render(
      <DataContext.Provider value={{ pedidos: [], obras: seed.obras, eventos: [], clientes: [], reload: async () => {} }}>
        <TelaEstoque onVenda={async () => {}} onAdicionar={async () => {}} onRemoverUnidades={onRemoverUnidades} onRemoverObra={async () => {}} />
      </DataContext.Provider>
    );
    fireEvent.press(screen.getByLabelText(`remover-unidades-${serie.id}`));
    expect(screen.getByLabelText('dialog-confirm')).toBeTruthy();
    expect(screen.getByLabelText('dialog-confirm-btn')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('dialog-confirm-dupla'));
    await waitFor(() => expect(onRemoverUnidades).toHaveBeenCalledWith(serie.id));
  });

  it('remoção bloqueada (RF22) exibe o erro sem travar', async () => {
    const seed = seedFixtures();
    const onRemoverObra = jest.fn(async () => { throw new Error('Obra vinculada a pedido aberto não pode ser removida'); });
    render(
      <DataContext.Provider value={{ pedidos: [], obras: seed.obras, eventos: [], clientes: [], reload: async () => {} }}>
        <TelaEstoque onVenda={async () => {}} onAdicionar={async () => {}} onRemoverUnidades={async () => {}} onRemoverObra={onRemoverObra} />
      </DataContext.Provider>
    );
    fireEvent.press(screen.getByLabelText(`remover-obra-${seed.obras[0].id}`));
    fireEvent.press(screen.getByLabelText('dialog-confirm-btn'));
    await waitFor(() => expect(screen.getByLabelText('erro-estoque')).toBeTruthy());
  });

  it('estoque vazio mostra estado guiado (Review Focus)', () => {
    render(
      <DataContext.Provider value={{ pedidos: [], obras: [], eventos: [], clientes: [], reload: async () => {} }}>
        <TelaEstoque onVenda={async () => {}} onAdicionar={async () => {}} onRemoverUnidades={async () => {}} onRemoverObra={async () => {}} />
      </DataContext.Provider>
    );
    expect(screen.getByText('Nenhuma obra — toque em Nova Obra')).toBeTruthy();
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

export function ObraCard({ obra, onVenda, onAdicionar, onRemoverUnidades, onRemoverObra }: {
  obra: Obra; onVenda(): void; onAdicionar(): void; onRemoverUnidades(): void; onRemoverObra(): void;
}) {
  return (
    <View accessibilityLabel={`obra-${obra.id}`}>
      <Text>{obra.nome} ({obra.tipo})</Text>
      <Text accessibilityLabel={`qtd-${obra.id}`}>Qtd: {obra.quantidade}{obra.quantidade === 0 ? ' (Esgotada)' : ''}</Text>
      <View accessibilityLabel={`venda-${obra.id}`}><Button title="Venda direta" onPress={onVenda} /></View>
      <View accessibilityLabel={`add-${obra.id}`}><Button title="Adicionar unidades" onPress={onAdicionar} /></View>
      <View accessibilityLabel={`remover-unidades-${obra.id}`}><Button title="Remover unidades" onPress={onRemoverUnidades} /></View>
      <View accessibilityLabel={`remover-obra-${obra.id}`}><Button title="Remover obra" onPress={onRemoverObra} /></View>
    </View>
  );
}
```

- [ ] **Step 4: Criar TelaEstoque.tsx + TelaNovaObra.tsx**

```tsx
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useData } from '../../src/presentation/hooks/AppProviders';
import { ObraCard } from '../../src/presentation/components/ObraCard';
import { ConfirmDialog } from '../../src/presentation/components/ConfirmDialog';

export default function TelaEstoque({ onVenda, onAdicionar, onRemoverUnidades, onRemoverObra }: {
  onVenda(obraId: string): Promise<void>; onAdicionar(obraId: string): Promise<void>; onRemoverUnidades(obraId: string): Promise<void>; onRemoverObra(obraId: string): Promise<void>;
}) {
  const { obras } = useData();
  const [alvoUnidades, setAlvoUnidades] = useState<string | null>(null);
  const [alvoObra, setAlvoObra] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmarRemocaoUnidades() {
    if (!alvoUnidades) return;
    const id = alvoUnidades;
    setAlvoUnidades(null);
    setErro(null);
    try {
      await onRemoverUnidades(id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível remover as unidades');
    }
  }

  async function confirmarRemocaoObra() {
    if (!alvoObra) return;
    const id = alvoObra;
    setAlvoObra(null);
    setErro(null);
    try {
      await onRemoverObra(id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível remover a obra');
    }
  }

  return (
    <View>
      <Text accessibilityLabel="titulo-estoque">Estoque de Obras</Text>
      {erro ? <Text accessibilityLabel="erro-estoque">{erro}</Text> : null}
      {obras.length === 0 ? <Text>Nenhuma obra — toque em Nova Obra</Text> : null}
      {obras.map(o => (
        <ObraCard key={o.id} obra={o}
          onVenda={() => onVenda(o.id)}
          onAdicionar={() => onAdicionar(o.id)}
          onRemoverUnidades={() => setAlvoUnidades(o.id)}
          onRemoverObra={() => setAlvoObra(o.id)} />
      ))}
      {alvoUnidades ? (
        <ConfirmDialog titulo="Remover unidades? Baixa definitiva no estoque." dupla
          onCancel={() => setAlvoUnidades(null)} onConfirm={confirmarRemocaoUnidades} onConfirmDupla={confirmarRemocaoUnidades} />
      ) : null}
      {alvoObra ? (
        <ConfirmDialog titulo="Remover obra do estoque?" onCancel={() => setAlvoObra(null)} onConfirm={confirmarRemocaoObra} />
      ) : null}
    </View>
  );
}
```

`TelaNovaObra.tsx`: campos `campo-nome-obra`, `campo-tipo-obra` (UNICA/SERIE), `campo-qtd-obra` (só SERIE), `botao-salvar-obra`, `erro-obra`; valida `qtd>0` quando SERIE (UC12 passo 4).
`app/obra/nova.tsx` — TelaNovaObra completa.

- [ ] **Step 5: Rodar e ver passar + commit**

Run: `npx jest src/presentation/__tests__/TelaEstoque.test.tsx --verbose`
Expected: PASS (5 passed).

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

  it('sem eventos mostra estado guiado (Review Focus)', () => {
    render(
      <DataContext.Provider value={{ pedidos: [], obras: [], eventos: [], clientes: [], reload: async () => {} }}>
        <TelaEventos onNovo={() => {}} onRemover={async () => {}} />
      </DataContext.Provider>
    );
    expect(screen.getByText('Nenhum evento — toque em Novo Evento')).toBeTruthy();
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
import { useData } from '../../src/presentation/hooks/AppProviders';
import { EventoCard } from '../../src/presentation/components/EventoCard';
import { ConfirmDialog } from '../../src/presentation/components/ConfirmDialog';

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

---

### Task 7: Editar Cliente (UC19/RF18)

**Files:**
- Create: `app/cliente/[id].tsx` (TelaEditarCliente completa, autocontida)
- Test: `src/presentation/__tests__/TelaEditarCliente.test.tsx`

**Interfaces:**
- Consumes: `EditarClienteUseCase.execute({clienteId,nome,contato}): Promise<Cliente>` (Plano 2) — rejeita Cliente Avulso e nome/contato vazios.
- Produces: `TelaEditarCliente` com `campo-nome`/`campo-contato` pré-preenchidos, `botao-salvar-cliente`, `erro-cliente`; rota `app/cliente/[id].tsx`.

- [ ] **Step 1: Escrever testes (pré-preenchido, salvar, Avulso)**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TelaEditarCliente from '../../../app/cliente/[id]';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('TelaEditarCliente', () => {
  it('pré-preenche nome e contato do cliente', () => {
    const seed = seedFixtures();
    render(<TelaEditarCliente cliente={seed.clientes[0]} onSalvar={async () => {}} />);
    expect(screen.getByLabelText('campo-nome').props.value).toBe('Joao da Silva');
    expect(screen.getByLabelText('campo-contato').props.value).toBe('(11) 99999-9999');
  });

  it('salva chamando onSalvar com os novos valores', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {});
    render(<TelaEditarCliente cliente={seed.clientes[0]} onSalvar={onSalvar} />);
    fireEvent.changeText(screen.getByLabelText('campo-nome'), 'Joao Editado');
    fireEvent.press(screen.getByLabelText('botao-salvar-cliente'));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Joao Editado' })));
  });

  it('erro do use case (ex. Cliente Avulso) aparece sem travar (UC19)', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => { throw new Error('Cliente Avulso não pode ser editado'); });
    render(<TelaEditarCliente cliente={seed.clientes[0]} onSalvar={onSalvar} />);
    fireEvent.press(screen.getByLabelText('botao-salvar-cliente'));
    await waitFor(() => expect(screen.getByLabelText('erro-cliente')).toBeTruthy());
    expect(onSalvar).toHaveBeenCalled();
  });
});
```

Salvar em `src/presentation/__tests__/TelaEditarCliente.test.tsx`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/presentation/__tests__/TelaEditarCliente.test.tsx --verbose`
Expected: FAIL "Cannot find module '../../../app/cliente/[id]'".

- [ ] **Step 3: Implementação mínima (labels explícitos RNF05)**

```tsx
import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import type { Cliente } from '../../../src/core/domain/entities/Cliente';

export default function TelaEditarCliente({ cliente, onSalvar }: {
  cliente: Cliente; onSalvar(args: { nome: string; contato: string }): Promise<void>;
}) {
  const [nome, setNome] = useState(cliente.nome);
  const [contato, setContato] = useState(cliente.contato);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function salvar() {
    setLoading(true);
    setErro(null);
    try {
      await onSalvar({ nome, contato });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Text accessibilityLabel="titulo-editar-cliente">Editar Cliente</Text>
      <Text>Nome</Text>
      <TextInput accessibilityLabel="campo-nome" value={nome} onChangeText={setNome} />
      <Text>Contato</Text>
      <TextInput accessibilityLabel="campo-contato" value={contato} onChangeText={setContato} />
      {erro ? <Text accessibilityLabel="erro-cliente">{erro}</Text> : null}
      <View accessibilityLabel="botao-salvar-cliente">
        <Button title={loading ? 'Salvando...' : 'Salvar'} onPress={salvar} disabled={loading} />
      </View>
    </View>
  );
}
```

Salvar em `app/cliente/[id].tsx`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/presentation/__tests__/TelaEditarCliente.test.tsx --verbose`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add app/cliente/\[id\].tsx src/presentation/__tests__/TelaEditarCliente.test.tsx
git commit -m "feat(ui): add Editar Cliente com Avulso bloqueado"
```

---

### Task 8: Editar Pedido (UC20/RF19)

**Files:**
- Create: `app/pedido/[id]/editar.tsx` (TelaEditarPedido completa, autocontida)
- Test: `src/presentation/__tests__/TelaEditarPedido.test.tsx`

**Interfaces:**
- Consumes: `EditarPedidoUseCase.execute({pedidoId,descricao,dataEntrega}): Promise<Pedido>` (Plano 2) — válido somente em `A_FAZER`; troca de obra fora de escopo (cancelar + recriar).
- Produces: `TelaEditarPedido` com `campo-descricao`/`campo-data` pré-preenchidos, `botao-salvar-pedido`, `erro-pedido`; rota `app/pedido/[id]/editar.tsx`.

- [ ] **Step 1: Escrever testes (pré-preenchido, salvar, erro)**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TelaEditarPedido from '../../../app/pedido/[id]/editar';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('TelaEditarPedido', () => {
  it('pré-preenche descrição do pedido', () => {
    const seed = seedFixtures();
    const pedido = seed.pedidos.find(p => p.status === 'A_FAZER')!;
    render(<TelaEditarPedido pedido={pedido} onSalvar={async () => {}} />);
    expect(screen.getByLabelText('campo-descricao').props.value).toBe('Escultura de Onca');
  });

  it('salva chamando onSalvar com descrição e data', async () => {
    const seed = seedFixtures();
    const pedido = seed.pedidos.find(p => p.status === 'A_FAZER')!;
    const onSalvar = jest.fn(async () => {});
    render(<TelaEditarPedido pedido={pedido} onSalvar={onSalvar} />);
    fireEvent.changeText(screen.getByLabelText('campo-descricao'), 'Onca com base');
    fireEvent.press(screen.getByLabelText('botao-salvar-pedido'));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ descricao: 'Onca com base' })));
    const chamada = onSalvar.mock.calls[0][0] as { dataEntrega: unknown };
    expect(chamada.dataEntrega).toBeInstanceOf(Date);
  });

  it('erro do use case (ex. pedido fora de A_FAZER) aparece sem travar (UC20)', async () => {
    const seed = seedFixtures();
    const pedido = seed.pedidos.find(p => p.status === 'A_FAZER')!;
    const onSalvar = jest.fn(async () => { throw new Error('editar() válido somente em A_FAZER'); });
    render(<TelaEditarPedido pedido={pedido} onSalvar={onSalvar} />);
    fireEvent.press(screen.getByLabelText('botao-salvar-pedido'));
    await waitFor(() => expect(screen.getByLabelText('erro-pedido')).toBeTruthy());
  });
});
```

Salvar em `src/presentation/__tests__/TelaEditarPedido.test.tsx`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/presentation/__tests__/TelaEditarPedido.test.tsx --verbose`
Expected: FAIL "Cannot find module '../../../app/pedido/[id]/editar'".

- [ ] **Step 3: Implementação mínima**

```tsx
import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import type { Pedido } from '../../../src/core/domain/entities/Pedido';

export default function TelaEditarPedido({ pedido, onSalvar }: {
  pedido: Pedido; onSalvar(args: { descricao: string; dataEntrega: Date }): Promise<void>;
}) {
  const [descricao, setDescricao] = useState(pedido.descricao);
  const [dataTexto, setDataTexto] = useState(pedido.dataEntrega.toISOString().slice(0, 10));
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function salvar() {
    setLoading(true);
    setErro(null);
    try {
      await onSalvar({ descricao, dataEntrega: new Date(dataTexto) });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Text accessibilityLabel="titulo-editar-pedido">Editar Pedido</Text>
      <Text>Descrição da peça</Text>
      <TextInput accessibilityLabel="campo-descricao" value={descricao} onChangeText={setDescricao} />
      <Text>Data de entrega (AAAA-MM-DD)</Text>
      <TextInput accessibilityLabel="campo-data" value={dataTexto} onChangeText={setDataTexto} />
      {erro ? <Text accessibilityLabel="erro-pedido">{erro}</Text> : null}
      <View accessibilityLabel="botao-salvar-pedido">
        <Button title={loading ? 'Salvando...' : 'Salvar'} onPress={salvar} disabled={loading} />
      </View>
    </View>
  );
}
```

Salvar em `app/pedido/[id]/editar.tsx`. (A troca da obra vinculada não está nesta tela: fora de `A_FAZER` o use case rejeita, e a troca exige compensação não especificada — cancela-se e recria-se o pedido.)

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/presentation/__tests__/TelaEditarPedido.test.tsx --verbose`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add "app/pedido/[id]/editar.tsx" src/presentation/__tests__/TelaEditarPedido.test.tsx
git commit -m "feat(ui): add Editar Pedido em A_FAZER"
```

---

### Task 9: Editar Evento (UC24/RF23) + suíte final

**Files:**
- Create: `app/evento/[id]/editar.tsx` (TelaEditarEvento completa, autocontida)
- Test: `src/presentation/__tests__/TelaEditarEvento.test.tsx`

**Interfaces:**
- Consumes: `EditarEventoUseCase.execute({eventoId,nome,data,endereco,localizacao,observacoes}): Promise<Evento>` (Plano 2) + `FakeLocationGateway.getCurrent()` para atualizar o pin (opcional; pin atual vem na prop).
- Produces: `TelaEditarEvento` com campos pré-preenchidos, pin atual como texto, `botao-usar-gps`, `botao-salvar-evento`, `erro-evento`; rota `app/evento/[id]/editar.tsx`.

- [ ] **Step 1: Escrever testes (pré-preenchido, pin, GPS, salvar)**

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TelaEditarEvento from '../../../app/evento/[id]/editar';
import { seedFixtures } from '../../infrastructure/seed/fixtures';

describe('TelaEditarEvento', () => {
  it('pré-preenche campos e exibe o pin atual', () => {
    const seed = seedFixtures();
    render(<TelaEditarEvento evento={seed.eventos[0]} onGps={async () => ({ latitude: 0, longitude: 0 })} onSalvar={async () => {}} />);
    expect(screen.getByLabelText('campo-nome-evento').props.value).toBe('Feira da Praca');
    expect(screen.getByLabelText('pin-atual')).toBeTruthy();
  });

  it('botão GPS atualiza o ponto exibido', async () => {
    const seed = seedFixtures();
    render(<TelaEditarEvento evento={seed.eventos[0]} onGps={async () => ({ latitude: 1, longitude: 2 })} onSalvar={async () => {}} />);
    fireEvent.press(screen.getByLabelText('botao-usar-gps'));
    await waitFor(() => expect(screen.getByLabelText('ponto-selecionado')).toBeTruthy());
  });

  it('salva chamando onSalvar com os novos valores', async () => {
    const seed = seedFixtures();
    const onSalvar = jest.fn(async () => {});
    render(<TelaEditarEvento evento={seed.eventos[0]} onGps={async () => ({ latitude: 0, longitude: 0 })} onSalvar={onSalvar} />);
    fireEvent.changeText(screen.getByLabelText('campo-nome-evento'), 'Feira Nova');
    fireEvent.press(screen.getByLabelText('botao-salvar-evento'));
    await waitFor(() => expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Feira Nova' })));
  });
});
```

Salvar em `src/presentation/__tests__/TelaEditarEvento.test.tsx`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest src/presentation/__tests__/TelaEditarEvento.test.tsx --verbose`
Expected: FAIL "Cannot find module '../../../app/evento/[id]/editar'".

- [ ] **Step 3: Implementação mínima**

```tsx
import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import type { Evento } from '../../../src/core/domain/entities/Evento';
import { Coordenada } from '../../../src/core/domain/value-objects/Coordenada';

export default function TelaEditarEvento({ evento, onGps, onSalvar }: {
  evento: Evento;
  onGps(): Promise<{ latitude: number; longitude: number }>;
  onSalvar(args: { nome: string; data: Date; endereco: string; localizacao: Coordenada; observacoes: string }): Promise<void>;
}) {
  const [nome, setNome] = useState(evento.nome);
  const [dataTexto, setDataTexto] = useState(evento.data.toISOString().slice(0, 10));
  const [endereco, setEndereco] = useState(evento.endereco);
  const [observacoes, setObservacoes] = useState(evento.observacoes);
  const [ponto, setPonto] = useState<{ latitude: number; longitude: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function salvar() {
    setLoading(true);
    setErro(null);
    try {
      const localizacao = ponto
        ? new Coordenada(ponto.latitude, ponto.longitude)
        : evento.localizacao;
      await onSalvar({ nome, data: new Date(dataTexto), endereco, localizacao, observacoes });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <Text accessibilityLabel="titulo-editar-evento">Editar Evento</Text>
      <Text>Nome da feira</Text>
      <TextInput accessibilityLabel="campo-nome-evento" value={nome} onChangeText={setNome} />
      <Text>Data (AAAA-MM-DD)</Text>
      <TextInput accessibilityLabel="campo-data-evento" value={dataTexto} onChangeText={setDataTexto} />
      <Text>Endereço</Text>
      <TextInput accessibilityLabel="campo-endereco-evento" value={endereco} onChangeText={setEndereco} />
      <Text>Observações</Text>
      <TextInput accessibilityLabel="campo-obs-evento" value={observacoes} onChangeText={setObservacoes} />
      <Text accessibilityLabel="pin-atual">Pin atual: {evento.localizacao.latitude}, {evento.localizacao.longitude}</Text>
      <View accessibilityLabel="botao-usar-gps">
        <Button title="Atualizar localização" onPress={() => onGps().then(setPonto)} />
      </View>
      {ponto ? <Text accessibilityLabel="ponto-selecionado">{ponto.latitude},{ponto.longitude}</Text> : null}
      {erro ? <Text accessibilityLabel="erro-evento">{erro}</Text> : null}
      <View accessibilityLabel="botao-salvar-evento">
        <Button title={loading ? 'Salvando...' : 'Salvar'} onPress={salvar} disabled={loading} />
      </View>
    </View>
  );
}
```

Salvar em `app/evento/[id]/editar.tsx`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/presentation/__tests__/TelaEditarEvento.test.tsx --verbose`
Expected: PASS (3 passed).

- [ ] **Step 5: Rodar suíte presentation completa + checagem de arquitetura**

Run: `npx jest src/presentation --verbose`
Expected: PASS (9 arquivos: Shell, Login, Kanban, NovoPedido, Estoque, Eventos, EditarCliente, EditarPedido, EditarEvento).

Run: `npm run typecheck && ! grep -r "expo-sqlite\|supabase-js\|expo-camera\|expo-location" src/presentation app || echo "VIOLACAO"`
Expected: grep não acha nada (telas usam só fakes via Context).

- [ ] **Step 6: Commit**

```bash
git add "app/evento/[id]/editar.tsx" src/presentation/__tests__/TelaEditarEvento.test.tsx
git commit -m "feat(ui): add Editar Evento com pin e GPS opcional"
```
