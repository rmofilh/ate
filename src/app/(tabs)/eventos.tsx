import React, { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/presentation/components/ActionButton';
import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
import { ConfirmationLayer } from '@/presentation/components/ConfirmationLayer';
import { EventoCard } from '@/presentation/components/EventoCard';
import { OfflineBanner } from '@/presentation/components/OfflineBanner';
import { uiStyles } from '@/presentation/styles/uiStyles';
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
    <SafeAreaView style={uiStyles.screen} edges={['bottom', 'left', 'right']}>
    <ScrollView testID="scroll-eventos" contentContainerStyle={uiStyles.formContent}>
      <View style={uiStyles.formColumn}>
      <OfflineBanner isOnline={isOnline} />
      <Text accessibilityRole="header" style={uiStyles.title}>Mapa de Eventos</Text>
      <ActionButton
        label="novo-evento"
        title="Novo Evento"
        onPress={() => {
          if (onNovo) onNovo();
          else navigation.novoEvento();
        }}
        appearance="primary"
      />
      {erro ? <Text testID="erro-eventos" style={uiStyles.error}>{erro}</Text> : null}
      {eventos.length === 0 ? <Text style={uiStyles.empty}>Nenhum evento — toque em Novo Evento</Text> : null}
      {eventos.map((evento) => (
        <EventoCard
          key={evento.id}
          evento={evento}
          loading={loadingId === evento.id}
          onEditar={() => navigation.editarEvento(evento.id)}
          onRemover={() => setAlvo(evento.id)}
        />
      ))}
      </View>
    </ScrollView>
      {alvo ? (
        <ConfirmationLayer>
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
