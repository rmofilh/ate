import React from 'react';
import { Text, View } from 'react-native';

import type { Obra } from '../../core/domain/entities/Obra';
import { ActionButton } from './ActionButton';

export function ObraCard({
  obra,
  onVenda,
  onAdicionar,
  onRemoverUnidades,
  onRemoverObra,
  loading,
}: {
  obra: Obra;
  onVenda(): void;
  onAdicionar(): void;
  onRemoverUnidades(): void;
  onRemoverObra(): void;
  loading: boolean;
}) {
  return (
    <View testID={`obra-${obra.id}`}>
      <Text>
        {obra.nome} ({obra.tipo})
      </Text>
      <Text testID={`qtd-${obra.id}`}>
        Quantidade: {obra.quantidade}
        {obra.quantidade === 0 ? ' (Esgotada)' : ''}
      </Text>
      {obra.tipo === 'SERIE' ? (
        <>
          <ActionButton
            label={`venda-${obra.id}`}
            title="Venda direta"
            onPress={onVenda}
            disabled={loading || obra.quantidade === 0}
          />
          <ActionButton
            label={`add-${obra.id}`}
            title="Adicionar 1 unidade"
            onPress={onAdicionar}
            disabled={loading}
          />
          <ActionButton
            label={`remover-unidades-${obra.id}`}
            title="Remover unidades"
            onPress={onRemoverUnidades}
            disabled={loading || obra.quantidade === 0}
          />
        </>
      ) : null}
      <ActionButton
        label={`remover-obra-${obra.id}`}
        title="Remover obra"
        onPress={onRemoverObra}
        disabled={loading}
      />
    </View>
  );
}
