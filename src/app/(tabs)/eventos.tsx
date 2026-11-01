import React, { useMemo, useRef, useState } from 'react';
import { SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, textStyles } from '@/constants/theme';
import { ActionButton } from '@/presentation/components/ActionButton';
import { MapaDeEventos } from '@/presentation/components/mapa/MapaDeEventos';
import { ScreenHeader } from '@/presentation/components/ScreenHeader';
import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
import { ConfirmationLayer } from '@/presentation/components/ConfirmationLayer';
import { EventoCard } from '@/presentation/components/EventoCard';
import { ErroDadosBanner } from '@/presentation/components/ErroDadosBanner';
import { OfflineBanner } from '@/presentation/components/OfflineBanner';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import { separarEventos } from '@/presentation/utils/eventos';
import {
  useData,
  useAppNavigation,
  useNetwork,
  useServices,
} from '@/presentation/hooks/AppProviders';

interface TelaEventosProps {
  onNovo?(): void;
  onRemover?(eventoId: string): Promise<void>;
}

export default function TelaEventos({ onNovo, onRemover }: TelaEventosProps = {}) {
  const uiStyles = useUIStyles();
  const styles = useStyles();
  const { eventos, reload } = useData();
  const { proximos, realizados } = useMemo(() => separarEventos(eventos), [eventos]);
  const sections = useMemo(() => [
    { key: 'PROXIMOS', title: 'Próximos', testID: 'secao-eventos-proximos', data: proximos },
    { key: 'REALIZADOS', title: 'Realizados', testID: 'secao-eventos-realizados', data: realizados },
  ].filter((section) => section.data.length > 0), [proximos, realizados]);
  const { isOnline } = useNetwork();
  const navigation = useAppNavigation();
  const services = useServices();
  const removingIds = useRef(new Set<string>());
  const [alvo, setAlvo] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mapa, setMapa] = useState<{ focoId: string | null } | null>(null);
  const focado = eventos.find((evento) => evento.id === mapa?.focoId);
  const eventosNoMapa = focado && !proximos.includes(focado) ? [...proximos, focado] : proximos;

  async function removerConfirmado() {
    if (!alvo || removingIds.current.has(alvo)) return;

    const id = alvo;
    setAlvo(null);
    setErro(null);
    removingIds.current.add(id);
    setLoadingId(id);
    try {
      if (onRemover) await onRemover(id);
      else {
        if (!services) throw new Error('Serviço de eventos indisponível');
        await services.useCases.removerEvento.execute({ eventoId: id, confirmado: true });
      }
      await reload();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível remover o evento');
    } finally {
      removingIds.current.delete(id);
      setLoadingId(null);
    }
  }

  return (
    <SafeAreaView style={uiStyles.screen} edges={['top', 'bottom', 'left', 'right']}>
    <SectionList testID="scroll-eventos" sections={sections} keyExtractor={(evento) => evento.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={uiStyles.scrollContent}
      ListHeaderComponent={<View style={uiStyles.listColumn}>
      <OfflineBanner isOnline={isOnline} />
      <ErroDadosBanner />
      <ScreenHeader title="Eventos" action={{ testID: 'novo-evento', title: 'Novo Evento', onPress: () => {
          if (onNovo) onNovo();
          else navigation.novoEvento();
        } }} />
      <Text style={uiStyles.muted}>Onde suas obras encontram novas histórias.</Text>
      {erro ? <Text testID="erro-eventos" style={uiStyles.error}>{erro}</Text> : null}
      {proximos.length > 0 ? <ActionButton label="botao-ver-mapa" title="Ver mapa" icon="pin"
        appearance="secondary" onPress={() => setMapa({ focoId: null })} /> : null}
      </View>}
      renderSectionHeader={({ section }) => <View style={[uiStyles.listColumn, styles.sectionHeader]} testID={section.testID}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
        <Text style={uiStyles.muted}>{section.data.length} {section.data.length === 1 ? 'evento' : 'eventos'}</Text>
      </View>}
      ListEmptyComponent={<Text style={uiStyles.empty}>Nenhum evento — toque em Novo Evento</Text>}
      renderItem={({ item: evento, section }) => <View style={uiStyles.listColumn}>
        <EventoCard
          key={evento.id}
          evento={evento}
          loading={loadingId === evento.id}
          realizado={section.key === 'REALIZADOS'}
          onVerNoMapa={() => setMapa({ focoId: evento.id })}
          onEditar={() => navigation.editarEvento(evento.id)}
          onRemover={() => setAlvo(evento.id)}
        />
      </View>
      } />
      {alvo ? (
        <ConfirmationLayer onDismiss={() => setAlvo(null)}>
        <ConfirmDialog
          titulo="Remover este evento?"
          onCancel={() => setAlvo(null)}
          onConfirm={() => void removerConfirmado()}
          appearance="panel"
        />
        </ConfirmationLayer>
      ) : null}
      <MapaDeEventos visivel={mapa !== null} eventos={eventosNoMapa} focoId={mapa?.focoId}
        onFechar={() => setMapa(null)} />
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.x2,
    paddingTop: spacing.x2, paddingBottom: spacing.x2, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionTitle: { ...textStyles.label, color: colors.text, flex: 1 },
}));
