import { useEffect, useRef, useState } from 'react';

import type {
  IGeocodingGateway,
  SugestaoDeEndereco,
} from '@/core/application/gateways/IGeocodingGateway';
import type { Coordenada } from '@/core/domain/value-objects/Coordenada';

export const ATRASO_DAS_SUGESTOES_MS = 400;
export const MINIMO_DE_LETRAS = 3;

type Enderecos = Pick<IGeocodingGateway, 'sugerir' | 'enderecoDe'>;

/**
 * Endereço dos formulários de evento: sugestões enquanto digita (com espera e a partir de 3 letras,
 * só com internet) e o caminho inverso, endereço a partir do pin do mapa. O texto digitado nunca é
 * trocado sem o usuário pedir: com o campo vazio, o endereço do pin preenche sozinho; com o campo
 * preenchido, vira uma oferta ("Usar este").
 */
export function useEnderecoDoEvento({
  endereco,
  setEndereco,
  enderecos,
  online,
}: {
  endereco: string;
  setEndereco(texto: string): void;
  enderecos: Enderecos | undefined;
  online: boolean;
}) {
  const [sugestoes, setSugestoes] = useState<SugestaoDeEndereco[]>([]);
  const [enderecoDoPonto, setEnderecoDoPonto] = useState<string | null>(null);
  /** Texto que veio de uma escolha (sugestão ou pin): não dispara nova busca de sugestões. */
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const atual = useRef(endereco);
  const pedido = useRef(0);

  useEffect(() => {
    atual.current = endereco;
  });

  const texto = endereco.trim();
  const buscar =
    Boolean(enderecos) && online && texto.length >= MINIMO_DE_LETRAS && texto !== escolhido;

  useEffect(() => {
    if (!buscar || !enderecos) return;
    const numero = ++pedido.current;
    const espera = setTimeout(() => {
      enderecos.sugerir(texto).then(
        (encontradas) => {
          if (numero === pedido.current) setSugestoes(encontradas);
        },
        () => undefined,
      );
    }, ATRASO_DAS_SUGESTOES_MS);
    return () => clearTimeout(espera);
  }, [buscar, enderecos, texto]);

  function digitar(novo: string) {
    setEscolhido(null);
    setEnderecoDoPonto(null);
    setEndereco(novo);
  }

  /** Aplica a sugestão no campo e devolve a coordenada dela (o formulário marca o local). */
  function escolher(sugestao: SugestaoDeEndereco): Coordenada {
    setEscolhido(sugestao.rotulo);
    setSugestoes([]);
    setEnderecoDoPonto(null);
    setEndereco(sugestao.rotulo);
    return sugestao.coordenada;
  }

  /** Depois de marcar o pin no mapa: busca o endereço daquele ponto. */
  function aoMarcarNoMapa(coordenada: Coordenada) {
    if (!enderecos || !online) return;
    enderecos.enderecoDe(coordenada).then(
      (encontrado) => {
        if (!encontrado) return;
        const digitado = atual.current.trim();
        if (!digitado) {
          setEscolhido(encontrado);
          setEndereco(encontrado);
        } else if (digitado !== encontrado) {
          setEnderecoDoPonto(encontrado);
        }
      },
      () => undefined,
    );
  }

  function usarEnderecoDoPonto() {
    if (!enderecoDoPonto) return;
    setEscolhido(enderecoDoPonto);
    setEndereco(enderecoDoPonto);
    setEnderecoDoPonto(null);
  }

  return {
    sugestoes: buscar ? sugestoes : [],
    enderecoDoPonto,
    digitar,
    escolher,
    aoMarcarNoMapa,
    usarEnderecoDoPonto,
  };
}
