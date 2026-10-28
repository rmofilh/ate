# Documento de Software — Fase 3 (Implementação offline-first)

Registro contínuo das decisões da fase 3 e das divergências em relação ao documento da fase 2 (`docs/ate-fase2.md`). Cada plano acrescenta a sua seção. Roteiro completo: `docs/superpowers/plans/2026-10-27-fase3-roteiro.md`.

## Plano 1 — Persistência local real (SQLite + Drizzle)

Concluído em 27/10/2026. Os 4 repositórios em memória e o `FakeSyncGateway` foram substituídos no runtime por SQLite (`expo-sqlite` + Drizzle ORM) e por uma fila outbox real (`fila_sync`). O app roda no Expo Go, abre vazio e mantém os dados ao fechar e reabrir. Os fakes continuam como dublês de teste.

### Arquitetura entregue

- `infrastructure/database/sqlite/`: schema Drizzle (`schema.ts`), tipo comum dos drivers (`DrizzleAppDb`), `ExecutorDeTransacao` + decorator `transacional` e os 4 repositórios SQLite.
- `infrastructure/sync/OutboxSyncGateway.ts`: implementa `ISyncGateway` gravando em `fila_sync`.
- `main/database/openAppDatabase.ts`: abre `ate.db` com `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;` e `enableChangeListener` (base do Plano 4).
- `main/factories/makeSqliteProviders.ts`: composition root do runtime. `ProviderBag` é o tipo estrutural que o `AppProviders` aceita; a bag fake continua satisfazendo esse tipo nos testes.
- Migrations geradas pelo `drizzle-kit` em `drizzle/` (versionadas), embutidas no bundle (`babel-plugin-inline-import` + `.sql` no Metro) e aplicadas com `useMigrations` no `_layout.tsx`.
- Ainda fakes no runtime: autenticação (até o Plano 3), câmera (até o Plano 2) e GPS (até o Plano 5, com o botão desabilitado nas telas de evento).

### Decisões e divergências em relação à fase 2

| # | Fase 2 | Fase 3 (Plano 1) | Motivo |
|---|---|---|---|
| 1 | `fila_sync` com `tipo_operacao`, `entidade`, `entidade_id`, `payload`, `status`, `criado_em_local` (§3.2/§3.3) | Acrescenta `tentativas`, `proxima_tentativa_em` e `erro`; `status` aceita `PENDENTE`, `ENVIANDO` e `FALHA` | Retentativa com backoff e falha visível no motor de sync (Plano 4) |
| 2 | Foto como `foto_conclusao_path` + `foto_conclusao_url` (pedido) e `foto_path` + `foto_url` (obra) | As entidades guardam só o caminho **relativo** do arquivo; hash, status de upload e caminho remoto ficam na tabela nova `fotos` | Padrão do material ("arquivo no filesystem; no SQLite só caminho, status e hash"); o caminho absoluto muda entre builds e reinstalações |
| 3 | — | Tabela nova `sync_meta` (chave/valor) | Cursor do pull por tabela (Plano 4) |
| 4 | `updated_at` só no remoto | `updated_at` também local, só de infraestrutura (fora das entidades). O upsert grava apenas as colunas da entidade e preserva essa coluna | Guardar o timestamp do servidor recebido no pull |
| 5 | Linha removida fisicamente após o servidor confirmar o `DELETAR` (§3.1 "Campo `deletedAt`" e §3.3) | Tombstone (`deleted_at`) mantido localmente **para sempre**; toda leitura de UI filtra `deleted_at IS NULL` | RNF13; o pull não ressuscita registros removidos |
| 6 | — | Sem coluna `version` | Usuário único, um aparelho, servidor vence pelo timestamp dele |
| 7 | Enums e faixas validados só no domínio | Validados também no banco com `CHECK` (status, tipo, canal, quantidades ≥ 0, latitude/longitude) e índice único parcial para um único cliente balcão vivo por usuário | Defesa em profundidade contra dado corrompido |
| 8 | Atomicidade registro + fila não especificada | Cada caso de uso que escreve roda numa transação (`transacional(...)` no composition root) | RNF02: nunca registro sem fila, nem obra reservada sem pedido |
| 9 | Entidades criadas só por `criar`/`balcao`/`criarVendaDireta` | Novo método estático `reidratar(props)` nas 4 entidades (decisão D1, aprovada) | Reconstruir entidades lidas do banco sem reaplicar as regras de criação; valida só a estrutura (UUID, enums, datas, inteiros, `Coordenada`) |
| 10 | Dados de exemplo no runtime | Runtime inicia vazio; fixtures só nos testes | Concepção da fase 3 |
| 11 | Botão "Usar minha localização" ativo com GPS falso | Botão desabilitado com aviso; coordenadas só manuais | Nunca gravar a coordenada fixa do fake como se fosse real (Plano 5 reabilita) |

