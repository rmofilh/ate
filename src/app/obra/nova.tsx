import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import type { TipoObra } from '@/core/domain/enums/TipoObra';
import { ActionButton } from '@/presentation/components/ActionButton';
import { ArtworkThumbnail } from '@/presentation/components/ArtworkThumbnail';
import { FormScreen } from '@/presentation/components/FormScreen';
import { StyledTextInput as TextInput } from '@/presentation/components/StyledTextInput';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import {
  useAppNavigation,
  useData,
  useServices,
} from '@/presentation/hooks/AppProviders';

interface NovaObraInput {
  nome: string;
  tipo: TipoObra;
  quantidade: number;
  fotoPath: string | null;
}

export default function TelaNovaObra({
  onSalvar,
  onConcluido,
  onCapturarFoto,
}: {
  onSalvar?(args: NovaObraInput): Promise<void>;
  onConcluido?(): void;
  onCapturarFoto?(): Promise<string | null>;
} = {}) {
  const uiStyles = useUIStyles();
  const { reload } = useData();
  const services = useServices();
  const navigation = useAppNavigation();
  const submitting = useRef(false);
  const [nome, setNome] = useState('');
  const [tipoTexto, setTipoTexto] = useState<TipoObra>('UNICA');
  const [quantidadeTexto, setQuantidadeTexto] = useState('1');
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fotoPath, setFotoPath] = useState<string | null>(null);
  const [capturando, setCapturando] = useState(false);
  const tipoNormalizado = tipoTexto.trim().toUpperCase();

  async function adicionarFoto() {
    if (capturando || loading) return;
    setCapturando(true);
    setErro(null);
    try {
      const caminho = onCapturarFoto
        ? await onCapturarFoto()
        : await services?.gateways.camera.capture();
      if (caminho === undefined) throw new Error('Câmera indisponível');
      if (caminho) setFotoPath(caminho);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível tirar a foto');
    } finally {
      setCapturando(false);
    }
  }

  async function salvar() {
    if (submitting.current || capturando) return;

    const nomeLimpo = nome.trim();
    if (!nomeLimpo || (tipoNormalizado !== 'UNICA' && tipoNormalizado !== 'SERIE')) {
      setErro('Preencha o nome e informe o tipo UNICA ou SERIE');
      return;
    }

    const quantidade = tipoNormalizado === 'UNICA' ? 1 : Number(quantidadeTexto);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      setErro('Obra em série exige quantidade maior que zero');
      return;
    }

    const input: NovaObraInput = {
      nome: nomeLimpo,
      tipo: tipoNormalizado,
      quantidade,
      fotoPath,
    };
    submitting.current = true;
    setLoading(true);
    setErro(null);
    try {
      if (onSalvar) await onSalvar(input);
      else {
        if (!services) throw new Error('Serviço de estoque indisponível');
        await services.useCases.cadastrarObra.execute({
          ...input,
          usuarioId: services.usuarioId,
        });
        await reload();
      }
      if (onConcluido) onConcluido();
      else navigation.voltar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar a obra');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <FormScreen>
      <View style={uiStyles.formColumn}>
      <Text accessibilityRole="header" style={uiStyles.title}>Nova Obra</Text>
      <Text style={uiStyles.muted}>Dê um lugar à sua próxima criação.</Text>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Nome da obra</Text>
      <TextInput
        accessibilityLabel="Nome da obra"
        testID="campo-nome-obra"
        value={nome}
        onChangeText={setNome}
      />
      </View>
      <View style={uiStyles.field}>
      <Text style={uiStyles.label}>Tipo da obra</Text>
      <View testID="campo-tipo-obra" accessibilityLabel="Tipo da obra" style={uiStyles.choicesRow}>
        <ActionButton label="tipo-unica" title="Peça única" icon="stock" selected={tipoNormalizado === 'UNICA'}
          appearance={tipoNormalizado === 'UNICA' ? 'primary' : 'secondary'} disabled={loading}
          onPress={() => setTipoTexto('UNICA')} />
        <ActionButton label="tipo-serie" title="Em série" icon="series" selected={tipoNormalizado === 'SERIE'}
          appearance={tipoNormalizado === 'SERIE' ? 'primary' : 'secondary'} disabled={loading}
          onPress={() => setTipoTexto('SERIE')} />
      </View>
      </View>
      {tipoNormalizado === 'SERIE' ? (
        <View style={uiStyles.field}>
          <Text style={uiStyles.label}>Quantidade de unidades</Text>
          <TextInput
            accessibilityLabel="Quantidade de unidades"
            testID="campo-qtd-obra"
            value={quantidadeTexto}
            onChangeText={setQuantidadeTexto}
            keyboardType="number-pad"
          />
        </View>
      ) : null}
      <View style={uiStyles.field}>
        <Text style={uiStyles.label}>Foto de catálogo (opcional)</Text>
        {fotoPath ? <ArtworkThumbnail photoPath={fotoPath} testID="miniatura-foto-catalogo" /> : null}
        <ActionButton
          label="botao-foto-catalogo"
          title={capturando ? 'Abrindo câmera...' : fotoPath ? 'Tirar outra foto' : 'Adicionar foto de catálogo'}
          icon="camera"
          appearance="secondary"
          disabled={loading || capturando}
          busy={capturando}
          onPress={() => void adicionarFoto()}
        />
        {fotoPath ? (
          <ActionButton
            label="botao-remover-foto-catalogo"
            title="Remover foto"
            appearance="quiet"
            disabled={loading || capturando}
            onPress={() => setFotoPath(null)}
          />
        ) : null}
      </View>
      {erro ? (
        <Text testID="erro-obra" accessibilityLiveRegion="polite" style={uiStyles.error}>
          {erro}
        </Text>
      ) : null}
      <ActionButton
        label="botao-salvar-obra"
        title={loading ? 'Salvando...' : 'Salvar Obra'}
        onPress={() => void salvar()}
        disabled={loading || capturando}
        appearance="primary"
        icon="check"
        busy={loading}
      />
      </View>
    </FormScreen>
  );
}
