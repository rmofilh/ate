import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import type { Evento } from '@/core/domain/entities/Evento';
import { ActionButton } from '@/presentation/components/ActionButton';
import { MapaLeaflet, type MarcadorNoMapa } from '@/presentation/components/mapa/MapaLeaflet';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import { formatCalendarDate } from '@/presentation/utils/date';

const ZOOM_DO_EVENTO = 15;

export function urlDeComoChegar(evento: Evento): string {
  const { latitude, longitude } = evento.localizacao;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function marcadorDo(evento: Evento): MarcadorNoMapa {
  return {
    id: evento.id,
    titulo: `${evento.nome} · ${formatCalendarDate(evento.data)}`,
    latitude: evento.localizacao.latitude,
    longitude: evento.localizacao.longitude,
  };
}

interface MapaDeEventosProps {
  visivel: boolean;
  eventos: readonly Evento[];
  /** Evento já selecionado ao abrir; sem ele, o mapa mostra o conjunto. */
  focoId?: string | null;
  onFechar(): void;
}

/** Modal de consulta com os pins dos eventos (RF13). O mapa só é montado com o modal aberto. */
export function MapaDeEventos({ visivel, onFechar, ...props }: MapaDeEventosProps) {
  return (
    <Modal testID="mapa-de-eventos" visible={visivel} animationType="slide" onRequestClose={onFechar}>
      {visivel ? <ConteudoDoMapa onFechar={onFechar} {...props} /> : null}
    </Modal>
  );
}

function ConteudoDoMapa({ eventos, focoId = null, onFechar }: Omit<MapaDeEventosProps, 'visivel'>) {
  const uiStyles = useUIStyles();
  const styles = useStyles();
  const [selecionadoId, setSelecionadoId] = useState<string | null>(
    focoId ?? (eventos.length === 1 ? eventos[0].id : null),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [marcadores] = useState(() => eventos.map(marcadorDo));
  const selecionado = eventos.find((evento) => evento.id === selecionadoId);
  const centro = marcadores.find((marcador) => marcador.id === selecionadoId) ?? marcadores[0];

  async function comoChegar(evento: Evento) {
    setErro(null);
    try {
      await Linking.openURL(urlDeComoChegar(evento));
    } catch {
      setErro('Não foi possível abrir o app de mapas');
    }
  }

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.cabecalho}>
        <Text accessibilityRole="header" style={uiStyles.title}>Mapa de eventos</Text>
        <Text style={uiStyles.muted}>Toque em um pin para ver o evento.</Text>
      </View>
      {centro ? (
        <MapaLeaflet
          centroInicial={centro}
          zoomInicial={ZOOM_DO_EVENTO}
          somenteLeitura
          marcadores={marcadores}
          marcadorEmFoco={focoId}
          onSelecionarMarcador={(id) => {
            setErro(null);
            setSelecionadoId(id);
          }}
        />
      ) : <View style={styles.vazio} />}
      <View style={styles.rodape}>
        {selecionado ? (
          <View testID="evento-selecionado" style={styles.detalhe}>
            <Text style={uiStyles.heading}>{selecionado.nome}</Text>
            <Text style={uiStyles.muted}>{formatCalendarDate(selecionado.data)}</Text>
            <Text style={uiStyles.body}>{selecionado.endereco}</Text>
          </View>
        ) : null}
        {erro ? (
          <Text testID="erro-como-chegar" accessibilityLiveRegion="polite" style={uiStyles.error}>{erro}</Text>
        ) : null}
        <View style={styles.acoes}>
          <ActionButton label="botao-fechar-mapa" title="Fechar" appearance="secondary" onPress={onFechar} />
          {selecionado ? (
            <ActionButton label="botao-como-chegar" title="Como chegar" icon="forward" appearance="primary"
              onPress={() => void comoChegar(selecionado)} />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  tela: { flex: 1, backgroundColor: colors.background },
  cabecalho: { padding: spacing.x4, gap: spacing.x2 },
  vazio: { flex: 1 },
  rodape: { padding: spacing.x4, gap: spacing.x3, backgroundColor: colors.surface },
  detalhe: { gap: spacing.x1 },
  acoes: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: spacing.x3 },
}));
