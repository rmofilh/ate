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
- Registrar clientes e criar encomendas de forma rápida durante eventos presenciais, incluindo edição e cancelamento para correção de erros;
- Gerenciar o estoque com edição de dados, adição de unidades em série e remoção/arquivamento com confirmação explícita;
- Remover manualmente unidades de obra em série com dupla confirmação (UC26) e realizar venda direta de peça em série com criação imediata do pedido em "Feito" (UC27);
- Visualizar no mapa os locais de feiras e eventos em que o artesão vai expor, incluindo edição e remoção de eventos cancelados.

---

## 2. Interface e Navegação (Expo Router)

**Mapeamento de Telas:** Login, Dashboard (Kanban de Pedidos), Novo Pedido/Cliente, Estoque (Obras Prontas) e Mapa de Eventos.

**Estrutura de Roteamento:** A navegação será construída com o Expo Router. Teremos rotas públicas contendo apenas o fluxo de autenticação. Na área logada (rotas protegidas), a navegação principal será dividida em Bottom Tabs (Kanban, Estoque, Eventos). Fluxos sequenciais, como "Adicionar Novo Pedido", utilizarão Stacks para sobrepor a tela atual e focar na tarefa.

---

## 3. Estratégia Offline-First (SQLite)

**Funcionamento Offline:** Sem internet, o usuário conseguirá interagir com praticamente todo o sistema: visualizar e mover os cards no Kanban, acessar todo o estoque de obras prontas e registrar novas encomendas e clientes durante as feiras.

**Modelagem de Dados Local:** O SQLite precisará persistir as tabelas: `clientes`, `pedidos`, `obras` e `eventos`. Isso garantirá que o painel e o catálogo abram instantaneamente, com ou sem rede. Os IDs são UUID v4 gerados no dispositivo, usados como chave primária tanto no SQLite quanto no Supabase, evitando colisão no sync.

A tabela `obras` suportará os campos `tipo ENUM('unica', 'serie')` e `quantidade INT` para representar obras em série — múltiplas unidades físicas de uma mesma peça. Esta distinção impacta diretamente a lógica de baixa de estoque ao vincular uma obra a um pedido. Ao cancelar um pedido vinculado a obra em série, a quantidade é restaurada (+1); ao cancelar pedido com obra única, a obra retorna a `DISPONIVEL`.

**Fila de Ações:** O aplicativo terá uma tabela de fila `fila_sync` no SQLite. Quando o usuário cadastrar ou editar algo offline, o registro será salvo localmente com a flag `status_sync = 'pendente'` e um registro correspondente na `fila_sync` (tipo de operação, entidade, entidade_id, payload). Um serviço no app monitorará a rede para esvaziar essa fila quando a conexão for restabelecida.

---

## 4. Backend e Sincronização (Supabase)

**Modelagem de Dados Remota:** O banco de dados no Supabase refletirá o local, contendo as tabelas: `profiles` (usuário, FK para `auth.users.id`), `clientes`, `pedidos`, `obras` e `eventos`. Todas as tabelas operacionais possuem `usuario_id UUID` como escopo direto do dono, sem entidade intermediária de negócio. IDs são UUID v4 gerados no dispositivo.

A tabela `obras` incluirá os campos `tipo ENUM('unica', 'serie')` e `quantidade INT` desde o schema v1, para refletir a realidade do estoque do artesão (peças únicas sob encomenda e peças produzidas em série para venda em feiras).

**Estratégia de Sincronização:** Quando a conexão for restabelecida, o aplicativo lerá a fila de ações pendentes (`fila_sync`) no SQLite. Ele fará o upload das imagens para o Supabase Storage primeiro e, com as URLs geradas, sincronizará os registros via API.

**Resolução de Conflitos:** A fonte de verdade para resolução de conflitos é o **server timestamp** — o timestamp gerado pelo Supabase no momento da inserção/atualização. Registros criados offline receberão seu timestamp oficial no momento do sync. O timestamp de criação local (`created_at_local`) será preservado como metadado separado para rastreabilidade, mas não será usado como critério de desempate.

**Autenticação e Permissões:** O app terá login utilizando o Supabase Auth. As políticas de segurança RLS (Row Level Security) serão configuradas para que o usuário autenticado só possa inserir, ler e editar os dados (clientes, pedidos, estoque, eventos) vinculados ao seu próprio `usuario_id` (`auth.uid()`).

**Limitação conhecida:** Suporte a apenas **um usuário autenticado** (um dispositivo, um login). Não há suporte a ajudantes nem compartilhamento de contas.

---

## 5. Integração com Hardware e Sensores

**Uso da Câmera:** A câmera será utilizada obrigatoriamente como validador de conclusão: para mover um pedido de "Fazendo" para "Feito" no Kanban, o usuário **deve** fotografar a escultura pronta. Esta é uma regra de negócio rígida, sem bypass ou configuração — constitui um dos diferenciais do produto, pois gera um histórico visual acessível e relevante de cada obra entregue. Opcionalmente, o artesão pode fotografar a obra no cadastro do estoque para o catálogo. Exceção única: a venda direta de obra em série (UC27) dispensa foto nova de conclusão, reutilizando a foto de catálogo existente.

