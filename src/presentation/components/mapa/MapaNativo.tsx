import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Coordenada } from '@/core/domain/value-objects/Coordenada';
import {
  caixaDosPontos,
  deLngLat,
  paraLngLat,
  type PontoNoMapa,
} from '@/infrastructure/device/mapa/geometria';
import { carregarMapLibre, ESTILO_DO_MAPA } from '@/infrastructure/device/mapa/mapLibre';
import { useNetwork } from '@/presentation/hooks/AppProviders';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';
import { useUIStyles } from '@/presentation/styles/uiStyles';

export type { PontoNoMapa };

export interface MapaNativoRef {
  /** Move o pin para o ponto e centraliza o mapa nele. */
  centralizar(ponto: PontoNoMapa): void;
  /** Só move a câmera (sem pin), ex.: para perto do usuário ao abrir. */
  mover(ponto: PontoNoMapa, zoom?: number): void;
}

/** Evento mostrado no mapa de consulta. */
export interface MarcadorNoMapa extends PontoNoMapa {
  id: string;
  titulo: string;
}

export interface MapaNativoProps {
  centroInicial: PontoNoMapa;
  zoomInicial: number;
  pinInicial?: PontoNoMapa | null;
  onEscolher?(ponto: PontoNoMapa): void;
  onSelecionarMarcador?(id: string): void;
  somenteLeitura?: boolean;
  marcadores?: readonly MarcadorNoMapa[];
  /** Marcador destacado ao abrir; com ele, o mapa não se ajusta ao conjunto. */
  marcadorEmFoco?: string | null;
}

const ZOOM_AO_CENTRALIZAR = 16;
const ZOOM_PERTO_DO_USUARIO = 13;
const MARGEM_DO_CONJUNTO = { top: 48, right: 48, bottom: 48, left: 48 };

function pontoValido(lngLat: readonly [number, number]): PontoNoMapa | null {
  const ponto = deLngLat(lngLat);
  return Coordenada.validar(ponto.latitude, ponto.longitude) ? ponto : null;
}

/**
 * Mapa nativo (MapLibre + OpenFreeMap), sem WebView e sem chave de API. As áreas dos eventos são
 * baixadas para uso offline (ver MapaOfflineMapLibre); fora delas, sem internet, o mapa fica sem
 * as ruas, mas o pin, o GPS e as coordenadas continuam funcionando. No Expo Go (sem o módulo
 * nativo) mostra um aviso no lugar do mapa.
 */
export const MapaNativo = forwardRef<MapaNativoRef, MapaNativoProps>(function MapaNativo(
  {
    centroInicial,
    zoomInicial,
    pinInicial = null,
    onEscolher,
    onSelecionarMarcador,
    somenteLeitura = false,
    marcadores = [],
    marcadorEmFoco = null,
  },
  ref,
) {
  const uiStyles = useUIStyles();
  const styles = useStyles();
  const { isOnline } = useNetwork();
  const camera = useRef<{ flyTo(opcoes: object): void } | null>(null);
  const [pin, setPin] = useState<PontoNoMapa | null>(pinInicial);
  const [mapLibre] = useState(carregarMapLibre);
  const [vistaInicial] = useState(() => {
    const caixa = !marcadorEmFoco ? caixaDosPontos(marcadores) : null;
    return caixa
      ? { bounds: caixa, padding: MARGEM_DO_CONJUNTO }
      : { center: paraLngLat(centroInicial), zoom: zoomInicial };
  });

  useImperativeHandle(ref, () => ({
    centralizar(ponto) {
      setPin(ponto);
      camera.current?.flyTo({ center: paraLngLat(ponto), zoom: ZOOM_AO_CENTRALIZAR, duration: 600 });
    },
    mover(ponto, zoom = ZOOM_PERTO_DO_USUARIO) {
      camera.current?.flyTo({ center: paraLngLat(ponto), zoom, duration: 600 });
    },
  }));

  function escolher(lngLat: readonly [number, number]) {
    if (somenteLeitura) return;
    const ponto = pontoValido(lngLat);
    if (!ponto) return;
    setPin(ponto);
    onEscolher?.(ponto);
  }

  if (!mapLibre) {
    return (
      <View testID="mapa-indisponivel" style={[styles.area, styles.semMapa]}>
        <Text style={uiStyles.notice}>
          {somenteLeitura
            ? 'O mapa aparece no app instalado. Os eventos continuam na lista.'
            : 'O mapa aparece no app instalado. Use "Minha localização" ou informe as coordenadas no formulário.'}
        </Text>
      </View>
    );
  }

  const { Map, Camera, ViewAnnotation } = mapLibre;
  return (
    <View style={styles.area}>
      <Map
        testID="mapa"
        style={styles.area}
        mapStyle={ESTILO_DO_MAPA}
        attribution
        logo={false}
        onPress={(evento) => escolher(evento.nativeEvent.lngLat)}
      >
        <Camera ref={camera as never} initialViewState={vistaInicial} />
        {marcadores.map((marcador) => (
          <ViewAnnotation
            key={marcador.id}
            id={marcador.id}
            lngLat={paraLngLat(marcador)}
            title={marcador.titulo}
            selected={marcador.id === marcadorEmFoco}
            onPress={() => onSelecionarMarcador?.(marcador.id)}
          >
            <View
              accessibilityLabel={marcador.titulo}
              style={[styles.pino, styles.pinoDeEvento, marcador.id === marcadorEmFoco && styles.pinoEmFoco]}
            />
          </ViewAnnotation>
        ))}
        {pin && !somenteLeitura ? (
          <ViewAnnotation
            id="pin"
            lngLat={paraLngLat(pin)}
            draggable
            onDragEnd={(evento) => escolher(evento.nativeEvent.lngLat)}
          >
            <View accessibilityLabel="Local escolhido" style={styles.pino} />
          </ViewAnnotation>
        ) : null}
      </Map>
      {!isOnline ? (
        <View testID="mapa-offline" style={styles.aviso}>
          <Text style={uiStyles.notice}>
            Sem internet: aparecem as ruas das áreas já baixadas (eventos salvos).
            {somenteLeitura ? '' : ' O pin e o GPS funcionam em qualquer lugar.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const useStyles = createThemedStyles((colors) => ({
  area: { flex: 1 },
  semMapa: { justifyContent: 'center' as const, padding: spacing.x4, backgroundColor: colors.surfaceSecondary },
  aviso: { position: 'absolute' as const, left: spacing.x3, right: spacing.x3, top: spacing.x3 },
  pino: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.primary,
  },
  pinoDeEvento: { backgroundColor: colors.accent },
  pinoEmFoco: { backgroundColor: colors.doing, width: 28, height: 28, borderRadius: 14 },
}));
