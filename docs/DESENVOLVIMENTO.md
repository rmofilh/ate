# Desenvolvimento

Guia interno do `ate`: convenções, verificações, estrutura do código, notas de teste e o estado atual
da implementação. O README descreve o produto e não repete estes detalhes de propósito.

## Ambiente

Requisito de runtime: Node >= 22.13 (com `npm`/`npx` no `PATH`).

Variáveis do Supabase em `.env` (fora do git), a partir de `.env.example`:
`EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (só a chave publishable; nunca a
secret). O Expo lê o `.env` ao iniciar: reinicie o `npx expo start` depois de mudar.

## Convenções

- Instale e ajuste dependências com `npx expo install <pacote>`, nunca `npm install` para pacotes
  Expo — o `expo install` resolve a versão compatível com o SDK. As versões fixadas em `package.json`
  são alinhadas ao SDK 58 (React 19.3.0, React Native 0.88.1).
- Rotas em `src/app/` (Expo Router); componentes, hooks e utilidades fora de `src/app/`.

## Verificações

```sh
npm test             # Jest
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint
npm run db:check     # migrations do Drizzle consistentes com o schema
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
- `src/core/application/sync/` — regras puras do sync (ordem e coalescência da fila, backoff).
- `src/infrastructure/` — implementações: SQLite (Drizzle), câmera, localização, rede, fotos, auth e
  sessão cifrada, Supabase (PostgREST e Storage) e adaptadores do sync; os fakes e repositórios em
  memória ficam só para os testes.
- `src/main/` — composição: `makeSqliteProviders` (runtime), `makeFakeProviders` (testes),
  `criarSupabaseDoApp`, D4 (`protegerDonoDosDados`) e o `MotorDeSync` (gatilhos e estado do sync).
- `src/presentation/` — telas, componentes, hooks, estilos e testes de tela/navegação.
- `src/constants/` — tema e tokens visuais.
- `src/test-support/` — utilitários compartilhados dos testes (SQLite em memória, dublês dos módulos
  Expo, servidor Supabase em memória).
- `supabase/` — migrations SQL, roteiro de verificação de RLS e guia do projeto remoto.
- `drizzle/` — migrations do SQLite local geradas pelo `drizzle-kit`.

## Notas de teste

- Os testes usam React Native Testing Library 14, com `await render(...)` e
  `await fireEvent.*(...)`.
- `test-renderer@1.2.0` é o par do React 19.2.3; não instalar o renderer antigo do protótipo com
  React 18.
- `jest.setup.js` mocka `expo-crypto.getRandomBytes` para devolver bytes determinísticos (UUIDs v4) e
  troca o AES-GCM nativo pelo do Node; também registra os dublês de `expo-file-system`,
  `expo-image-manipulator`, `expo-camera`, `expo-location`, `expo-network`, `expo-secure-store`,
  `expo-sqlite/kv-store` e `react-native-webview` (`src/test-support/mocks/`).
- Repositórios e sync usam SQLite real em memória (`bancoDeTeste()`, better-sqlite3) com as mesmas
  migrations; o sync de ponta a ponta usa `ServidorEmMemoria` no lugar do Supabase.
- `jest.config.js` inclui `uuid` no `transformIgnorePatterns` porque o `jest-expo` não transforma
  esse pacote por padrão.
- Suítes e casos vivem em pastas `__tests__/` ao lado do código que testam.

## Estado atual (fase 4)

- Dados no SQLite do aparelho (`ate.db`), com cada escrita e sua entrada na fila `fila_sync` numa
  mesma transação. Nada espera a rede.
- Login real no Supabase Auth; sessão cifrada (chave no SecureStore, cifra no kv-store do
  expo-sqlite). Abre offline com a sessão guardada.
- Câmera, GPS, busca de endereço e mapa reais. Fotos comprimidas em `fotos/` no aparelho.
- Sincronização com o Supabase: fotos (bucket privado), fila (push) e mudanças do servidor (pull por
  cursor), disparada ao entrar, ao reconectar, ao voltar o app e após cada escrita. Detalhes em
  `docs/ate-fase4.md`.
- Pendente para a entrega final: EAS, `expo-dev-client`, `expo-updates` e APK.

O protótipo da fase 2 (tudo em memória, gateways fake) continua congelado na tag `demo-fase2` /
branch `demo/fase2`.

## Capturas de tela

- Originais (com status bar): `docs/ate-mock-screenshot/` — não versionadas.
- Versões usadas no README: `docs/screenshots/` — recortadas apenas no topo (status bar do
  celular); o botão do Expo Go permanece nas imagens.
