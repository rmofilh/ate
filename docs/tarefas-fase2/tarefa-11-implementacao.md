# Tarefa 11 — Orientações de Implementação
## App de Gestão para Artesãos

---

Para garantir a manutenibilidade (RNF09) e a robustez testável do sistema "Offline-First", as seguintes orientações devem guiar o momento da escrita do código.

## 11.1 Estrutura de Pastas (Clean Architecture)

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

## 11.2 Orientação para TDD (Test-Driven Development)

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

## 11.3 Padrões de Projeto Exigidos

- **Repository Pattern:** O App NUNCA deve fazer queries do SQLite diretamente dentro de Hooks do React ou Telas. A UI chama os *UseCases*, que interagem com as interfaces genéricas dos repositórios.
- **Dependency Injection (Inversão de Dependência):** Instancie o repositório concreto do SQLite na pasta `main/factories/` e injete nos *UseCases* via construtor. Isso permite rodar testes unitários rápidos na camada Application passando *in-memory repositories*.
- **Desacoplamento Offline-First:** As camadas de repositório devem responder imediatamente com sucesso à UI após a gravação local (SQLite). A comunicação de falha ou latência de rede fica encapsulada e isolada apenas no Worker de Sincronização em background.

## 11.4 Checklist para a Fase de Código (Próxima Etapa)

O desenvolvimento deverá ser iniciado respeitando o seguinte fluxo:
- [ ] **1. Setup:** Instanciar o app via Expo (`npx create-expo-app`), configurar TypeScript, ESLint e Jest.
- [ ] **2. Domínio:** Codificar e testar a camada `core/domain` (Entidades e Regras de Negócio).
- [ ] **3. Aplicação:** Codificar e testar a camada `core/application` (Casos de Uso e interfaces).
- [ ] **4. Infra local:** Configurar esquema do SQLite e testes de persistência.
- [ ] **5. Apresentação (UI):** Desenvolver telas e componentes conectando com `main/factories`.
- [ ] **6. Nuvem & Sync:** Configurar projeto Supabase (Tabelas e RLS), implementar Rotina de Sync Worker e SDK Auth.
