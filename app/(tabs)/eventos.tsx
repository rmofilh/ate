import React, { useRef, useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { ActionButton } from '../../src/presentation/components/ActionButton';
import { ConfirmDialog } from '../../src/presentation/components/ConfirmDialog';
import { EventoCard } from '../../src/presentation/components/EventoCard';
import { OfflineBanner } from '../../src/presentation/components/OfflineBanner';
import {
  useData,
  useAppNavigation,
  useNetwork,
  useServices,
} from '../../src/presentation/hooks/AppProviders';

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
    <ScrollView testID="scroll-eventos">
      <OfflineBanner isOnline={isOnline} />
      <Text accessibilityRole="header">Mapa de Eventos</Text>
      <ActionButton
        label="novo-evento"
        title="Novo Evento"
        onPress={() => {
          if (onNovo) onNovo();
          else navigation.novoEvento();
        }}
      />
      {erro ? <Text testID="erro-eventos">{erro}</Text> : null}
      {eventos.length === 0 ? <Text>Nenhum evento — toque em Novo Evento</Text> : null}
      {eventos.map((evento) => (
        <EventoCard
          key={evento.id}
          evento={evento}
          loading={loadingId === evento.id}
          onEditar={() => navigation.editarEvento(evento.id)}
          onRemover={() => setAlvo(evento.id)}
        />
      ))}
      {alvo ? (
        <ConfirmDialog
          titulo="Remover este evento cancelado?"
          onCancel={() => setAlvo(null)}
          onConfirm={() => void removerConfirmado()}
        />
      ) : null}
    </ScrollView>
  );
}