As imagens serão comprimidas antes de serem salvas e armazenadas permanentemente no diretório do app no dispositivo (`expo-file-system`), garantindo persistência offline. Após o sync, as imagens serão enviadas ao Supabase Storage e o caminho local poderá ser mantido como cache.

**Uso da Geolocalização:** A captura será pontual (marcar local no mapa). A justificativa funcional é registrar com precisão os locais de feiras e eventos em que o artesão vai expor. O módulo de Mapa de Eventos exibirá um **mapa visual simples** com os pins dos locais cadastrados — sem notificações e sem integração de calendário. Modo degradado offline: a lista de eventos e os pins cacheados funcionam sem rede; os tiles do mapa exigem conexão.

---

## 6. Arquitetura e Padrões de Código

**Organização do Projeto:** O projeto aplicará conceitos de Clean Architecture e Domain Driven Design (DDD). Os diretórios separarão o núcleo da aplicação (regras de negócio, use-cases e entities, como a regra que exige foto para finalizar um pedido) das camadas externas (comunicação com a API do Supabase e queries do SQLite). Os componentes visuais ficarão isolados na camada de apresentação.

**Escopo de usuário único:** O modelo de dados escopa todas as tabelas operacionais diretamente por `usuario_id` (UUID do Supabase Auth). Não há entidade `negocio/workspace` nem suporte a ajudantes. O usuário edita e remove seus próprios registros com confirmação explícita nas ações destrutivas.

**Gerenciamento de Estado de Conexão:** A aplicação usará a Context API para prover o estado de rede (`isOnline`) para todo o app. Um listener (como o `expo-network`) escutará mudanças na conexão. Ao ficar offline, um banner alertará o usuário. Ao voltar a ficar online, a Context API reagirá iniciando automaticamente a função de sincronização em segundo plano, sem interromper a navegação.

---

## 7. Escopo Fechado — Fronteiras Explícitas

| Funcionalidade | Observação |
|----------------|------------|
| Autenticação (login/logout) | Supabase Auth, usuário único |
| Kanban de pedidos (3 colunas: A Fazer / Fazendo / Feito) | Regra rígida de foto para mover para "Feito" |
| Cadastro, edição e seleção de clientes | Correção de erros de digitação em campo |
| Cadastro, edição e cancelamento de pedidos | Edição só em `A Fazer`; cancelamento com confirmação explícita e compensação de estoque |
| Vinculação de obra ao pedido | `unica` → Reservada; `serie` → decremento; cancelamento restaura |
| Estoque de obras prontas | Peças únicas e em série (`quantidade`); adicionar unidades; remover/arquivar com confirmação e bloqueio se vinculada a pedido aberto |
| Mapa de eventos/feiras | Mapa visual simples com pins; criar, editar e remover eventos |
| Estratégia offline-first completa | SQLite + fila de sync `fila_sync` + server timestamp |
| Upload de imagens para Supabase Storage | Foto de conclusão obrigatória + foto de catálogo opcional; compressão local antes do upload |

---

## 8. Decisões e Premissas Registradas

| # | Decisão | Valor escolhido | Justificativa |
|---|---------|-----------------|---------------|
| 1 | Dispositivos por usuário | 1 dispositivo | Evita complexidade de sync multi-device |
| 2 | Resolução de conflitos de sync | Server timestamp | Timestamp do Supabase como verdade; `created_at_local` só rastreabilidade |
| 3 | Suporte a ajudantes | Não | Escopo por `usuario_id` direto; sem entidade `negocio`; sem compartilhamento de contas |
| 4 | Modelo de negócio | Projeto acadêmico | Disciplina de 6 meses; sem fins comerciais; sem entregas futuras |
| 5 | Métrica de sucesso | Arquitetura completa + app funcionando minimamente | Demonstrar viabilidade técnica e arquitetural |
| 6 | Letramento digital da persona | Básico | Usa redes sociais de forma simples; exige UX clara e guiada |
| 7 | Foto obrigatória para fechar pedido | Regra rígida, sem bypass | Diferencial do produto; gera histórico visual comprovante |
| 8 | Obras em série | Suportado | Artesão tem estoque de peças repetidas para venda em feiras; cancelamento restaura quantidade |
| 9 | Armazenamento de imagens | Comprimidas + FileSystem permanente | Garante persistência offline; `expo-file-system` |
| 10 | Volume estimado de dados | < 30 obras/ano | Valida Free tier Supabase; sem necessidade de paginação |
| 11 | Módulo Mapa de Eventos | Mapa visual simples com pins | Sem notificações, sem calendário; lista funciona offline, tiles exigem rede |
| 12 | Canal de origem do pedido | Enum estruturado | Valores fixos: Instagram, WhatsApp, Presencial, Telefone, Outros |
| 13 | Venda direta de obra em série | Venda direta (UC27) só para tipo SERIE, sem passar pelo Kanban: cria pedido direto em Feito vinculado ao Cliente Balcão único por usuario_id (criado sob demanda); dispensa foto nova de conclusão, valendo a foto de catálogo como exceção à Decisão #7 | Agiliza venda presencial em feiras sem burocracia do Kanban; Cliente Balcão evita cadastros repetitivos mantendo escopo por usuario_id |
