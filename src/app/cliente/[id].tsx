import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import type { Cliente } from '@/core/domain/entities/Cliente';
import { ActionButton } from '@/presentation/components/ActionButton';
import { FormScreen } from '@/presentation/components/FormScreen';
import { StyledTextInput as TextInput } from '@/presentation/components/StyledTextInput';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import {
  useAppNavigation,
  useData,
  useRouteParams,
  useServices,
} from '@/presentation/hooks/AppProviders';

interface EditarClienteInput {
  nome: string;
  contato: string;
}

interface TelaEditarClienteProps {
  cliente?: Cliente;
  onSalvar?(args: EditarClienteInput): Promise<void>;
  onConcluido?(): void;
}

export default function TelaEditarCliente(props: TelaEditarClienteProps = {}) {
  const { id } = useRouteParams();
  return <FormularioEditarCliente key={props.cliente?.id ?? id} {...props} />;
}

function FormularioEditarCliente({
  cliente: clienteRecebido,
  onSalvar,
  onConcluido,
}: TelaEditarClienteProps = {}) {
  const uiStyles = useUIStyles();
  const { clientes, reload } = useData();
  const services = useServices();
  const navigation = useAppNavigation();
  const { id } = useRouteParams();
  const cliente = clienteRecebido ?? clientes.find((item) => item.id === id);
  const submitting = useRef(false);
  const [nome, setNome] = useState(cliente?.nome ?? '');
  const [contato, setContato] = useState(cliente?.contato ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function salvar() {
    if (submitting.current || !cliente) return;

    submitting.current = true;
    setLoading(true);
    setErro(null);
    try {
      const input = { nome: nome.trim(), contato: contato.trim() };
      if (!input.nome || !input.contato) {
        setErro('Preencha o nome e o contato do cliente');
        return;
      }
      if (onSalvar) await onSalvar(input);
      else {
        if (!services) throw new Error('Serviço de clientes indisponível');
        await services.useCases.editarCliente.execute({ clienteId: cliente.id, ...input });
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

  if (!cliente) {
    return <Text testID="erro-cliente" style={uiStyles.notice}>Cliente não encontrado</Text>;
  }

  return (
    <FormScreen>
      <View style={uiStyles.formColumn}>
      <Text accessibilityRole="header" style={uiStyles.title}>Editar Cliente</Text>
      <View style={uiStyles.field}>
        <Text style={uiStyles.label}>Nome</Text>
        <TextInput
          accessibilityLabel="Nome"
          testID="campo-nome"
          value={nome}
          onChangeText={setNome}
        />
      </View>
      <View style={uiStyles.field}>
        <Text style={uiStyles.label}>Contato</Text>
        <TextInput
          accessibilityLabel="Contato"
          testID="campo-contato"
          value={contato}
          onChangeText={setContato}
        />
      </View>
      {erro ? (
        <Text testID="erro-cliente" accessibilityLiveRegion="polite" style={uiStyles.error}>
          {erro}
        </Text>
      ) : null}
      <ActionButton
        label="botao-salvar-cliente"
        title={loading ? 'Salvando...' : 'Salvar Cliente'}
        onPress={() => void salvar()}
        disabled={loading}
        appearance="primary"
        icon="check"
        busy={loading}
      />
      </View>
    </FormScreen>
  );
}
