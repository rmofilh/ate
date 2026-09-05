# Etapa 1 — Ideação e Brainstorming
### App de Gestão para Artesãos — Documentação Finalizada

---

## 1. Visão Geral e Escopo

**Tema e Objetivo:** O aplicativo — denominado **ate** — é uma ferramenta de gestão móvel para artesãos. O propósito é profissionalizar o controle da operação, resolvendo a desorganização de pedidos espalhados por diferentes redes e substituindo anotações informais por um controle de estoque e de produção mais profissional.

**Público-Alvo:** O usuário final principal é um artesão independente que trabalha com esculturas em madeira, gerencia seu próprio negócio e participa de eventos/feiras de rua. Nisso, o público-alvo se estende para trabalhadores do mesmo ramo com necessidades semelhantes.

**Perfil de Letramento Digital:** O usuário possui letramento digital básico — usa de forma simples aplicativos como Instagram, WhatsApp e outras redes sociais, mas não de forma profissional. A interface deve priorizar labels explícitos, confirmações visuais claras e onboarding guiado.

**Contexto do Projeto:** Trata-se de um projeto acadêmico a ser desenvolvido e apresentado na disciplina de Desenvolvimento de Aplicações para Dispositivos Móveis, com duração de seis meses. O produto é classificado como portfólio/aprendizado técnico, sem fins comerciais.

**Casos de Uso Principais:**
- Unificar e registrar pedidos vindos de múltiplos canais (redes sociais, telefone, presencial) em um único local;
- Gerenciar a produção através de um quadro Kanban simples;
- Consultar o estoque de obras prontas, incluindo obras em série (múltiplas unidades da mesma peça), para levar a eventos;
- Consultar um histórico de preços de materiais para avaliar compras e ofertas;
- Registrar clientes e criar encomendas de forma rápida durante eventos presenciais;
- Visualizar no mapa os locais de feiras e eventos em que o artesão vai expor.

---

## 2. Interface e Navegação (Expo Router)

**Mapeamento de Telas:** Login, Dashboard (Kanban de Pedidos), Novo Pedido/Cliente, Estoque (Obras Prontas e Histórico de Materiais), e Mapa de Eventos.

**Estrutura de Roteamento:** A navegação será construída com o Expo Router. Teremos rotas públicas contendo apenas o fluxo de autenticação. Na área logada (rotas protegidas), a navegação principal será dividida em Bottom Tabs (Kanban, Estoque, Eventos). Fluxos sequenciais, como "Adicionar Novo Pedido", utilizarão Stacks para sobrepor a tela atual e focar na tarefa.

---

## 3. Estratégia Offline-First (SQLite)

**Funcionamento Offline:** Sem internet, o usuário conseguirá interagir com praticamente todo o sistema: visualizar e mover os cards no Kanban, acessar todo o estoque de obras prontas, consultar o histórico de preços de materiais para decisões de compra rápidas e registrar novas encomendas durante as feiras.

**Modelagem de Dados Local:** O SQLite precisará persistir as tabelas: `pedidos`, `clientes`, `estoque_obras` e `historico_materiais_precos`. Isso garantirá que o painel e o catálogo abram instantaneamente, com ou sem rede.

A tabela `estoque_obras` suportará os campos `tipo ENUM('unica', 'serie')` e `quantidade INT` para representar obras em série — múltiplas unidades físicas de uma mesma peça. Esta distinção impacta diretamente a lógica de baixa de estoque ao vincular uma obra a um pedido.

**Fila de Ações:** O aplicativo terá uma tabela de fila no SQLite. Quando o usuário cadastrar ou editar algo offline, o registro será salvo localmente com uma flag `status_sync = 'pendente'` (ou em uma tabela dedicada de operações). Um serviço no app monitorará a rede para esvaziar essa fila futuramente.

---

## 4. Backend e Sincronização (Supabase)

**Modelagem de Dados Remota:** O banco de dados no Supabase refletirá o local, contendo as tabelas: `profiles` (usuários), `clientes`, `pedidos`, `obras`, `eventos` e `historico_materiais`.

A tabela `obras` incluirá os campos `tipo ENUM('unica', 'serie')` e `quantidade INT` desde o schema v1, para refletir a realidade do estoque do artesão (peças únicas sob encomenda e peças produzidas em série para venda em feiras).

**Estratégia de Sincronização:** Quando a conexão for restabelecida, o aplicativo lerá a fila de ações pendentes no SQLite. Ele fará o upload das imagens para o Supabase Storage primeiro e, com as URLs geradas, sincronizará os registros via API.

**Resolução de Conflitos:** A fonte de verdade para resolução de conflitos é o **server timestamp** — o timestamp gerado pelo Supabase no momento da inserção/atualização. Registros criados offline receberão seu timestamp oficial no momento do sync. O timestamp de criação local (`created_at_local`) será preservado como metadado separado para rastreabilidade, mas não será usado como critério de desempate. Esta estratégia foi escolhida visando expansão futura sem refatoração do mecanismo de sync.

**Autenticação e Permissões:** O app terá login utilizando o Supabase Auth. As políticas de segurança RLS (Row Level Security) serão configuradas para que o usuário autenticado só possa inserir, ler e editar os dados (clientes, pedidos, estoque) vinculados ao seu próprio ID de usuário.

**Limitação conhecida do MVP:** O MVP suporta apenas **um usuário autenticado por negócio** (um dispositivo, um login). O compartilhamento de credenciais por ajudantes não é suportado nem encorajado nesta versão. A arquitetura de dados é desenhada de forma agnóstica para permitir expansão futura (ver Seção 6).

---

