import React, { useRef, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, textStyles } from '@/constants/theme';
import { Coordenada } from '@/core/domain/value-objects/Coordenada';
import { ActionButton } from '@/presentation/components/ActionButton';
import { MapaLeaflet, type MapaLeafletRef, type PontoNoMapa } from '@/presentation/components/mapa/MapaLeaflet';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';
import { useLocalizacaoAtual } from '@/presentation/hooks/useLocalizacaoAtual';
import { useUIStyles } from '@/presentation/styles/uiStyles';

/** Sem ponto conhecido, o mapa abre amplo sobre São Paulo. */
const CENTRO_PADRAO: PontoNoMapa = { latitude: -23.5505, longitude: -46.6333 };
const ZOOM_PADRAO = 10;
const ZOOM_DO_PIN = 16;

export interface SeletorDeLocalProps {
  visivel: boolean;
  pontoInicial: Coordenada | null;
  /** Mensagem do fluxo de busca (ex.: endereço não encontrado). */
  aviso?: string | null;
  lerGps: (() => Promise<Coordenada>) | undefined;
  onConfirmar(coordenada: Coordenada): void;
  onCancelar(): void;
}

/**
 * Modal com mapa (Leaflet + OpenStreetMap) para escolher o local do evento: toque ou arraste do pin, atalho
 * "Minha localização" pelo GPS e confirmação. O mapa só é montado com o modal aberto.
 */
export function SeletorDeLocal({ visivel, onCancelar, ...props }: SeletorDeLocalProps) {
  return (
    <Modal testID="seletor-de-local" visible={visivel} animationType="slide" onRequestClose={onCancelar}>
      {visivel ? <ConteudoDoSeletor onCancelar={onCancelar} {...props} /> : null}
    </Modal>
  );
}

function ConteudoDoSeletor({
  pontoInicial,
  aviso,
  lerGps,
  onConfirmar,
  onCancelar,
}: Omit<SeletorDeLocalProps, 'visivel'>) {
  const uiStyles = useUIStyles();
  const styles = useStyles();
  const mapa = useRef<MapaLeafletRef>(null);
  const gps = useLocalizacaoAtual(lerGps);
  const [pinInicial] = useState<PontoNoMapa | null>(() =>
    pontoInicial ? { latitude: pontoInicial.latitude, longitude: pontoInicial.longitude } : null,
  );
  const [pin, setPin] = useState<PontoNoMapa | null>(pinInicial);

  async function irParaMinhaLocalizacao() {
    const coordenada = await gps.buscar();
    if (!coordenada) return;
    const ponto = { latitude: coordenada.latitude, longitude: coordenada.longitude };
    setPin(ponto);
    mapa.current?.centralizar(ponto);
  }

  function confirmar() {
    if (!pin) return;
    onConfirmar(new Coordenada(pin.latitude, pin.longitude));
  }

  return (
    <SafeAreaView style={styles.tela}>
      <View style={styles.cabecalho}>
        <Text accessibilityRole="header" style={uiStyles.title}>Local do evento</Text>
        <Text style={uiStyles.muted}>Toque no mapa ou arraste o pin até o local da feira.</Text>
        {aviso ? (
          <Text testID="aviso-seletor" accessibilityLiveRegion="polite" style={uiStyles.notice}>{aviso}</Text>
        ) : null}
      </View>
      <MapaLeaflet
        ref={mapa}
        centroInicial={pinInicial ?? CENTRO_PADRAO}
        zoomInicial={pinInicial ? ZOOM_DO_PIN : ZOOM_PADRAO}
        pinInicial={pinInicial}
        onEscolher={setPin}
      />
      <View style={styles.rodape}>
        <Text testID="aviso-sem-internet" style={uiStyles.muted}>
          Sem internet o mapa pode não carregar; o pin e o GPS continuam funcionando.
        </Text>
        <Text testID="coordenada-do-pin" style={uiStyles.body}>
          {pin ? `Pin: ${pin.latitude}, ${pin.longitude}` : 'Nenhum ponto escolhido'}
        </Text>
        {gps.falha ? (
          <View style={styles.falha}>
            <Text testID="erro-gps" accessibilityLiveRegion="polite" style={uiStyles.error}>
              {gps.falha.mensagem}
            </Text>
            {gps.falha.podeAbrirConfiguracoes ? (
              <ActionButton label="botao-abrir-configuracoes" title="Abrir configurações"
                appearance="secondary" onPress={gps.abrirConfiguracoes} />
            ) : null}
          </View>
        ) : null}
        <ActionButton
          label="botao-minha-localizacao"
          title={gps.buscando ? 'Buscando localização...' : 'Minha localização'}
          icon="location"
          appearance="secondary"
          disabled={gps.buscando}
          busy={gps.buscando}
          onPress={() => void irParaMinhaLocalizacao()}
        />
        <View style={styles.acoes}>
          <ActionButton label="botao-cancelar-local" title="Cancelar" appearance="secondary" onPress={onCancelar} />
          <ActionButton label="botao-confirmar-local" title="Confirmar local" icon="check"
            appearance="primary" disabled={!pin} onPress={confirmar} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  tela: { flex: 1, backgroundColor: colors.background },
  cabecalho: { padding: spacing.x4, gap: spacing.x2 },
  rodape: { padding: spacing.x4, gap: spacing.x3, backgroundColor: colors.surface },
  falha: { gap: spacing.x2 },
  acoes: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: spacing.x3 },
  erro: { ...textStyles.body, color: colors.error },
}));
