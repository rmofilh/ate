# Fase 3 — Roteiro dos planos

> Documento de referência para escrever (skill `writing-plans`) e revisar os Planos 2 a 6, um de cada vez, depois que o Plano 1 estiver concluído.
> Base: `docs/ate-fase1.md`, `docs/ate-fase2.md`, código da `main` em 27/10/2026, materiais da disciplina (offline-first com Expo, câmera partes 1 e 2, proposta de implementação do App Estágio, plano didático) e documentação oficial do Expo SDK 57, Drizzle e Supabase.
> Este roteiro define **o quê e por quê** de cada plano, as decisões, os testes e os critérios de aceite. O **como** detalhado (tarefas, código, comandos) fica no plano de cada etapa.

## 1. Visão geral

| # | Plano | Entrega | Depende de | Aula relacionada |
|---|---|---|---|---|
| 1 | SQLite + Drizzle | App 100% local e persistente, fila outbox atômica | — | 29/09 a 13/10 (já vistas) |
| 2 | Câmera + imagens | Foto de conclusão real (obrigatória) e foto de catálogo, comprimidas e registradas em `fotos` | 1 | Câmera partes 1 a 3 |
| 3 | Supabase + Auth | Projeto, schema remoto versionado, RLS, bucket privado, login real com sessão segura | 1 | 03/11 e 10/11 |
| 4 | Sincronização | Motor de sync: upload de fotos, push da fila, pull por cursor, gatilhos e estado visível | 1, 2, 3 | 06/11 |
| 5 | Geolocalização + mapa | GPS pontual com permissão no uso e mapa de eventos com pins | 1 | 13/10 (material de geo) |
| 6 | Fechamento + build | Conformidade, documentação, rastreabilidade, EAS e APK instalado | todos | 13/11 |

Calendário sugerido (com folga para revisão entre planos):

| Período | Planos |
|---|---|
| até 02/11 | Plano 1 |
| 03/11 a 09/11 | Plano 2 e Plano 3 (parte de projeto, schema e RLS) |
| 10/11 a 16/11 | Plano 3 (Auth) e Plano 4 |
| 17/11 | Apresentação final (1ª data) com 1 a 4 prontos |
| 18/11 a 24/11 | Plano 5 e início do Plano 6 (EAS/APK) |
| 25/11 a 01/12 | Plano 6 e entrega |

Os Planos 2 e 3 são independentes entre si e podem andar em paralelo. O Plano 5 só depende do Plano 1 e pode ser antecipado se o material de geolocalização for estudado antes.

## 2. Princípios que valem para todos os planos

1. **Banco local é a fonte da verdade da UI.** A tela lê e grava só no SQLite; o Supabase é destino de sincronização. Escrita nunca espera rede.
2. **Contratos estáveis.** Interfaces existentes não mudam. Interfaces **novas** em `core/application` (portas) são permitidas quando o caso pedir, mas precisam de aprovação explícita antes da execução.
3. **Pureza do núcleo** garantida pelo teste de arquitetura criado no Plano 1.
4. **Pirâmide de testes do material:** domínio sem mock (maior volume) → casos de uso com fakes → gateways com SDK mockado (`jest.mock('expo-camera')`, `jest.mock('expo-location')`, `jest.mock('expo-secure-store')`) → repositórios com SQLite real em memória → telas com RNTL. Câmera, GPS e rede real só no smoke test manual.
5. **Permissões no momento do uso** (RNF12), tratando os três estados: indeterminada, concedida, negada (com `canAskAgain = false` → explicar e oferecer `Linking.openSettings()`).
6. **Uma branch por plano** (`feat/fase3-planoN-...`), commit por tarefa, PR para `main` com checklist de smoke test. `demo/fase2` e a tag `demo-fase2` intocadas.
7. **Registro contínuo** em `docs/ate-fase3.md`: cada plano acrescenta sua seção de decisões e divergências em relação à fase 2.
8. **Teste em modo avião** em todo smoke test (boa prática do material).

## 3. Decisões já tomadas (concepção e Plano 1)

