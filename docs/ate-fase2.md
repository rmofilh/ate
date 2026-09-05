# Documento de Software — App de Gestão para Artesãos
## Documento Consolidado Final (Tarefas 1 a 11 + Tarefa 12: Consolidação e Autocorreção)

> Origem: fusão integral dos arquivos `docs/tarefas-fase2/tarefa-01-requisitos.md` a `tarefa-11-implementacao.md`, na ordem da skill `software-design-doc`.
> Nenhum conteúdo textual, tabela ou observação foi resumido ou cortado — apenas reorganizado sob os títulos abaixo.
> Tarefa 12 aplicou o Ciclo de Autocorreção e substituiu 3 blocos Mermaid com erro real de sintaxe (validados contra o parser oficial `mermaid`/npm + conferência visual em mermaid.live):
> - Seção 6 (BCE), Fluxo 1 UC05 — causa raiz: parênteses `()` em rótulos de aresta/nó de `flowchart` sem aspas duplas; correção: envolver rótulo em aspas duplas.
> - Seção 8 (Atividades) — mesma causa + `\n` literal trocado por `<br/>` (em `flowchart`, `\n` não gera quebra de linha real).
> - Seção 9 (Componentes) — mesma causa + `\n` literal trocado por `<br/>`.

---

# 1. Levantamento de Requisitos

## 1.1 Requisitos Funcionais (RF)

