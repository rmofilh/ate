import React from 'react';
import { Text, View } from 'react-native';

import type { Evento } from '../../core/domain/entities/Evento';
import { formatCalendarDate } from '../utils/date';
import { ActionButton } from './ActionButton';

export function EventoCard({
  evento,
  onEditar,
  onRemover,
  loading,
}: {
  evento: Evento;
  onEditar(): void;
  onRemover(): void;
  loading: boolean;
}) {
  return (
    <View testID={`evento-${evento.id}`}>
      <Text>
        {evento.nome} - {formatCalendarDate(evento.data)} - {evento.endereco}
      </Text>
      <Text testID={`pin-${evento.id}`}>
        Pin: {evento.localizacao.latitude}, {evento.localizacao.longitude}
      </Text>
      <ActionButton
        label={`editar-evento-${evento.id}`}
        title="Editar evento"
        onPress={onEditar}
        disabled={loading}
      />
      <ActionButton
        label={`remover-${evento.id}`}
        title={loading ? 'Removendo...' : 'Remover evento'}
        onPress={onRemover}
        disabled={loading}
      />
    </View>
  );
}
