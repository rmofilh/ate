import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Coordenada } from '@/core/domain/value-objects/Coordenada';
import { ActionButton } from '@/presentation/components/ActionButton';
import { DateField } from '@/presentation/components/DateField';
import { FormScreen } from '@/presentation/components/FormScreen';
import { CampoDeEndereco } from '@/presentation/components/mapa/CampoDeEndereco';
import { CoordenadasManuais } from '@/presentation/components/mapa/CoordenadasManuais';
import { SeletorDeLocal } from '@/presentation/components/mapa/SeletorDeLocal';
import { StyledTextInput as TextInput } from '@/presentation/components/StyledTextInput';
import { useEnderecoDoEvento } from '@/presentation/hooks/useEnderecoDoEvento';
import { useLocalizarNoMapa } from '@/presentation/hooks/useLocalizarNoMapa';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import {
  useAppNavigation,
  useData,
  useNetwork,
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
  onGps?(): Promise<Coordenada>;
  onBuscarEndereco?(endereco: string): Promise<Coordenada | null>;
  onSalvar?(args: NovoEventoInput): Promise<void>;
  onConcluido?(): void;
}

export default function TelaNovoEvento({
  onGps,
  onBuscarEndereco,
  onSalvar,
  onConcluido,
}: TelaNovoEventoProps = {}) {
  const uiStyles = useUIStyles();
  const { reload } = useData();
  const services = useServices();
  const navigation = useAppNavigation();
  const submitting = useRef(false);
  const [nome, setNome] = useState('');
  const [dataTexto, setDataTexto] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');
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
    aoEscolher: (coordenada: Coordenada) => {
      aplicarPonto(coordenada);
      enderecoDoEvento.aoMarcarNoMapa(coordenada);
    },
  });
  const { isOnline } = useNetwork();
  const enderecoDoEvento = useEnderecoDoEvento({
    endereco,
    setEndereco,
    enderecos: services?.gateways.geocodificador,
    online: isOnline,
  });

  function aplicarPonto(coordenada: Coordenada) {
    setPonto({ latitude: coordenada.latitude, longitude: coordenada.longitude });
    setLatitudeTexto(String(coordenada.latitude));
    setLongitudeTexto(String(coordenada.longitude));
    setErro(null);
  }

  function pontoAtual(): Coordenada | null {
    return ponto ? new Coordenada(ponto.latitude, ponto.longitude) : null;
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
      <CampoDeEndereco
        valor={endereco}
        onDigitar={enderecoDoEvento.digitar}
        sugestoes={enderecoDoEvento.sugestoes}
        onEscolher={(sugestao) => aplicarPonto(enderecoDoEvento.escolher(sugestao))}
        enderecoDoPonto={enderecoDoEvento.enderecoDoPonto}
        onUsarEnderecoDoPonto={enderecoDoEvento.usarEnderecoDoPonto}
        online={isOnline}
        editavel={!loading}
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
      <Text style={uiStyles.label}>Observações (opcional)</Text>
      <TextInput
        accessibilityLabel="Observações"
        testID="campo-obs-evento"
        value={observacoes}
        onChangeText={setObservacoes}
      />
      </View>
      <CoordenadasManuais
        titulo="Ou informe as coordenadas manualmente"
        latitude={latitudeTexto}
        longitude={longitudeTexto}
        onLatitude={setLatitudeTexto}
        onLongitude={setLongitudeTexto}
        onUsar={usarLocalizacaoManual}
        disabled={loading}
      />
      {ponto ? (
        <Text testID="ponto-selecionado" style={uiStyles.notice}>
          Local marcado no mapa
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
      <SeletorDeLocal
        {...mapa.seletor}
        lerGps={lerGps}
        lerUltimaPosicao={services ? () => services.gateways.location.ultimaConhecida() : undefined}
      />
    </FormScreen>
  );
}
