import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import type { Evento } from '@/core/domain/entities/Evento';
import { Coordenada } from '@/core/domain/value-objects/Coordenada';
import { ActionButton } from '@/presentation/components/ActionButton';
import { DateField } from '@/presentation/components/DateField';
import { FormScreen } from '@/presentation/components/FormScreen';
import { SeletorDeLocal } from '@/presentation/components/mapa/SeletorDeLocal';
import { StyledTextInput as TextInput } from '@/presentation/components/StyledTextInput';
import { useLocalizarNoMapa } from '@/presentation/hooks/useLocalizarNoMapa';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import {
  useAppNavigation,
  useData,
  useRouteParams,
  useServices,
} from '@/presentation/hooks/AppProviders';
import { parseCalendarDate } from '@/presentation/utils/date';

interface EditarEventoInput {
  nome: string;
  data: Date;
  endereco: string;
  localizacao: Coordenada;
  observacoes: string;
}

interface TelaEditarEventoProps {
  evento?: Evento;
  onGps?(): Promise<Coordenada>;
  onBuscarEndereco?(endereco: string): Promise<Coordenada | null>;
  onSalvar?(args: EditarEventoInput): Promise<void>;
  onConcluido?(): void;
}

export default function TelaEditarEvento(props: TelaEditarEventoProps = {}) {
  const { id } = useRouteParams();
  return <FormularioEditarEvento key={props.evento?.id ?? id} {...props} />;
}

function FormularioEditarEvento({
  evento: eventoRecebido,
  onGps,
  onBuscarEndereco,
  onSalvar,
  onConcluido,
}: TelaEditarEventoProps = {}) {
  const uiStyles = useUIStyles();
  const { eventos, reload } = useData();
  const services = useServices();
  const navigation = useAppNavigation();
  const { id } = useRouteParams();
  const evento = eventoRecebido ?? eventos.find((item) => item.id === id);
  const submitting = useRef(false);
  const [nome, setNome] = useState(evento?.nome ?? '');
  const [dataTexto, setDataTexto] = useState(evento?.data.toISOString().slice(0, 10) ?? '');
  const [endereco, setEndereco] = useState(evento?.endereco ?? '');
  const [observacoes, setObservacoes] = useState(evento?.observacoes ?? '');
  const [latitudeTexto, setLatitudeTexto] = useState('');
  const [longitudeTexto, setLongitudeTexto] = useState('');
  const [ponto, setPonto] = useState<{ latitude: number; longitude: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lerGps = onGps ?? (services ? () => services.gateways.location.getCurrent() : undefined);
  const mapa = useLocalizarNoMapa({
    buscarEndereco:
      onBuscarEndereco ??
      (services ? (texto: string) => services.gateways.geocodificador.buscar(texto) : undefined),
    aoEscolher: aplicarPonto,
  });

  function aplicarPonto(coordenada: Coordenada) {
    setPonto({ latitude: coordenada.latitude, longitude: coordenada.longitude });
    setLatitudeTexto(String(coordenada.latitude));
    setLongitudeTexto(String(coordenada.longitude));
    setErro(null);
  }

  function pontoAtual(): Coordenada | null {
    return ponto ? new Coordenada(ponto.latitude, ponto.longitude) : (evento?.localizacao ?? null);
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
    return <Text testID="erro-evento" style={uiStyles.notice}>Evento não encontrado</Text>;
  }

  return (
    <FormScreen>
      <View style={uiStyles.formColumn}>
      <Text accessibilityRole="header" style={uiStyles.title}>Editar Evento</Text>
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
      <ActionButton
        label="botao-localizar-mapa"
        title={mapa.buscando ? 'Buscando endereço...' : 'Localizar no mapa'}
        onPress={() => void mapa.localizar(endereco, pontoAtual())}
        disabled={mapa.buscando || loading}
        appearance="secondary"
        icon="pin"
        busy={mapa.buscando}
      />
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Observações</Text>
      <TextInput
        accessibilityLabel="Observações"
        testID="campo-obs-evento"
        value={observacoes}
        onChangeText={setObservacoes}
      />
      </View>
      <Text testID="pin-atual" style={uiStyles.notice}>
        Pin atual: {evento.localizacao.latitude}, {evento.localizacao.longitude}
      </Text>
      <View style={uiStyles.field}>
      <Text style={uiStyles.body}>Ou informe as novas coordenadas</Text>
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
        disabled={loading}
        appearance="secondary"
      />
      {ponto ? (
        <Text testID="ponto-selecionado" style={uiStyles.notice}>
          Novo pin: {ponto.latitude}, {ponto.longitude}
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
        disabled={loading}
        appearance="primary"
        icon="check"
        busy={loading}
      />
      </View>
      <SeletorDeLocal {...mapa.seletor} lerGps={lerGps} />
    </FormScreen>
  );
}