| ID | Descrição | Prioridade | Ator/Origem |
|----|-----------|-----------|-------------|
| RF01 | Sistema deve permitir que o artesão realize login com e-mail e senha via Supabase Auth *(base: Etapa 1, Seção 4)* | Alta | Artesão |
| RF02 | Sistema deve permitir que o artesão realize logout, encerrando a sessão *(base: Etapa 1, Seção 7)* | Alta | Artesão |
| RF03 | Sistema deve exibir os pedidos do artesão organizados em três colunas Kanban: **A Fazer**, **Fazendo** e **Feito** *(base: Etapa 1, Seção 1 / Seção 7)* | Alta | Artesão |
| RF04 | Sistema deve permitir que o artesão mova um card de pedido entre as colunas do Kanban *(base: Etapa 1, Seção 1)* | Alta | Artesão |
| RF05 | Sistema deve **exigir** que o artesão fotografe a escultura pronta antes de mover o card da coluna "Fazendo" para a coluna "Feito" — sem bypass ou configuração *(base: Etapa 1, Seção 5 / Decisão #7)* | Alta | Artesão |
| RF06 | Sistema deve permitir que o artesão cadastre um novo cliente com nome e dados de contato *(base: Etapa 1, Seção 1)* | Alta | Artesão |
| RF07 | Sistema deve permitir que o artesão registre um novo pedido vinculado a um cliente, informando canal de origem (Instagram, WhatsApp, Presencial, Telefone, Outros), descrição e data de entrega *(base: Etapa 1, Seção 1 / Passo 0 - A3)* | Alta | Artesão |
| RF08 | Sistema deve permitir que o artesão anexe uma foto de referência ao pedido no momento do cadastro *(base: Etapa 1, Seção 5)* | Média | Artesão |
| RF09 | Sistema deve permitir que o artesão consulte o estoque de obras prontas, listando nome, tipo (única/série) e quantidade disponível *(base: Etapa 1, Seção 1 / Seção 3)* | Alta | Artesão |
| RF10 | Sistema deve permitir que o artesão cadastre uma obra no estoque informando nome, tipo (`unica` ou `serie`) e, para obras em série, a quantidade de unidades *(base: Etapa 1, Seção 3 / Decisão #8)* | Alta | Artesão |
| RF11 | Sistema deve realizar baixa de estoque conforme o tipo da obra: para obras **únicas**, marcar como "Reservada" ao ser vinculada a um pedido, dando baixa definitiva quando o pedido for "Feito"; para obras **em série**, decrementar `quantidade` imediatamente ao vincular *(base: Passo 0 - A2 / Etapa 1, Seção 3)* | Alta | Sistema |
| RF12 | Sistema deve permitir que o artesão vincule uma obra do estoque a um pedido existente *(base: Etapa 1, Seção 1)* | Alta | Artesão |
| RF13 | Sistema deve permitir que o artesão registre o preço de compra de um material em uma data específica, com o nome do material sugerido por autocomplete baseado em registros anteriores *(base: Etapa 1, Seção 1 / Passo 0 - A4)* | Média | Artesão |
| RF14 | Sistema deve permitir que o artesão consulte o histórico de preços de um material ao longo do tempo *(base: Etapa 1, Seção 1)* | Média | Artesão |
| RF15 | Sistema deve permitir que o artesão cadastre um evento/feira informando nome, data, endereço textual, coordenadas (via geolocalização ou seleção manual no mapa) e observações *(base: Etapa 1, Seção 5 / Passo 0 - A5)* | Média | Artesão |
| RF16 | Sistema deve exibir os eventos cadastrados como pins em um mapa visual *(base: Etapa 1, Seção 1 / Seção 5)* | Média | Artesão |
| RF17 | Sistema deve permitir que o artesão opere as funcionalidades principais — visualizar e mover cards do Kanban, consultar estoque, consultar histórico de preços, registrar pedidos e clientes — sem conexão com a internet *(base: Etapa 1, Seção 3)* | Alta | Artesão |
| RF18 | Sistema deve enfileirar as operações realizadas offline com status `pendente` e sincronizá-las automaticamente com o Supabase quando a conexão for restabelecida *(base: Etapa 1, Seção 3)* | Alta | Sistema |
| RF19 | Sistema deve fazer upload das imagens (referência e conclusão) para o Supabase Storage durante a sincronização, após comprimir as imagens localmente *(base: Etapa 1, Seção 4 / Seção 5)* | Alta | Sistema |
| RF20 | Sistema deve exibir um banner de aviso quando o dispositivo estiver sem conexão e ocultá-lo ao restabelecer a rede *(base: Etapa 1, Seção 6)* | Média | Sistema |
| RF21 | Sistema deve permitir que o artesão edite os dados de um cliente existente (nome e contato) *(base: Passo 0 - A3 / gap CRUD identificado)* | Média | Artesão |
| RF22 | Sistema deve permitir que o artesão edite um pedido cujo status seja **A Fazer** (descrição, data de entrega, obra vinculada) *(base: Passo 0 - A4 / gap CRUD identificado)* | Média | Artesão |
| RF23 | Sistema deve permitir que o artesão cancele/remova um pedido — com confirmação explícita antes da exclusão *(base: Passo 0 - A4 / gap CRUD identificado)* | Média | Artesão |
| RF24 | Sistema deve permitir que o artesão adicione unidades manualmente a uma obra em série no estoque (ex: nova leva de produção) *(base: Passo 0 - A2 / gap CRUD identificado)* | Alta | Artesão |
| RF25 | Sistema deve permitir que o artesão remova/arquive uma obra do estoque (ex: peça danificada ou descontinuada) — com confirmação explícita; obras vinculadas a pedido aberto não podem ser removidas *(base: Passo 0 - A2 / gap CRUD identificado)* | Média | Artesão |
| RF26 | Sistema deve permitir que o artesão remova uma entrada específica do histórico de preços de material (exclusão pontual para correção de erro) *(base: Passo 0 - A1 / gap CRUD identificado)* | Baixa | Artesão |
| RF27 | Sistema deve permitir que o artesão edite um evento/feira existente (nome, data, local, observações) *(base: Passo 0 - A5 / gap CRUD identificado)* | Média | Artesão |
| RF28 | Sistema deve permitir que o artesão remova um evento cancelado — com confirmação explícita antes da exclusão *(base: Passo 0 - A5 / gap CRUD identificado)* | Média | Artesão |

## 1.2 Requisitos Não Funcionais (RNF)

| ID | Descrição | Prioridade | Ator/Origem |
|----|-----------|-----------|-------------|
| RNF01 | **Desempenho:** O painel Kanban e a lista de estoque devem abrir em menos de 1 segundo, mesmo sem conexão, carregando dados do SQLite local *(base: Etapa 1, Seção 3)* | Alta | Equipe técnica |
| RNF02 | **Confiabilidade:** Nenhuma ação realizada offline pode ser perdida — toda operação deve ser persistida localmente no SQLite antes de retornar sucesso ao usuário, independentemente do status da rede *(base: Etapa 1, Seção 3)* | Alta | Equipe técnica |
| RNF03 | **Segurança:** As políticas RLS (Row Level Security) do Supabase devem garantir que o artesão autenticado leia, insira e edite apenas os dados vinculados ao seu próprio ID de usuário *(base: Etapa 1, Seção 4)* | Alta | Equipe técnica |
| RNF04 | **Confiabilidade (conflito):** Conflitos de escrita concorrente devem ser resolvidos via timestamp gerado pelo servidor (Supabase), nunca pelo relógio do dispositivo; o `created_at_local` é preservado como metadado separado apenas para rastreabilidade *(base: Etapa 1, Seção 4 / Decisão #2)* | Alta | Equipe técnica |
| RNF05 | **Usabilidade:** A interface deve priorizar labels explícitos, confirmações visuais claras e onboarding guiado, adequada a usuário com letramento digital básico (nível: uso simples de redes sociais) *(base: Etapa 1, Seção 1 / Decisão #6)* | Alta | Artesão |
| RNF06 | **Armazenamento de imagens:** Toda imagem deve ser comprimida antes de ser salva no sistema de arquivos do dispositivo (`expo-file-system`) e antes do upload ao Supabase Storage, preservando a persistência offline *(base: Etapa 1, Seção 5 / Decisão #9)* | Alta | Equipe técnica |
| RNF07 | **Portabilidade:** O app deve executar em iOS e Android via Expo/React Native, com comportamento equivalente em ambas as plataformas *(base: Etapa 1, Seção 2)* | Alta | Equipe técnica |
| RNF08 | **Escalabilidade (dados):** O volume estimado de dados é inferior a 30 obras/ano; a solução deve operar dentro dos limites do Free tier do Supabase sem necessidade de paginação no MVP *(base: Etapa 1, Decisão #10)* | Baixa | Equipe técnica |
| RNF09 | **Manutenibilidade:** O código deve seguir os princípios de Clean Architecture e Domain-Driven Design, separando núcleo de regras de negócio (domain/application) das camadas externas (adapters/infra), sem importar libs de banco ou framework dentro de entidades ou use cases *(base: Etapa 1, Seção 6)* | Alta | Equipe técnica |
| RNF10 | **Escalabilidade (multi-usuário):** O modelo de dados deve incluir a entidade `negocio` separada da entidade `usuario` desde o schema v1, mantendo a porta aberta para suporte a múltiplos usuários por negócio em versões futuras sem migração estrutural *(base: Etapa 1, Seção 6 / Decisão #3)* | Média | Equipe técnica |
| RNF11 | **Conformidade (MVP):** O MVP suporta exatamente um usuário autenticado por negócio; compartilhamento de credenciais por ajudantes não é suportado nesta versão *(base: Etapa 1, Seção 4 / Decisão #1)* | Alta | Equipe técnica |
| RNF12 | **Confiabilidade (imagem de conclusão):** A regra de exigir fotografia para fechar um pedido ("Fazendo" → "Feito") é uma restrição rígida do sistema — não pode ser contornada por configuração, permissão ou fluxo alternativo *(base: Etapa 1, Decisão #7)* | Alta | Equipe técnica |

---

# 2. Diagrama de Casos de Uso

## 2.1 Atores

| Ator | Tipo | Descrição |
|------|------|-----------|
| **Artesão** | Primário | Único usuário do sistema no MVP; inicia todos os casos de uso interativos *(base: Etapa 1, Seção 1 / Decisão #11)* |
| **Monitor de Rede** | Sistema (evento) | Listener interno que detecta mudanças de conectividade e dispara sync e banner *(base: Etapa 1, Seção 6)* |
| **Supabase** | Secundário externo | Plataforma de backend — Auth, banco de dados e Storage; participa de login e sincronização *(base: Etapa 1, Seção 4)* |

> Não há ator `Administrador` no MVP — o app suporta um único usuário por negócio *(base: Etapa 1, Decisão #11)*.

## 2.2 Diagrama de Casos de Uso

```mermaid
flowchart LR
    Artesao((Artesão))
    MonitorRede(("Monitor de Rede"))
    Supabase(("Supabase"))

    subgraph AUTH["Autenticação"]
        UC01["UC01 Realizar Login"]
        UC02["UC02 Realizar Logout"]
    end

    subgraph KANBAN["Pedidos e Kanban"]
        UC03["UC03 Visualizar Kanban"]
        UC04["UC04 Iniciar Produção"]
        UC05["UC05 Concluir Pedido"]
        UC06["UC06 Fotografar Obra Concluída"]
        UC07["UC07 Registrar Novo Pedido"]
        UC08["UC08 Selecionar Cliente"]
        UC09["UC09 Cadastrar Cliente"]
        UC10["UC10 Anexar Foto de Referência"]
        UC11["UC11 Vincular Obra ao Pedido"]
        UC22["UC22 Editar Cliente"]
        UC23["UC23 Editar Pedido"]
        UC24["UC24 Cancelar Pedido"]
    end

    subgraph ESTOQUE["Estoque de Obras"]
        UC12["UC12 Consultar Estoque"]
        UC13["UC13 Cadastrar Obra"]
        UC25["UC25 Adicionar Unidades a Obra em Série"]
        UC26["UC26 Remover Obra do Estoque"]
    end

    subgraph MATERIAIS["Histórico de Materiais"]
        UC14["UC14 Registrar Preço de Material"]
        UC15["UC15 Consultar Histórico de Preços"]
        UC27["UC27 Remover Entrada de Preço"]
    end

    subgraph EVENTOS["Eventos e Feiras"]
        UC16["UC16 Cadastrar Evento/Feira"]
        UC17["UC17 Capturar Localização"]
        UC18["UC18 Visualizar Mapa de Eventos"]
        UC28["UC28 Editar Evento"]
        UC29["UC29 Remover Evento"]
    end

    subgraph SYNC["Sincronização"]
        UC19["UC19 Sincronizar Dados Offline"]
        UC20["UC20 Fazer Upload de Imagens"]
        UC21["UC21 Exibir Banner de Conectividade"]
    end

    Artesao --> UC01
    Artesao --> UC02
    Artesao --> UC03
    Artesao --> UC04
    Artesao --> UC05
    Artesao --> UC07
    Artesao --> UC09
    Artesao --> UC22
    Artesao --> UC23
    Artesao --> UC24
    Artesao --> UC12
    Artesao --> UC13
    Artesao --> UC25
    Artesao --> UC26
    Artesao --> UC14
    Artesao --> UC15
    Artesao --> UC27
    Artesao --> UC16
    Artesao --> UC18
    Artesao --> UC28
    Artesao --> UC29

    MonitorRede --> UC19
    MonitorRede --> UC21

    UC01 --> Supabase
    UC19 --> Supabase
    UC20 --> Supabase

    UC05 -. include .-> UC06
    UC07 -. include .-> UC08
    UC09 -. extend .-> UC08
    UC10 -. extend .-> UC07
    UC11 -. extend .-> UC07
    UC16 -. include .-> UC17
    UC19 -. include .-> UC20
```

### Legenda de relações

| Notação | Semântica |
|---------|-----------|
| `──►` sólida | Ator inicia o caso de uso |
| `-. include .-►` tracejada | Comportamento obrigatório, sempre executado como parte do caso base |
| `-. extend .-►` tracejada | Comportamento opcional/condicional, insere-se quando a condição de extensão é satisfeita |

## 2.3 Mapeamento UC ↔ RF

| Caso de Uso | RFs Atendidos |
|-------------|--------------|
| UC01 Realizar Login | RF01 |
| UC02 Realizar Logout | RF02 |
| UC03 Visualizar Kanban | RF03 |
| UC04 Iniciar Produção | RF04 |
| UC05 Concluir Pedido | RF04, RF05 |
| UC06 Fotografar Obra Concluída | RF05 |
| UC07 Registrar Novo Pedido | RF07, RF17 |
| UC08 Selecionar Cliente | RF06 |
| UC09 Cadastrar Cliente | RF06, RF17 |
| UC10 Anexar Foto de Referência | RF08 |
| UC11 Vincular Obra ao Pedido | RF11, RF12 |
| UC12 Consultar Estoque de Obras | RF09, RF17 |
| UC13 Cadastrar Obra no Estoque | RF10, RF17 |
| UC14 Registrar Preço de Material | RF13, RF17 |
| UC15 Consultar Histórico de Preços | RF14, RF17 |
| UC16 Cadastrar Evento/Feira | RF15 |
| UC17 Capturar Localização | RF15 |
| UC18 Visualizar Mapa de Eventos | RF16 |
| UC19 Sincronizar Dados Offline | RF18 |
| UC20 Fazer Upload de Imagens | RF19 |
| UC21 Exibir Banner de Conectividade | RF20 |
| UC22 Editar Cliente | RF21 |
| UC23 Editar Pedido | RF22 |
| UC24 Cancelar Pedido | RF23 |
| UC25 Adicionar Unidades a Obra em Série | RF24 |
| UC26 Remover Obra do Estoque | RF25 |
| UC27 Remover Entrada de Preço de Material | RF26 |
| UC28 Editar Evento | RF27 |
| UC29 Remover Evento | RF28 |

## 2.4 Descrições Textuais dos Casos de Uso Principais

---

### UC01 — Realizar Login

**Ator primário:** Artesão  
**Ator secundário:** Supabase (Auth)  
**Pré-condições:**
- Artesão possui conta cadastrada no Supabase Auth.
- App instalado e com conectividade (login exige rede).

**Fluxo principal:**
1. Artesão abre o app e é redirecionado para a tela de Login (rota pública).
2. Artesão informa e-mail e senha.
3. App envia credenciais ao Supabase Auth.
4. Supabase valida e retorna token de sessão.
5. App persiste token localmente e redireciona para a área protegida (Bottom Tabs: Kanban, Estoque, Eventos).

**Fluxos alternativos:**
- **FA1 — Credenciais inválidas:** Supabase retorna erro; app exibe mensagem "E-mail ou senha incorretos"; fluxo retorna ao passo 2.
- **FA2 — Sem conectividade:** App detecta ausência de rede antes do envio; exibe aviso "Sem conexão — login requer internet"; bloqueia o passo 3.
- **FA3 — Sessão já ativa:** Se token válido já persistido, app pula para o passo 5 sem exibir a tela de login.

**Pós-condições:**
- Artesão autenticado; token de sessão disponível para requisições subsequentes.
- Dados locais do SQLite ficam disponíveis para operações offline imediatas.

*(base: Etapa 1, Seção 4 / RF01)*

---

### UC05 — Concluir Pedido (Fazendo → Feito)

**Ator primário:** Artesão  
**Pré-condições:**
- Pedido existe no sistema com status `Fazendo`.
- Câmera do dispositivo disponível e com permissão concedida.

**Fluxo principal:**
1. Artesão acessa o Kanban e localiza o card do pedido na coluna "Fazendo".
2. Artesão aciona "Mover para Feito".
3. **[include UC06]** Sistema abre a câmera e solicita que o artesão fotografe a obra concluída.
4. Artesão captura a foto.
5. App comprime a imagem e a salva localmente (`expo-file-system`) vinculada ao pedido.
6. Sistema atualiza o status do pedido para `Feito` no SQLite com `status_sync = 'pendente'`.
7. Card move-se visualmente para a coluna "Feito".
8. Se conectado, a fila de sync é processada imediatamente (UC19 → UC20).

**Fluxos alternativos:**
- **FA1 — Artesão cancela a câmera:** Sistema aborta a operação; status do pedido permanece `Fazendo`; exibe aviso "Foto obrigatória para concluir o pedido." *(regra rígida, sem bypass — base: Etapa 1, Decisão #7 / RNF12)*.
- **FA2 — Câmera sem permissão:** App exibe diálogo de solicitação de permissão; se negada, operação é abortada com aviso de instrução para habilitar nas configurações do dispositivo.
- **FA3 — Offline:** Passo 6 salva localmente; passo 8 não ocorre; enfileiramento para sync posterior.

**Pós-condições:**
- Pedido no status `Feito`.
- Imagem da obra concluída persistida localmente e associada ao pedido.
- Se obra vinculada for do tipo `unica`, seu status no estoque é atualizado para `Entregue`.

*(base: Etapa 1, Seção 5 / Decisão #7 / RF04, RF05)*

---

### UC07 — Registrar Novo Pedido

**Ator primário:** Artesão  
**Pré-condições:**
- Artesão autenticado.
- (Opcional) Cliente já cadastrado no sistema.

**Fluxo principal:**
1. Artesão aciona "Novo Pedido" (via FAB no Kanban ou menu de navegação).
2. App exibe formulário de novo pedido com campos: canal de origem, descrição, data de entrega.
3. Artesão seleciona o canal de origem (Instagram / WhatsApp / Presencial / Telefone / Outros).
4. **[include UC08]** Artesão seleciona o cliente vinculado ao pedido.
5. Artesão preenche descrição e data de entrega.
6. Artesão confirma o cadastro.
7. App persiste o pedido no SQLite com status `A Fazer` e `status_sync = 'pendente'`.
8. Card aparece na coluna "A Fazer" do Kanban.

**Fluxos alternativos:**
- **FA1 — Cliente não encontrado em UC08:** Sistema oferece ação "Cadastrar novo cliente"; **[extend UC09]** artesão cadastra o cliente; fluxo retorna ao passo 4 com o novo cliente selecionado.
- **FA2 — Artesão anexa foto de referência:** **[extend UC10]** Artesão aciona "Adicionar foto de referência"; câmera é aberta; foto capturada e comprimida é vinculada ao pedido.
- **FA3 — Artesão vincula obra do estoque:** **[extend UC11]** Artesão aciona "Vincular obra"; seleciona obra disponível no estoque; sistema aplica baixa conforme tipo (`unica` → Reservada; `serie` → decremento de quantidade).
- **FA4 — Offline:** Fluxo ocorre integralmente; dados persistidos localmente; sync ocorre quando rede for restabelecida.

**Pós-condições:**
- Pedido criado com status `A Fazer`, vinculado a um cliente.
- Card exibido na coluna "A Fazer" do Kanban.
- (Se FA2) Foto de referência salva localmente e associada ao pedido.
- (Se FA3) Baixa de estoque aplicada conforme tipo da obra.

*(base: Etapa 1, Seção 1 / Seção 3 / RF06, RF07, RF08, RF11, RF12, RF17)*

---

### UC13 — Cadastrar Obra no Estoque

**Ator primário:** Artesão  
**Pré-condições:**
- Artesão autenticado.

**Fluxo principal:**
1. Artesão acessa a tela de Estoque e aciona "Nova Obra".
2. App exibe formulário com campos: nome, tipo (`Única` ou `Em Série`), foto.
3. Artesão preenche o nome e seleciona o tipo.
4. Se tipo = `Em Série`: campo `quantidade` fica obrigatório e visível; artesão informa a quantidade de unidades.
5. (Opcional) Artesão fotografa a obra para o catálogo.
6. Artesão confirma o cadastro.
7. App persiste a obra no SQLite com status inicial `Disponível` e `status_sync = 'pendente'`.
8. Obra aparece na lista de estoque.

**Fluxos alternativos:**
- **FA1 — Tipo `Única`:** Campo `quantidade` oculto/fixado em 1; sem alteração no fluxo.
- **FA2 — Artesão não fotografa:** Obra cadastrada sem foto; ação opcional.
- **FA3 — Offline:** Persiste localmente; sync posterior.

**Pós-condições:**
- Obra disponível no estoque com status `Disponível`.
- Para obras em série: `quantidade > 0`.
- Para obras únicas: disponível para vinculação a um único pedido.

*(base: Etapa 1, Seção 3 / Decisão #8 / RF10)*

---

### UC16 — Cadastrar Evento/Feira

**Ator primário:** Artesão  
**Pré-condições:**
- Artesão autenticado.
- GPS do dispositivo disponível (ou possibilidade de seleção manual no mapa).

**Fluxo principal:**
1. Artesão acessa a tela de Mapa de Eventos e aciona "Novo Evento".
2. App exibe formulário: nome, data, endereço textual, observações.
3. Artesão preenche nome e data.
4. **[include UC17]** App solicita captura de localização: exibe mapa com pin arrastável e opção de usar GPS atual; artesão confirma o ponto.
5. Artesão preenche endereço textual (complemento descritivo) e observações (opcional).
6. Artesão confirma o cadastro.
7. App persiste o evento no SQLite com `status_sync = 'pendente'`.
8. Pin do evento aparece no mapa.

**Fluxos alternativos:**
- **FA1 — GPS indisponível/negado:** App permite posicionamento manual do pin diretamente no mapa; fluxo continua.
- **FA2 — Offline:** Persiste localmente; sync posterior (mapa exibe pins dos eventos locais normalmente).

**Pós-condições:**
- Evento registrado com nome, data, coordenadas, endereço e observações.
- Pin visível no mapa da tela de Eventos.

*(base: Etapa 1, Seção 5 / Passo 0 - A5 / RF15, RF16)*

---

### UC19 — Sincronizar Dados Offline

**Ator primário:** Monitor de Rede (sistema)  
**Atores secundários:** Supabase (banco de dados), Supabase Storage  
**Pré-condições:**
- Existem registros com `status_sync = 'pendente'` na fila local do SQLite.
- Conexão com a internet foi restabelecida (evento detectado pelo listener de rede).

**Fluxo principal:**
1. Monitor de Rede detecta restauração da conectividade.
2. App aciona o serviço de sincronização em segundo plano (sem interromper a navegação do artesão).
3. **[include UC20]** App identifica imagens pendentes de upload; comprime e faz upload para o Supabase Storage; obtém URLs públicas.
4. App lê a fila de operações pendentes (criação/edição de pedidos, clientes, obras, eventos, preços).
5. Para cada operação, app realiza o upsert no Supabase via API, usando o server timestamp gerado pelo Supabase como timestamp oficial do registro.
6. Registro atualizado com `status_sync = 'sincronizado'` no SQLite local.
7. URLs das imagens retornadas pelo Storage são gravadas nos registros correspondentes.

**Fluxos alternativos:**
- **FA1 — Conexão perdida durante sync:** Operações já enviadas são marcadas como `sincronizado`; operações pendentes permanecem na fila; sync retoma quando a rede retornar.
- **FA2 — Erro de upload de imagem:** Operação de imagem retorna para a fila com tentativa futura; não bloqueia sync dos demais registros.
- **FA3 — Fila vazia:** Serviço de sync é acionado mas não executa operações; finaliza silenciosamente.

**Pós-condições:**
- Todos os registros com `status_sync = 'pendente'` foram enviados ao Supabase ou mantidos na fila para nova tentativa.
- Timestamps oficiais (server timestamp) gravados nos registros sincronizados.
- `created_at_local` preservado como metadado separado para rastreabilidade *(base: Etapa 1, Seção 4 / Decisão #2 / RNF04)*.

*(base: Etapa 1, Seção 3 / Seção 4 / RF18, RF19)*

---

# 3. Diagrama de Classes

## 3.1 Diagrama de Classes

### Extração de candidatos a classes

Substantivos dos casos de uso e requisitos:

| Substantivo | Classe candidata | Descartado? |
|-------------|-----------------|-------------|
| Artesão / Usuário | `Usuario` | Não |
| Negócio / Workspace | `Negocio` | Não (RNF10) |
| Cliente | `Cliente` | Não |
| Pedido / Encomenda | `Pedido` | Não |
| Obra / Escultura | `Obra` | Não |
| Preço de Material | `HistoricoPreco` | Não |
| Evento / Feira | `Evento` | Não |
| Fila de Sync | `FilaSync` | Não (infraestrutura) |
| Canal de Origem | `CanalOrigem` | Enum — embutido em `Pedido` |
| Status do Pedido | `StatusPedido` | Enum — embutido em `Pedido` |
| Tipo de Obra | `TipoObra` | Enum — embutido em `Obra` |
| Status da Obra | `StatusObra` | Enum — embutido em `Obra` |
| Status de Sync | `StatusSync` | Enum transversal |
| Item de Pedido | — | **Descartado**: pedido tem exatamente 1 obra opcional; sem lista de itens neste domínio |
| Pagamento | — | **Descartado**: fora do MVP v1 *(base: Etapa 1, Seção 7)* |

---

```mermaid
classDiagram
    class Negocio {
        <<entity>>
        -id: Long
        -nome: String
    }

    class Usuario {
        <<entity>>
        -id: UUID
        -email: String
        -negocioId: Long
    }

    class Cliente {
        <<entity>>
        -id: Long
        -nome: String
        -contato: String
        -statusSync: StatusSync
        -criadoEmLocal: DateTime
        +editar(nome: String, contato: String) void
    }

    class Pedido {
        <<entity>>
        -id: Long
        -descricao: String
        -canalOrigem: CanalOrigem
        -dataEntrega: Date
        -status: StatusPedido
        -fotoReferenciaPath: String
        -fotoConclusaoPath: String
        -statusSync: StatusSync
        -criadoEmLocal: DateTime
        +moverParaFazendo() void
        +concluir(fotoConclusaoPath: String) void
        +editar(descricao: String, dataEntrega: Date) void
        +cancelar() void
        +vincularObra(obraId: Long) void
    }

    class Obra {
        <<entity>>
        -id: Long
        -nome: String
        -tipo: TipoObra
        -quantidade: int
        -statusObra: StatusObra
        -fotoPath: String
        -statusSync: StatusSync
        -criadoEmLocal: DateTime
        +reservar() void
        +liberar() void
        +darBaixa() void
        +adicionarUnidades(qtd: int) void
        +decrementarUnidades() void
        +arquivar() void
    }

    class HistoricoPreco {
        <<entity>>
        -id: Long
        -nomeMaterial: String
        -valor: Decimal
        -data: Date
        -statusSync: StatusSync
        -criadoEmLocal: DateTime
    }

    class Evento {
        <<entity>>
        -id: Long
        -nome: String
        -data: Date
        -endereco: String
        -latitude: Double
        -longitude: Double
        -observacoes: String
        -statusSync: StatusSync
        -criadoEmLocal: DateTime
        +editar(nome: String, data: Date, endereco: String, lat: Double, lng: Double, obs: String) void
    }

    class FilaSync {
        -id: Long
        -tipoOperacao: TipoOperacao
        -entidade: String
        -entidadeId: Long
        -payload: String
        -status: StatusSync
        -criadoEmLocal: DateTime
        +processar() void
        +marcarSincronizado() void
        +marcarErro() void
    }

    class CanalOrigem {
        <<enumeration>>
        INSTAGRAM
        WHATSAPP
        PRESENCIAL
        TELEFONE
        OUTROS
    }

    class StatusPedido {
        <<enumeration>>
        A_FAZER
        FAZENDO
        FEITO
    }

    class TipoObra {
        <<enumeration>>
        UNICA
        SERIE
    }

    class StatusObra {
        <<enumeration>>
        DISPONIVEL
        RESERVADA
        ENTREGUE
        ARQUIVADA
    }

    class StatusSync {
        <<enumeration>>
        PENDENTE
        SINCRONIZADO
        ERRO
    }

    class TipoOperacao {
        <<enumeration>>
        CRIAR
        EDITAR
        DELETAR
    }

    %% --- Relacionamentos ---

    Negocio "1" --> "1" Usuario : pertence a
    Negocio "1" *-- "0..*" Cliente : possui
    Negocio "1" *-- "0..*" Pedido : gerencia
    Negocio "1" *-- "0..*" Obra : possui
    Negocio "1" *-- "0..*" HistoricoPreco : registra
    Negocio "1" *-- "0..*" Evento : agenda

    Cliente "1" -- "0..*" Pedido : origina

    Pedido "0..*" --> "0..1" Obra : vincula

    Pedido --> CanalOrigem
    Pedido --> StatusPedido
    Obra --> TipoObra
    Obra --> StatusObra
    FilaSync --> StatusSync
    FilaSync --> TipoOperacao
```

### Notas sobre relações

| Relação | Tipo | Justificativa |
|---------|------|---------------|
| `Negocio *-- Cliente/Pedido/Obra/HistoricoPreco/Evento` | Composição | Dados não existem sem o `Negocio`; exclusão do negócio implica exclusão em cascata *(base: RNF10)* |
| `Negocio --> Usuario` | Associação 1–1 (MVP) | Arquitetura permite 1–N no futuro; cardinalidade reflete apenas o MVP *(base: Etapa 1, Decisão #3)* |
| `Cliente -- Pedido` | Associação 1–0..* | Pedido pertence a um cliente; cliente pode existir sem pedidos |
| `Pedido --> Obra` | Associação 0..*–0..1 | Pedido pode ou não estar vinculado a uma obra do estoque; para `UNICA`, regra de negócio em `Obra.reservar()` limita a 1 vínculo ativo; para `SERIE`, múltiplos pedidos podem referenciar a mesma obra |

### Restrições de negócio nos métodos de `Obra`

| Método | Regra |
|--------|-------|
| `reservar()` | Válido somente se `tipo = UNICA` e `statusObra = DISPONIVEL`; lança exceção caso contrário |
| `liberar()` | Válido somente se `tipo = UNICA` e `statusObra = RESERVADA` |
| `darBaixa()` | Válido somente se `tipo = UNICA`; muda `statusObra` para `ENTREGUE` |
| `decrementarUnidades()` | Válido somente se `tipo = SERIE` e `quantidade > 0` |
| `adicionarUnidades(qtd)` | Válido somente se `tipo = SERIE` e `qtd > 0` *(base: Passo 0 - A2 / RF24)* |
| `arquivar()` | Bloqueado se obra está vinculada a pedido com `status != FEITO` *(base: RF25)* |

### Restrições de negócio nos métodos de `Pedido`

| Método | Regra |
|--------|-------|
| `moverParaFazendo()` | Válido somente se `status = A_FAZER` |
| `concluir(fotoConclusaoPath)` | Válido somente se `status = FAZENDO` e `fotoConclusaoPath` não nulo/vazio *(regra rígida — base: Etapa 1, Decisão #7 / RNF12)* |
| `editar(...)` | Válido somente se `status = A_FAZER` *(base: RF22)* |
| `cancelar()` | Disponível em qualquer status, com confirmação explícita; dispara `Obra.liberar()` se obra `UNICA` estiver vinculada *(base: RF23)* |
| `vincularObra(obraId)` | Válido somente se `status = A_FAZER`; delega regra de baixa ao tipo da obra |

## 3.2 Tabela de Persistência

| Classe | Persistente? | Estratégia | Observação |
|--------|-------------|-----------|------------|
| `Negocio` | Sim | SQLite: `negocios`; Supabase: `negocios`; PK `id` BIGINT | Scoping de todos os dados do artesão *(base: RNF10)* |
| `Usuario` | Sim (parcial) | Gerenciado pelo Supabase Auth (`auth.users`); tabela `profiles` no Supabase com FK para `auth.users.id` (UUID); **somente remota** — não replicada no SQLite local | ID = UUID do Supabase Auth *(base: Etapa 1, Seção 4)* |
| `Cliente` | Sim | SQLite: `clientes`; Supabase: `clientes`; PK `id`, FK `negocio_id` | Offline-first *(base: Etapa 1, Seção 3)* |
| `Pedido` | Sim | SQLite: `pedidos`; Supabase: `pedidos`; PK `id`, FK `cliente_id`, FK `obra_id` (nullable), FK `negocio_id` | Fotos: path local (`foto_referencia_path`, `foto_conclusao_path`) + URL remota pós-sync (`foto_referencia_url`, `foto_conclusao_url`) *(base: Etapa 1, Seção 5)* |
| `Obra` | Sim | SQLite: `estoque_obras`; Supabase: `obras`; PK `id`, FK `negocio_id`; colunas `tipo` (enum string), `quantidade` INT, `status_obra` (enum string) *(base: Etapa 1, Seção 3 / Decisão #8)* | Foto: path local + URL remota pós-sync |
| `HistoricoPreco` | Sim | SQLite: `historico_materiais_precos`; Supabase: `historico_materiais`; PK `id`, FK `negocio_id` | Append-only por padrão; exclusão pontual possível *(base: Passo 0 - A1 / RF26)* |
| `Evento` | Sim | SQLite: `eventos`; Supabase: `eventos`; PK `id`, FK `negocio_id`; colunas `latitude` DOUBLE, `longitude` DOUBLE *(base: Etapa 1, Seção 5)* | — |
| `FilaSync` | Sim (local only) | SQLite: `fila_sync`; **não replicada no Supabase** — tabela de controle interno de sync; colunas `tipo_operacao`, `entidade`, `entidade_id`, `payload` JSON, `status` enum string, `criado_em_local` | *(base: Etapa 1, Seção 3)* |
| `CanalOrigem` | Não (enum) | Coluna `canal_origem` TEXT em `pedidos`; valores: `INSTAGRAM`, `WHATSAPP`, `PRESENCIAL`, `TELEFONE`, `OUTROS` | *(base: Passo 0 - A3 / RF07)* |
| `StatusPedido` | Não (enum) | Coluna `status` TEXT em `pedidos`; valores: `A_FAZER`, `FAZENDO`, `FEITO` | — |
| `TipoObra` | Não (enum) | Coluna `tipo` TEXT em `estoque_obras` / `obras`; valores: `UNICA`, `SERIE` | *(base: Etapa 1, Decisão #8)* |
| `StatusObra` | Não (enum) | Coluna `status_obra` TEXT em `estoque_obras` / `obras`; valores: `DISPONIVEL`, `RESERVADA`, `ENTREGUE`, `ARQUIVADA` | `RESERVADA` válido somente para `tipo = UNICA` |
| `StatusSync` | Não (enum) | Coluna `status_sync` TEXT em todas as tabelas offline-first; valores: `PENDENTE`, `SINCRONIZADO`, `ERRO` | *(base: Etapa 1, Seção 3)* |
| `TipoOperacao` | Não (enum) | Coluna `tipo_operacao` TEXT em `fila_sync`; valores: `CRIAR`, `EDITAR`, `DELETAR` | — |

### Campo `created_at_local` (transversal)

Todas as tabelas offline-first (`clientes`, `pedidos`, `estoque_obras`, `historico_materiais_precos`, `eventos`) possuem a coluna `created_at_local DATETIME` preenchida pelo dispositivo no momento da criação. Usada **exclusivamente para rastreabilidade** — não substitui o server timestamp como critério de desempate em conflitos *(base: Etapa 1, Seção 4 / Decisão #2 / RNF04)*.

## 3.3 Diagrama Entidade-Relacionamento (DER)

Este diagrama materializa a visão relacional do banco de dados (SQLite local e Supabase remoto), derivada da Tabela de Persistência (Seção 3.2).

As cardinalidades foram estritamente alinhadas com as multiplicidades do Diagrama de Classes (Seção 3.1):
- `Negocio` possui relação `1:N` forte com as entidades operacionais, estabelecendo o escopo de permissões (RLS no Supabase).
- `Cliente` possui `1:N` com `Pedido`.
- `Obra` possui `1:N` opcional com `Pedido` (no banco, materializado como a chave estrangeira nula `obra_id` na tabela `PEDIDO`), já que obras em série podem estar em vários pedidos e um pedido não obrigatoriamente tem uma obra desde o momento da criação.
- `FilaSync` é uma tabela estritamente local (sem contraparte no Supabase) e se relaciona com as demais entidades de forma polimórfica (via `entidade` + `entidade_id`), sem restrição de chave estrangeira (FK) estrita no nível do banco.
- Valores enumerados (`CanalOrigem`, `StatusPedido`, etc.) foram persistidos como colunas descritivas (strings) dentro de suas respectivas tabelas.

```mermaid
erDiagram
    NEGOCIO ||--|| USUARIO_PROFILE : "pertence a (MVP)"
    NEGOCIO ||--o{ CLIENTE : possui
    NEGOCIO ||--o{ PEDIDO : gerencia
    NEGOCIO ||--o{ OBRA : possui
    NEGOCIO ||--o{ HISTORICO_PRECO : registra
    NEGOCIO ||--o{ EVENTO : agenda
    
    CLIENTE ||--o{ PEDIDO : origina
    OBRA |o--o{ PEDIDO : vincula

    NEGOCIO {
        bigint id PK
        string nome
    }
    
    USUARIO_PROFILE {
        uuid id PK "FK para auth.users.id (Supabase)"
        bigint negocio_id FK
        string email
    }
    
    CLIENTE {
        bigint id PK
        bigint negocio_id FK
        string nome
        string contato
        string status_sync "enum"
        datetime criado_em_local
    }
    
    PEDIDO {
        bigint id PK
        bigint negocio_id FK
        bigint cliente_id FK
        bigint obra_id FK "nullable"
        string descricao
        string canal_origem "enum"
        date data_entrega
        string status "enum"
        string foto_referencia_path
        string foto_conclusao_path
        string status_sync "enum"
        datetime criado_em_local
    }
    
    OBRA {
        bigint id PK
        bigint negocio_id FK
        string nome
        string tipo "enum (UNICA/SERIE)"
        int quantidade
        string status_obra "enum"
        string foto_path
        string status_sync "enum"
        datetime criado_em_local
    }
    
    HISTORICO_PRECO {
        bigint id PK
        bigint negocio_id FK
        string nome_material
        decimal valor
        date data
        string status_sync "enum"
        datetime criado_em_local
    }
    
    EVENTO {
        bigint id PK
        bigint negocio_id FK
        string nome
        date data
        string endereco
        double latitude
        double longitude
        string observacoes
        string status_sync "enum"
        datetime criado_em_local
    }
    
    FILA_SYNC {
        bigint id PK
        string tipo_operacao "enum"
        string entidade "associação polimórfica"
        bigint entidade_id "associação polimórfica"
        string payload "json"
        string status "enum"
        datetime criado_em_local
    }
```

*(base: Etapa 1, Seções 3 e 4; restrições derivadas da Seção 3)*

---

# 4. Diagrama de Objetos

## 4.1 Diagrama de Instâncias (Snapshot)

Este diagrama representa um instantâneo (snapshot) em tempo de execução do sistema, materializando as classes definidas na Seção 3.

**Cenário ilustrado:**
O negócio "Arte em Madeira Silva" (`negocio1`) possui um cliente cadastrado (`clienteJoao`) que realizou dois pedidos.
- O `pedido101` (A Fazer/Fazendo) está vinculado a uma obra exclusiva (`obraAguia`), cujo tipo é `UNICA`. Por conta desse vínculo ativo, o status da obra reflete `RESERVADA`.
- O `pedido102` (Feito) foi uma venda presencial de uma obra repetível (`obraCoruja`), do tipo `SERIE`. A obra continua com status `DISPONIVEL` e a quantidade restante é 4, pois a baixa do estoque nesse tipo ocorre por decremento da quantidade, não por retenção de estado.

```mermaid
classDiagram
    class negocio1 {
        <<instance>>
        id = 1
        nome = "Arte em Madeira Silva"
    }

    class clienteJoao {
        <<instance>>
        id = 42
        nome = "João da Silva"
        contato = "(11) 99999-9999"
    }

    class pedido101 {
        <<instance>>
        id = 101
        descricao = "Escultura de Águia personalizada"
        canalOrigem = "WHATSAPP"
        status = "FAZENDO"
    }

    class pedido102 {
        <<instance>>
        id = 102
        descricao = "Coruja de prateleira (pronta entrega)"
        canalOrigem = "PRESENCIAL"
        status = "FEITO"
    }

    class obraAguia {
        <<instance>>
        id = 201
        nome = "Águia de Asas Abertas"
        tipo = "UNICA"
        quantidade = 1
        statusObra = "RESERVADA"
    }

    class obraCoruja {
        <<instance>>
        id = 202
        nome = "Coruja Pequena"
        tipo = "SERIE"
        quantidade = 4
        statusObra = "DISPONIVEL"
    }

    %% Composições (Tudo pertence ao negócio)
    negocio1 *-- clienteJoao
    negocio1 *-- pedido101
    negocio1 *-- pedido102
    negocio1 *-- obraAguia
    negocio1 *-- obraCoruja

    %% Associações Cliente <-> Pedido
    clienteJoao -- pedido101
    clienteJoao -- pedido102

    %% Associações Pedido -> Obra
    pedido101 --> obraAguia
    pedido102 --> obraCoruja
```

### Validação de Cardinalidades e Relações

- A **composição** `Negocio *-- [Entidades]` prova que todos os registros estão atrelados ao espaço (tenant) do artesão, satisfazendo o isolamento de dados do MVP (RNF03, RNF10).
- A **associação** `Cliente -- Pedido` demonstra que um cliente pode originar vários pedidos distintos simultaneamente (associação 1 para muitos do lado do Cliente).
- A **associação** `Pedido --> Obra` (1 para 0..1 do lado do Pedido) reflete corretamente que o Pedido aponta para a obra, com o modelo suportando as distinções vitais das regras de negócio (Passo 0 - A2): obras únicas seguram seu status em `RESERVADA`, enquanto obras em série apenas operam por decremento da `quantidade` e continuam `DISPONIVEL` para outros pedidos.

*(base: Seção 3, Seção 3.3 e validações estruturais do Passo 0)*

---

# 5. Diagrama de Estados

Conforme definido nas etapas anteriores (Passo 0, Tabela de Persistência e regras de negócio da Seção 3), duas entidades deste domínio possuem um ciclo de vida complexo o suficiente para justificar a modelagem detalhada de estados: **Pedido** e **Obra**.

## 5.1 Ciclo de Vida do Pedido

Este diagrama detalha as transições do atributo `status` (enum `StatusPedido`) da entidade `Pedido`.

A regra rígida documentada (RF05 / RNF12 / Decisão #7 da Etapa 1) — exigência obrigatória de fotografia da obra concluída — atua como a **condição de guarda** (`[possui foto de conclusão]`) na transição de `FAZENDO` para `FEITO`. O cancelamento (RF23) encerra a vida do objeto, levando-o ao estado final (deleção física ou deleção lógica não visível).

```mermaid
stateDiagram-v2
    [*] --> A_FAZER : registrarNovoPedido()
    
    A_FAZER --> FAZENDO : moverParaFazendo()
    A_FAZER --> [*] : cancelar() / removerRegistro()
    
    FAZENDO --> FEITO : concluir() [possui foto de conclusão]
    FAZENDO --> [*] : cancelar() / removerRegistro()
    
    FEITO --> [*] : arquivamento automático (estado final útil)
```

*(base: Etapa 1, Decisão #7; RF03, RF04, RF05, RF23)*

## 5.2 Ciclo de Vida da Obra

Este diagrama detalha as transições do atributo `status_obra` (enum `StatusObra`) da entidade `Obra`.

O fluxo é fortemente bifurcado pelas regras de tipo de obra (RF11 / Passo 0 - A2):
- Somente obras do tipo `UNICA` transitam pelo estado transitório `RESERVADA` (assumindo exclusividade de um vínculo com Pedido). Quando o pedido associado é concluído, transita para `ENTREGUE`. Se o pedido é cancelado, retorna a `DISPONIVEL`.
- Obras do tipo `SERIE` operam apenas por manipulação do atributo `quantidade` permanecendo no estado `DISPONIVEL` para múltiplos pedidos (decremento de estoque) até serem descontinuadas/arquivadas pelo artesão.

```mermaid
stateDiagram-v2
    [*] --> DISPONIVEL : cadastrarObra()
    
    DISPONIVEL --> RESERVADA : reservar() [tipo == UNICA e pedido associado]
    DISPONIVEL --> DISPONIVEL : decrementarUnidades() [tipo == SERIE]
    DISPONIVEL --> ARQUIVADA : arquivar() / removerRegistro()
    
    RESERVADA --> ENTREGUE : darBaixa() [pedido associado muda p/ FEITO]
    RESERVADA --> DISPONIVEL : liberar() [pedido associado muda p/ Cancelado]
    
    ENTREGUE --> [*]
    ARQUIVADA --> [*]
```

*(base: Passo 0 - A2; RF11, RF24, RF25; restrições dos métodos da classe Obra da Seção 3)*

---

# 6. Classes de Fronteira, Controle e Entidade (Boundary-Control-Entity)

Esta etapa reclassifica os elementos levantados até aqui na visão da Análise BCE (Boundary-Control-Entity), preparando o terreno para as camadas de Clean Architecture (Boundary = Interface Adapters / Control = Application / Entity = Domain).

## 6.1 Mapeamento BCE por Caso de Uso Principal

| Caso de Uso (UC) | Boundary (Telas / Triggers) | Control (Use Cases / Services) | Entities Envolvidas |
|------------------|----------------------------|--------------------------------|----------------------|
| UC01 Realizar Login | `TelaLogin` | `AuthUseCase` | `Usuario` (remoto) |
| UC03 Visualizar Kanban | `TelaKanban` | `ConsultarPedidosUseCase` | `Pedido`, `Cliente`, `Obra` |
| UC05 Concluir Pedido | `TelaKanban`, `CameraView` | `ConcluirPedidoUseCase` | `Pedido`, `Obra` |
| UC07 Registrar Novo Pedido | `TelaNovoPedido`, `CameraView` (opcional) | `CadastrarPedidoUseCase` | `Pedido`, `Cliente`, `Obra` |
| UC09 Cadastrar Cliente | `TelaNovoCliente` | `CadastrarClienteUseCase` | `Cliente` |
| UC12 Consultar Estoque | `TelaEstoque` | `ConsultarEstoqueUseCase` | `Obra` |
| UC13 Cadastrar Obra | `TelaNovaObra`, `CameraView` (opcional) | `CadastrarObraUseCase` | `Obra` |
| UC14 Registrar Preço | `TelaHistoricoPrecos` | `RegistrarPrecoUseCase` | `HistoricoPreco` |
| UC16 Cadastrar Evento | `TelaNovoEvento`, `MapaView` | `CadastrarEventoUseCase` | `Evento` |
| UC19 Sincronizar Dados | `SyncServiceWorker` (Background) | `SincronizarDadosUseCase` | `FilaSync`, `Pedido`, `Cliente`, `Obra`, `Evento`, `HistoricoPreco` |

*(base: Seções 2 e 3)*

## 6.2 Diagramas de Robustez

Os diagramas abaixo ilustram o fluxo de responsabilidade Ator → Boundary → Control → Entity, simplificando a visualização de quem chama quem.

### Fluxo 1: UC05 Concluir Pedido (Fazendo → Feito)

Demonstra a restrição (RNF12) de uso obrigatório da câmera antes que a lógica de aplicação altere o status da entidade Pedido, que por sua vez altera o status da Obra associada.

> **Tarefa 12 — diagrama corrigido** (versão original quebrava o parser por parênteses sem aspas em `|concluir(foto)|`; substituído pela versão validada).

```mermaid
flowchart LR
    Ator((Artesão))
    B1[TelaKanban «boundary»]
    B2[CameraView «boundary»]
    C[ConcluirPedidoUseCase «control»]
    E1[Pedido «entity»]
    E2[Obra «entity»]

    Ator -->|Clica mover p/ Feito| B1
    B1 -->|Exige foto| B2
    Ator -->|Captura foto| B2
    B2 -->|Confirma foto| C
    C -->|"concluir(foto)"| E1
    C -->|"darBaixa()"| E2
```

### Fluxo 2: UC07 Registrar Novo Pedido

Demonstra o fluxo de cadastro envolvendo o vínculo com cliente (existente ou novo) e a seleção opcional de uma obra do catálogo.

```mermaid
flowchart LR
    Ator((Artesão))
    B1[TelaNovoPedido «boundary»]
    B2[TelaNovoCliente «boundary»]
    C1[CadastrarPedidoUseCase «control»]
    C2[CadastrarClienteUseCase «control»]
    E1[Pedido «entity»]
    E2[Cliente «entity»]
    E3[Obra «entity»]

    Ator -->|Abre formulário| B1
    Ator -.->|UC09: Se cliente não existir| B2
    B2 -.->|Cadastra| C2
    C2 -.->|Cria| E2
    
    Ator -->|Preenche dados e seleciona| B1
    B1 -->|Submete formulário| C1
    
    C1 -->|Cria| E1
    C1 -->|Vincula| E2
    C1 -->|Reserva / Decrementa qtd| E3
```

*(base: Seção 2 — Fluxos Alternativos e Inclusões; Seção 3 — Restrições de métodos)*

---

# 7. Diagrama de Sequência

Os diagramas de sequência abaixo expandem a visão de robustez (Seção 6), inserindo a linha do tempo, retornos síncronos, os participantes de infraestrutura (Repositórios e Fila de Sync do SQLite) e os fragmentos de condição (`alt`) que executam as regras de negócio de domínio (TDD/Clean Architecture).

## 7.1 UC05 — Concluir Pedido (Fazendo → Feito)

Demonstra a validação rigorosa da foto e o enfileiramento offline.

```mermaid
sequenceDiagram
    actor Artesao as Artesão
    participant Tela as TelaKanban «boundary»
    participant Cam as CameraView «boundary»
    participant UC as ConcluirPedidoUseCase «control»
    participant Pedido as Pedido «entity»
    participant Obra as Obra «entity»
    participant Repo as SQLiteRepository «adapter»
    participant Fila as FilaSync «adapter»

    Artesao ->> Tela: aciona "Mover para Feito"
    Tela ->> Cam: abrirCamera()
    
    alt Artesão cancela captura
        Artesao -->> Cam: fechar()
        Cam -->> Tela: null
        Tela -->> Artesao: erro ("Foto obrigatória")
    else Captura realizada
        Artesao ->> Cam: fotografar()
        Cam -->> Tela: fotoConclusaoPath
        
        Tela ->> UC: concluirPedido(pedidoId, fotoConclusaoPath)
        UC ->> Repo: buscarPedido(pedidoId)
        Repo -->> UC: Pedido
        
        UC ->> Pedido: concluir(fotoConclusaoPath)
        Pedido -->> UC: ok
        
        alt pedido possui Obra UNICA vinculada
            UC ->> Repo: buscarObra(pedido.obraId)
            Repo -->> UC: Obra
            UC ->> Obra: darBaixa()
            Obra -->> UC: status = ENTREGUE
            UC ->> Repo: salvar(Obra)
        end
        
        UC ->> Repo: salvar(Pedido)
        UC ->> Fila: enfileirar(EDITAR, "Pedido", pedidoId, payload)
        
        UC -->> Tela: sucesso
        Tela -->> Artesao: exibe card na coluna "Feito"
    end
```

## 7.2 UC07 — Registrar Novo Pedido

Demonstra o cadastro de um pedido com seleção de cliente e a bifurcação de regra de negócio (reserva vs. baixa) dependendo do tipo da obra selecionada do estoque.

```mermaid
sequenceDiagram
    actor Artesao as Artesão
    participant Tela as TelaNovoPedido «boundary»
    participant UC as CadastrarPedidoUseCase «control»
    participant Pedido as novoPedido: Pedido «entity»
    participant Obra as ObraEstoque «entity»
    participant Repo as SQLiteRepository «adapter»
    participant Fila as FilaSync «adapter»

    Artesao ->> Tela: preenche dados + seleciona Cliente
    
    opt Seleciona obra do catálogo
        Artesao ->> Tela: seleciona obraId
    end
    
    Artesao ->> Tela: confirmar()
    Tela ->> UC: cadastrarPedido(dados, obraId)
    
    UC ->> Pedido: new Pedido(dados)
    
    alt obraId informado
        UC ->> Repo: buscarObra(obraId)
        Repo -->> UC: ObraEstoque
        
        alt tipo == UNICA
            UC ->> ObraEstoque: reservar()
            ObraEstoque -->> UC: status = RESERVADA
        else tipo == SERIE
            UC ->> ObraEstoque: decrementarUnidades()
            ObraEstoque -->> UC: quantidade -= 1
        end
        
        UC ->> Pedido: vincularObra(obraId)
        UC ->> Repo: salvar(ObraEstoque)
    end
    
    UC ->> Repo: salvar(novoPedido)
    UC ->> Fila: enfileirar(CRIAR, "Pedido", novoPedido.id, payload)
    
    UC -->> Tela: sucesso
    Tela -->> Artesao: redireciona p/ Kanban ("A Fazer")
```

*(base: Seção 2 - fluxos principais; Seção 3 - restrições de métodos; RF05, RF11, RF18)*

---

# 8. Diagrama de Atividades

Para o Diagrama de Atividades, foi escolhido o fluxo mais crítico e complexo do aplicativo: **Operações Offline e Sincronização Automática (UC19 + UC20)**.

O diagrama demonstra o padrão "Offline-First" adotado pelo sistema (RNF02). Ele divide as responsabilidades em raias (swimlanes conceituais) demonstrando como a interface de usuário (UI) não é bloqueada pela rede, e como o processamento em background (worker) se recupera de estados sem conectividade, resolvendo também a dependência de upload de imagens (Storage) antes de atualizar os dados relacionais (Database).

## 8.1 Atividade: Operação e Sincronização Offline-First

> **Tarefa 12 — diagrama corrigido** (versão original usava `\n` literal e rótulos com parênteses sem aspas; substituído pela versão validada com `<br/>` e aspas duplas).

```mermaid
flowchart TD
    %% Definição das Raias (Swimlanes visuais através de subgraphs)
    
    subgraph UI [Frontend / Ações do Artesão]
        A([Artesão realiza ação de gravação<br/>ex: Concluir Pedido, Novo Cliente])
        E([Sucesso imediato na UI<br/>Artesão continua uso normal])
    end

    subgraph Local [Infraestrutura Local / SQLite]
        B[Salva entidade na tabela local<br/>com status_sync = 'pendente']
        C[Grava registro de log na<br/>tabela FilaSync]
        L[Marca registro na FilaSync e<br/>na Entidade como 'sincronizado']
    end

    subgraph Worker [Worker de Sincronização em Background]
        D{Dispositivo possui<br/>conexão com internet?}
        F[Pausa processamento e aguarda<br/>notificação do Monitor de Rede]
        G[Lê registros 'pendentes'<br/>da FilaSync]
        H{Operação contém<br/>foto/imagem local?}
        I[Prepara payload final e<br/>dispara Upsert para a API]
        M{Ocorreu erro de<br/>rede ou permissão?}
    end

    subgraph Nuvem [Supabase Backend]
        J[Supabase Storage:<br/>Faz upload da foto e retorna URL pública]
        K["Supabase Database:<br/>Aplica regras (RLS), gera Server Timestamp<br/>e persiste no Postgres"]
    end

    %% Fluxo Imediato (Bloqueante apenas para o banco local)
    A --> B
    B --> C
    C --> E
    
    %% Fluxo Assíncrono (Desacoplado)
    C -.->|Gatilho assíncrono| D
    
    %% Decisão de Rede
    D -- "Não (Offline)" --> F
    F -.->|Gatilho: Rede restabelecida| D
    
    D -- "Sim (Online)" --> G
    G --> H
    
    %% Fluxo de Imagens
    H -- Sim --> J
    J -- Sucesso --> I
    J -- Erro --> M
    
    %% Bypass de Imagens
    H -- Não --> I
    
    %% Integração com Banco Remoto
    I --> K
    K -- Sucesso --> L
    K -- Erro --> M
    
    %% Tratamento de Erros
    M -- Sim --> N["Marca erro transitório na FilaSync<br/>(Tenta novamente na próxima janela)"]
    N --> F
    
    %% Fim do processo
    L --> Z([Fim da Sincronização para o Registro])
    
    %% Estilização base para destacar nós de fim
    classDef endNode fill:#2d3748,color:#fff,stroke-width:2px,stroke:#a0aec0;
    class E,Z endNode;
```

### Análise de Decisões e Paralelismo
- **Desacoplamento UI/Sync:** A passagem `C --> E` garante que a percepção de performance (RNF01) seja atingida independentemente da nuvem.
- **Precedência de Recursos (Storage antes do DB):** O nó `H` demonstra uma orquestração vital: se a operação for concluir um pedido, a imagem é enviada para o Storage (`J`) *antes* de o pedido ser atualizado no Database (`K`). O payload final para o Postgres já deve conter a URL remota obtida no passo anterior.
- **Server Timestamp e Consistência (RNF04):** A gravação oficial na nuvem (`K`) utiliza os timestamps do servidor para resolver eventuais conflitos (em cenários onde o usuário utilizou múltiplos aparelhos offline antes de reconectar). O tempo `criado_em_local` viaja junto apenas para auditoria na UI, não interferindo na cronologia do banco de dados remoto.

*(base: Etapa 1 - Seção 3 e 4; UC19, UC20)*

---

# 9. Diagrama de Componentes

Este diagrama detalha a **arquitetura tecnológica** do sistema (proposta na Etapa 1), separando logicamente as responsabilidades do aplicativo mobile no dispositivo (isolado em camadas via *Clean Architecture*) da infraestrutura em nuvem (BaaS Supabase).

A modelagem enfatiza o caráter "Offline-First", evidenciando que as lógicas de negócio operam diretamente contra a Infraestrutura Local (`SQLite` e `File System`), enquanto um componente assíncrono especializado (`Sync Worker`) faz a ponte entre os Repositórios Locais e as APIs Remotas.

## 9.1 Arquitetura Macro e Integrações

> **Tarefa 12 — diagrama corrigido** (versão original usava `\n` literal e rótulos com parênteses sem aspas; substituído pela versão validada com `<br/>` e aspas duplas).

```mermaid
flowchart TD
    Artesao(("Artesão<br/>(Usuário)"))

    subgraph MobileApp ["Aplicação Mobile / Dispositivo (Expo - React Native)"]
        
        subgraph Presentation [Camada de Apresentação]
            Telas[Telas e Componentes de UI]
            Hooks[Hooks e Gerência de Estado]
        end

        subgraph ApplicationDomain ["Núcleo da Aplicação (Application / Domain)"]
            UseCases["Casos de Uso<br/>(Lógica da Aplicação)"]
            Entities[Entidades e Regras de Negócio]
        end

        subgraph InterfaceAdapters [Adaptadores de Interface]
            Repo[Repositórios Locais]
            SyncWorker[Worker de Sincronização<br/>em Background]
            NetListener[Monitor de Conectividade]
            SupabaseAdapter[Adaptadores REST API / SDK]
        end
        
        subgraph LocalInfra ["Infraestrutura Local (Offline-First)"]
            SQLite[(SQLite Database<br/>Dados Relacionais)]
            FS[Expo File System<br/>Cache de Imagens]
        end

        %% Fluxo interno da arquitetura Limpa
        Telas --> Hooks
        Hooks --> UseCases
        UseCases --> Entities
        UseCases --> Repo
        
        %% Gravação Local
        Repo --> SQLite
        Repo --> FS
        
        %% Mecânica de Sincronização
        NetListener -.->|"Gatilho (Online)"| SyncWorker
        SyncWorker --> Repo
        SyncWorker --> SupabaseAdapter
    end

    subgraph BackendCloud ["Backend as a Service (Supabase)"]
        S_Auth["Supabase Auth<br/>(Gestão de Sessão e Identidade)"]
        S_DB[(Supabase Database<br/>PostgreSQL + Regras RLS)]
        S_Storage["Supabase Storage<br/>(Buckets para Fotos de Obras e Referências)"]
    end

    %% Integrações com a Nuvem
    Artesao -->|"Interação (Toque/Gestos)"| Telas
    Hooks -->|Login/Logout Direto| S_Auth
    SupabaseAdapter -->|"Sincronização Assíncrona (Criação, Edição, Deleção)"| S_DB
    SupabaseAdapter -->|Upload Compressado| S_Storage

    %% Estilização
    classDef cloud fill:#e6f7ff,stroke:#69c0ff,stroke-width:2px;
    classDef localinfra fill:#f6ffed,stroke:#b7eb8f,stroke-width:2px;
    
    class BackendCloud cloud;
    class LocalInfra localinfra;
```

### Componentes Chave

1. **Camada de Apresentação:** React Native com Expo, consumindo os `UseCases` sem conhecer os bancos de dados locais diretamente.
2. **Repositórios Locais (`Repo`):** São a única fonte de verdade síncrona do App. A UI lê e escreve exclusivamente aqui.
3. **Monitor de Conectividade (`NetListener`):** Escuta mudanças no sistema operacional do celular (modo avião, perda de sinal) e sinaliza a UI (para exibir o banner de offline - RF20) ou aciona o `SyncWorker`.
4. **Worker de Sincronização (`SyncWorker`):** Lê a `FilaSync` (dentro do SQLite), compacta as imagens salvas no `FS` e aciona os `SupabaseAdapters`.
5. **PostgreSQL com RLS (`S_DB`):** O backend recebe operações do aplicativo, checa o token de identidade e, baseado no `id` do usuário atrelado à tabela `Negocio`, permite (ou nega) as transações, garantindo o RNF03.

*(base: Etapa 1 - Seção 2, 3, 4, 5 e 6)*

---

# 10. Implementação: DDD, Clean Architecture, TDD

Para garantir a manutenibilidade (RNF09) e a robustez testável do sistema "Offline-First", as seguintes orientações devem guiar o momento da escrita do código.

## 10.1 Estrutura de Pastas (Clean Architecture)

A organização do projeto deve seguir rigorosamente a separação de responsabilidades. A regra de ouro é: **dependências apontam sempre para o centro** (Domain). A camada `domain` não pode importar ABSOLUTAMENTE NADA de pacotes externos, bibliotecas de UI (React) ou SDKs de banco (Supabase, SQLite).

```text
src/
 ├── core/
 │   ├── domain/               # O coração da aplicação (TDD Primeira fase)
 │   │   ├── entities/         # Classes puras: Obra, Pedido, Cliente (c/ regras de negócio)
 │   │   ├── enums/            # StatusPedido, TipoObra, etc.
 │   │   └── errors/           # Exceções de domínio (ex: ObraInvalidaError)
 │   │
 │   └── application/          # Casos de Uso (TDD Segunda fase)
 │       ├── usecases/         # ConcluirPedidoUseCase, CadastrarObraUseCase
 │       └── repositories/     # Interfaces (contratos) dos repositórios (ex: IPedidoRepository)
 │
 ├── infrastructure/           # Implementação dos contratos (Adapters)
 │   ├── database/
 │   │   ├── sqlite/           # Implementação dos repositórios usando expo-sqlite
 │   │   └── supabase/         # Integração com backend (SupabaseClient)
 │   ├── fileSystem/           # Implementação de compressão/salvamento (expo-file-system)
 │   └── sync/                 # Worker de sincronização e monitor de rede
 │
 ├── presentation/             # React Native / Expo UI
 │   ├── components/           # Componentes visuais "burros" (Botões, Inputs, Cards)
 │   ├── screens/              # Telas conectadas aos Casos de Uso (Kanban, Estoque)
 │   ├── hooks/                # Gerência de estado local / Context API
 │   └── navigation/           # Rotas do app
 │
 └── main/                     # Ponto de entrada e Injeção de Dependência (Factories)
     └── factories/            # Monta os Casos de Uso instanciando os Repositórios reais
```

## 10.2 Orientação para TDD (Test-Driven Development)

A implementação deve ser orientada a testes, começando pelo núcleo e expandindo para as bordas, seguindo esta ordem estrita:

1. **Fase 1: Testes de Entidade (Domain)**
   - Escreva testes para instanciar a entidade `Obra` e verificar os métodos `reservar()` e `decrementarUnidades()`.
   - Assegure que exceções de negócio sejam lançadas ao violar restrições (ex: tentar reservar uma obra do tipo `SERIE` ou tentar concluir `Pedido` sem foto).
2. **Fase 2: Testes de Caso de Uso (Application)**
   - Escreva testes para `ConcluirPedidoUseCase` usando repositórios em memória (mocks criados com Jest).
   - Valide orquestração: se a regra da foto funciona e se `Obra.darBaixa()` é chamada corretamente via caso de uso, verificando se o repositório é chamado no final.
3. **Fase 3: Testes de Repositório (Infrastructure)**
   - Teste as queries do SQLite para operações CRUD.
   - Valide estritamente o gatilho de enfileiramento (garantir a adição do status `pendente` e a inserção na `FilaSync`).

## 10.3 Padrões de Projeto Exigidos

- **Repository Pattern:** O App NUNCA deve fazer queries do SQLite diretamente dentro de Hooks do React ou Telas. A UI chama os *UseCases*, que interagem com as interfaces genéricas dos repositórios.
- **Dependency Injection (Inversão de Dependência):** Instancie o repositório concreto do SQLite na pasta `main/factories/` e injete nos *UseCases* via construtor. Isso permite rodar testes unitários rápidos na camada Application passando *in-memory repositories*.
- **Desacoplamento Offline-First:** As camadas de repositório devem responder imediatamente com sucesso à UI após a gravação local (SQLite). A comunicação de falha ou latência de rede fica encapsulada e isolada apenas no Worker de Sincronização em background.

## 10.4 Checklist para a Fase de Código (Próxima Etapa)

O desenvolvimento deverá ser iniciado respeitando o seguinte fluxo:
- [ ] **1. Setup:** Instanciar o app via Expo (`npx create-expo-app`), configurar TypeScript, ESLint e Jest.
- [ ] **2. Domínio:** Codificar e testar a camada `core/domain` (Entidades e Regras de Negócio).
- [ ] **3. Aplicação:** Codificar e testar a camada `core/application` (Casos de Uso e interfaces).
- [ ] **4. Infra local:** Configurar esquema do SQLite e testes de persistência.
- [ ] **5. Apresentação (UI):** Desenvolver telas e componentes conectando com `main/factories`.
- [ ] **6. Nuvem & Sync:** Configurar projeto Supabase (Tabelas e RLS), implementar Rotina de Sync Worker e SDK Auth.

---

# Apêndice A — Ciclo de Autocorreção (Tarefa 12)

## A.1 Checklist de 15 itens da skill `software-design-doc`

| # | Item exigido | Presença neste documento | Seção |
|---|--------------|--------------------------|-------|
| 1 | Requisitos funcionais e não funcionais (tabela) | OK — RF01–28, RNF01–12 | 1 |
| 2 | Diagrama de casos de uso com atores (+ herança de ator), include, extend | OK com adaptação registrada — atores Artesão/Monitor/Supabase; `include` (UC05→UC06, UC07→UC08, UC16→UC17, UC19→UC20) e `extend` (UC09→UC08, UC10→UC07, UC11→UC07); herança de ator não aplicável ao MVP (um único usuário; sem `Administrador` — Decisão #11 registrada em 2.1) | 2 |
| 3 | Descrição textual dos casos de uso principais | OK — UC01, UC05, UC07, UC13, UC16, UC19 com ator, pré-condição, fluxo principal, alternativos, pós-condição | 2.4 |
| 4 | Diagrama de classes com composição, agregação, herança e multiplicidades | OK — composição `Negocio *--`, associação `Cliente--Pedido`, `Pedido-->Obra`, enums; agregação/herança genérica não se aplicam a este domínio (registrado em 3.1: `ItemPedido`/`Pagamento` descartados com justificativa) | 3.1 |
| 5 | Marcação de persistência das entidades | OK — tabela completa + `created_at_local` transversal | 3.2 |
| 6 | DER — feito se houver entidade persistente, dispensado com registro se não | OK — feito (7 tabelas + `FILA_SYNC` local) | 3.3 |
| 7 | Diagrama de objetos validando cardinalidades/relações | OK — snapshot negocio1/clienteJoao/pedidos/obras + validação | 4 |
| 8 | Diagrama de estados — perguntado sobre ciclo complexo; feito ou dispensado com registro | OK — feito para 2 entidades com ciclo complexo (`Pedido`, `Obra`); demais entidades sem ciclo complexo (dispensadas por não se aplicar) | 5 |
| 9 | Classes BCE mapeadas por caso de uso | OK — tabela 10 linhas UC→Boundary→Control→Entities | 6.1 |
| 10 | Diagrama de sequência dos casos de uso principais | OK — UC05 e UC07 com lifelines, `alt`/`opt`, retornos | 7 |
| 11 | Diagrama(s) de atividade para fluxos principais | OK — UC19+UC20 offline-first com decisão, raias via subgraphs | 8 |
| 12 | Diagrama de componentes (camadas Clean) | OK — subgraphs Presentation/Application-Domain/Adapters/LocalInfra + Supabase; regra de dependência documentada | 9 |
| 13 | Mapeamento DDD (aggregates, entidades, value objects, repositories) | OK parcial herdado da Tarefa 11 — entities/enums/errors, repositories por aggregate root, linguagem ubíqua; aggregates implícitos (`Pedido`, `Obra` como raízes; `ItemPedido` inexistente neste domínio); sem Value Objects nomeados além dos enums (nenhum VO complexo identificado no MVP) | 10 |
| 14 | Estrutura de camadas Clean (domain/application/adapters/infra) | OK — árvore `src/` + regra de dependência para o centro | 10.1 |
| 15 | Plano de testes TDD por caso de uso (unidade domínio → use case → integração) | OK — Fase 1 entidade, Fase 2 use case com in-memory repo, Fase 3 SQLite/FilaSync | 10.2–10.4 |

## A.2 Numeração de seções

Sequencial e sem duplicidade: 1, 2, 3, 3.3 (DER como 3.1 lógico da skill, numerado 3.3 para preservar ordem interna), 4, 5, 6, 7, 8, 9, 10 + Apêndice A. Títulos originais `# Tarefa N` removidos para evitar dupla numeração.

## A.3 Rastreabilidade RF → UC → BCE → Sequência → Teste

- Todo RF01–28 possui pelo menos um UC na tabela 2.3 (cobertura total verificada).
- UCs principais (UC01, UC03, UC05, UC07, UC09, UC12, UC13, UC14, UC16, UC19) estão na tabela BCE 6.1 com mesmos nomes de Boundary/Control/Entity.
- UC05 e UC07 (fluxos críticos com regra rígida) possuem sequência em 7.1–7.2 com mesmos participantes da Seção 6 e mesma ordem de chamada que vira teste de use case.
- Entities da Seção 3 aparecem em BCE (6.1), sequência (7), DER (3.3) e objetos (4).
- Testes da Seção 10 cobrem domínio (`Obra.reservar`, `Pedido.concluir` sem foto), aplicação (`ConcluirPedidoUseCase` + `darBaixa`) e infra (CRUD SQLite + `FilaSync pendente`); cada RF é rastreável a pelo menos um nível de teste via UC de origem.
- Nenhuma referência cruzada quebrou na reorganização: IDs RF/UC, nomes de métodos (`concluir`, `darBaixa`, `reservar`, `decrementarUnidades`), enums e tabelas mantidos verbatim.

## A.4 Inconsistências encontradas e correção

1. **Sintaxe Mermaid (3 blocos):** corrigidos conforme Seções 6, 8, 9 (parênteses sem aspas + `\n` → `<br/>`). Demais 9 blocos já válidos, mantidos intactos.
2. **Herança de ator ausente:** não é erro — MVP single-user sem `Administrador` (Decisão #11); registrado no item 2 acima em vez de inventar ator.
3. **Numeração DER:** original `Tarefa 4`; fundido como `3.3` para obedecer à skill (DER dentro de Classes) sem duplicar seção 4 (Objetos). Referências internas atualizadas (`Tarefa 3` → `Seção 3`).
4. Nenhuma outra divergência de cardinalidade (Classes × DER) ou quebra de cadeia RF→teste detectada.
