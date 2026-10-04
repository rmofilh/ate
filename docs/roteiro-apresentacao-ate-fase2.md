# ate — roteiro da apresentação da fase 2

**Duração:** 9:00, incluindo 2:30 de demonstração. **Limite:** 10:00.

**Ideia central:** acompanhar a regra de foto obrigatória do domínio até o caso
de uso, a interface e os testes. A interface executa regras implementadas com
repositórios em memória e gateways fake.

Apresentação: [apresentacao-ate-fase2.html](apresentacao-ate-fase2.html).

## Abrir a apresentação

Na raiz do projeto:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Abrir no navegador:

**http://127.0.0.1:8000/docs/apresentacao-ate-fase2.html**

Reveal.js 6.0.2, plugin de notas, fontes e marca são locais. O servidor é local
e a apresentação funciona sem internet. Ao copiar para outro computador, levar
`docs/` e `assets/`, mantendo a estrutura relativa das pastas.

O HTML também pode ser aberto diretamente para navegar pelos slides. Para usar
o modo apresentador com notas e cronômetro, usar o endereço HTTP acima.

### Atalhos

| Tecla | Ação |
|---|---|
| `→` / `←` | Próximo slide / slide anterior |
| `Espaço` | Próximo slide |
| `S` | Abrir janela de notas e cronômetro |
| `F` | Tela cheia |
| `Esc` | Visão geral dos slides |
| `?` | Ajuda de teclado do Reveal.js |

Usar a janela principal no projetor e a janela de notas na tela do apresentador.
Permitir a janela pop-up quando o navegador pedir. O timer continua contando
enquanto você alterna para o app ou o editor; clicar no timer para zerá-lo antes
de iniciar. Os slides não avançam automaticamente.

Para imprimir em PDF, abrir o mesmo endereço com `?print-pdf` **antes do hash**:
`http://127.0.0.1:8000/docs/apresentacao-ate-fase2.html?print-pdf`, e usar a
impressão do navegador em paisagem, sem cabeçalhos/rodapés, com fundos ativados.

## Preparação para ganhar tempo

1. Abrir a apresentação e a janela de notas antes de começar.
2. Deixar o app carregado com as fixtures iniciais. Conta de demonstração:
   **artesao@email.com / 123456**. A câmera fake padrão retorna sucesso.
3. Preparar as abas do editor nesta ordem; localizar os métodos pelo nome:
   - `src/core/domain/entities/Pedido.ts` → `concluir()` (linha 179).
   - `src/core/application/usecases/ConcluirPedidoUseCase.ts` → construtor e `execute()`.
   - `src/main/factories/makeFakeProviders.ts` → `concluirPedido` (linha 54).
   - `src/presentation/hooks/AppProviders.tsx` → `AuthProvider()` (linha 116).
   - `src/core/application/__tests__/PedidoClose.test.ts` → testes sem/com foto (linhas 41–60).
   - `src/presentation/__tests__/TelaKanban.test.tsx` → câmera cancelada (linhas 322–333).
4. Aumentar a fonte do editor/terminal para o projetor e manter o resultado dos
   testes já aberto. Evitar pesquisar arquivos ou aguardar a suíte durante a fala.
5. Ensaiar a troca de janelas e o fluxo da Águia. Reiniciar o app antes do ensaio
   seguinte restaura os dados e apaga a sessão em memória.

Para iniciar o app, usar o script do projeto:

```sh
npm start
```

## Cronograma

| Slide | Assunto | Duração | Acumulado |
|---|---|---:|---:|
| 1 | Domínio e interface primeiro | 0:30 | 0:30 |
| 2 | Clean Architecture no código | 1:00 | 1:30 |
| 3 | Regra no domínio | 0:55 | 2:25 |
| 4 | Caso de uso, contratos e fakes | 1:10 | 3:35 |
| 5 | Context API, hooks e sessão | 1:00 | 4:35 |
| 6 | TDD, testes e cobertura | 1:25 | 6:00 |
| 7 | Demonstração no app | 2:30 | 8:30 |
| 8 | Síntese e próximas integrações | 0:30 | 9:00 |

