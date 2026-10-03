import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Coordenada } from '@/core/domain/value-objects/Coordenada';
import { ActionButton } from '@/presentation/components/ActionButton';
import { DateField } from '@/presentation/components/DateField';
import { FormScreen } from '@/presentation/components/FormScreen';
import { StyledTextInput as TextInput } from '@/presentation/components/StyledTextInput';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import {
  useAppNavigation,
  useData,
  useServices,
} from '@/presentation/hooks/AppProviders';
import { parseCalendarDate } from '@/presentation/utils/date';

interface NovoEventoInput {
  nome: string;
  data: Date;
  endereco: string;
  localizacao: Coordenada;
  observacoes: string;
}

interface TelaNovoEventoProps {
  onGps?(): Promise<{ latitude: number; longitude: number }>;
  onSalvar?(args: NovoEventoInput): Promise<void>;
  onConcluido?(): void;
}

export default function TelaNovoEvento({
  onGps,
  onSalvar,
  onConcluido,
}: TelaNovoEventoProps = {}) {
  const uiStyles = useUIStyles();
  const { reload } = useData();
  const services = useServices();
  const navigation = useAppNavigation();
  const gpsBusy = useRef(false);
  const submitting = useRef(false);
  const [nome, setNome] = useState('');
  const [dataTexto, setDataTexto] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [latitudeTexto, setLatitudeTexto] = useState('');
  const [longitudeTexto, setLongitudeTexto] = useState('');
  const [ponto, setPonto] = useState<{ latitude: number; longitude: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  async function usarGps() {
    if (gpsBusy.current) return;

    gpsBusy.current = true;
    setGpsLoading(true);
    setErro(null);
    try {
      const coordenada = onGps
        ? await onGps()
        : await services?.gateways.location.getCurrent();
      if (!coordenada) throw new Error('Serviço de localização indisponível');
      setPonto({ latitude: coordenada.latitude, longitude: coordenada.longitude });
    } catch (error) {
      const motivo = error instanceof Error ? error.message : 'Permissão de localização negada';
      setErro(
        `${motivo}. Habilite a localização nas configurações do dispositivo ou posicione o pin manualmente.`,
      );
    } finally {
      gpsBusy.current = false;
      setGpsLoading(false);
    }
  }

  function usarLocalizacaoManual() {
    if (!latitudeTexto.trim() || !longitudeTexto.trim()) {
      setErro('Informe latitude e longitude válidas');
      return;
    }

    const latitude = Number(latitudeTexto.replace(',', '.'));
    const longitude = Number(longitudeTexto.replace(',', '.'));
    try {
      const coordenada = new Coordenada(latitude, longitude);
      setPonto({ latitude: coordenada.latitude, longitude: coordenada.longitude });
      setErro(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Informe latitude e longitude válidas');
    }
  }

  async function salvar() {
    if (submitting.current) return;

    const data = parseCalendarDate(dataTexto);
    const nomeLimpo = nome.trim();
    const enderecoLimpo = endereco.trim();
    if (!nomeLimpo || !enderecoLimpo || !data || !ponto) {
      setErro('Preencha nome, data, endereço e selecione a localização');
      return;
    }

    const input: NovoEventoInput = {
      nome: nomeLimpo,
      data,
      endereco: enderecoLimpo,
      localizacao: new Coordenada(ponto.latitude, ponto.longitude),
      observacoes: observacoes.trim(),
    };
    submitting.current = true;
    setLoading(true);
    setErro(null);
    try {
      if (onSalvar) await onSalvar(input);
      else {
        if (!services) throw new Error('Serviço de eventos indisponível');
        await services.useCases.cadastrarEvento.execute({
          ...input,
          usuarioId: services.usuarioId,
        });
        await reload();
      }
      if (onConcluido) onConcluido();
      else navigation.voltar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar o evento');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <FormScreen>
      <View style={uiStyles.formColumn}>
      <Text accessibilityRole="header" style={uiStyles.title}>Novo Evento</Text>
      <Text style={uiStyles.muted}>Uma nova oportunidade de levar suas obras ao mundo.</Text>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Nome da feira</Text>
      <TextInput
        accessibilityLabel="Nome da feira"
        testID="campo-nome-evento"
        value={nome}
        onChangeText={setNome}
      />
      </View>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Data do evento</Text>
      <DateField
        accessibilityLabel="Data do evento"
        testID="campo-data-evento"
        value={dataTexto}
        onChangeText={setDataTexto}
        editable={!loading}
      />
      </View>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Endereço</Text>
      <TextInput
        accessibilityLabel="Endereço"
        testID="campo-endereco-evento"
        value={endereco}
        onChangeText={setEndereco}
      />
      </View>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Observações (opcional)</Text>
      <TextInput
        accessibilityLabel="Observações"
        testID="campo-obs-evento"
        value={observacoes}
        onChangeText={setObservacoes}
      />
      </View>
      <ActionButton
        label="botao-usar-gps"
        title={gpsLoading ? 'Buscando localização...' : 'Usar minha localização'}
        onPress={() => void usarGps()}
        disabled={gpsLoading || loading}
        appearance="secondary"
        icon="location"
        busy={gpsLoading}
      />
      <View style={uiStyles.field}>
      <Text style={uiStyles.body}>Ou informe as coordenadas manualmente</Text>
      <TextInput
        accessibilityLabel="Latitude"
        placeholder="Latitude"
        testID="campo-latitude-manual"
        value={latitudeTexto}
        onChangeText={setLatitudeTexto}
        keyboardType="numbers-and-punctuation"
      />
      <TextInput
        accessibilityLabel="Longitude"
        placeholder="Longitude"
        testID="campo-longitude-manual"
        value={longitudeTexto}
        onChangeText={setLongitudeTexto}
        keyboardType="numbers-and-punctuation"
      />
      </View>
      <ActionButton
        label="usar-localizacao-manual"
        title="Usar localização informada"
        onPress={usarLocalizacaoManual}
        disabled={gpsLoading || loading}
        appearance="secondary"
      />
      {ponto ? (
        <Text testID="ponto-selecionado" style={uiStyles.notice}>
          Local selecionado: {ponto.latitude}, {ponto.longitude}
        </Text>
      ) : null}
      {erro ? (
        <Text testID="erro-evento" accessibilityLiveRegion="polite" style={uiStyles.error}>
          {erro}
        </Text>
      ) : null}
      <ActionButton
        label="botao-salvar-evento"
        title={loading ? 'Salvando...' : 'Salvar Evento'}
        onPress={() => void salvar()}
        disabled={loading || gpsLoading}
        appearance="primary"
        icon="check"
        busy={loading}
      />
      </View>
    </FormScreen>
  );
}
