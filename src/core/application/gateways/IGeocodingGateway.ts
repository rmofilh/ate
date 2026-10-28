import type { Coordenada } from '../../domain/value-objects/Coordenada';

export interface IGeocodingGateway {
  /** Coordenada do endereço, ou null quando nada é encontrado. */
  buscar(endereco: string): Promise<Coordenada | null>;
}