## 5. Integração com Hardware e Sensores

**Uso da Câmera:** A câmera será utilizada no fluxo de cadastro de pedidos (para capturar fotos de referência do cliente) e, obrigatoriamente, como validador de conclusão: para mover um pedido de "Fazendo" para "Feito" no Kanban, o usuário **deve** fotografar a escultura pronta. Esta é uma regra de negócio rígida, sem bypass ou configuração — constitui um dos diferenciais do produto, pois gera um histórico visual acessível e relevante de cada obra entregue.

As imagens serão comprimidas antes de serem salvas e armazenadas permanentemente no diretório do app no dispositivo (`expo-file-system`), garantindo persistência offline. Após o sync, as imagens serão enviadas ao Supabase Storage e o caminho local poderá ser mantido como cache.

**Uso da Geolocalização:** A captura será pontual (marcar local no mapa). A justificativa funcional é registrar com precisão os locais de feiras e eventos em que o artesão vai expor. O módulo de Mapa de Eventos exibirá um **mapa visual simples** com os pins dos locais cadastrados — sem notificações, sem integração de calendário e sem geolocalização de fornecedores nesta versão.

---

## 6. Arquitetura e Padrões de Código

**Organização do Projeto:** O projeto aplicará conceitos de Clean Architecture e Domain Driven Design (DDD). Os diretórios separarão o núcleo da aplicação (regras de negócio, use-cases e entities, como a regra que exige foto para finalizar um pedido) das camadas externas (comunicação com a API do Supabase e queries do SQLite). Os componentes visuais ficarão isolados na camada de apresentação.

**Suporte Futuro a Múltiplos Usuários:** O modelo de dados utilizará uma entidade `negocio` (ou `workspace`) separada da entidade `usuario` desde o schema v1. Isso mantém a porta aberta para a implementação de ajudantes/co-usuários em versões futuras, sem exigir migração estrutural de banco. A viabilidade de implementar permissões multi-usuário será avaliada nas camadas da Clean Architecture conforme o avanço do projeto; se não for viável dentro do prazo acadêmico, a limitação de login único permanece documentada como escopo do MVP.

**Gerenciamento de Estado de Conexão:** A aplicação usará a Context API para prover o estado de rede (`isOnline`) para todo o app. Um listener (como o `expo-network`) escutará mudanças na conexão. Ao ficar offline, um banner alertará o usuário. Ao voltar a ficar online, a Context API reagirá iniciando automaticamente a função de sincronização em segundo plano, sem interromper a navegação.

---

## 7. Escopo do MVP v1 — Fronteiras Explícitas

### Dentro do MVP v1

| Funcionalidade | Observação |
|----------------|------------|
| Autenticação (login/logout) | Supabase Auth, um usuário por negócio |
| Kanban de pedidos (3 colunas: A Fazer / Fazendo / Feito) | Regra rígida de foto para mover para "Feito" |
| Cadastro de clientes e pedidos | Inclui foto de referência e canal de origem (enum estruturado) |
| Estoque de obras prontas | Suporte a peças únicas e em série (campo `quantidade`) |
| Histórico de preços de materiais | Consulta e registro de preços para tomada de decisão |
| Mapa de eventos/feiras | Mapa visual simples com pins de locais cadastrados |
| Estratégia offline-first completa | SQLite + fila de sync + server timestamp |
| Upload de imagens para Supabase Storage | Compressão local antes do upload |

### Fora do MVP v1

| Funcionalidade | Versão prevista |
|----------------|-----------------|
| Múltiplos usuários / ajudantes com login próprio | v1.1 ou v2 (se viável) |
| Notificações push de eventos | v1.1 |
| Integração com calendário do dispositivo | v1.1 |
| Geolocalização de fornecedores de materiais | v1.1 |
| Integração com marketplaces (Elo7, Etsy) | v2 |
| Relatórios e analytics | v2 |
| Exportação de dados | v2 |

---

## 8. Decisões e Premissas Registradas

| # | Decisão | Valor escolhido | Justificativa |
|---|---------|-----------------|---------------|
| 1 | Dispositivos por usuário | 1 dispositivo | Evita complexidade de sync multi-device no MVP |
| 2 | Resolução de conflitos de sync | Server timestamp | Mais robusto que timestamp do dispositivo; preparado para expansão |
| 3 | Suporte a ajudantes no MVP | Não — arquitetura agnóstica | Entidade `negocio` separada de `usuario`; porta aberta para v1.1 |
| 4 | Modelo de negócio | Projeto acadêmico | Disciplina de 6 meses; sem fins comerciais |
| 5 | Métrica de sucesso | Arquitetura completa + app funcionando minimamente | Demonstrar viabilidade técnica e arquitetural |
| 6 | Letramento digital da persona | Básico | Usa redes sociais de forma simples; exige UX clara e guiada |
| 7 | Foto obrigatória para fechar pedido | Regra rígida, sem bypass | Diferencial do produto; gera histórico visual comprovante |
| 8 | Obras em série | Suportado desde o MVP | Artesão tem estoque de peças repetidas para venda em feiras |
| 9 | Armazenamento de imagens | Comprimidas + FileSystem permanente | Garante persistência offline; `expo-file-system` |
| 10 | Volume estimado de dados | < 30 obras/ano | Valida Free tier Supabase; sem necessidade de paginação no MVP |
| 11 | Módulo Mapa de Eventos | Mapa visual simples com pins | Sem notificações, sem calendário — menor complexidade possível |
| 12 | Canal de origem do pedido | Enum estruturado, sem integração no MVP | Facilita futura integração com marketplaces sem migração de schema |
