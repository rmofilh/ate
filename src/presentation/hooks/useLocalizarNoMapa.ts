import { useRef, useState } from 'react';

import { LocalizacaoIndisponivelError } from '@/core/application/errors/LocalizacaoIndisponivelError';
import type { Coordenada } from '@/core/domain/value-objects/Coordenada';

const AVISO_NAO_ENCONTRADO = 'Endereço não encontrado. Posicione o pin no mapa.';
const AVISO_GENERICO = 'Não foi possível buscar o endereço. Posicione o pin no mapa.';

interface SeletorAberto {
  pontoInicial: Coordenada | null;
  aviso: string | null;
}

/**
 * Fluxo "Localizar no mapa" dos formulários de evento: busca o endereço digitado e abre o
 * seletor com o pin no resultado. Sem endereço, sem resultado ou com falha, o seletor abre
 * mesmo assim (no ponto atual) para o pin ser posicionado à mão.
 */
export function useLocalizarNoMapa({
  buscarEndereco,
  aoEscolher,
}: {
  buscarEndereco: ((endereco: string) => Promise<Coordenada | null>) | undefined;
  aoEscolher(coordenada: Coordenada): void;
}) {
  const ocupado = useRef(false);
  const [buscando, setBuscando] = useState(false);
  const [seletor, setSeletor] = useState<SeletorAberto | null>(null);

  async function localizar(endereco: string, pontoAtual: Coordenada | null) {
    if (ocupado.current) return;
    const texto = endereco.trim();
    if (!texto) {
      setSeletor({ pontoInicial: pontoAtual, aviso: null });
      return;
    }

    ocupado.current = true;
    setBuscando(true);
    try {
      if (!buscarEndereco) throw new Error('Busca de endereço indisponível');
      const encontrado = await buscarEndereco(texto);
      setSeletor(
        encontrado
          ? { pontoInicial: encontrado, aviso: null }
          : { pontoInicial: pontoAtual, aviso: AVISO_NAO_ENCONTRADO },
      );
    } catch (erro) {
      setSeletor({
        pontoInicial: pontoAtual,
        aviso: erro instanceof LocalizacaoIndisponivelError ? erro.message : AVISO_GENERICO,
      });
    } finally {
      ocupado.current = false;
      setBuscando(false);
    }
  }

  return {
    buscando,
    localizar,
    seletor: {
      visivel: seletor !== null,
      pontoInicial: seletor?.pontoInicial ?? null,
      aviso: seletor?.aviso ?? null,
      onConfirmar(coordenada: Coordenada) {
        setSeletor(null);
        aoEscolher(coordenada);
      },
      onCancelar: () => setSeletor(null),
    },
  };
}
