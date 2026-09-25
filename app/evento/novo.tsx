import React, { useRef, useState } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';

import { Coordenada } from '../../src/core/domain/value-objects/Coordenada';
import { ActionButton } from '../../src/presentation/components/ActionButton';
import {
  useAppNavigation,
  useData,
  useServices,
} from '../../src/presentation/hooks/AppProviders';
import { parseCalendarDate } from '../../src/presentation/utils/date';

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
    <ScrollView>
      <Text accessibilityRole="header">Novo Evento</Text>
      <Text>Nome da feira</Text>
      <TextInput
        accessibilityLabel="Nome da feira"
        testID="campo-nome-evento"
        value={nome}
        onChangeText={setNome}
      />
      <Text>Data (AAAA-MM-DD)</Text>
      <TextInput
        accessibilityLabel="Data do evento"
        testID="campo-data-evento"
        value={dataTexto}
        onChangeText={setDataTexto}
      />
      <Text>Endereço</Text>
      <TextInput
        accessibilityLabel="Endereço"
        testID="campo-endereco-evento"
        value={endereco}
        onChangeText={setEndereco}
      />
      <Text>Observações (opcional)</Text>
      <TextInput
        accessibilityLabel="Observações"
        testID="campo-obs-evento"
        value={observacoes}
        onChangeText={setObservacoes}
      />
      <ActionButton
        label="botao-usar-gps"
        title={gpsLoading ? 'Buscando localização...' : 'Usar minha localização'}
        onPress={() => void usarGps()}
        disabled={gpsLoading || loading}
      />
      <Text>Ou informe as coordenadas manualmente</Text>
      <TextInput
        accessibilityLabel="Latitude"
        testID="campo-latitude-manual"
        value={latitudeTexto}
        onChangeText={setLatitudeTexto}
        keyboardType="numbers-and-punctuation"
      />
      <TextInput
        accessibilityLabel="Longitude"
        testID="campo-longitude-manual"
        value={longitudeTexto}
        onChangeText={setLongitudeTexto}
        keyboardType="numbers-and-punctuation"
      />
      <ActionButton
        label="usar-localizacao-manual"
        title="Usar localização informada"
        onPress={usarLocalizacaoManual}
        disabled={gpsLoading || loading}
      />
      {ponto ? (
        <Text testID="ponto-selecionado">
          Local selecionado: {ponto.latitude}, {ponto.longitude}
        </Text>
      ) : null}
      {erro ? (
        <Text testID="erro-evento" accessibilityLiveRegion="polite">
          {erro}
        </Text>
      ) : null}
      <ActionButton
        label="botao-salvar-evento"
        title={loading ? 'Salvando...' : 'Salvar Evento'}
        onPress={() => void salvar()}
        disabled={loading || gpsLoading}
      />
    </ScrollView>
  );
}