O minuto até 10:00 é margem para transições ou uma pergunta curta. Os tempos
dos slides técnicos **já incluem** mostrar os recortes no editor.

## Fala e evidências por slide

### 1. Domínio e interface primeiro — 0:30

> O ate organiza pedidos, estoque e eventos de um artesão. Nesta entrega, o
> núcleo de regras e a interface já podem ser demonstrados com dados em memória
> e gateways fake. Vou acompanhar uma regra concreta: para concluir um pedido
> em produção, a foto é obrigatória.

Manter a apresentação no slide. Essa abertura já contextualiza produto e escopo.

### 2. Clean Architecture — 1:00

> As decisões de negócio ficam no centro. As telas acessam os casos de uso;
> eles trabalham com entidades e contratos. A infraestrutura implementa esses
> contratos, e a factory monta e injeta as dependências.

**Mostrar:** árvore de `src/core/domain/` e `src/core/application/`; imports de
`Pedido.ts` e construtor de `ConcluirPedidoUseCase.ts`.

**Ponto de prova:** domínio e aplicação não importam React, Expo, SQLite ou
Supabase. Os contratos ficam em `application` nesta implementação. As setas do
slide representam **dependências de código**, não a ordem de execução.

### 3. A regra pertence à entidade — 0:55

> A entidade Pedido protege a transição. Se o pedido não estiver Fazendo, ou
> se a foto estiver vazia, ela rejeita a conclusão antes de mudar o estado.
> Assim, a regra continua válida mesmo se eu chamar a entidade fora da tela.
> Coordenada é um Value Object: valida latitude e longitude na criação.

**Mostrar:** `Pedido.concluir()` e suas duas guardas. O slide contém um recorte
da validação da foto; o arquivo também valida pedido vivo e estado FAZENDO.

**Precisão:** venda direta de obra em série é uma exceção documentada. Ela usa
um fluxo próprio que valida o tipo/quantidade e cria um pedido já Feito.

### 4. O caso de uso coordena — 1:10

> O caso de uso busca pedido e obra, chama o domínio, salva e enfileira as
> alterações. Ele depende de interfaces. Por isso, consigo executar o fluxo
> com um repositório que guarda objetos em um Map e uma fila em memória.
> A factory fornece essas implementações ao aplicativo.

**Mostrar:** `ConcluirPedidoUseCase.execute()` e a linha de composição
`concluirPedido` em `makeFakeProviders.ts`.

**Explicar em uma frase:** fake é uma implementação simplificada funcional;
stub fornece uma resposta predefinida; mock/spy permite simular ou verificar
interações. O projeto usa Map/array, respostas fake de hardware e `jest.fn()`/
`jest.spyOn()` em testes.

Se houver pergunta, abrir
`src/infrastructure/database/memory/InMemoryPedidoRepository.ts`: `Map`,
`save()` e filtragem por usuário/deleção lógica. A fila fake registra operações;
não as envia para um servidor.

### 5. Context API e sessão — 1:00

> O AuthProvider está na apresentação. Ele carrega a sessão do gateway e chama
> os casos de uso de login e logout. useAuth compartilha o estado sem prop
> drilling, e as rotas usam a sessão para proteger o acesso. useServices fornece
> os serviços usados pelas telas. A sessão desta entrega fica em memória;
> persistência segura é a próxima integração.

**Mostrar:** `AuthProvider()`: `getSession()`, `login.execute()` e `setSession()`.

**Precisão:** os hooks atuais acessam Contexts; as telas ainda executam casos
de uso via `useServices`. Os estados de salvamento do Kanban são locais à tela.
O grupo de rotas se chama `(tabs)`, mas o navegador atual é um **Drawer**.

### 6. TDD e testes — 1:25

> O ciclo TDD começa pelo comportamento: teste que falha, implementação mínima
> que o faz passar e refatoração mantendo a suíte verde. A regra da foto aparece
> em três níveis: domínio puro, caso de uso com fakes e tela com interação
> simulada. A suíte atual passou com 214 testes em 45 suítes.

**Mostrar:** `PedidoClose.test.ts`, testes sem/com foto; em seguida, o último
teste de `TelaKanban.test.tsx`.

**Apontar as asserções:**

