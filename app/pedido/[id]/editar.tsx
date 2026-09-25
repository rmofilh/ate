import React, { useRef, useState } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';

import type { Pedido } from '../../../src/core/domain/entities/Pedido';
import { ActionButton } from '../../../src/presentation/components/ActionButton';
import {
  useAppNavigation,
  useData,
  useRouteParams,
  useServices,
} from '../../../src/presentation/hooks/AppProviders';
import { parseCalendarDate } from '../../../src/presentation/utils/date';

interface EditarPedidoInput {
  descricao: string;
  dataEntrega: Date;
}

interface TelaEditarPedidoProps {
  pedido?: Pedido;
  onSalvar?(args: EditarPedidoInput): Promise<void>;
  onConcluido?(): void;
}

export default function TelaEditarPedido({
  pedido: pedidoRecebido,
  onSalvar,
  onConcluido,
}: TelaEditarPedidoProps = {}) {
  const { pedidos, reload } = useData();
  const services = useServices();
  const navigation = useAppNavigation();
  const { id } = useRouteParams();
  const pedido = pedidoRecebido ?? pedidos.find((item) => item.id === id);
  const submitting = useRef(false);
  const [descricao, setDescricao] = useState(pedido?.descricao ?? '');
  const [dataTexto, setDataTexto] = useState(
    pedido?.dataEntrega.toISOString().slice(0, 10) ?? '',
  );
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function salvar() {
    if (submitting.current || !pedido) return;

    const descricaoLimpa = descricao.trim();
    const dataEntrega = parseCalendarDate(dataTexto);
    if (!descricaoLimpa || !dataEntrega) {
      setErro('Preencha a descrição e informe uma data válida');
      return;
    }

    submitting.current = true;
    setLoading(true);
    setErro(null);
    try {
      const input = { descricao: descricaoLimpa, dataEntrega };
      if (onSalvar) await onSalvar(input);
      else {
        if (!services) throw new Error('Serviço de pedidos indisponível');
        await services.useCases.editarPedido.execute({ pedidoId: pedido.id, ...input });
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

  if (!pedido) {
    return <Text testID="erro-pedido">Pedido não encontrado</Text>;
  }

  return (
    <ScrollView>
      <Text accessibilityRole="header">Editar Pedido</Text>
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
        testID="campo-data"
        value={dataTexto}
        onChangeText={setDataTexto}
      />
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
