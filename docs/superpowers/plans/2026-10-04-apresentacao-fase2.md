# Apresentação ate — fase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar uma apresentação acadêmica em português, com oito slides, nove minutos de roteiro incluindo demonstração e um minuto de margem.

**Architecture:** HTML estático com Reveal.js 6.0.2 local, tema baseado nos tokens e assets do ate, notas por slide e tempos explícitos. Conteúdo fundamentado no código atual; roteiro Markdown fornece os arquivos e passos de demonstração.

**Tech Stack:** HTML, CSS, JavaScript, Reveal.js 6.0.2; Jest 29.7 para medir a suíte existente; Chromium para revisão visual.

**Spec:** Roteiro de oito slides aprovado pelo usuário em 2026-10-04, `docs/ate-fase2.md` e implementação atual em `src/`.

## Global Constraints

- Apresentação completa em dez minutos no máximo; roteiro principal de 9:00, demonstração de 2:30.
- Arquivos da apresentação em `docs/` e assets do Reveal.js locais.
- Mostrar Clean Architecture, TDD, Context API, contratos e fakes com os nomes reais do ate.
- Exibir o resultado medido de cobertura, distinguindo linhas, instruções, funções e ramificações.
- Identificar a sessão em memória e as integrações futuras de armazenamento seguro, persistência, sincronização e hardware.

## Review Focus

- Internet indisponível: apresentação, fontes e modo apresentador devem carregar por servidor local sem CDN.
- Projetor 4:3 ou notebook pequeno: Reveal.js deve ajustar o palco 16:9 sem cortar conteúdo.
- Retorno após alternar para app/editor: slide e cronômetro devem preservar o andamento.
- Evidências acadêmicas: erro esperado de negócio não é a fase Red do TDD; testes de Router não são E2E nativos.
- Demonstração: concluir a Águia em Fazendo deve refletir sua baixa no estoque; a foto é uma resposta fake.

## Arquivos

- `docs/apresentacao-ate-fase2.html`: conteúdo, tema, tempos e notas dos oito slides.
- `docs/roteiro-apresentacao-ate-fase2.md`: fala, cronograma, evidências, comandos e passos do app.
- `docs/apresentacao-coverage.cjs`: configuração reproduzível da medição de todos os arquivos de produção.
- `docs/vendor/reveal/`: README, licença e arquivos oficiais de execução da versão 6.0.2.

## Etapas

- [x] Conferir domínio, casos de uso, composition root, providers, rotas e testes da conclusão de pedido.
- [x] Medir a suíte: 45 suítes / 214 testes aprovados; 88,18% de linhas, 85,42% de instruções, 85,74% de funções, 77,14% de ramificações.
- [x] Criar os oito slides e as notas, com durações de 30, 60, 55, 70, 60, 85, 150 e 30 segundos.
- [x] Criar o roteiro e a configuração reproduzível de cobertura.
- [x] Empacotar somente os assets oficiais usados do Reveal.js e sua licença.
- [x] Verificar navegador, notas, teclado, ajuste do palco e carregamento local.
- [x] Executar `npm run lint` e `npm run typecheck` e registrar a verificação final.

## Direção visual

- Paleta: azul `#355676`, fundo `#F7F7F2`, texto `#263444`, noite `#192432`, dourado `#B5924D`, sucesso `#365E4A`.
- Bricolage Grotesque nos títulos; Atkinson Hyperlegible Next no conteúdo; monoespaçada apenas em código.
- Alinhamento à esquerda, diagramas de dependência e fluxos em vez de grades de cartões decorativos.
- Destaque visual: a passagem Fazendo → Feito com a guarda de fotografia, retomada na demonstração.
- Visual baseado na identidade atual do app; fontes, flor-de-lis e recursos de apresentação locais.

## Resultado da execução

- Entregues HTML Reveal.js offline, roteiro com falas/evidências, configuração de cobertura e distribuição local com licença.
- A configuração permanente de cobertura reproduziu 45 suítes / 214 testes e as mesmas métricas da medição inicial.
- Typecheck aprovado; lint sem erros e 11 avisos preexistentes em RouterGuards.test.tsx. Assets de terceiros excluídos do lint em `eslint.config.js`.
- Chromium: oito slides dentro do palco em 1280×720, 1024×768 e 375×812; fontes e marca locais.
- Navegação, hash, visão geral, notas conectadas/sincronizadas, impressão em oito páginas e carregamento por file:// com rede bloqueada verificados.
- Nenhum erro JavaScript, recurso não carregado ou requisição externa observado na apresentação.
- Capturas de revisão em `/tmp/opencode/ate-slides-1.png` a `/tmp/opencode/ate-slides-8.png`.