| Decisão | Valor | Origem |
|---|---|---|
| Conflito | Servidor vence (timestamp do servidor); sem coluna `version` | Fase 1 #2; concepção |
| Tombstone | Mantido localmente para sempre | RNF13; concepção |
| Ordem das imagens no sync | Foto primeiro (storage-first), depois o registro | Concepção |
| Web | Abandonada na fase 3 | Concepção |
| Conta do artesão | Criada manualmente no dashboard; o app só faz login/logout | Concepção |
| Dados iniciais | Runtime vazio; fixtures só nos testes | Concepção |
| Atomicidade | Decorator `transacional` por caso de uso (Plano 1) | Revisão do Plano 1 |
| Fotos | Tabela `fotos` com caminho relativo, hash e status | Revisão do Plano 1 |

Sobre a ordem das imagens: o material sugere "o registro sobe primeiro, o arquivo depois". O projeto mantém **storage-first** porque, com a regra da foto obrigatória (RNF11), o servidor nunca deve ter um pedido `FEITO` sem foto. O custo é o pedido esperar o upload da própria foto; os demais registros não são bloqueados (UC16 FA2). Registrar essa divergência em `docs/ate-fase3.md`.

## 4. Decisões pendentes (responder antes do plano correspondente)

| # | Pergunta | Recomendação | Plano |
|---|---|---|---|
| D1 | Aprovar `reidratar()` estático nas 4 entidades | Sim (padrão DDD, aditivo, sem SDK) | 1 |
| D2 | Foto de catálogo também pode vir da galeria? | Sim, só no catálogo, com `expo-image-picker`. A foto de conclusão continua só pela câmera (RNF11) | 2 |
| D3 | Bucket privado guardando o **caminho** do objeto (e URL assinada para exibir), em vez de URL pública | Sim (fotos de clientes; LGPD). Diverge de "URLs públicas" no UC16, registrar | 3 |
| D4 | Se outro e-mail logar no aparelho, o que fazer com os dados locais? | Bloquear com aviso e oferecer "apagar dados locais e entrar" (usuário único, Decisão #1) | 3 |
| D5 | Sync como caso de uso em `application` com portas novas | Sim (o material lista `SincronizarFilaUseCase` na camada de aplicação; regras de ordem e retentativa ficam testáveis com fakes) | 4 |
| D6 | Biblioteca do mapa | `react-native-maps` (roda no Expo Go; `expo-maps` é alpha e não está no Expo Go) | 5 |

---

## Plano 2 — Câmera real e pipeline de imagens

**Objetivo.** A foto de conclusão (RF05, UC05/UC06, RNF11) e a foto opcional de catálogo (RF09, UC12) passam a ser capturadas de verdade, comprimidas, salvas no filesystem e registradas em `fotos`, prontas para o upload do Plano 4.

**Decisões.**
- `expo-camera` (`CameraView` + `takePictureAsync`) para a foto de conclusão: preview ao vivo, UI própria e sem acesso à galeria, que violaria "foto tirada na hora". Galeria só no catálogo, se D2 for aprovada.
- O contrato `ICameraGateway.capture(): Promise<string | null>` **não muda**. `null` = cancelou; string = caminho relativo da foto aceita.
- A UI da câmera é um componente React, mas o gateway é uma classe. Ponte: um `CameraHost` (presentation) montado uma vez no `AppProviders` registra no `ExpoCameraGateway` uma função que abre o modal e devolve uma Promise resolvida por "Usar foto" ou "Cancelar". As telas não mudam: continuam chamando `services.gateways.camera.capture()`.
- Caminho **relativo** (`fotos/<uuid>.jpg`), resolvido contra o diretório de documentos em tempo de uso. O caminho absoluto muda entre builds e reinstalações (no iOS a cada atualização), e um absoluto salvo quebraria as fotos antigas.

**Componentes.**
- `presentation/components/camera/CameraHost.tsx` e `CameraModal.tsx`: permissão em três estados (material parte 1); `CameraView` com `ref`; botão de captura habilitado só após `onCameraReady` e desabilitado durante a captura; preview com **Refazer** e **Usar foto** (`expo-image`); câmera montada só enquanto o modal está visível (bateria, material parte 2).
- `infrastructure/device/camera/ExpoCameraGateway.ts`: implementa `ICameraGateway` via ponte.
- `infrastructure/fileSystem/ArmazenamentoDeFotos.ts`: recebe o URI temporário e:
  1. redimensiona para no máximo 1600 px no maior lado e comprime em JPEG ~0,7 (`expo-image-manipulator`, API nova `ImageManipulator.manipulate(...).renderAsync()` + `saveAsync`; a `manipulateAsync` está deprecada);
  2. move para `Paths.document/fotos/<uuid>.jpg` (`expo-file-system`, API `File`/`Directory`);
  3. calcula o SHA-256 do arquivo (`expo-crypto`, já é dependência);
  4. grava a linha em `fotos` (`PENDENTE_UPLOAD`) e devolve o caminho relativo.
- Exibição: um helper `resolverUriDaFoto(caminhoRelativo)` usado por `PedidoCard`/`ObraCard` (miniatura com `expo-image`).
- `app.json`: plugin `expo-camera` com `cameraPermission` em português (no Expo Go aparece o texto do Expo Go; vale no APK do Plano 6).
- Tela de obra (`obra/nova` e edição): botão opcional "Adicionar foto de catálogo" (fecha a divergência RF09 sem UI).

**Fotos órfãs.** Se o usuário aceita a foto e o caso de uso falha (rollback), o arquivo e a linha de `fotos` ficam sem referência. Uma limpeza simples na abertura do app remove fotos `PENDENTE_UPLOAD` não referenciadas por nenhum pedido/obra e com mais de 24 h.

**Testes.**
- `ArmazenamentoDeFotos` com `expo-image-manipulator`, `expo-file-system` e `expo-crypto` mockados: chama redimensionar/comprimir com os parâmetros certos, move para a pasta certa, grava `fotos` com hash e devolve caminho relativo; falha de escrita propaga erro sem linha órfã.
- `ExpoCameraGateway`: resolve `null` ao cancelar, o caminho ao aceitar, erro com instrução quando a permissão é negada.
- `CameraModal` (RNTL, `expo-camera` mockado): os três estados de permissão, "Abrir configurações" quando `canAskAgain = false`, captura → preview → refazer → usar.
- Limpeza de órfãs com `bancoDeTeste()`.
- Telas existentes (Kanban, concluir pedido) continuam verdes com o `FakeCameraGateway`.

**Aceite.** No Expo Go: concluir pedido abre a câmera, refazer funciona, "usar" conclui e mostra a miniatura; negar a permissão mostra a instrução e não conclui; a foto continua aparecendo depois de fechar e reabrir o app; a foto tem tamanho de centenas de KB, não de MB.

---

## Plano 3 — Supabase: projeto, schema remoto, RLS, bucket e Auth

Dividido em duas partes, alinhadas às aulas de 03/11 (infraestrutura e segurança) e 10/11 (autenticação e `expo-secure-store`).

### 3A — Projeto, schema, RLS e Storage

**Projeto.** Criar no dashboard (região São Paulo, `sa-east-1`). Conta do artesão criada manualmente (Authentication → Users).

**SQL versionado** em `supabase/migrations/NNNN_descricao.sql` (executado pelo SQL Editor ou pela Supabase CLI), nunca só "clicado" no dashboard:
- Tabelas `clientes`, `obras`, `pedidos`, `eventos` espelhando o DER remoto da fase 2, **corrigido** com o que o DER deixou de fora: `pedidos.venda_direta`, `pedidos.quantidade_obra` (RF25/RF26) e `criado_em_local` em todas (metadado de auditoria, conforme o §3.4).
- `id uuid primary key` **sem default** (o UUID vem do aparelho); `usuario_id uuid not null default auth.uid() references auth.users`; `updated_at timestamptz not null default now()`; `deleted_at timestamptz`; os mesmos `CHECK` de enum do SQLite; FKs `pedidos → clientes/obras`.
- Trigger `before update` que força `updated_at = now()` (o relógio do aparelho nunca decide conflito, RNF04).
- Índice `(usuario_id, updated_at)` em cada tabela, para o pull por cursor.
- `profiles` com trigger em `auth.users` (como no DER) — opcional, já que o app não usa perfil; manter só se for útil na apresentação.
- `status_sync` e `fila_sync` **não** existem no remoto.

**RLS** (RNF03), em todas as tabelas: `enable row level security`; políticas `select`, `insert` e `update` com `using (usuario_id = auth.uid())` e `with check (usuario_id = auth.uid())`. **Sem política de `delete`**: exclusão é sempre lógica (`deleted_at`).

**Storage.** Bucket **privado** `fotos` (D3). Caminho do objeto `<auth.uid()>/<id-da-foto>.jpg`. Políticas em `storage.objects` para `insert`, `select` e `update` quando `bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text`. Isso concretiza o "escopo indireto" vago do §3.5.

**Verificação de segurança.** Um roteiro SQL de teste (ou teste de integração opcional, fora do `npm test`) que, com dois usuários, prova que um não lê nem escreve linhas e objetos do outro.

### 3B — Cliente Supabase e Auth real

**Configuração.**
- `@supabase/supabase-js` (2.x). Verificar logo no início (spike) se o Hermes do SDK 57 ainda precisa de `react-native-url-polyfill`; instalar só se precisar.
- Chave **publishable** (antiga "anon") e URL em `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_KEY`, num `.env` fora do git, com `.env.example` commitado. Variáveis `EXPO_PUBLIC_*` vão para dentro do bundle; isso é aceitável para a chave publishable porque a proteção real é o RLS. A chave `service_role` nunca entra no app.
- Cliente criado em `infrastructure/supabase/cliente.ts` com `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false` e listener de `AppState` chamando `startAutoRefresh`/`stopAutoRefresh`.

**Sessão segura.** O material exige sessão no `expo-secure-store` ("nunca AsyncStorage puro"). Como a sessão do Supabase pode passar do limite de tamanho do SecureStore, usar o padrão **LargeSecureStore** do guia oficial do Supabase para Expo: chave AES-256 no SecureStore e sessão cifrada no AsyncStorage. Implementar como adaptador de `storage` do cliente em `infrastructure/auth/`.

**Gateway.** `SupabaseAuthGateway implements IAuthGateway` (contrato inalterado):
- `login` → `signInWithPassword`; erros traduzidos para mensagens do app ("E-mail ou senha incorretos", "Sem conexão: entre uma vez com internet").
- `getSession` lê a sessão persistida **sem exigir rede**: o artesão precisa abrir o app na feira, offline. Uma falha de refresh por falta de rede não pode deslogar.
- `logout` → `signOut({ scope: 'local' })`, que funciona offline.

**Troca de usuário e dados de desenvolvimento.** As linhas criadas até aqui pertencem ao usuário falso `a1111111-…` e seriam barradas pelo RLS. Ao entrar com um usuário diferente do dono dos dados locais, aplicar D4: bloquear com aviso e oferecer "apagar dados locais e entrar". Antes do Plano 4, zerar o banco de desenvolvimento.

**Testes.** Gateway com o cliente Supabase mockado (sucesso, credencial inválida, sem rede, sessão restaurada); adaptador de storage com `jest.mock('expo-secure-store')` (salva, recupera, limpa); `AuthProvider` com RNTL restaurando a sessão no boot e limpando no logout (como no material).

**Aceite.** RF01/RF02 (UC01/UC02) com a conta real: fechar e reabrir mantém a sessão; abrir em **modo avião** com sessão salva entra direto; logout volta ao login; credencial errada mostra mensagem clara; outro e-mail com dados locais aplica D4. O `FakeAuthGateway` sai do runtime.

---

## Plano 4 — Motor de sincronização

**Objetivo.** Implementar UC16, UC17 e UC18 (RF15, RF16, RF17): enviar fotos e a fila, trazer mudanças do servidor, disparar nos momentos certos e mostrar o estado ao artesão.

**Arquitetura (D5).**
- `core/application/usecases/SincronizarUseCase.ts` orquestra o ciclo e depende de portas **novas**:
  - `IFilaSync` (ler pendentes elegíveis, marcar enviando/concluída/falha, reagendar);
  - `IServidorRemoto` (upsert de registro, pull paginado por cursor);
  - `IArmazenamentoRemoto` (upload de foto);
  - `IEstadoLocalSync` (aplicar linha remota, ler/gravar cursor, marcar `SINCRONIZADO`/`ERRO`).
- Regras puras e testáveis sem mock em `core/application/sync/`: política de retentativa (backoff exponencial com jitter) e ordenação/coalescência da fila.
- Implementações em `infrastructure/sync/` (SQLite via Drizzle) e `infrastructure/supabase/` (PostgREST e Storage).
- **Single-flight:** só um ciclo por vez; um gatilho durante a execução marca "rodar de novo ao terminar".

**Ciclo.**
1. **Fotos** `PENDENTE_UPLOAD` referenciadas por algum registro: upload para `<uid>/<id>.jpg` com `upsert: true` (reenviar não duplica). Sucesso → `ENVIADA` + `caminho_remoto`. Falha → incrementa tentativas; não bloqueia os demais registros (UC16 FA2).
2. **Push** da `fila_sync`:
   - elegíveis: `PENDENTE` com `proxima_tentativa_em` nula ou vencida, em ordem de `criado_em_local`;
   - **coalescência** por entidade: várias entradas da mesma linha viram um único upsert com o estado atual, relido do SQLite (inclui tombstone; o payload parcial fica só como diagnóstico);
   - **pai antes de filho**: clientes e obras antes de pedidos (FKs remotas);
   - registro cuja foto ainda não subiu fica para o próximo ciclo (storage-first);
   - upsert com `onConflict: 'id'`, idempotente porque o UUID vem do aparelho (o "Idempotency-Key" natural);
   - sucesso → remove as entradas processadas e marca `SINCRONIZADO` **só se não entrou nova entrada para a mesma linha durante o envio** (senão continua `PENDENTE`);
   - erro de rede/5xx → `tentativas + 1` e `proxima_tentativa_em = agora + min(2^n × 2 s, 15 min) × jitter(0,5 a 1,5)`. O relógio do aparelho serve para agendar, nunca para decidir conflito;
   - erro permanente (4xx de validação, `CHECK`, RLS) → entrada `FALHA` com `erro`, registro `ERRO`, visível na UI com ação "tentar de novo";
   - 401 → tenta renovar a sessão; se não der, interrompe o ciclo e pede login.
3. **Pull** por tabela, pai antes de filho, com cursor em `sync_meta` (`pull:<tabela>` = maior `updated_at` do servidor já aplicado):
   - lotes de até 500, ordenados por `(updated_at, id)`, com cursor composto, para não perder linhas com o mesmo timestamp na fronteira do lote;
   - cada lote e o avanço do cursor na **mesma transação** (sem buracos, como no material);
   - linha local `PENDENTE`/`ERRO` não é sobrescrita (o push dela vem antes e, depois do push, o servidor vence);
   - tombstones remotos são aplicados (a linha some da UI).
   - Com um único aparelho, o pull serve sobretudo para **reinstalação ou troca de aparelho**: o banco vazio se repovoa a partir do servidor.

**Gatilhos.**
- Reconexão: `@react-native-community/netinfo` (roda no Expo Go). Substitui o `isOnline` fixo do `NetworkProvider` e alimenta o banner offline (RF17).
- Volta ao foreground (`AppState`).
- Após escrita local: hook pós-commit no `transacional`, com debounce de alguns segundos.
- Botão "Sincronizar agora" e pull-to-refresh no Kanban.
- Opcional, por último: `expo-background-task` como melhor esforço (o material lista; sem garantia de horário).

**UI reativa sem quebrar o padrão Repository.** O `useLiveQuery` do material colocaria consulta dentro da tela. Em vez disso, expor na bag um `observarMudancas(callback)` implementado com `addDatabaseChangeListener` do expo-sqlite (o banco já abre com `enableChangeListener: true` no Plano 1); o `DataProvider` assina e recarrega com debounce. O sync escreve e a tela reage.

**Estado visível.** Banner com sem conexão / sincronizando / N pendentes / N com falha. Indicador discreto de pendente ou erro nos cards. Ação para reenviar falhas.

**Testes.**
- Política de retentativa e ordenação/coalescência: testes puros.
- `SincronizarUseCase` com fakes: rede cai no meio (o que foi enviado fica `SINCRONIZADO`, o resto permanece), 4xx vira falha visível, pai antes de filho, foto pendente segura só o próprio registro, nova edição durante o envio mantém `PENDENTE`, single-flight.
- Adaptadores SQLite com `bancoDeTeste()`; adaptadores Supabase com cliente mockado.
- Pull: cursor composto, lote + cursor atômicos, linha `PENDENTE` local preservada, tombstone aplicado.
- Smoke test: modo avião → criar/editar → voltar a rede → tudo sobe sozinho; matar o app no meio do sync e reabrir → nada duplica nem se perde; desinstalar e reinstalar → login → dados e fotos voltam do servidor.

**Aceite.** RF15, RF16, RF17, UC16 (fluxo principal e FA1 a FA3), UC17 e UC18 demonstrados no aparelho; nenhum registro `FEITO` aparece no servidor sem foto.

---

## Plano 5 — Geolocalização e mapa de eventos

**Objetivo.** RF12/UC13/UC14 (coordenada do evento pelo GPS, pontual) e RF13/UC15 (mapa com pins). Pré-requisito: estudar o material de geolocalização (aula de 13/10).

**Decisões.**
- `expo-location`: `requestForegroundPermissionsAsync` no toque em "Usar GPS" (RNF12, nunca no início do app); `getCurrentPositionAsync` com precisão `Balanced` e timeout; fallback manual já existente.
- Ponto do evento é imutável e de um sentido só (material); não há conflito a tratar além do CRUD normal do evento.
- Mapa com `react-native-maps` (D6). Pins dos eventos não removidos; toque no pin abre o evento. Sem rede: a lista funciona e o mapa mostra um aviso, porque tiles exigem conexão (RF13).
- Opcional: preencher o endereço com `reverseGeocodeAsync` quando houver rede.
- `app.json`: plugin `expo-location` com `locationWhenInUsePermission` em português.
- **Atenção para o Plano 6:** no Android, fora do Expo Go, o `react-native-maps` exige chave do Google Maps (`android.config.googleMaps.apiKey`). Sem ela o mapa fica em branco no APK. Prever a chave ou um provedor alternativo antes do build.

**Componentes.** `infrastructure/device/location/ExpoLocationGateway.ts` (contrato `ILocationGateway` inalterado); reabilitar o botão GPS das telas de evento (desfaz a Tarefa 9 do Plano 1); tela/aba de mapa em `app/` com componente em `presentation/components`.

**Testes.** Gateway com `jest.mock('expo-location')` (concedida, negada, negada para sempre, timeout); telas com RNTL (GPS preenche coordenadas, negação mostra instrução e mantém o manual); mapa renderiza um pin por evento ativo (mock de `react-native-maps`).

**Aceite.** Criar evento usando o GPS no aparelho; negar a permissão mantém o fluxo manual; mapa mostra os pins; offline a lista funciona e o mapa avisa.

---

## Plano 6 — Fechamento, documentação e build (fase 4 da disciplina)

**Conformidade.**
- Teste de arquitetura verde; nenhum fake no runtime (`makeFakeProviders`, `Fake*Gateway` só em testes).
- `npm test`, `typecheck`, `lint` (0 erros, e reduzir os 12 warnings herdados), `db:check`.
- Relatório de cobertura (`jest --coverage`) e **matriz de rastreabilidade RF → UC → teste** (exigência do material: cada RF com teste de aceitação), atualizando o Apêndice A.3 da fase 2.

**Build e distribuição** (aula de 13/11):
- `eas.json` com perfis `development` (dev client) e `preview` (`android.buildType: "apk"`).
- `expo-dev-client` para testar o que o Expo Go não cobre (textos de permissão próprios, mapa com chave).
- `expo-updates` com `runtimeVersion` por política, para publicar correções sem novo APK.
- Variáveis `EXPO_PUBLIC_*` configuradas no EAS (`eas env`), não no repositório.
- `app.json`: `android.package`, ícone, splash, plugins com textos de permissão, chave do Google Maps.
- Instalar o APK no celular e repetir o smoke test completo dos Planos 1 a 5.

**Documentação.**
- `docs/ate-fase3.md` consolidado: decisões, divergências da fase 2 (DER local e remoto, tombstone, storage-first, bucket privado, fila com retentativa, portas de sync), arquitetura final e instruções de configuração do Supabase.
- README: remover o aviso de protótipo, explicar `.env` e o setup do Supabase, atualizar capturas.
- Pendências antigas: copyright do `LICENSE` e o caminho do sandbox no `DESENVOLVIMENTO.md`.

**Aceite.** APK instalado num Android real executando o fluxo completo (login, pedidos com foto, estoque, eventos com GPS e mapa, uso offline e sincronização), documentação atualizada e PR final para `main`.

---

## 5. Riscos acompanhados

| Risco | Onde | Mitigação |
|---|---|---|
| Rollback do executor de transação não confirmado no expo-sqlite real | 1 | Validado com better-sqlite3 e no código do driver; confirmar no smoke test da Tarefa 11 |
| Sessão do Supabase grande para o SecureStore | 3 | Padrão LargeSecureStore |
| Polyfill de URL no Hermes | 3 | Spike no início do 3B |
| Pedido parado esperando a própria foto | 4 | Storage-first consciente; falha visível e reenvio |
| Linhas com o mesmo `updated_at` na fronteira do lote | 4 | Cursor composto `(updated_at, id)` |
| Mapa em branco no APK Android | 5 e 6 | Chave do Google Maps antes do build |
| Dados de desenvolvimento com usuário falso | 3 e 4 | Zerar o banco antes do Plano 4; regra D4 |
