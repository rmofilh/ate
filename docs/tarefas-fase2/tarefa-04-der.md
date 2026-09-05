# Tarefa 4 — Diagrama Entidade-Relacionamento (DER)
## App de Gestão para Artesãos

---

## 4.1 Diagrama DER (Visão Relacional)

Este diagrama materializa a visão relacional do banco de dados (SQLite local e Supabase remoto), derivada da Tabela de Persistência (Tarefa 3.2). 

As cardinalidades foram estritamente alinhadas com as multiplicidades do Diagrama de Classes (Tarefa 3.1):
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

*(base: Etapa 1, Seções 3 e 4; restrições derivadas da Tarefa 3)*
