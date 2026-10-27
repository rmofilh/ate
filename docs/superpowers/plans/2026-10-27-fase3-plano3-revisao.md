# Revisão do Plano 3 — Supabase e Auth (Fase 3)

Data: 27/10/2026  
Arquivo revisado: `docs/superpowers/plans/2026-10-27-fase3-plano3-supabase-auth.md`  
Roteiro de referência: `docs/superpowers/plans/2026-10-27-fase3-roteiro.md`  
Status: **somente análise — nenhuma alteração foi feita no repositório.**

O HEAD contém apenas o commit que adicionou o Plano 3 (`e091938 docs: registra Plano 3 (Supabase e Auth) da fase 3`). Não há código do Plano 3 implementado.

## Resumo

O desenho do Plano 3 está consistente e bem fundamentado. Não foi encontrado bloqueio arquitetural. Foram encontrados 7 pontos de alto impacto que convém corrigir antes de executar, mais 7 de impacto médio, além de decisões pendentes e observações operacionais.

## Pontos de alto impacto

1. **Teste existente quebrará com D4.** `src/main/factories/__tests__/makeSqliteProviders.test.ts:120` exige que `bag.useCases.login` não tenha `execute` próprio. O decorator D4 cria esse método. O Plano 3 (linha 1639) só manda acrescentar testes; é preciso atualizar a asserção para `true` e renomear o teste.
2. **`criarSupabaseDoApp` descarta o cliente Supabase.** Plano 3, linhas 1732-1741: retorna apenas `{ auth: IAuthGateway }`. O Plano 4 precisa de PostgREST/Storage; criar um segundo cliente com o mesmo storage cifrado gera dois `GoTrueClient`s e corrida de refresh. Recomendação: retornar `{ auth, cliente }`.
3. **Sessão revogada não é apagada.** `SupabaseAuthGateway.getSession` (linhas 1209-1215) só usa fallback em erro retryable; em erro definitivo retorna `null` mantendo o storage. Um boot offline posterior pode ressuscitar a sessão revogada. Remover a sessão nesse ramo e cobrir no teste da linha 1118.
4. **SQL de RLS frágil.** `supabase/tests/rls_isolamento.sql` (linha 390) insere direto em `auth.users` e `storage.objects`. O fallback da linha 533 só cobre `auth.users`. Validar no projeto real ou prever fallback também para Storage.
5. **FKs multi-tenant.** Linhas 211-212: `pedidos.cliente_id → clientes(id)` e `pedidos.obra_id → obras(id)` sem compor com `usuario_id`. RLS não impede um pedido de A apontar para cliente/obra de B. Considerar FKs compostas `(id, usuario_id)` com unique correspondente ou trigger.
6. **P3-8 incorreto.** Linha 26 afirma que o guia atual do Supabase para Expo não usa `react-native-url-polyfill`; o quickstart oficial instala esse pacote. O spike está apenas na Tarefa 9 (linha 2202); o roteiro pede no início do 3B.
7. **Sem timeout no boot/logout.** `signOut({scope:'local'})` ainda faz request de rede. Em sinal ruim, `getSession`/`logout` podem demorar até o timeout do fetch, mantendo `restaurando` e o botão Sair presos. O modo avião tende a falhar rápido e passar no smoke; o caso "rede instável" não está coberto.

## Pontos de impacto médio

- **D4 só no login:** uma sessão já restaurada de outra conta não é validada contra `DonoDosDadosLocais`.
- **`RootNavigator` retorna `TelaCarregando` antes de montar o `Stack`** (linha 2093): atrasa a montagem do navigator raiz; merece teste no `RouterGuards`.
- **`apagarEEntrar`** (linha 2129) apaga os dados antes de relogar; se a rede cair, os dados já foram perdidos.
- **`criarSupabaseDoApp` roda em inicializador de `useState`**; StrictMode/Fast Refresh pode criar dois clientes/listeners/timers.
- **`papelDoJwt`** (linha 928) depende de `atob`; não foi encontrado `atob` em `react-native`/`expo`. O `catch` retorna `null`, então uma chave legada `service_role` (`eyJ...`) não seria recusada; chaves novas `sb_secret_` são recusadas.
- **`traduzirErro`** (linha 1244) trata qualquer status 400 como credenciais inválidas (`email_not_confirmed` etc.).
- **Mensagem ASCII** `'E-mail e senha sao obrigatorios'` do `LoginUseCase` agora aparece crua na UI.

## Decisões pendentes

1. **D3** (bucket privado + URLs assinadas) e **D4** (bloquear outra conta e oferecer apagar dados locais) — confirmar antes de executar.
2. **Fluxo de git:** main direta (como o plano) ou branch + PR (como o roteiro, princípio 6)?
3. **Atualizar o plano** com os ajustes acima antes da implementação?
4. **Baseline operacional:** o ambiente não tem `node`/`npm`/`npx`/`bun` no `PATH`; `node_modules` existe, mas o único arquivo chamado `node` encontrado é `/home/alunos/.cache/ms-playwright-go/1.57.0/node`, não um runtime Node utilizável. Como rodar `npm test`, `typecheck`, `lint`, `db:check`?

## Verificado e correto

