import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { ActionButton } from '@/presentation/components/ActionButton';
import { StyledTextInput as TextInput } from '@/presentation/components/StyledTextInput';
import { useUIStyles } from '@/presentation/styles/uiStyles';

/** Alternativa sem internet ao mapa, recolhida para não competir com o fluxo principal. */
export function CoordenadasManuais({
  titulo,
  latitude,
  longitude,
  onLatitude,
  onLongitude,
  onUsar,
  disabled,
}: {
  titulo: string;
  latitude: string;
  longitude: string;
  onLatitude(valor: string): void;
  onLongitude(valor: string): void;
  onUsar(): void;
  disabled: boolean;
}) {
  const uiStyles = useUIStyles();
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <ActionButton
        label="alternar-coordenadas-manuais"
        title="Informar coordenadas manualmente"
        icon={aberta ? 'collapse' : 'expand'}
        appearance="quiet"
        expanded={aberta}
        onPress={() => setAberta((atual) => !atual)}
      />
      {aberta ? (
        <>
          <View style={uiStyles.field}>
            <Text style={uiStyles.body}>{titulo}</Text>
            <TextInput
              accessibilityLabel="Latitude"
              placeholder="Latitude"
              testID="campo-latitude-manual"
              value={latitude}
              onChangeText={onLatitude}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              accessibilityLabel="Longitude"
              placeholder="Longitude"
              testID="campo-longitude-manual"
              value={longitude}
              onChangeText={onLongitude}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <ActionButton
            label="usar-localizacao-manual"
            title="Usar localização informada"
            onPress={onUsar}
            disabled={disabled}
            appearance="secondary"
          />
        </>
      ) : null}
    </>
  );
}
