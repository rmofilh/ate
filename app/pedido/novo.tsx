import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';

import type { Cliente } from '../../src/core/domain/entities/Cliente';
import type { Obra } from '../../src/core/domain/entities/Obra';
import { CANAIS_ORIGEM, type CanalOrigem } from '../../src/core/domain/enums/CanalOrigem';
import { ActionButton } from '../../src/presentation/components/ActionButton';
import {
  useAppNavigation,
  useData,
  usePedidoDraft,
  useServices,
} from '../../src/presentation/hooks/AppProviders';
import { parseCalendarDate } from '../../src/presentation/utils/date';

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

  useEffect(() => {
    if (
      pedidoDraft.clienteId &&
      clientes.some((cliente) => cliente.id === pedidoDraft.clienteId)
    ) {
      setClienteId(pedidoDraft.clienteId);
    }
  }, [clientes, pedidoDraft.clienteId]);

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
    <ScrollView testID="scroll-novo-pedido">
      <Text accessibilityRole="header">Novo Pedido</Text>
      <Text>Descrição da peça</Text>
      <TextInput
        accessibilityLabel="Descrição da peça"
        testID="campo-descricao"
        value={descricao}
        onChangeText={setDescricao}
      />
      <Text>Data de entrega (AAAA-MM-DD)</Text>
      <TextInput
        accessibilityLabel="Data de entrega"
        testID="campo-data-entrega"
        value={dataEntregaTexto}
        onChangeText={setDataEntregaTexto}
      />
      <Text>
        Cliente: {clientes.find((cliente) => cliente.id === clienteId)?.nome ?? 'escolha'}
      </Text>
      {clientes.map((cliente) => (
        <ActionButton
          key={cliente.id}
          label={`escolher-cliente-${cliente.id}`}
          title={cliente.id === clienteId ? `Selecionado: ${cliente.nome}` : cliente.nome}
          onPress={() => setClienteId(cliente.id)}
          disabled={loading}
        />
      ))}
      <ActionButton
        label="novo-cliente"
        title="Cadastrar novo cliente"
        onPress={navigation.novoCliente}
        disabled={loading}
      />
      <Text>Canal de origem</Text>
      {CANAIS_ORIGEM.map((canal) => (
        <ActionButton
          key={canal}
          label={`escolher-canal-${canal}`}
          title={canal === canalOrigem ? `Selecionado: ${canal}` : canal}
          onPress={() => setCanalOrigem(canal)}
          disabled={loading}
        />
      ))}
      <Text>Obras: {obrasDisponiveis.length} disponíveis (obra opcional)</Text>
      {obrasDisponiveis.map((obra) => (
        <ActionButton
          key={obra.id}
          label={`escolher-obra-${obra.id}`}
          title={obra.id === obraId ? `Selecionada: ${obra.nome}` : obra.nome}
          onPress={() => setObraId(obra.id)}
          disabled={loading}
        />
      ))}
      {erro ? (
        <Text testID="erro-pedido" accessibilityLiveRegion="polite">
          {erro}
        </Text>
      ) : null}
      <ActionButton
        label="botao-salvar-pedido"
        title={loading ? 'Salvando...' : 'Salvar Pedido'}
        onPress={() => void salvar()}
        disabled={loading}
      />
    </ScrollView>
  );
}
