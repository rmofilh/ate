import React, { useRef, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/presentation/components/ScreenHeader';
import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
import { ConfirmationLayer } from '@/presentation/components/ConfirmationLayer';
import { EventoCard } from '@/presentation/components/EventoCard';
import { OfflineBanner } from '@/presentation/components/OfflineBanner';
import { useUIStyles } from '@/presentation/styles/uiStyles';
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
  const { eventos, reload } = useData();
  const { isOnline } = useNetwork();
  const navigation = useAppNavigation();
  const services = useServices();
  const removingIds = useRef(new Set<string>());
  const [alvo, setAlvo] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

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
    <FlatList testID="scroll-eventos" data={eventos} keyExtractor={(evento) => evento.id}
      contentContainerStyle={uiStyles.scrollContent}
      ListHeaderComponent={<View style={uiStyles.listColumn}>
      <OfflineBanner isOnline={isOnline} />
      <ScreenHeader title="Eventos" action={{ testID: 'novo-evento', title: 'Novo Evento', onPress: () => {
          if (onNovo) onNovo();
          else navigation.novoEvento();
        } }} />
      <Text style={uiStyles.muted}>Onde suas obras encontram novas histórias.</Text>
      {erro ? <Text testID="erro-eventos" style={uiStyles.error}>{erro}</Text> : null}
      </View>}
      ListEmptyComponent={<Text style={uiStyles.empty}>Nenhum evento — toque em Novo Evento</Text>}
      renderItem={({ item: evento }) => <View style={uiStyles.listColumn}>
        <EventoCard
          key={evento.id}
          evento={evento}
          loading={loadingId === evento.id}
          onEditar={() => navigation.editarEvento(evento.id)}
          onRemover={() => setAlvo(evento.id)}
        />
      </View>
      } />
      {alvo ? (
        <ConfirmationLayer onDismiss={() => setAlvo(null)}>
        <ConfirmDialog
          titulo="Remover este evento cancelado?"
          onCancel={() => setAlvo(null)}
          onConfirm={() => void removerConfirmado()}
          appearance="panel"
        />
        </ConfirmationLayer>
      ) : null}
    </SafeAreaView>
  );
}
