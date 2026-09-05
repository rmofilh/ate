# Tarefa 10 — Diagrama de Componentes
## App de Gestão para Artesãos

---

Este diagrama detalha a **arquitetura tecnológica** do sistema (proposta na Etapa 1), separando logicamente as responsabilidades do aplicativo mobile no dispositivo (isolado em camadas via *Clean Architecture*) da infraestrutura em nuvem (BaaS Supabase).

A modelagem enfatiza o caráter "Offline-First", evidenciando que as lógicas de negócio operam diretamente contra a Infraestrutura Local (`SQLite` e `File System`), enquanto um componente assíncrono especializado (`Sync Worker`) faz a ponte entre os Repositórios Locais e as APIs Remotas.

## 10.1 Arquitetura Macro e Integrações

```mermaid
flowchart TD
    Artesao((Artesão\n(Usuário)))

    subgraph MobileApp [Aplicação Mobile / Dispositivo (Expo - React Native)]
        
        subgraph Presentation [Camada de Apresentação]
            Telas[Telas e Componentes de UI]
            Hooks[Hooks e Gerência de Estado]
        end

        subgraph ApplicationDomain [Núcleo da Aplicação (Application / Domain)]
            UseCases[Casos de Uso\n(Lógica da Aplicação)]
            Entities[Entidades e Regras de Negócio]
        end

        subgraph InterfaceAdapters [Adaptadores de Interface]
            Repo[Repositórios Locais]
            SyncWorker[Worker de Sincronização\nem Background]
            NetListener[Monitor de Conectividade]
            SupabaseAdapter[Adaptadores REST API / SDK]
        end
        
        subgraph LocalInfra [Infraestrutura Local (Offline-First)]
            SQLite[(SQLite Database\nDados Relacionais)]
            FS[Expo File System\nCache de Imagens]
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
        NetListener -.->|Gatilho (Online)| SyncWorker
        SyncWorker --> Repo
        SyncWorker --> SupabaseAdapter
    end

    subgraph BackendCloud [Backend as a Service (Supabase)]
        S_Auth[Supabase Auth\n(Gestão de Sessão e Identidade)]
        S_DB[(Supabase Database\nPostgreSQL + Regras RLS)]
        S_Storage[Supabase Storage\n(Buckets para Fotos de Obras e Referências)]
    end

    %% Integrações com a Nuvem
    Artesao -->|Interação (Toque/Gestos)| Telas
    Hooks -->|Login/Logout Direto| S_Auth
    SupabaseAdapter -->|Sincronização Assíncrona\n(Criação, Edição, Deleção)| S_DB
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
