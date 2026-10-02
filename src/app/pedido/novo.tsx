import React, { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Cliente } from '@/core/domain/entities/Cliente';
import type { Obra } from '@/core/domain/entities/Obra';
import { CANAIS_ORIGEM, type CanalOrigem } from '@/core/domain/enums/CanalOrigem';
import { ActionButton } from '@/presentation/components/ActionButton';
import { StyledTextInput as TextInput } from '@/presentation/components/StyledTextInput';
import { uiStyles } from '@/presentation/styles/uiStyles';
import {
  useAppNavigation,
  useData,
  usePedidoDraft,
  useServices,
} from '@/presentation/hooks/AppProviders';
import { parseCalendarDate } from '@/presentation/utils/date';

interface NovoPedidoInput {
  descricao: string;
  clienteId: string;
  obraId: string | null;
  canalOrigem: CanalOrigem;
  dataEntrega: Date;
}

interface TelaNovoPedidoProps {
  clientes?: Cliente[];
  obras?: Obra[];
  onSalvar?(args: NovoPedidoInput): Promise<void>;
  onConcluido?(): void;
}

export default function TelaNovoPedido({
  clientes: clientesRecebidos,
  obras: obrasRecebidas,
  onSalvar,
  onConcluido,
}: TelaNovoPedidoProps = {}) {
  const data = useData();
  const services = useServices();
  const navigation = useAppNavigation();
  const pedidoDraft = usePedidoDraft();
  const clientes = clientesRecebidos ?? data.clientes;
  const obras = obrasRecebidas ?? data.obras;
  const obrasDisponiveis = obras.filter(
    (obra) => obra.statusObra === 'DISPONIVEL' && obra.quantidade > 0,
  );
  const submitting = useRef(false);
  const [descricao, setDescricao] = useState('');
  const [clienteId, setClienteId] = useState(
    clientes.some((cliente) => cliente.id === pedidoDraft.clienteId)
      ? pedidoDraft.clienteId ?? ''
      : clientes[0]?.id ?? '',
  );
  const [obraId, setObraId] = useState<string | null>(null);
  const [canalOrigem, setCanalOrigem] = useState<CanalOrigem>('OUTROS');
  const [dataEntregaTexto, setDataEntregaTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clienteDraftAnterior, setClienteDraftAnterior] = useState(pedidoDraft.clienteId);

  if (
    clienteDraftAnterior !== pedidoDraft.clienteId &&
    (!pedidoDraft.clienteId || clientes.some((cliente) => cliente.id === pedidoDraft.clienteId))
  ) {
    setClienteDraftAnterior(pedidoDraft.clienteId);
    if (
      pedidoDraft.clienteId &&
      clientes.some((cliente) => cliente.id === pedidoDraft.clienteId)
    ) {
      setClienteId(pedidoDraft.clienteId);
    }
  }

  async function salvar() {
    if (submitting.current) return;

    const descricaoLimpa = descricao.trim();
    const dataEntrega = parseCalendarDate(dataEntregaTexto);
    if (!descricaoLimpa || !clienteId || !dataEntrega) {
      setErro('Preencha a descrição, a data de entrega e escolha o cliente');
      return;
    }

    submitting.current = true;
    setLoading(true);
    setErro(null);
    try {
      const input = {
        descricao: descricaoLimpa,
        clienteId,
        obraId,
        canalOrigem,
        dataEntrega,
      };
      if (onSalvar) await onSalvar(input);
      else {
        if (!services) throw new Error('Serviço de pedidos indisponível');
        await services.useCases.cadastrarPedido.execute({
          ...input,
          usuarioId: services.usuarioId,
        });
        await data.reload();
      }
      pedidoDraft.limpar();
      if (onConcluido) onConcluido();
      else navigation.voltar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar o pedido');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={uiStyles.screen} edges={['bottom', 'left', 'right']}>
    <ScrollView testID="scroll-novo-pedido" contentContainerStyle={uiStyles.formContent} keyboardShouldPersistTaps="handled">
      <View style={uiStyles.formColumn}>
      <Text accessibilityRole="header" style={uiStyles.title}>Novo Pedido</Text>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Descrição da peça</Text>
      <TextInput
        accessibilityLabel="Descrição da peça"
        testID="campo-descricao"
        value={descricao}
        onChangeText={setDescricao}
      />
      </View>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Data de entrega (AAAA-MM-DD)</Text>
      <TextInput
        accessibilityLabel="Data de entrega"
        testID="campo-data-entrega"
        value={dataEntregaTexto}
        onChangeText={setDataEntregaTexto}
      />
      </View>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>
        Cliente: {clientes.find((cliente) => cliente.id === clienteId)?.nome ?? 'escolha'}
      </Text>
      <View style={uiStyles.choices}>
      {clientes.map((cliente) => (
        <ActionButton
          key={cliente.id}
          label={`escolher-cliente-${cliente.id}`}
          title={cliente.id === clienteId ? `Selecionado: ${cliente.nome}` : cliente.nome}
          onPress={() => setClienteId(cliente.id)}
          disabled={loading}
          appearance={cliente.id === clienteId ? 'primary' : 'secondary'}
          style={uiStyles.choice}
          textStyle={uiStyles.choiceText}
        />
      ))}
      </View>
      <ActionButton
        label="novo-cliente"
        title="Cadastrar novo cliente"
        onPress={navigation.novoCliente}
        disabled={loading}
        appearance="quiet"
      />
      </View>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Canal de origem</Text>
      <View style={uiStyles.choicesRow}>
      {CANAIS_ORIGEM.map((canal) => (
        <ActionButton
          key={canal}
          label={`escolher-canal-${canal}`}
          title={canal === canalOrigem ? `Selecionado: ${canal}` : canal}
          onPress={() => setCanalOrigem(canal)}
          disabled={loading}
          appearance={canal === canalOrigem ? 'primary' : 'secondary'}
        />
      ))}
      </View>
      </View>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Obras: {obrasDisponiveis.length} disponíveis (obra opcional)</Text>
      <View style={uiStyles.choices}>
      {obrasDisponiveis.map((obra) => (
        <ActionButton
          key={obra.id}
          label={`escolher-obra-${obra.id}`}
          title={obra.id === obraId ? `Selecionada: ${obra.nome}` : obra.nome}
          onPress={() => setObraId(obra.id)}
          disabled={loading}
          appearance={obra.id === obraId ? 'primary' : 'secondary'}
          style={uiStyles.choice}
          textStyle={uiStyles.choiceText}
        />
      ))}
      </View>
      </View>
      {erro ? (
        <Text testID="erro-pedido" accessibilityLiveRegion="polite" style={uiStyles.error}>
          {erro}
        </Text>
      ) : null}
      <ActionButton
        label="botao-salvar-pedido"
        title={loading ? 'Salvando...' : 'Salvar Pedido'}
        onPress={() => void salvar()}
        disabled={loading}
        appearance="primary"
      />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
