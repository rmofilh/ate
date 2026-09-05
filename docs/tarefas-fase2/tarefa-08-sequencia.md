# Tarefa 8 — Diagramas de Sequência
## App de Gestão para Artesãos

---

Os diagramas de sequência abaixo expandem a visão de robustez (Tarefa 7), inserindo a linha do tempo, retornos síncronos, os participantes de infraestrutura (Repositórios e Fila de Sync do SQLite) e os fragmentos de condição (`alt`) que executam as regras de negócio de domínio (TDD/Clean Architecture).

## 8.1 UC05 — Concluir Pedido (Fazendo → Feito)

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

## 8.2 UC07 — Registrar Novo Pedido

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

*(base: Tarefa 2 - fluxos principais; Tarefa 3 - restrições de métodos; RF05, RF11, RF18)*