### Transação por caso de uso, e por que não `db.transaction(async …)`

No driver `drizzle-orm/expo-sqlite` a transação é **síncrona**: com callback `async`, ela faz `COMMIT` assim que o callback devolve a Promise, e as escritas depois do primeiro `await` ficam fora da transação, sem erro algum. No better-sqlite3 o mesmo código lança `Transaction function cannot return a promise`.

O `ExecutorDeTransacao` abre `BEGIN IMMEDIATE`, aguarda o trabalho assíncrono e faz `COMMIT` ou `ROLLBACK` na conexão única, serializando os trabalhos numa fila de Promises. O decorator `transacional` devolve um objeto com o mesmo protótipo do caso de uso (o `instanceof` continua valendo). Assim os contratos e os casos de uso não mudaram.

Limites conhecidos:
- Leituras fora do executor (ex.: `loadData` da UI) durante um trabalho podem ver dados ainda não confirmados. É inofensivo com usuário único e poucos dados.
- Um caso de uso decorado não pode chamar outro decorado (o executor não aceita aninhamento). Hoje `VendaDireta` instancia `ResolverClienteBalcao` direto, sem decorator.

### Sessão e carregamento dos dados

- `registrarSessao(sessao)` informa a sessão à bag SQLite. Sem sessão, `usuarioId` lança `SessaoNaoDisponivelError` e `loadData()` devolve listas vazias.
- O `DataProvider` recarrega a cada nova sessão e zera os dados no logout (nunca na montagem sem sessão). Uma falha de leitura do banco não é mais engolida: fica em `erro` e aparece num banner nas abas Pedidos, Estoque e Eventos.
- Falha ao abrir ou migrar o banco mostra uma tela de erro própria em vez de seguir sem dados.

### Testes

- Pirâmide do material: domínio sem mock (inclui `reidratar`), casos de uso com fakes, repositórios e executor com **SQLite real em memória** (`better-sqlite3` com as mesmas migrations, via `test-support/bancoDeTeste.ts`) e telas com RNTL.
- Cobertos: migrations (tabelas, índices, `CHECK`, idempotência), roundtrip campo a campo de cada repositório, preservação de `updated_at` no upsert, tombstone, isolamento por usuário, FKs, cliente balcão único, rollback do executor e atomicidade de ponta a ponta (com o `enqueue` do pedido falhando, a obra continua `DISPONIVEL`).
- Teste de arquitetura automatizado (`src/core/__tests__/Arquitetura.test.ts`): `core/` só importa caminhos relativos dentro de `core/`, sem `expo`, `react`, `react-native`, `drizzle-orm`, `better-sqlite3`, `@supabase/*` ou `uuid`; e `src/app/` não usa `makeFakeProviders`. Substitui o grep manual e vale para os próximos planos.
- Baseline ao fim do plano: 316 testes, `typecheck` limpo, `lint` com 0 erros (11 warnings herdados), `db:check` ok.

### Smoke test no aparelho (Expo Go, 27/10/2026)

Aprovado: login demo com abas vazias; criação de cliente, obra única, obra em série, pedido vinculado, venda direta e evento com coordenada manual; pedido movido para Fazendo e concluído; criação e edição em modo avião; dados persistidos após fechar e reabrir o app; cancelamento de pedido vinculado devolvendo a obra; rollback do executor confirmado no expo-sqlite real.

### Pendências para os próximos planos

- Câmera real e gravação da linha em `fotos` (Plano 2).
- Supabase, RLS e Auth real; os dados de desenvolvimento pertencem ao usuário falso `a1111111-…` e o banco deve ser zerado antes do Plano 4 (Plano 3).
- Envio da fila, pull por cursor e UI reativa via `addDatabaseChangeListener` (Plano 4).
- GPS real e mapa; reabilitar o botão das telas de evento (Plano 5).

## Plano 2 — Câmera real e pipeline de imagens

Concluído em 27/10/2026. A foto de conclusão do pedido (RF05, UC05/UC06, RNF11) e a foto opcional de catálogo da obra (RF09, UC12) agora vêm da câmera de verdade, comprimidas e guardadas no aparelho, com uma linha em `fotos` pronta para o upload do Plano 4.

### Arquitetura entregue

