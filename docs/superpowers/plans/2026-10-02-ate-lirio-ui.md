# Refinamento da apresentação do ate — plano aprovado

**Objetivo:** identidade de ateliê contemporâneo com flor-de-lis simplificada, controles mais intuitivos e layouts confortáveis em celular, paisagem e web.

**Arquitetura:** alterações somente em apresentação, tokens e assets visuais. Reutilizar providers e operações existentes; manter rotas, regras de negócio e contratos de testes. A exceção autorizada em `app.json` é `orientation: "default"`.

**Stack:** Expo SDK 57, React Native 0.86, Expo Router, `expo-symbols`, `expo-image` e `@expo/ui` já instalados. Fontes locais Bricolage Grotesque e Atkinson Hyperlegible.

## Decisões aprovadas

- Branco quente, verde profundo, dourado discreto e temas claro/escuro sem cores por tela.
- Flor-de-lis no login e drawer; ícones vetoriais coerentes com nomes acessíveis.
- Kanban deslizante com âncoras para centralizar etapas, além de visão geral com três colunas e descrições resumidas. Muitos pedidos continuam acessíveis por rolagem vertical.
- Rotação retrato/paisagem permitida, com reposicionamento da etapa atual.
- Calendário para datas, mantendo campos controlados e formato canônico `YYYY-MM-DD`.
- Drawer com marca, destinos atuais, resumo e atalhos de criação existentes.
- Teclado não deve ocultar campos ou ações, incluindo painéis de quantidade.

## Contratos obrigatórios

- Preservar todos os testIDs, propriedades públicas e textos exigidos pelos testes.
- Não editar core, infraestrutura, factories, providers funcionais ou testes fora da apresentação.
- Capturar foto antes de concluir pedido comum; cancelamento não move nem enfileira.
- Baixa de unidades em série: primeira confirmação congela quantidade; somente a segunda executa a baixa. Remoção da obra inteira mantém seu fluxo atual.
- Venda Direta UC27: quantidade e confirmação, sem adicionar etapas de cliente, foto ou produção.
- Manter guards, parâmetros, caminhos e reset de formulários de edição por ID.
- Preservar a alteração preexistente em `package-lock.json`.

## Etapas

- [x] Tokens, estilos temáticos, marca e primitivas: `src/constants/theme.ts`, `src/presentation/styles/uiStyles.ts`, hooks visuais e componentes compartilhados. Verificar acessibilidade e typecheck.
- [x] Login e formulários: shell rolável com teclado, foco e senha visível; `DateField` com calendário nativo e adaptador web. Testar cancelamento, conversão de data, entrada manual e formulários existentes.
- [x] Drawer/cabeçalhos: marca, atalhos, acesso visível nas três telas; mudar somente orientação no app config. Verificar RouterGuards e navegação.
- [x] Kanban: rolagem horizontal, âncoras, cores semânticas, metadados, ações compactas e visão geral. Preservar testes atuais e acrescentar testes de interação das novas visualizações.
- [x] Estoque/eventos: cartões, hierarquia e modais com teclado e foco. Executar testes da apresentação, especialmente estoque e conclusão com foto.
- [x] Validação final: suíte completa, lint, typecheck, export web/nativo e revisão de escopo. Registrar separadamente verificações reais de dispositivo e limitações.

## Referências verificadas

- https://docs.expo.dev/versions/v57.0.0/
- https://docs.expo.dev/guides/keyboard-handling.md
- https://docs.expo.dev/versions/v57.0.0/sdk/ui/drop-in-replacements/datetimepicker.md
- https://docs.expo.dev/versions/v57.0.0/sdk/symbols.md
- https://docs.expo.dev/versions/v57.0.0/sdk/image.md
- https://docs.expo.dev/develop/user-interface/color-themes.md
- https://docs.expo.dev/versions/v57.0.0/config/app.md
- Skill ui-ux-pro-max: semântica das cores, nomes acessíveis de ícones, dimensões responsivas e listas virtualizadas. O visual foi curado para este app; recomendações de landing page não são aplicáveis.

## Verificação

Baseline da investigação: 34 suítes / 169 testes aprovados, typecheck aprovado, lint de src sem erros e 11 avisos preexistentes em RouterGuards.test.tsx.

```sh
npm test -- --no-cache --coverage=false
npm run typecheck -- --incremental false
npm run lint -- --no-cache
```

Revisão visual: telefone pequeno, paisagem, tablet/web, teclado aberto, texto ampliado, modo escuro/claro, movimento reduzido, foco em modais e conflito entre drawer e rolagem do Kanban.

## Resultado da execução

- **37 suítes / 181 testes aprovados** na execução final, incluindo os 169 testes originais e 12 novos testes exclusivamente de apresentação.
- Typecheck aprovado; lint sem erros, com os mesmos 11 avisos preexistentes em `RouterGuards.test.tsx`.
- Bundles Android, iOS e web e 18 rotas estáticas exportados com sucesso em `/tmp/opencode/ate-ui-export`.
- Revisão Chromium realizada em 375×812, 812×375 e 1024×768, incluindo temas claro/escuro e movimento reduzido.
- Âncora centraliza a coluna escolhida com diferença de aproximadamente 0,08px; visão geral reúne os três pedidos da fixture e retorna à etapa selecionada.
- Calendário web preenche o mesmo campo controlado com `2026-12-01` e exibe apoio localizado `01/12/2026`; testes nativos cobrem confirmação/cancelamento e o dia emitido em UTC pelo Android, inclusive com `TZ=America/Sao_Paulo`.
- Login em viewport reduzido 375×400: senha e botão alcançáveis por foco/rolagem, sem overflow horizontal. Isso verifica o layout web reduzido, não um teclado nativo.
- `fontScale=3.2` simulado em testes: controles continuam nomeados e colunas não ultrapassam o viewport; âncoras e alternância de visão continuam funcionando.
- Contraste calculado dos pares de texto: mínimo 5,45:1 entre os pares verificados em claro/escuro. Bordas de controles: 3,74:1 ou mais.
- Fluxos de foto obrigatória, quantidade congelada/dupla confirmação, UC27, parâmetros/guards e serviços preservados. Auditoria de diff confirma ausência de alterações em core, infraestrutura, factories e AppProviders.
- A alteração preexistente em `package-lock.json` foi preservada. Em `app.json`, somente `orientation` foi alterado.

### Verificação real de dispositivo pendente

Não havia Android/ADB ou simulador iOS disponível. Teclado nativo, calendários nativos, maior tamanho real de Dynamic Type, barras/áreas seguras e rotação física ainda precisam ser conferidos em um dispositivo. Exportação de bundle e simulação em testes não substituem essa verificação.

Capturas de revisão estão em `/tmp/opencode/ate-*.png`; não foram adicionadas ao repositório.
