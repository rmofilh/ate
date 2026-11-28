import type { Coordenada } from '../../domain/value-objects/Coordenada';

/** Endereço sugerido enquanto o usuário digita, já com a posição. */
export interface SugestaoDeEndereco {
  rotulo: string;
  coordenada: Coordenada;
}

export interface IGeocodingGateway {
  /** Coordenada do endereço, ou null quando nada é encontrado. */
  buscar(endereco: string): Promise<Coordenada | null>;
  /**
   * Sugestões para o texto digitado (autocomplete). Precisa de internet; sem rede ou com falha
   * devolve lista vazia, nunca lança: sugestão é conveniência, não pode travar o formulário.
   */
  sugerir(texto: string): Promise<SugestaoDeEndereco[]>;
  /** Endereço legível de uma coordenada (geocoding reverso), ou null se não houver/sem rede. */
  enderecoDe(coordenada: Coordenada): Promise<string | null>;
}
