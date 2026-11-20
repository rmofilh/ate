import { mensagemDoErro, tipoDoErro } from '../errors/ErroDeSincronizacao';
import type { IArmazenamentoRemoto } from '../gateways/IArmazenamentoRemoto';
import type { IEstadoLocalSync } from '../gateways/IEstadoLocalSync';
import type { IFilaSync } from '../gateways/IFilaSync';
import type { IServidorRemoto } from '../gateways/IServidorRemoto';
import { organizarFila } from '../sync/organizarFila';
import { proximaTentativa } from '../sync/politicaDeRetentativa';
import {
  type ResultadoSync,
  type ResumoSync,
  resultadoVazio,
  TABELAS_SYNC,
} from '../sync/tipos';

export const TAMANHO_LOTE_PULL = 500;

export interface DependenciasDoSync {
  fila: IFilaSync;
  estado: IEstadoLocalSync;
  servidor: IServidorRemoto;
  armazenamento: IArmazenamentoRemoto;
  relogio?: () => Date;
  aleatorio?: () => number;
  tamanhoLote?: number;
}

/**
 * Um ciclo de sincronização (UC16/UC17): 1) sobe as fotos pendentes; 2) envia a fila, pai antes de
 * filho, um registro por vez com o estado atual relido do banco; 3) traz as mudanças do servidor
 * por cursor; 4) baixa as fotos que faltam no aparelho.
 *
 * Single-flight: um gatilho durante a execução não abre outro ciclo, só pede que o atual rode de
 * novo ao terminar (e recebe o resultado final).
 */
export class SincronizarUseCase {
  private emAndamento: Promise<ResultadoSync> | null = null;
  private repetir = false;
  private readonly relogio: () => Date;
  private readonly aleatorio: () => number;
  private readonly tamanhoLote: number;

  constructor(private readonly deps: DependenciasDoSync) {
    this.relogio = deps.relogio ?? (() => new Date());
    this.aleatorio = deps.aleatorio ?? Math.random;
    this.tamanhoLote = deps.tamanhoLote ?? TAMANHO_LOTE_PULL;
  }

  get sincronizando(): boolean {
    return this.emAndamento !== null;
  }

  execute(args: { usuarioId: string }): Promise<ResultadoSync> {
    if (this.emAndamento) {
      this.repetir = true;
      return this.emAndamento;
    }
    const execucao = (async () => {
      try {
        let resultado: ResultadoSync;
        do {
          this.repetir = false;
          resultado = await this.ciclo(args.usuarioId);
        } while (this.repetir && !resultado.semRede && !resultado.sessaoExpirada);
        return resultado;
      } finally {
        this.emAndamento = null;
      }
    })();
    this.emAndamento = execucao;
    return execucao;
  }

  /** "Tentar de novo": devolve as falhas para a fila e roda um ciclo. */
  async reenviarFalhas(args: { usuarioId: string }): Promise<ResultadoSync> {
    await this.deps.fila.reenviarFalhas();
    await this.deps.estado.reenviarErros();
    return this.execute(args);
  }

  resumo(): Promise<ResumoSync> {
    return this.deps.fila.resumo();
  }

  private async ciclo(usuarioId: string): Promise<ResultadoSync> {
    const resultado = resultadoVazio();
    if (!(await this.enviarFotos(usuarioId, resultado))) return resultado;
    if (!(await this.enviarFila(resultado))) return resultado;
    if (!(await this.receber(resultado))) return resultado;
    await this.baixarFotos(resultado);
    return resultado;
  }

  /** SEM_REDE e SESSAO interrompem o ciclo; devolve true nesses casos. */
  private interromper(erro: unknown, resultado: ResultadoSync): boolean {
    const tipo = tipoDoErro(erro);
    if (tipo === 'SEM_REDE') resultado.semRede = true;
    if (tipo === 'SESSAO') resultado.sessaoExpirada = true;
    return tipo === 'SEM_REDE' || tipo === 'SESSAO';
  }

  private async enviarFotos(usuarioId: string, resultado: ResultadoSync): Promise<boolean> {
    const { estado, armazenamento } = this.deps;
    for (const foto of await estado.fotosParaEnviar()) {
      const caminhoRemoto = `${usuarioId}/${foto.id}.jpg`;
      try {
        await armazenamento.enviar(foto.caminhoLocal, caminhoRemoto);
        await estado.marcarFotoEnviada(foto.id, caminhoRemoto);
        resultado.fotosEnviadas += 1;
      } catch (erro) {
        if (this.interromper(erro, resultado)) return false;
        await estado.marcarFalhaDaFoto(foto.id, mensagemDoErro(erro));
      }
    }
    return true;
  }

  private async enviarFila(resultado: ResultadoSync): Promise<boolean> {
    const { fila, estado, servidor } = this.deps;
    const agora = this.relogio();
    await estado.reenfileirarOrfas();
    for (const grupo of organizarFila(await fila.elegiveis(agora))) {
      const ids = grupo.entradas.map((entrada) => entrada.id);
      const registro = await estado.lerParaEnvio(grupo.tabela, grupo.entidadeId);
      if (!registro) {
        await fila.concluir(ids);
        continue;
      }
      if (registro.aguardandoFoto) continue;
      try {
        const { updatedAt } = await servidor.enviar(grupo.tabela, registro.dados);
        await fila.concluir(ids);
        resultado.enviados += 1;
        // Editada durante o envio: a entrada nova continua na fila e a linha segue PENDENTE.
        if (!(await fila.temPendente(grupo.entradas[0].entidade, grupo.entidadeId))) {
          await estado.marcarSincronizado(grupo.tabela, grupo.entidadeId, updatedAt);
        }
      } catch (erro) {
        if (this.interromper(erro, resultado)) return false;
        if (tipoDoErro(erro) === 'PERMANENTE') {
          await fila.falhar(ids, mensagemDoErro(erro));
          await estado.marcarErro(grupo.tabela, grupo.entidadeId);
          resultado.falhas += 1;
        } else {
          const tentativas = Math.max(...grupo.entradas.map((entrada) => entrada.tentativas));
          await fila.reagendar(
            ids,
            proximaTentativa(tentativas, agora, this.aleatorio),
            mensagemDoErro(erro),
          );
        }
      }
    }
    return true;
  }

  private async receber(resultado: ResultadoSync): Promise<boolean> {
    const { estado, servidor } = this.deps;
    try {
      for (const tabela of TABELAS_SYNC) {
        for (;;) {
          const cursor = await estado.cursor(tabela);
          const linhas = await servidor.buscarAlteracoes(tabela, cursor, this.tamanhoLote);
          if (linhas.length === 0) break;
          resultado.recebidos += await estado.aplicarLote(tabela, linhas);
          if (linhas.length < this.tamanhoLote) break;
        }
      }
    } catch (erro) {
      // Falha no pull não perde nada: o cursor só avança junto com o lote aplicado.
      if (this.interromper(erro, resultado)) return false;
      resultado.erroNoPull = mensagemDoErro(erro);
    }
    return true;
  }

  private async baixarFotos(resultado: ResultadoSync): Promise<void> {
    const { estado, armazenamento } = this.deps;
    for (const foto of await estado.fotosParaBaixar()) {
      try {
        await armazenamento.baixar(foto.caminhoRemoto, foto.caminhoLocal);
        resultado.fotosBaixadas += 1;
      } catch (erro) {
        if (this.interromper(erro, resultado)) return;
      }
    }
  }
}