- Sem foto: `rejects.toThrow(/foto/i)` e estado continua `FAZENDO`.
- Com foto: pedido `FEITO`, obra única `ENTREGUE`.
- Câmera cancelada na tela: aviso, fila vazia e pedido preservado.

> A cobertura global de linhas é 88,18%; instruções e funções também passam de
> 80%. Ramificações estão em 77,14% e ainda precisam evoluir.

**Precisão sobre TDD:** o slide explica o ciclo com o teste existente. Não
reconstrói a ordem histórica de escrita. Um teste que espera um erro de negócio
e passa está **Green**; a exceção esperada não é a fase Red.

**Context e navegação:** `RouterGuards.test.tsx`, linhas 49–72, exercita login,
logout e proteção de rotas com o `AuthProvider` real e gateway fake. É teste de
integração em memória, não E2E de dispositivo. E2E nativo fica para a etapa de
integrações reais.

### 7. Demonstração — 2:30

| Tempo dentro da demo | Ação | Evidência visível |
|---|---|---|
| 0:00–0:20 | Alternar para o app e entrar, se necessário. | Sessão fake libera a área protegida. |
| 0:20–0:55 | Em Pedidos, tocar na âncora **Fazendo**; localizar **Escultura de Aguia personalizada**. | Pedido em produção com obra única vinculada. |
| 0:55–1:35 | Tocar **Concluir com foto**; depois na âncora **Feito**. | A Águia aparece concluída. |
| 1:35–2:05 | Abrir menu → **Estoque** → **Peças únicas**. | **Aguia de Asas Abertas** aparece **Entregue**. |
| 2:05–2:20 | Abrir menu → **Eventos**. | **Feira da Praca**, com coordenadas textuais. |
| 2:20–2:30 | Retornar aos slides. | Fechamento dentro do cronograma. |

Durante a conclusão:

> A câmera aqui é fake: retorna um caminho. A regra de negócio e o caso de uso
> executam a conclusão e a baixa da obra de verdade, sobre dados em memória.

O gateway retorna `/tmp/foto-fake.jpg`; esse caminho não representa uma imagem
real capturada. A câmera nativa não abre. O app não oferece um botão para
alternar o modo fake para cancelamento; esse cenário já foi mostrado no teste.

As fixtures incluem a Águia em FAZENDO e sua obra única RESERVADA. Se o pedido
já estiver concluído por causa de um ensaio anterior, reiniciar antes da prova.
Se houver atraso, encurtar a passagem por Eventos e preservar o fechamento.

### 8. Síntese — 0:30

> O ate já comprova um domínio independente, casos de uso com dependências
> injetadas e telas exercitadas com fakes. A regra que vimos está protegida do
> domínio até a interface. O próximo passo é implementar os adaptadores reais
> de sessão, persistência, sincronização e hardware.

Encerrar até 9:00. Reservar perguntas mais longas para depois da apresentação.

## Resultados de teste e cobertura

**Medição de 04/10/2026**, baseada no código da revisão `a4151c7`:

- **45 suítes aprovadas / 45**.
- **214 testes aprovados / 214**.
- Execução com cobertura: aproximadamente **32–36 segundos** nesta máquina.

| Métrica | Cobertos / total | Resultado |
|---|---:|---:|
| Linhas | 1247 / 1414 | **88,18%** |
| Instruções | 1389 / 1626 | **85,42%** |
| Funções | 409 / 477 | **85,74%** |
| Ramificações | 898 / 1164 | **77,14%** |

O escopo inclui **todos os arquivos de produção** em `src/**/*.{ts,tsx}`,
incluindo arquivos não importados pelos testes. Exclui `__tests__`, arquivos
de declaração `.d.ts` e `src/test-support/`. Interfaces apenas de tipo não
contêm instruções executáveis. Cobertura não substitui verificar o comportamento
do app em um dispositivo.

### Reproduzir a medição

```sh
npm test -- --config=docs/apresentacao-coverage.cjs
```

A configuração reaproveita `jest.config.js`, aplica o escopo acima e grava o
relatório em:

`node_modules/.cache/ate-apresentacao-coverage/coverage-summary.json`

Para executar apenas as três evidências centrais, **antes da apresentação**:

