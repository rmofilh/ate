# ate — protótipo Expo SDK 57

Aplicativo de gestão para artesãos: Kanban de pedidos, clientes, estoque de peças
únicas/em série e eventos. O protótipo usa repositórios em memória e gateways fake
de autenticação, câmera, localização e sincronização. Os dados reiniciam quando
o app reinicia. Os pins de eventos são representados por coordenadas textuais.

## Desenvolvimento

Requisitos: Node >= 22.13, npm e Expo Go compatível com SDK 57 em Android/iOS.

```sh
npm ci
npx expo start
```

Conta de demonstração: **artesao@email.com** / **123456**.

Instale ou ajuste dependências com `npx expo install <pacote>` para preservar
compatibilidade com o SDK. O projeto usa React 19.2.3 e React Native 0.86.3.

## Verificações

```sh
npm test
npm run typecheck
npm run lint
npx expo install --check
npx expo-doctor
```

Os testes usam RNTL 14, com `await render(...)` e `await fireEvent.*(...)`.
`test-renderer@1.2.0` acompanha React 19.2; não instalar o renderer antigo do
protótipo React 18. O Jest adapta apenas os bytes nativos usados para gerar UUIDs.

Para conferir os bundles das duas plataformas:

```sh
npx expo export --platform android
npx expo export --platform ios
```

## Estrutura

- `src/app/`: rotas Expo Router; login público, tabs e stacks protegidas.
- `src/core/domain/`: entidades, regras, enums e `Coordenada`; IDs v4 recebidos pelas factories.
- `src/core/application/`: casos de uso e interfaces de gateways/repositórios.
- `src/infrastructure/`: fakes, fixtures e UUIDs gerados com `uuid`/`expo-crypto`.
- `src/main/factories/`: composição e injeção de dependências.
- `src/presentation/`: componentes, Contexts e testes de tela/navegação.

## Documentação

O [plano de migração](docs/superpowers/plans/2026-09-29-migracao-ate-expo-57.md)
registra o mapeamento do protótipo anterior e os resultados da execução.
As especificações e planos originais são acessíveis pelo histórico preservado:

```sh
git show 7042cac0:docs/ate-fase1.md
git show 7042cac0:docs/ate-fase2.md
git show 7042cac0:docs/superpowers/plans/2026-09-21-ate-dominio.md
git show 7042cac0:docs/superpowers/plans/2026-09-21-ate-aplicacao.md
git show 7042cac0:docs/superpowers/plans/2026-09-21-ate-apresentacao.md
```

SQLite, Supabase, câmera/GPS reais e mapa visual fazem parte da especificação do
produto; esta entrega conserva o comportamento demonstrativo dos fakes.
