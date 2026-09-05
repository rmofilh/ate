# Tarefa 9 — Diagrama de Atividades
## App de Gestão para Artesãos

---

Para o Diagrama de Atividades, foi escolhido o fluxo mais crítico e complexo do aplicativo: **Operações Offline e Sincronização Automática (UC19 + UC20)**.

O diagrama demonstra o padrão "Offline-First" adotado pelo sistema (RNF02). Ele divide as responsabilidades em raias (swimlanes conceituais) demonstrando como a interface de usuário (UI) não é bloqueada pela rede, e como o processamento em background (worker) se recupera de estados sem conectividade, resolvendo também a dependência de upload de imagens (Storage) antes de atualizar os dados relacionais (Database).

## 9.1 Atividade: Operação e Sincronização Offline-First

```mermaid
flowchart TD
    %% Definição das Raias (Swimlanes visuais através de subgraphs)
    
    subgraph UI [Frontend / Ações do Artesão]
        A([Artesão realiza ação de gravação\nex: Concluir Pedido, Novo Cliente])
        E([Sucesso imediato na UI\nArtesão continua uso normal])
    end

    subgraph Local [Infraestrutura Local / SQLite]
        B[Salva entidade na tabela local\ncom status_sync = 'pendente']
        C[Grava registro de log na\ntabela FilaSync]
        L[Marca registro na FilaSync e\nna Entidade como 'sincronizado']
    end

    subgraph Worker [Worker de Sincronização em Background]
        D{Dispositivo possui\nconexão com internet?}
        F[Pausa processamento e aguarda\nnotificação do Monitor de Rede]
        G[Lê registros 'pendentes'\nda FilaSync]
        H{Operação contém\nfoto/imagem local?}
        I[Prepara payload final e\ndispara Upsert para a API]
        M{Ocorreu erro de\nrede ou permissão?}
    end

    subgraph Nuvem [Supabase Backend]
        J[Supabase Storage:\nFaz upload da foto e retorna URL pública]
        K[Supabase Database:\nAplica regras (RLS), gera Server Timestamp\ne persiste no Postgres]
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
    M -- Sim --> N[Marca erro transitório na FilaSync\n(Tenta novamente na próxima janela)]
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