- **P3-6** confirmado no `@supabase/auth-js` 2.118: `_signOut` retorna cedo sem `_removeSession` em erro retryable, então o `removeItem` explícito do plano é necessário. Após remover o storage, o ticker de auto-refresh lê storage nulo e não ressuscita a sessão; um refresh em voo é descartado pelo commit guard quando `storedAfter === null`. O risco real é a demora da chamada de rede, não a ressurreição pelo ticker.
- **Storage cifrado** usa o adaptador cifrado como `auth.storage` do Supabase; não há sessão em texto claro no AsyncStorage. AES-CTR com chave nova a cada gravação e `CHAVE_SESSAO='ate-auth'` (válida no SecureStore).
- **Teste de contrato SQL** espera 11 casos e bate com as migrations/RLS planejadas; o teste de arquitetura só proíbe `@supabase/` em `core/`.
- **`DonoDosDadosLocais`** e o decorator D4 estão coerentes com `makeSqliteProviders` e com a ordem de limpeza (`sync_meta`, fila e fotos).
- **`ConfirmDialog`, `ActionButton`, `TelaErroBanco` e o tema** suportam o que o plano usa.
- **`ExecutorDeTransacao`** usa `BEGIN IMMEDIATE` na mesma conexão; `apagarDadosLocais` com `dono.apagarTudo()` fica corretamente dentro da transação.
- **`ArmazenamentoCifradoDeSessao.getItem`** devolve `null` sem limpar quando só a chave ou só a cifra existe (limpeza menor, não bloqueante).
- **`apagarDadosLocais`** apaga arquivos de foto depois do commit do banco; se a exclusão de arquivo falhar, o banco já foi limpo. Também não limpa a sessão em memória da bag; o fluxo D4 já deslogou antes.
- **`TelaLogin`**: as credenciais podem ser editadas entre o aviso D4 e a confirmação; o confirm apaga os dados e tenta a conta nova (baixo risco).
- **`RootLayout`** mostra erro de configuração antes de erro de migration quando ambos falham; aceitável, mas decide a precedência.
- **`MigrationsSupabase.test.ts`** foi conferido: baixa o SQL para lowercase, espera exatamente `0001`, `0002`, `0003`, 11 testes, regex de políticas/grants/check/bucket; caminho `../../../../supabase/migrations` correto.
- **`jest.config.js`** usa `setupFilesAfterEnv`, `jest-expo`, `testMatch` restrito a `**/__tests__/**/*.test.ts(x)`. `jest.setup.js` já mocka `expo-crypto`, `expo-file-system`, `expo-image-manipulator` e `expo-camera`.
- **`jest.setup.js`** mocka `getRandomBytes` deterministicamente (bytes 12-15 variam); suficiente para os testes de chave nova/decifra falha.
- **`.gitignore`** ignora `.env*.local`, mas não `.env`; a Tarefa 1 do plano corrige.
- **`supabase/LEIA-ME.md`** prevê usuário criado no dashboard com "Auto Confirm User"; o app não tem signup.
- **`docs/ate-fase3.md`** será atualizado na Tarefa 9; placeholders de baseline/polyfill.

## Contagem de testes esperada

`MigrationsSupabase` 11; `cliente` 9; `ArmazenamentoCifradoDeSessao` 7; `SupabaseAuthGateway` 14; `DonoDosDadosLocais` 6; `protegerDonoDosDados` 6; `AuthRestauracao` 2; `TelaLogin` +3; `makeSqliteProviders` +2.

## Arquivos relevantes

- `docs/superpowers/plans/2026-10-27-fase3-plano3-supabase-auth.md` — plano em análise (2279 linhas, 9 tarefas)
- `docs/superpowers/plans/2026-10-27-fase3-roteiro.md` — roteiro da fase 3
- `src/core/application/gateways/IAuthGateway.ts` — contrato inalterável
- `src/core/application/usecases/LoginUseCase.ts` — normalização e mensagem de campos
- `src/core/application/usecases/LogoutUseCase.ts`
- `src/infrastructure/device/FakeAuthGateway.ts` — fake atualmente usado no runtime
- `src/main/factories/makeSqliteProviders.ts` — composition root a alterar
- `src/main/factories/__tests__/makeSqliteProviders.test.ts` — asserção que quebrará com D4
- `src/main/factories/makeFakeProviders.ts`
- `src/main/factories/ProviderBag.ts`
- `src/app/_layout.tsx` — criação do cliente Supabase e `AppProviders`
- `src/presentation/hooks/AppProviders.tsx` — `AuthProvider`, `restaurando`, `apagarDadosEEntrar`
- `src/app/(auth)/login.tsx` — login, mensagem real e fluxo D4
- `src/presentation/__tests__/RouterGuards.test.tsx`
- `src/presentation/__tests__/TelaLogin.test.tsx`
- `src/presentation/__tests__/DataProviderSessao.test.tsx`
- `src/presentation/__tests__/AuthRestauracao.test.tsx`
- `src/presentation/__tests__/AppProvidersCamera.test.tsx`
- `src/presentation/components/TelaErroBanco.tsx`
- `src/presentation/components/ConfirmDialog.tsx`
- `src/presentation/components/ActionButton.tsx`
- `src/presentation/components/SairButton.tsx`
- `src/infrastructure/database/sqlite/schema.ts`
- `src/infrastructure/database/sqlite/ExecutorDeTransacao.ts`
- `src/infrastructure/fileSystem/ArmazenamentoDeFotos.ts`
- `src/core/__tests__/Arquitetura.test.ts`
- `jest.setup.js`, `jest.config.js`, `package.json`, `.gitignore`
- `supabase/migrations/0001_tabelas.sql`, `0002_rls.sql`, `0003_storage.sql`
- `supabase/tests/rls_isolamento.sql`
- `supabase/LEIA-ME.md`, `.env.example`
- `docs/ate-fase3.md`

## Observação final

Esta revisão foi gerada em modo de análise. Nenhum arquivo de código foi criado ou modificado; apenas este arquivo de revisão foi adicionado.
