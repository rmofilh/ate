# SDD ledger — plan: docs/superpowers/plans/2026-09-21-ate-dominio.md
Setup: specs lidas: docs/ate-fase1.md e docs/ate-fase2.md.
Ruling: etapas de worktree e commit foram omitidas — solicitado explicitamente pelo usuario; a execucao e o ledger permanecem no workspace principal — custo se errado: nao havera historico Git granular por tarefa.
Pre-flight: Task 1 -> Tasks 2-7: scripts npm test/typecheck produzidos e consumidos com os mesmos nomes; sem conflito.
Pre-flight: Task 2 -> Task 3: CoordenadaInvalidaError produzido e consumido com o mesmo nome; sem conflito.
Pre-flight: Task 2 -> Task 4: StatusSync e ClienteInvalidoError produzidos e consumidos com os mesmos nomes; sem conflito.
Pre-flight: Task 2 -> Task 5: TipoObra, StatusObra, StatusSync e ObraInvalidaError produzidos e consumidos com os mesmos nomes; sem conflito.
Pre-flight: Task 2 -> Task 6: CanalOrigem, StatusPedido, StatusSync e PedidoInvalidoError produzidos e consumidos com os mesmos nomes; sem conflito.
Pre-flight: Tasks 2/3 -> Task 7: StatusSync, EventoInvalidoError e Coordenada produzidos e consumidos com os mesmos nomes; sem conflito.
Task 1: Ruling: smoke test executado antes dos arquivos de setup — atende ao pedido explicito de RED por tarefa, embora o plano previsse configurar antes — custo se errado: a falha inicial prova apenas ausencia do runner, nao comportamento TypeScript.
Task 1: Ruling: adicionados react 18.2.0 e react-native 0.74.5 — o package minimo do plano deixa npm resolver react-native 0.87.1, incompativel com jest-expo/Expo SDK 51; versoes sao as declaradas pelo SDK 51 — custo se errado: duas dependencias diretas extras no setup.
Task 1: Ruling: adicionado babel.config.js com babel-preset-expo — sem a configuracao, Jest nao transforma a sintaxe Flow interna do React Native 0.74.5 — custo se errado: um arquivo e uma dependencia de build extras.
Task 1: complete (sem commit por solicitacao; tests: npx jest src/core/domain/__tests__/smoke.test.ts --verbose -> 1/1 passou; npm run typecheck -> passou).
Task 2: complete (sem commit por solicitacao; tests: npx jest src/core/domain/__tests__/EnumsErrors.test.ts --verbose -> 2/2 passaram; npm run typecheck -> passou; suite -> 3/3 passaram).
Task 3: complete (sem commit por solicitacao; tests: npx jest src/core/domain/__tests__/Coordenada.test.ts --verbose -> 4/4 passaram; npm run typecheck -> passou; suite -> 7/7 passaram).
Task 4: Ruling: Jest mapeia uuid para seu entrypoint CommonJS — jest-expo escolhe o export browser ESM de uuid@9 e falha antes dos testes; o app continua usando o pacote exigido — custo se errado: testes podem resolver um build diferente do bundle React Native.
Task 4: complete (sem commit por solicitacao; tests: npx jest src/core/domain/__tests__/Cliente.test.ts --verbose -> 5/5 passaram; npm run typecheck -> passou; suite -> 12/12 passaram).
Task 5: Ruling: Obra.arquivar() faz apenas a transicao local; o bloqueio quando existe pedido aberto exige consulta a outro agregado e fica para o use case do Plano 2 — custo se errado: um chamador direto sem guarda pode arquivar obra vinculada.
Task 5: Ruling: resultado esperado corrigido de 7 para 8 testes — os tres blocos prescritos contem 3 + 2 + 3 casos e todos foram mantidos — custo se errado: nenhum comportamento muda, apenas a contagem reportada.
Task 5: complete (sem commit por solicitacao; tests: npx jest src/core/domain/__tests__/Obra.test.ts --verbose -> 8/8 passaram; npm run typecheck -> passou; suite -> 20/20 passaram).
Task 6: Ruling: criarVendaDireta recebe apenas obraId e nao pode provar tipo SERIE; a verificacao da Obra e a baixa atomica ficam no VendaDiretaUseCase do Plano 2 — custo se errado: uso direto da factory pode marcar como venda direta uma obra de outro tipo.
Task 6: Ruling: resultado esperado corrigido de 7 para 8 testes — os blocos prescritos contem 3 + 1 + 4 casos e todos foram mantidos — custo se errado: nenhum comportamento muda, apenas a contagem reportada.
Task 6: complete (sem commit por solicitacao; tests: npx jest src/core/domain/__tests__/Pedido.test.ts --verbose -> 8/8 passaram; npm run typecheck -> passou; suite -> 28/28 passaram).
Task 7: Ruling: resultado global esperado corrigido de 6 arquivos/~26 testes para 7 arquivos/31 testes — o smoke da Task 1 e todos os casos prescritos fazem parte da suite — custo se errado: nenhum comportamento muda, apenas a contagem reportada.
Task 7: complete (sem commit por solicitacao; tests: npx jest src/core/domain/__tests__/Evento.test.ts --verbose -> 3/3 passaram; npx jest src/core/domain --verbose -> 31/31 passaram; arquitetura/typecheck -> passou sem VIOLACAO).
Final review: fresh-context review do dominio completo por subagente general, sem operacoes Git.
Final: fixed UUID v4 quebrando sem Web Crypto no React Native — `gera UUID v4 quando o runtime inicia sem Web Crypto` RED->GREEN, suite 48/48.
Final: fixed obra ARQUIVADA podia ser alterada e ressuscitada — `obra ARQUIVADA nao pode ser alterada nem voltar a DISPONIVEL` RED->GREEN, suite 48/48.
Final: fixed contato e endereco so-espacos — `rejeita contato vazio ou so-espacos na criacao e edicao` e `rejeita endereco vazio ou so-espacos na criacao e edicao` RED->GREEN, suite 48/48.
Final: fixed construtores publicos contornavam invariantes — `construtores das entidades: sao restritos as factories no contrato TypeScript` typecheck RED->GREEN, suite 48/48.
Final: fixed IDs externos sem validacao UUID v4 — `identificadores UUID v4` 10 casos RED->GREEN, suite 48/48.
Final: fixed datas mutaveis podiam invalidar Pedido/Evento apos validacao — `protege dataEntrega contra mutacoes externas` e `protege a data contra mutacoes externas` RED->GREEN, suite 48/48.
Final: Ruling: bloqueio de Obra.arquivar com pedido aberto permanece no use case do Plano 2 — depende de consulta a Pedido fora do agregado Obra — custo se errado: chamador direto pode arquivar obra vinculada.
Final: Ruling: tipo SERIE, estoque suficiente e Cliente Balcao unico na venda direta permanecem no VendaDiretaUseCase do Plano 2 — a factory recebe somente IDs e nao pode consultar agregados/repositorios — custo se errado: uso direto da factory pode criar venda inconsistente.
Final: Ruling: compensacao de estoque em Pedido.cancelar e baixa da obra unica ao concluir permanecem nos use cases do Plano 2 — exigem transacao entre Pedido, Obra e persistencia — custo se errado: estoque diverge se a orquestracao futura omitir a compensacao.
Final: Ruling: darBaixa permanece valida para qualquer Obra UNICA viva — a tabela normativa da Secao 3.1 e o plano dizem apenas UNICA, apesar do diagrama mostrar RESERVADA -> ENTREGUE — custo se errado: uma obra UNICA ainda DISPONIVEL pode ser marcada ENTREGUE.
Final: Ruling: uuid e react-native-get-random-values permanecem como dependencias do gerador interno de IDs — o Tech Stack exige uuid v4 e o polyfill evita falha real no dispositivo; imports de infraestrutura proibidos continuam ausentes — custo se errado: o dominio fica acoplado a uma dependencia de runtime React Native.
Final: minor (deferred): Coordenada ainda aceita -0 em latitude ou longitude.
Final: minor (deferred): Coordenada usa readonly apenas em TypeScript e nao e congelada em runtime.
Final: minor (deferred): faltam casos explicitos para NaN/Infinity/float em adicionarUnidades/removerUnidades, data invalida em Pedido.editar e concluir/vincularObra apos cancelar; as guardas existentes cobrem esses caminhos.
Final verification: npm test -- --runInBand -> 10 suites, 48/48 passaram; npm run typecheck -> passou; arquitetura -> passou sem VIOLACAO.
Final: Ruling: workspace/ledger mantido em vez de apagado — o usuario pediu o registro e dispensou commits Git, portanto nao existe outro historico persistente — custo se errado: permanece diretorio scratch no projeto.