- `infrastructure/fileSystem/ArmazenamentoDeFotos.ts`: reduz o maior lado para 1600 px, comprime em JPEG 0,7 (`expo-image-manipulator`, API `manipulate`/`renderAsync`/`saveAsync`), move para `<documentos>/fotos/<uuid>.jpg` (`expo-file-system`, API `File`/`Directory`/`Paths`), calcula o SHA-256 (`expo-crypto`) e grava a linha em `fotos` (`PENDENTE_UPLOAD`). Devolve o caminho relativo. Na abertura do app, remove fotos órfãs com mais de 24 h.
- `infrastructure/device/camera/ExpoCameraGateway.ts`: implementa `ICameraGateway` (contrato inalterado) por meio de uma ponte registrada pela UI. Cancelar → `null`; permissão negada → erro com instrução; segunda captura simultânea → erro.
- `presentation/components/camera/CameraModal.tsx` e `CameraHost.tsx`: permissão em três estados (com "Abrir configurações" quando não dá mais para pedir), câmera montada só com o modal aberto, captura habilitada só após `onCameraReady`, revisão com Refazer e Usar foto.
- `presentation/utils/fotos.ts`: `resolverUriDaFoto` resolve o caminho relativo no momento de exibir. Miniatura da foto de conclusão nos pedidos Feitos.
- Nova obra: botão opcional "Adicionar foto de catálogo" (fecha a divergência RF09 sem UI da fase 2).

### Decisões e divergências

| # | Decisão | Motivo |
|---|---|---|
| 1 | Sem galeria (D2): as duas fotos só pela câmera | Simplicidade; a foto de conclusão precisa ser tirada na hora (RNF11) |
| 2 | Caminho relativo `fotos/<uuid>.jpg` no banco | O caminho absoluto muda entre builds e reinstalações |
| 3 | A ponte UI → gateway é tipo de infraestrutura, não porta nova em `core` | Contratos de `core` inalterados |
| 4 | Foto de catálogo só na criação da obra | Não existe tela de edição de obra; trocar foto exigiria método novo no domínio |
| 5 | Limpeza de órfãs também apaga arquivos soltos em `fotos/` sem linha | App morto entre mover o arquivo e gravar a linha |
| 6 | Texto de permissão próprio só no APK | No Expo Go aparece o texto do Expo Go |

### Testes

Dublês em memória de `expo-file-system`, `expo-image-manipulator` e `expo-camera` registrados no `jest.setup.js`; `expo-crypto.digest` com SHA-256 real do Node. Cobertos: parâmetros de compressão (paisagem, retrato, imagem pequena), caminho e hash gravados, falhas no meio sem linha nem arquivo solto, limpeza de órfãs (idade, referência por pedido/obra/tombstone, `ENVIADA`, arquivo solto), resolvedor de caminho, gateway (cancelar, negar, ocupado, desregistrar), modal (três estados de permissão, configurações e volta, câmera pronta, captura/refazer/usar, erro de montagem, voltar do Android), host (desmontagem no meio), composição e foto de catálogo.

Baseline ao fim do plano: 374 testes, `typecheck` limpo, `lint` com 0 erros (11 warnings herdados), `db:check` ok e bundle Android exportado.

### Smoke test no aparelho (Expo Go, 27/10/2026)

Aprovado, os 8 itens: conclusão de pedido com permissão, captura, Refazer e Usar foto, com miniatura no card Feito; foto de conclusão com 106 KB no log (centenas de KB, não MB); miniatura mantida após fechar e reabrir o app; Cancelar e voltar do Android não concluem o pedido; permissão revogada mostra a explicação com "Abrir configurações", Voltar mostra a instrução e, ao permitir nas configurações e voltar, a câmera aparece sem fechar o modal; conclusão com foto em modo avião; foto de catálogo na nova obra (inclusive Remover foto) com miniatura no Estoque; toque duplo abre uma única câmera.

### Pendências para os próximos planos

- Upload das fotos `PENDENTE_UPLOAD` antes do registro (storage-first) no Plano 4.
- Texto de permissão em português visível só no APK (Plano 6).

## Plano 5A — Local do evento: busca de endereço, mapa e GPS

Executado em 27/10/2026, antes do Plano 3, para a apresentação de câmera e geolocalização (roteiro, §1.1). Foi feito em duas etapas:

