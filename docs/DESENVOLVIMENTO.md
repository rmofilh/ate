# Desenvolvimento

Guia interno do `ate`: convenções, verificações, estrutura do código, notas de teste e o estado atual
da implementação. O README descreve o produto e não repete estes detalhes de propósito — quando a
fase 3 substituir os mockados, a seção [Estado atual](#estado-atual-fase-2) é a única a atualizar.

## Ambiente

`node`/`npm`/`npx` só ficam disponíveis depois de carregar o nvm:

```sh
source /opt/scripts/nvm_autocomplete.sh
```

Requisito de runtime: Node >= 22.13.

## Convenções

- Instale e ajuste dependências com `npx expo install <pacote>`, nunca `npm install` para pacotes
  Expo — o `expo install` resolve a versão compatível com o SDK. As versões fixadas em `package.json`
  são alinhadas ao SDK 57 (React 19.2.3, React Native 0.86.3).
- Rotas em `src/app/` (Expo Router); componentes, hooks e utilidades fora de `src/app/`.

## Verificações

```sh
npm test             # Jest
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint
npx expo install --check   # confere versões das dependências contra o SDK
npx expo-doctor            # diagnóstico de dependências e configuração
```

Para conferir os bundles de cada plataforma:

```sh
npx expo export --platform android
npx expo export --platform ios
```

## Estrutura de pastas

- `src/app/` — rotas Expo Router: login público, tabs (Kanban, Estoque, Eventos) e stacks protegidas.
- `src/core/domain/` — entidades, value objects, enums, erros e validações. Não importa framework.
- `src/core/application/` — casos de uso e as interfaces de gateways e repositórios.
- `src/infrastructure/` — implementações: repositórios em memória, gateways fake, gerador de UUID e
  fixtures de seed.
- `src/main/factories/` — composição e injeção de dependência (`makeFakeProviders`).
- `src/presentation/` — telas, componentes, hooks, estilos e testes de tela/navegação.
- `src/constants/` — tema e tokens visuais.
- `src/test-support/` — utilitários compartilhados dos testes.

## Notas de teste

- Os testes usam React Native Testing Library 14, com `await render(...)` e
  `await fireEvent.*(...)`.
- `test-renderer@1.2.0` é o par do React 19.2.3; não instalar o renderer antigo do protótipo com
  React 18.
- `jest.setup.js` mocka `expo-crypto.getRandomBytes` para devolver bytes determinísticos — o Jest
  adapta apenas os bytes nativos usados para gerar UUIDs v4.
- `jest.config.js` inclui `uuid` no `transformIgnorePatterns` porque o `jest-expo` não transforma
  esse pacote por padrão.
- Suítes e casos vivem em pastas `__tests__/` ao lado do código que testam.

## Estado atual (fase 2)

Descreve o protótipo congelado na tag `demo-fase2` / branch `demo/fase2`:

- Os dados ficam em repositórios em memória (`src/infrastructure/database/memory/`) e **reiniciados
  a cada reinício do app**.
- Autenticação, câmera, localização e sincronização são gateways fake
  (`src/infrastructure/device/FakeAuthGateway.ts`, `FakeCameraGateway.ts`,
  `FakeLocationGateway.ts`, `FakeSyncGateway.ts`). Login de demonstração:
  `artesao@email.com` / `123456`.
- Não há mapa visual: os eventos são exibidos em lista, com as coordenadas em texto.
- Fora de escopo desta fase: SQLite local, sincronização com Supabase, câmera/GPS reais e mapa
  visual de eventos.

## Capturas de tela

- Originais (com status bar): `docs/ate-mock-screenshot/` — não versionadas.
- Versões usadas no README: `docs/screenshots/` — recortadas apenas no topo (status bar do
  celular); o botão do Expo Go permanece nas imagens.
