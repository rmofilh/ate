import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { ActionButton } from '@/presentation/components/ActionButton';
import { FormScreen } from '@/presentation/components/FormScreen';
import { StyledTextInput as TextInput } from '@/presentation/components/StyledTextInput';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import {
  useAppNavigation,
  useData,
  usePedidoDraft,
  useServices,
} from '@/presentation/hooks/AppProviders';

interface NovoClienteInput {
  nome: string;
  contato: string;
}

export default function TelaNovoCliente({
  onSalvar,
  onConcluido,
}: {
  onSalvar?(args: NovoClienteInput): Promise<void>;
  onConcluido?(): void;
} = {}) {
  const uiStyles = useUIStyles();
  const { reload } = useData();
  const services = useServices();
  const navigation = useAppNavigation();
  const pedidoDraft = usePedidoDraft();
  const submitting = useRef(false);
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function salvar() {
    if (submitting.current) return;

    const input = { nome: nome.trim(), contato: contato.trim() };
    if (!input.nome || !input.contato) {
      setErro('Preencha o nome e o contato do cliente');
      return;
    }

    submitting.current = true;
    setLoading(true);
    setErro(null);
    try {
      if (onSalvar) await onSalvar(input);
      else {
        if (!services) throw new Error('Serviço de clientes indisponível');
        const cliente = await services.useCases.cadastrarCliente.execute({
          ...input,
          usuarioId: services.usuarioId,
        });
        pedidoDraft.selecionarCliente(cliente.id);
        await reload();
      }
      if (onConcluido) onConcluido();
      else navigation.voltar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar o cliente');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <FormScreen>
      <View style={uiStyles.formColumn}>
      <Text accessibilityRole="header" style={uiStyles.title}>Novo Cliente</Text>
      <Text style={uiStyles.muted}>Cada criação começa com uma conexão.</Text>
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
