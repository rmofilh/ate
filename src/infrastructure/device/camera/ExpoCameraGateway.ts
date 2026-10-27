import type { ICameraGateway } from '../../../core/application/gateways/ICameraGateway';
import type { FotoCapturada } from '../../fileSystem/ArmazenamentoDeFotos';

/** O que a UI da câmera devolve ao fechar. */
export type ResultadoDaCamera =
  | ({ tipo: 'foto' } & FotoCapturada)
  | { tipo: 'cancelado' }
  | { tipo: 'negado' };

/** Função registrada pela UI (CameraHost) que abre o modal e resolve ao fechar. */
export type AbridorDaCamera = () => Promise<ResultadoDaCamera>;

export interface DestinoDasFotos {
  armazenar(foto: FotoCapturada): Promise<string>;
}

export const MENSAGEM_PERMISSAO_NEGADA =
  'Permissão de câmera negada. Habilite a câmera nas configurações do aparelho para tirar a foto.';
export const MENSAGEM_CAMERA_INDISPONIVEL = 'Câmera indisponível no momento. Tente novamente.';
export const MENSAGEM_CAMERA_OCUPADA = 'A câmera já está aberta.';

/**
 * ICameraGateway real. A UI registra como abrir o modal da câmera; a foto aceita é entregue
 * ao destino (ArmazenamentoDeFotos), que devolve o caminho relativo.
 */
export class ExpoCameraGateway implements ICameraGateway {
  private abridor: AbridorDaCamera | null = null;
  private aberta = false;

  constructor(private readonly destino: DestinoDasFotos) {}

  registrarAbridor(abridor: AbridorDaCamera): () => void {
    this.abridor = abridor;
    return () => {
      if (this.abridor === abridor) this.abridor = null;
    };
  }

  async capture(): Promise<string | null> {
    if (!this.abridor) throw new Error(MENSAGEM_CAMERA_INDISPONIVEL);
    if (this.aberta) throw new Error(MENSAGEM_CAMERA_OCUPADA);
    this.aberta = true;
    try {
      const resultado = await this.abridor();
      if (resultado.tipo === 'cancelado') return null;
      if (resultado.tipo === 'negado') throw new Error(MENSAGEM_PERMISSAO_NEGADA);
      const { uri, largura, altura } = resultado;
      return await this.destino.armazenar({ uri, largura, altura });
    } finally {
      this.aberta = false;
    }
  }
}
