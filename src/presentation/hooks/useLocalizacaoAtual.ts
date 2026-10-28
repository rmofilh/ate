import { useRef, useState } from 'react';
import { Linking } from 'react-native';

import { LocalizacaoIndisponivelError } from '@/core/application/errors/LocalizacaoIndisponivelError';
import type { Coordenada } from '@/core/domain/value-objects/Coordenada';

export interface FalhaDeLocalizacao {
  mensagem: string;
  podeAbrirConfiguracoes: boolean;
}

const MENSAGEM_GENERICA =
  'Não foi possível obter a localização. Tente de novo ou informe as coordenadas manualmente.';

function falhaDe(erro: unknown): FalhaDeLocalizacao {
  if (erro instanceof LocalizacaoIndisponivelError) {
    return {
      mensagem: erro.message,
      podeAbrirConfiguracoes: erro.motivo === 'NEGADA_PERMANENTE',
    };
  }
  return { mensagem: MENSAGEM_GENERICA, podeAbrirConfiguracoes: false };
}

/**
 * Leitura pontual do GPS para os formulários de evento: protege contra toque duplo e traduz a
 * falha em mensagem e ação. Nada é lido na montagem; só quando `buscar` é chamado (RNF12).
 */
export function useLocalizacaoAtual(ler: (() => Promise<Coordenada>) | undefined) {
  const ocupado = useRef(false);
  const [buscando, setBuscando] = useState(false);
  const [falha, setFalha] = useState<FalhaDeLocalizacao | null>(null);

  async function buscar(): Promise<Coordenada | null> {
    if (ocupado.current) return null;
    ocupado.current = true;
    setBuscando(true);
    setFalha(null);
    try {
      if (!ler) throw new Error('Serviço de localização indisponível');
      return await ler();
    } catch (erro) {
      setFalha(falhaDe(erro));
      return null;
    } finally {
      ocupado.current = false;
      setBuscando(false);
    }
  }

  return {
    buscando,
    falha,
    buscar,
    limparFalha: () => setFalha(null),
    abrirConfiguracoes: () => void Linking.openSettings(),
  };
}