1. **GPS real** (commit "Geolocalização - base"): o `FakeLocationGateway` saiu do runtime e o botão "Usar minha localização" passou a ler o GPS do aparelho (`expo-location`).
2. **Busca e mapa** (revisão do mesmo dia): o artesão cadastra a feira **antes** dela, longe do local, então a posição atual quase nunca é a do evento. O fluxo principal passou a ser: digitar o endereço → **"Localizar no mapa"** → o mapa abre com o pin no endereço encontrado → ajustar tocando ou arrastando → confirmar. O GPS virou o atalho **"Minha localização"** dentro do mapa, útil quando o artesão já está na feira.

Em todos os caminhos o ponto é mostrado antes de salvar, preenche os campos de latitude e longitude (que continuam editáveis) e é gravado no SQLite junto com a entrada da fila, na mesma transação. Sem internet, o pin, o GPS e as coordenadas manuais continuam funcionando.

### Arquitetura entregue

- `core/application/gateways/IGeocodingGateway.ts` (D11, porta nova): `buscar(endereco): Promise<Coordenada | null>`.
- `core/application/errors/LocalizacaoIndisponivelError.ts` (D7 e D12): motivos `NEGADA`, `NEGADA_PERMANENTE`, `SERVICO_DESLIGADO`, `TIMEOUT` e `BUSCA_INDISPONIVEL`, com mensagem em português. É a linguagem de falha da aplicação; nenhum tipo do SDK chega ao `core`.
- `infrastructure/device/location/ExpoLocationGateway.ts`: implementa `ILocationGateway` (contrato inalterado). Serviço ligado → permissão de primeiro plano no momento do uso → `getCurrentPositionAsync({ accuracy: Balanced })` com limite de 10 s → `new Coordenada(...)`.
- `infrastructure/device/location/ExpoGeocodingGateway.ts`: implementa `IGeocodingGateway` com o geocoder nativo (`geocodeAsync`): grátis, sem chave, precisa de internet. No Android pede a permissão de localização antes de buscar (exigência do SDK); no iOS, não. Lista vazia ou ponto fora da faixa → `null`; falha ou demora → `BUSCA_INDISPONIVEL`.
- `infrastructure/device/location/limiteDeTempo.ts`: `comLimiteDeTempo`, compartilhado pelos dois adaptadores (o SDK não tem timeout).
- `presentation/components/mapa/MapaLeaflet.tsx`: mapa Leaflet 1.9.4 com blocos do OpenStreetMap numa `react-native-webview` (D6). A página avisa o app por `postMessage` quando o pin é colocado ou arrastado; o app move o pin por `injectJavaScript`. Sem internet o Leaflet não carrega e aparece um aviso. Funciona no Expo Go e no APK sem chave de API.
- `presentation/components/mapa/SeletorDeLocal.tsx`: modal com o `MapaLeaflet`, pin arrastável, toque no mapa, "Minha localização", coordenada do pin em texto (útil se os tiles não carregarem), aviso de que sem internet o mapa pode não carregar e "Confirmar local". O mapa só é montado com o modal aberto.
- `presentation/hooks/useLocalizarNoMapa.ts`: busca o endereço e abre o seletor; sem endereço, sem resultado ou com falha, abre mesmo assim no ponto atual, com o aviso adequado. `useLocalizacaoAtual.ts` cuida do GPS dentro do seletor.
- `evento/novo.tsx` e `evento/[id]/editar.tsx`: botão "Localizar no mapa" logo abaixo do endereço; a edição abre no pin atual do evento.
- `makeSqliteProviders` e `ProviderBag`: `gateways.geocodificador` real no runtime; a bag fake usa `FakeGeocodingGateway`.
- `app.json`: plugin `expo-location` com `locationWhenInUsePermission` em português e background desligado. O mapa não precisa de plugin nem de chave.

### Decisões e divergências

