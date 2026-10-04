import React, { useMemo, useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';

import type { Cliente } from '@/core/domain/entities/Cliente';
import type { Obra } from '@/core/domain/entities/Obra';
import { CANAIS_ORIGEM, type CanalOrigem } from '@/core/domain/enums/CanalOrigem';
import { ActionButton } from '@/presentation/components/ActionButton';
import { DateField } from '@/presentation/components/DateField';
import { FormScreen } from '@/presentation/components/FormScreen';
import { SelectionSheet, type SelectionOption } from '@/presentation/components/SelectionSheet';
import { StyledTextInput as TextInput } from '@/presentation/components/StyledTextInput';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import {
  useAppNavigation,
  useData,
  usePedidoDraft,
  useServices,
} from '@/presentation/hooks/AppProviders';
import { parseCalendarDate } from '@/presentation/utils/date';
import { channelLabels } from '@/presentation/utils/labels';
import { isAvulsoClient } from '@/presentation/utils/selection';

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
  const uiStyles = useUIStyles();
  const data = useData();
  const services = useServices();
  const navigation = useAppNavigation();
  const pedidoDraft = usePedidoDraft();
  const clientes = clientesRecebidos ?? data.clientes;
  const obras = obrasRecebidas ?? data.obras;
  const obrasDisponiveis = useMemo(() => obras.filter(
    (obra) => obra.statusObra === 'DISPONIVEL' && obra.quantidade > 0,
  ), [obras]);
  const clientOptions = useMemo<SelectionOption[]>(() => clientes.map((cliente) => ({
    id: cliente.id, title: cliente.nome, detail: isAvulsoClient(cliente) ? 'Sem cadastro individual · atendimento avulso' : cliente.contato,
    icon: isAvulsoClient(cliente) ? 'sale' : 'person', badge: isAvulsoClient(cliente) ? 'AVULSO' : undefined,
  })), [clientes]);
  const pinnedClients = useMemo(() => clientOptions.filter((option) => option.badge === 'AVULSO'), [clientOptions]);
  const workOptions = useMemo<SelectionOption[]>(() => obrasDisponiveis.map((obra) => ({
    id: obra.id, title: obra.nome, icon: obra.tipo === 'SERIE' ? 'series' : 'stock',
    detail: `${obra.tipo === 'SERIE' ? 'Em série' : 'Peça única'} · ${obra.quantidade} ${obra.quantidade === 1 ? 'unidade disponível' : 'unidades disponíveis'}`,
  })), [obrasDisponiveis]);
  const submitting = useRef(false);
  const [descricao, setDescricao] = useState('');
  const [clienteId, setClienteId] = useState(
    clientes.some((cliente) => cliente.id === pedidoDraft.clienteId)
      ? pedidoDraft.clienteId ?? ''
      : '',
  );
  const [obraId, setObraId] = useState<string | null>(null);
  const [canalOrigem, setCanalOrigem] = useState<CanalOrigem>('OUTROS');
  const [dataEntregaTexto, setDataEntregaTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clienteDraftAnterior, setClienteDraftAnterior] = useState(pedidoDraft.clienteId);
  const [picker, setPicker] = useState<'clientes' | 'obras' | null>(null);
  const selectedClient = clientes.find((cliente) => cliente.id === clienteId);
  const selectedWork = obras.find((obra) => obra.id === obraId);

  function openPicker(kind: 'clientes' | 'obras') {
    Keyboard.dismiss();
    setPicker(kind);
  }

  function newClient() {
    Keyboard.dismiss();
    setPicker(null);
    navigation.novoCliente();
  }

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
    <>
    <FormScreen testID="scroll-novo-pedido">
      <View style={uiStyles.formColumn} accessibilityElementsHidden={picker !== null}
        importantForAccessibility={picker !== null ? 'no-hide-descendants' : 'auto'} aria-hidden={picker !== null}>
      <Text accessibilityRole="header" style={uiStyles.title}>Novo Pedido</Text>
      <Text style={uiStyles.muted}>Organize a próxima criação da sua oficina.</Text>
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
      <Text style={uiStyles.label}>Data de entrega</Text>
      <DateField
        accessibilityLabel="Data de entrega"
        testID="campo-data-entrega"
        value={dataEntregaTexto}
        onChangeText={setDataEntregaTexto}
        editable={!loading}
      />
      </View>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Cliente</Text>
      {selectedClient ? <View testID="cliente-selecionado" style={uiStyles.field}>
        <Text style={uiStyles.label}>{selectedClient.nome}</Text>
        <Text testID="detalhe-cliente-selecionado" style={uiStyles.muted}>
          {isAvulsoClient(selectedClient) ? 'Atendimento avulso · sem cadastro individual' : selectedClient.contato}
        </Text>
      </View> : <Text testID="cliente-sem-selecao" style={uiStyles.muted}>Nenhum cliente selecionado.</Text>}
      <ActionButton label="selecionar-cliente-existente" title="Selecionar Cliente" icon="search"
        appearance="secondary" disabled={loading} onPress={() => openPicker('clientes')} />
      </View>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Canal de origem</Text>
      <View style={uiStyles.choicesRow}>
      {CANAIS_ORIGEM.map((canal) => (
        <ActionButton
          key={canal}
          label={`escolher-canal-${canal}`}
          title={canal === canalOrigem ? `Selecionado: ${canal}` : canal}
          displayTitle={channelLabels[canal]}
          selected={canal === canalOrigem}
          icon={canal === canalOrigem ? 'check' : undefined}
          onPress={() => setCanalOrigem(canal)}
          disabled={loading}
          appearance={canal === canalOrigem ? 'primary' : 'secondary'}
        />
      ))}
      </View>
      </View>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Obra do estoque — opcional</Text>
      {selectedWork ? <>
        <ActionButton label="obra-selecionada" title={`Selecionada: ${selectedWork.nome}`} displayTitle={selectedWork.nome}
          icon="check" appearance="secondary" selected disabled={loading} onPress={() => setObraId(null)}
          style={uiStyles.choice} textStyle={uiStyles.choiceText} />
        <Text testID="detalhe-obra-selecionada" style={uiStyles.muted}>
          {selectedWork.tipo === 'SERIE' ? `Em série · ${selectedWork.quantidade} disponíveis · 1 unidade neste pedido.` : 'Peça única · 1 unidade neste pedido.'}
        </Text>
        {selectedWork.statusObra !== 'DISPONIVEL' || selectedWork.quantidade <= 0
          ? <Text style={uiStyles.error}>A obra escolhida não está mais disponível. Remova a seleção ou escolha outra peça.</Text>
          : null}
        <ActionButton label="remover-selecao-obra" title="Remover seleção de obra" icon="close"
          appearance="quiet" disabled={loading} onPress={() => setObraId(null)} />
      </> : <Text testID="obra-sem-selecao" style={uiStyles.muted}>Sem obra vinculada. Você pode registrar uma criação sem associar uma peça do estoque.</Text>}
      <ActionButton label="selecionar-obra-estoque" title={selectedWork ? 'Trocar obra do estoque' : 'Selecionar obra do estoque'}
        icon="stock" appearance="secondary" disabled={loading || obrasDisponiveis.length === 0} onPress={() => openPicker('obras')} />
      <Text style={uiStyles.muted}>{obrasDisponiveis.length} {obrasDisponiveis.length === 1 ? 'obra disponível' : 'obras disponíveis'}.</Text>
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
        icon="check"
        busy={loading}
      />
      </View>
    </FormScreen>
    {picker === 'clientes' ? <SelectionSheet title="Selecionar cliente" searchLabel="Buscar por nome ou contato"
      emptyMessage="Nenhum cliente cadastrado." options={clientOptions} pinnedOptions={pinnedClients} selectedId={clienteId || null}
      testIDPrefix="escolher-cliente" createTestID="novo-cliente" onDismiss={() => setPicker(null)} onCreate={newClient}
      onSelect={(id) => { setClienteId(id); setPicker(null); }} /> : null}
    {picker === 'obras' ? <SelectionSheet title="Selecionar obra do estoque" searchLabel="Buscar obra pelo nome"
      emptyMessage="Nenhuma obra disponível." options={workOptions} selectedId={obraId}
      testIDPrefix="escolher-obra" selectedPrefix="Selecionada" onDismiss={() => setPicker(null)}
      onSelect={(id) => { setObraId((current) => current === id ? null : id); setPicker(null); }} /> : null}
    </>
  );
}
