import type { ResultadoSync } from '../../core/application/sync/tipos';
import type { SincronizarUseCase } from '../../core/application/usecases/SincronizarUseCase';

export interface EstadoDoSync {
  sincronizando: boolean;
  pendentes: number;
  falhas: number;
  /** O último ciclo parou por falta de rede. */
  semRede: boolean;
  /** O servidor recusou a sessão: entrar de novo resolve. */
  sessaoExpirada: boolean;
  ultimaSincronizacao: Date | null;
}

export const ATRASO_APOS_ESCRITA_MS = 3_000;

type Ouvinte<T> = (valor: T) => void;

function houveMudanca(r: ResultadoSync): boolean {
  return r.enviados + r.falhas + r.recebidos + r.fotosEnviadas + r.fotosBaixadas > 0;
}

/**
 * Liga o SincronizarUseCase aos gatilhos do app: escrita local (com debounce), reconexão,
 * volta ao primeiro plano e "Sincronizar agora". Mantém o estado que a UI mostra e avisa quando
 * os dados locais mudaram (o DataProvider recarrega).
 */
export class MotorDeSync {
  private estado: EstadoDoSync = {
    sincronizando: false,
    pendentes: 0,
    falhas: 0,
    semRede: false,
    sessaoExpirada: false,
    ultimaSincronizacao: null,
  };
  private readonly ouvintesDeEstado = new Set<Ouvinte<EstadoDoSync>>();
  private readonly ouvintesDeDados = new Set<() => void>();
  private agendado: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly sincronizar: SincronizarUseCase,
    private readonly usuarioAtual: () => string | null,
    private readonly atrasoMs = ATRASO_APOS_ESCRITA_MS,
    private readonly relogio: () => Date = () => new Date(),
  ) {}

  obterEstado(): EstadoDoSync {
    return this.estado;
  }

  observar(ouvinte: Ouvinte<EstadoDoSync>): () => void {
    this.ouvintesDeEstado.add(ouvinte);
    return () => this.ouvintesDeEstado.delete(ouvinte);
  }

  aoMudarDados(ouvinte: () => void): () => void {
    this.ouvintesDeDados.add(ouvinte);
    return () => this.ouvintesDeDados.delete(ouvinte);
  }

  /** Depois de uma escrita local: espera um pouco para juntar várias escritas num ciclo só. */
  agendar(): void {
    if (this.agendado) clearTimeout(this.agendado);
    this.agendado = setTimeout(() => {
      this.agendado = null;
      void this.sincronizarAgora();
    }, this.atrasoMs);
  }

  sincronizarAgora(): Promise<ResultadoSync | null> {
    return this.rodar((usuarioId) => this.sincronizar.execute({ usuarioId }));
  }

  /** "Tentar de novo": devolve as falhas para a fila e sincroniza. */
  tentarDeNovo(): Promise<ResultadoSync | null> {
    return this.rodar((usuarioId) => this.sincronizar.reenviarFalhas({ usuarioId }));
  }

  async atualizarResumo(): Promise<void> {
    try {
      const resumo = await this.sincronizar.resumo();
      this.mudar(resumo);
    } catch {
      // Resumo é informativo: falha de leitura não derruba o app.
    }
  }

  parar(): void {
    if (this.agendado) clearTimeout(this.agendado);
    this.agendado = null;
  }

  private async rodar(
    ciclo: (usuarioId: string) => Promise<ResultadoSync>,
  ): Promise<ResultadoSync | null> {
    const usuarioId = this.usuarioAtual();
    if (!usuarioId) return null;
    this.mudar({ sincronizando: true });
    let resultado: ResultadoSync | null = null;
    try {
      resultado = await ciclo(usuarioId);
      if (resultado.erroNoPull) console.warn('[sync] falha ao trazer mudanças:', resultado.erroNoPull);
      this.mudar({
        semRede: resultado.semRede,
        sessaoExpirada: resultado.sessaoExpirada,
        ultimaSincronizacao:
          resultado.semRede || resultado.sessaoExpirada
            ? this.estado.ultimaSincronizacao
            : this.relogio(),
      });
    } catch (erro) {
      console.warn('Falha inesperada na sincronização', erro);
    } finally {
      this.mudar({ sincronizando: this.sincronizar.sincronizando });
      await this.atualizarResumo();
    }
    if (resultado && houveMudanca(resultado)) {
      for (const ouvinte of this.ouvintesDeDados) ouvinte();
      // O próprio ciclo pode ter gerado fila nova (ex.: Cliente Avulso duplicado aposentado no
      // pull). Um ciclo sem mudança não reagenda, então isso não vira laço.
      if (this.estado.pendentes > 0 && !resultado.semRede && !resultado.sessaoExpirada) {
        this.agendar();
      }
    }
    return resultado;
  }

  private mudar(parcial: Partial<EstadoDoSync>): void {
    this.estado = { ...this.estado, ...parcial };
    for (const ouvinte of this.ouvintesDeEstado) ouvinte(this.estado);
  }
}
