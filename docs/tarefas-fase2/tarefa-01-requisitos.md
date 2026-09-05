# Tarefa 1 — Levantamento de Requisitos (RF / RNF)
## App de Gestão para Artesãos

---

## 1. Requisitos Funcionais (RF)

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

---

## 2. Requisitos Não Funcionais (RNF)

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