```sh
npm test -- --runTestsByPath src/core/domain/__tests__/Pedido.test.ts src/core/application/__tests__/PedidoClose.test.ts src/presentation/__tests__/TelaKanban.test.tsx
```

Verificações do projeto:

```sh
npm run lint
npm run typecheck
```

## Correspondência com o exemplo do professor

| Tema da prova | Evidência no ate |
|---|---|
| Domínio puro e invariantes | `Pedido`, `Obra`, `Cliente`, `Evento`, `Coordenada`, enums e erros em `core/domain`. |
| Casos de uso desacoplados | `core/application/usecases`; repositórios/gateways recebidos pelo construtor. |
| Contratos | Interfaces em `core/application/repositories` e `core/application/gateways`. |
| Fakes em memória | Repositórios com `Map`, gateways fake e fixtures em `infrastructure`. |
| Context API e hooks | `AppProviders.tsx`, `AuthProvider`, `useAuth`, `useData`, `useServices`. |
| Interface e rotas | `src/app/`, componentes em `src/presentation`, Expo Router com Drawer e stacks protegidas. |
| Testes por camada | Testes puros, casos de uso com fakes, RNTL e integração de rotas/providers. |
| Sessão segura | Próxima integração; a sessão atual existe apenas em `FakeAuthGateway`. |
| Banco, hardware, sync e mapa reais | Próximas integrações; Map/array, câmera/GPS fake e coordenadas textuais nesta fase. |
| Serviços de domínio | Neste recorte, as regras estão nas entidades e a orquestração nos casos de uso; não há classes separadas de Domain Services. |
| E2E | Planejados para a etapa de integrações reais; testes de Router atuais não são E2E nativos. |

Os nomes do projeto de estágio do professor não são requisitos de classes para
o ate. Usar exemplos do domínio do artesão demonstra a aplicação dos princípios.

## Verificação da apresentação

- Oito slides com notas individuais e durações que somam 540 segundos.
- Revisão Chromium em 1280×720, 1024×768 e 375×812: conteúdo dentro do palco
  16:9, sem cortes; controles com espaço reservado no rodapé.
- Navegação por setas, hash por slide e visão geral verificados.
- Janela de notas conectada, com dois previews e conteúdo sincronizado ao
  mudar de slide.
- Carregamento por `file://` com HTTP/HTTPS bloqueados, cache desativado e
  fontes locais: oito slides disponíveis, sem requisições externas.
- Modo `?print-pdf`: oito páginas preparadas para impressão.
- Nenhum erro de execução JavaScript ou recurso de apresentação não carregado
  nos cenários verificados.
- Typecheck aprovado. Lint sem erros, com 11 avisos de ordenação de imports
  preexistentes em `src/presentation/__tests__/RouterGuards.test.tsx`.
- A medição reproduzível de cobertura confirmou novamente os 214 testes e as
  quatro métricas acima. A execução também emitiu avisos de `act()` em
  `CompletedDisclosure.test.tsx`, sem falhas nos testes.

## Respostas rápidas para perguntas

- **“O app funciona?”** Os fluxos demonstráveis executam regras implementadas
  sobre dados em memória. Persistência, autenticação remota e hardware reais
  pertencem à próxima integração.
- **“Por que fake em vez de banco?”** Para validar o núcleo e a orquestração
  com dados controláveis e sem dependências externas.
- **“Onde trocar o fake?”** Na composição em `makeFakeProviders`; um novo
  adaptador precisa cumprir o contrato e preservar o comportamento esperado.
- **“Qual camada impede concluir sem foto?”** `Pedido.concluir()`; o caso de
  uso delega a essa regra e a tela também trata a ausência de captura.
- **“A sessão já é criptografada?”** A sessão atual fica em memória. Ainda
  será implementado o adaptador de armazenamento seguro.
- **“Atingiu 80%?”** Linhas, instruções e funções atingem; ramificações ficam
  em 77,14%. O escopo da medição está documentado acima.
- **“Isso prova que todo código foi escrito por TDD?”** A suíte e os planos
  documentam os comportamentos e a estratégia; a apresentação não reconstrói
  a sequência histórica Red–Green de cada alteração.
