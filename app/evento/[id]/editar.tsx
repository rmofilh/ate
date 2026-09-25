import React, { useRef, useState } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';

import type { Evento } from '../../../src/core/domain/entities/Evento';
import { Coordenada } from '../../../src/core/domain/value-objects/Coordenada';
import { ActionButton } from '../../../src/presentation/components/ActionButton';
import {
  useAppNavigation,
  useData,
  useRouteParams,
  useServices,
} from '../../../src/presentation/hooks/AppProviders';
import { parseCalendarDate } from '../../../src/presentation/utils/date';

interface EditarEventoInput {
  nome: string;
  data: Date;
  endereco: string;
  localizacao: Coordenada;
  observacoes: string;
}

interface TelaEditarEventoProps {
  evento?: Evento;
  onGps?(): Promise<{ latitude: number; longitude: number }>;
  onSalvar?(args: EditarEventoInput): Promise<void>;
  onConcluido?(): void;
}

export default function TelaEditarEvento({
  evento: eventoRecebido,
  onGps,
  onSalvar,
  onConcluido,
}: TelaEditarEventoProps = {}) {
  const { eventos, reload } = useData();
  const services = useServices();
  const navigation = useAppNavigation();
  const { id } = useRouteParams();
  const evento = eventoRecebido ?? eventos.find((item) => item.id === id);
  const gpsBusy = useRef(false);
  const submitting = useRef(false);
  const [nome, setNome] = useState(evento?.nome ?? '');
  const [dataTexto, setDataTexto] = useState(evento?.data.toISOString().slice(0, 10) ?? '');
  const [endereco, setEndereco] = useState(evento?.endereco ?? '');
  const [observacoes, setObservacoes] = useState(evento?.observacoes ?? '');
  const [latitudeTexto, setLatitudeTexto] = useState('');
  const [longitudeTexto, setLongitudeTexto] = useState('');
  const [ponto, setPonto] = useState<{ latitude: number; longitude: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  async function atualizarGps() {
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
        `${motivo}. Habilite a localização nas configurações do dispositivo ou mantenha o pin atual.`,
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
    if (submitting.current || !evento) return;

    const data = parseCalendarDate(dataTexto);
    const nomeLimpo = nome.trim();
    const enderecoLimpo = endereco.trim();
    if (!nomeLimpo || !enderecoLimpo || !data) {
      setErro('Preencha nome, data e endereço corretamente');
      return;
    }

    submitting.current = true;
    setLoading(true);
    setErro(null);
    try {
      const localizacao = ponto
        ? new Coordenada(ponto.latitude, ponto.longitude)
        : evento.localizacao;
      const input: EditarEventoInput = {
        nome: nomeLimpo,
        data,
        endereco: enderecoLimpo,
        localizacao,
        observacoes: observacoes.trim(),
      };
      if (onSalvar) await onSalvar(input);
      else {
        if (!services) throw new Error('Serviço de eventos indisponível');
        await services.useCases.editarEvento.execute({ eventoId: evento.id, ...input });
        await reload();
      }
      if (onConcluido) onConcluido();
      else navigation.voltar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  if (!evento) {
    return <Text testID="erro-evento">Evento não encontrado</Text>;
  }

  return (
    <ScrollView>
      <Text accessibilityRole="header">Editar Evento</Text>
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
      <Text>Observações</Text>
      <TextInput
        accessibilityLabel="Observações"
        testID="campo-obs-evento"
        value={observacoes}
        onChangeText={setObservacoes}
      />
      <Text testID="pin-atual">
        Pin atual: {evento.localizacao.latitude}, {evento.localizacao.longitude}
      </Text>
      <ActionButton
        label="botao-usar-gps"
        title={gpsLoading ? 'Atualizando localização...' : 'Atualizar localização'}
        onPress={() => void atualizarGps()}
        disabled={gpsLoading || loading}
      />
      <Text>Ou informe as novas coordenadas</Text>
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
          Novo pin: {ponto.latitude}, {ponto.longitude}
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