| # | Decisão | Motivo |
|---|---|---|
| 1 | Fluxo principal por endereço + mapa; GPS como atalho dentro do mapa | O evento é cadastrado antes da feira, longe do local. Diverge do RF12 da fase 2 ("coordenada pelo GPS"), mas segue o "posicionar o pin" que a fase 2 já previa como alternativa |
| 2 | Geocoder nativo do aparelho, não Google Places | Grátis, sem chave nem faturamento e roda no Expo Go. Places exigiria chave no app ou proxy no servidor (Plano 3). Custo: sem sugestões enquanto digita e precisão variável, compensada pelo ajuste do pin |
| 3 | Porta nova `IGeocodingGateway` (D11) | A busca é uma capacidade externa como o GPS; fica atrás de um contrato do `core` e testável com fake |
| 4 | Erro tipado com motivos, incluindo `BUSCA_INDISPONIVEL` (D7, D12) | O domínio define os casos de falha; os adaptadores se adaptam. A tela escolhe a mensagem e a ação sem importar `expo-location` |
| 5 | A tela chama a busca e abre o seletor; o seletor chama o GPS (D8 revisada) | O artesão confere o ponto antes de gravar; o caso de uso recebe a `Coordenada` pronta. O caminho `usarGps` do caso de uso continua coberto |
| 6 | Limite de 10 s com `Promise.race` nos dois adaptadores | A doc do SDK 57 não oferece timeout; sem limite, GPS sem sinal ou geocoder sem rede prenderiam a tela |
| 7 | Busca sem resultado ou com falha ainda abre o mapa | Nunca bloquear o cadastro; o pin pode ser posicionado à mão |
| 8 | GPS e foto em fluxos separados, sem geotag (D9) | Sem RF para isso |
| 9 | Sem migration | `eventos.latitude/longitude` com `CHECK` de faixa já existiam desde o Plano 1 |
| 10 | Câmera continua com `Error` simples, sem tipo próprio | A permissão da câmera é tratada dentro do `CameraModal`; a tela nunca precisa distinguir motivos |
| 11 | Mapa com Leaflet + OpenStreetMap numa WebView, não `react-native-maps` (D6 revista) | No smoke test o Google Maps do `react-native-maps` ficou em branco (só o logo) no Expo Go para Android: a chave do Google embutida no Expo Go dos SDKs 55 a 57 está vencida (expo/expo#49323, aberto). A alternativa seria development build com chave própria no Google Cloud (faturamento e SHA-1). Leaflet roda no Expo Go e no APK sem chave. Custo: depende da política de uso dos blocos do OSM (uso leve, atribuição, identificação); num produto real, trocar por um provedor de blocos com chave |

### Testes

Dublês em memória de `expo-location` (`test-support/mocks/expoLocation.ts`, com `geocodeAsync`) e de `react-native-webview` (`test-support/mocks/reactNativeWebview.tsx`: a WebView vira uma View; os testes simulam mensagens da página e conferem o `injectJavaScript`) registrados no `jest.setup.js`. Cobertos:
- **Erro:** motivos e mensagens.
- **GPS:** concedida, `Balanced`, serviço desligado, negada, negada para sempre, timeout, coordenada inválida, falha desconhecida.
- **Geocoder:** resultado, não encontrado, endereço vazio sem chamar o SDK, permissão só no Android, negada e negada para sempre, falha e timeout como `BUSCA_INDISPONIVEL`, resultado fora da faixa.
- **Mapa Leaflet:** HTML com versão fixa do Leaflet, blocos e atribuição do OSM, centro e zoom, pin inicial e aviso de erro; mensagens de pin válidas e inválidas; aviso sem internet (mensagem de erro ou falha da WebView); centralizar pelo `injectJavaScript`.
- **Seletor:** pin inicial, região padrão sem pin, aviso, toque, arrasto, "Minha localização" (ok, negada, bloqueada com configurações, toque duplo), cancelar e mapa só montado aberto.
- **Telas:** endereço → mapa → arrastar → confirmar → salvar; não encontrado; sem internet; falha genérica; sem endereço; cancelar; reabrir no ponto escolhido; GPS dentro do mapa; toque duplo; gateways vindos dos serviços; edição (troca o pin, abre no pin atual, cancelar mantém a coordenada).
- **Composição e ponta a ponta** (`GeolocalizacaoPersistencia.test.ts`): SDK dublado → adaptador (GPS ou geocoder) → caso de uso transacional → SQLite real em memória e `fila_sync`, incluindo permissão negada e endereço não encontrado sem escrita.

Baseline ao fim do plano: 444 testes, `typecheck` limpo, `lint` com 0 erros (11 warnings herdados), `db:check` ok e bundle Android exportado.

### Smoke test no aparelho (Expo Go)

Pendente. Roteiro: endereço real → "Localizar no mapa" → pin no lugar certo → arrastar → confirmar → salvar → fechar e reabrir o app com a coordenada mantida; endereço inexistente → aviso e pin à mão; "Minha localização" dentro do mapa; negar a permissão (no Android também afeta a busca: aviso e pin à mão); negar de vez ("Abrir configurações" no GPS); modo avião (busca falha com aviso; GPS, pin e manual funcionam); editar evento abre no pin atual.

### Pendências para os próximos planos

- Mapa de eventos com pins (Plano 5B).
- Texto de permissão em português visível só no APK (Plano 6).
- Se o app for além do uso acadêmico, trocar os blocos do `tile.openstreetmap.org` por um provedor com chave e cota.
