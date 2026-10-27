import React, { useEffect, useRef, useState } from 'react';

import type { PonteDaCamera, ResultadoDaCamera } from '@/main/factories/ProviderBag';
import { CameraModal } from './CameraModal';

/**
 * Montado uma vez no AppProviders. Ensina o gateway a abrir o modal da câmera e resolve a
 * Promise do capture() quando o modal fecha. Se desmontar no meio, a captura vira cancelamento.
 */
export function CameraHost({ ponte }: { ponte?: PonteDaCamera }) {
  const resolver = useRef<((resultado: ResultadoDaCamera) => void) | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (!ponte) return;
    const remover = ponte.registrarAbridor(
      () =>
        new Promise<ResultadoDaCamera>((resolve) => {
          resolver.current = resolve;
          setVisivel(true);
        }),
    );
    return () => {
      remover();
      resolver.current?.({ tipo: 'cancelado' });
      resolver.current = null;
    };
  }, [ponte]);

  function concluir(resultado: ResultadoDaCamera) {
    const resolve = resolver.current;
    resolver.current = null;
    setVisivel(false);
    resolve?.(resultado);
  }

  return <CameraModal visivel={visivel} onResultado={concluir} />;
}
