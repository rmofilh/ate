import React, { useRef, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/presentation/components/ActionButton';
import { ConfirmDialog } from '@/presentation/components/ConfirmDialog';
import { ConfirmationLayer } from '@/presentation/components/ConfirmationLayer';
import { StyledTextInput as TextInput } from '@/presentation/components/StyledTextInput';
import { ObraCard } from '@/presentation/components/ObraCard';
import { OfflineBanner } from '@/presentation/components/OfflineBanner';
import { ScreenHeader } from '@/presentation/components/ScreenHeader';
import { borderRadius, borderWidths, layout, spacing } from '@/constants/theme';
import { useUIStyles } from '@/presentation/styles/uiStyles';
import { createThemedStyles } from '@/presentation/hooks/useDesignTheme';
import {
  useData,
  useAppNavigation,
  useNetwork,
  useServices,
} from '@/presentation/hooks/AppProviders';

interface TelaEstoqueProps {
  onVenda?(obraId: string, quantidade: number): Promise<void>;
  onAdicionar?(obraId: string, quantidade: number): Promise<void>;
  onRemoverUnidades?(obraId: string, quantidade: number): Promise<void>;
  onRemoverObra?(obraId: string): Promise<void>;
}

function quantidadeValida(texto: string): number | null {
  const quantidade = Number(texto);
  return Number.isInteger(quantidade) && quantidade > 0 ? quantidade : null;
}

export default function TelaEstoque({
  onVenda,
  onAdicionar,
  onRemoverUnidades,
  onRemoverObra,
}: TelaEstoqueProps = {}) {
  const uiStyles = useUIStyles();
  const styles = useStyles();
  const { obras, reload } = useData();
  const { isOnline } = useNetwork();
  const services = useServices();
  const navigation = useAppNavigation();
  const busyKeys = useRef(new Set<string>());
  const [loadingObraId, setLoadingObraId] = useState<string | null>(null);
  const [alvoVenda, setAlvoVenda] = useState<string | null>(null);
  const [qtdVenda, setQtdVenda] = useState('1');
  const [vendaLoading, setVendaLoading] = useState(false);
  const [alvoUnidades, setAlvoUnidades] = useState<string | null>(null);
  const [qtdRemover, setQtdRemover] = useState('1');
  const [qtdRemoverConfirmada, setQtdRemoverConfirmada] = useState<number | null>(null);
  const [alvoObra, setAlvoObra] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function executarUmaVez(key: string, obraId: string, action: () => Promise<void>) {
    if (busyKeys.current.has(key)) return;

    busyKeys.current.add(key);
    setLoadingObraId(obraId);
    try {
      await action();
    } finally {
      busyKeys.current.delete(key);
      setLoadingObraId(null);
    }
  }

  async function confirmarVenda() {
    if (!alvoVenda || busyKeys.current.has(`venda-${alvoVenda}`)) return;

    const quantidade = quantidadeValida(qtdVenda);
    const obra = obras.find((item) => item.id === alvoVenda);
    if (!quantidade || !obra || quantidade > obra.quantidade) {
      setErro('Informe uma quantidade disponível maior que zero');
      return;
    }

    setErro(null);
    setVendaLoading(true);
    try {
      await executarUmaVez(`venda-${alvoVenda}`, alvoVenda, async () => {
        if (onVenda) await onVenda(alvoVenda, quantidade);
        else {
          if (!services) throw new Error('Serviço de venda indisponível');
          await services.useCases.vendaDireta.execute({
            usuarioId: services.usuarioId,
            obraId: alvoVenda,
            qtd: quantidade,
          });
        }
        await reload();
      });
      setAlvoVenda(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível confirmar a venda');
    } finally {
      setVendaLoading(false);
    }
  }

  async function adicionar(obraId: string) {
    setErro(null);
    try {
      await executarUmaVez(`adicionar-${obraId}`, obraId, async () => {
        if (onAdicionar) await onAdicionar(obraId, 1);
        else {
          if (!services) throw new Error('Serviço de estoque indisponível');
          await services.useCases.adicionarUnidades.execute({ obraId, qtd: 1 });
        }
        await reload();
      });
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível adicionar a unidade');
    }
  }

  async function confirmarRemocaoUnidades() {
    if (!alvoUnidades) return;

    const id = alvoUnidades;
    const quantidade = qtdRemoverConfirmada;
    const obra = obras.find((item) => item.id === id);
    if (!quantidade || !obra || quantidade > obra.quantidade) {
      setErro('Informe uma quantidade disponível maior que zero');
      return;
    }

    setErro(null);
    try {
      await executarUmaVez(`remover-unidades-${id}`, id, async () => {
        if (onRemoverUnidades) await onRemoverUnidades(id, quantidade);
        else {
          if (!services) throw new Error('Serviço de estoque indisponível');
          await services.useCases.removerUnidades.execute({
            obraId: id,
            qtd: quantidade,
            confirmado: true,
            duplaConfirmacao: true,
          });
        }
        await reload();
      });
      setAlvoUnidades(null);
      setQtdRemoverConfirmada(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível remover as unidades');
    }
  }

  function prepararRemocaoUnidades(): boolean {
    if (!alvoUnidades) return false;

    const quantidade = quantidadeValida(qtdRemover);
    const obra = obras.find((item) => item.id === alvoUnidades);
    if (!quantidade || !obra || quantidade > obra.quantidade) {
      setErro('Informe uma quantidade disponível maior que zero');
      return false;
    }

    setErro(null);
    setQtdRemoverConfirmada(quantidade);
    return true;
  }

  async function confirmarRemocaoObra() {
    if (!alvoObra) return;

    const id = alvoObra;
    setAlvoObra(null);
    setErro(null);
    try {
      await executarUmaVez(`remover-obra-${id}`, id, async () => {
        if (onRemoverObra) await onRemoverObra(id);
        else {
          if (!services) throw new Error('Serviço de estoque indisponível');
          await services.useCases.removerObra.execute({ obraId: id, confirmado: true });
        }
        await reload();
      });
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível remover a obra');
    }
  }

  return (
    <SafeAreaView style={uiStyles.screen} edges={['top', 'bottom', 'left', 'right']}>
    <FlatList testID="scroll-estoque" data={obras} keyExtractor={(obra) => obra.id}
      contentContainerStyle={uiStyles.scrollContent}
      ListHeaderComponent={<View style={uiStyles.listColumn}>
      <OfflineBanner isOnline={isOnline} />
      <ScreenHeader title="Estoque de Obras" action={{ testID: 'nova-obra', title: 'Nova Obra', displayTitle: 'Nova', onPress: navigation.novaObra }} />
      <Text style={uiStyles.muted}>Suas criações, prontas para o próximo encontro.</Text>
      </View>}
      ListEmptyComponent={<Text style={uiStyles.empty}>Nenhuma obra — toque em Nova Obra</Text>}
      renderItem={({ item: obra }) => <View style={uiStyles.listColumn}>
        <ObraCard
          key={obra.id}
          obra={obra}
          loading={loadingObraId === obra.id}
          onVenda={() => {
            setErro(null);
            setQtdVenda('1');
            setAlvoVenda(obra.id);
          }}
          onAdicionar={() => void adicionar(obra.id)}
          onRemoverUnidades={() => {
            setErro(null);
            setQtdRemover('1');
            setQtdRemoverConfirmada(null);
            setAlvoUnidades(obra.id);
          }}
          onRemoverObra={() => {
            setErro(null);
            setAlvoObra(obra.id);
          }}
        />
      </View>
      } />
      {erro || alvoVenda || alvoUnidades || alvoObra ? (
      <ConfirmationLayer busy={vendaLoading || (alvoUnidades !== null && loadingObraId === alvoUnidades)} onDismiss={() => {
        setAlvoVenda(null);
        setAlvoUnidades(null);
        setQtdRemoverConfirmada(null);
        setAlvoObra(null);
        setErro(null);
      }}>
      {erro ? <Text testID="erro-estoque" accessibilityLiveRegion="polite" style={[uiStyles.error, styles.error]}>{erro}</Text> : null}
      {alvoVenda ? (
        <View testID="dialog-venda" accessibilityLabel="Confirmar venda direta" accessibilityRole="alert" style={styles.panel}>
          <Text style={uiStyles.heading}>Confirmar venda direta</Text>
          <Text style={uiStyles.muted}>{obras.find((obra) => obra.id === alvoVenda)?.nome} · {obras.find((obra) => obra.id === alvoVenda)?.quantidade} disponíveis</Text>
          <Text style={uiStyles.label}>Quantidade a vender</Text>
          <TextInput
            accessibilityLabel="Quantidade a vender"
            testID="campo-qtd-venda"
            value={qtdVenda}
            onChangeText={setQtdVenda}
            keyboardType="number-pad"
            editable={!vendaLoading}
          />
          <ActionButton
            label="cancelar-venda"
            title="Voltar sem vender"
            onPress={() => setAlvoVenda(null)}
            disabled={vendaLoading}
            appearance="secondary"
          />
          <ActionButton
            label="confirmar-venda"
            title={vendaLoading ? 'Salvando venda...' : 'Confirmar venda'}
            onPress={() => void confirmarVenda()}
            disabled={vendaLoading}
            appearance="primary"
            icon="sale"
            busy={vendaLoading}
          />
        </View>
      ) : null}
      {alvoUnidades ? (
        <View style={styles.panel}>
          <Text style={uiStyles.label}>Quantidade a remover</Text>
          <TextInput
            accessibilityLabel="Quantidade a remover"
            testID="campo-qtd-remover"
            value={qtdRemover}
            onChangeText={(value) => {
              if (qtdRemoverConfirmada === null) setQtdRemover(value);
            }}
            keyboardType="number-pad"
            editable={
              loadingObraId !== alvoUnidades && qtdRemoverConfirmada === null
            }
          />
          <ConfirmDialog
            key={alvoUnidades}
            titulo="Remover unidades? A baixa será definitiva no estoque."
            confirmLabel="Continuar para segunda confirmação"
            requireDouble
            loading={loadingObraId === alvoUnidades}
            onCancel={() => {
              setAlvoUnidades(null);
              setQtdRemoverConfirmada(null);
            }}
            onFirstConfirm={prepararRemocaoUnidades}
            onConfirm={() => void confirmarRemocaoUnidades()}
            appearance="panel"
            style={styles.panelContent}
          />
        </View>
      ) : null}
      {alvoObra ? (
        <ConfirmDialog
          titulo="Remover obra do estoque?"
          onCancel={() => setAlvoObra(null)}
          onConfirm={() => void confirmarRemocaoObra()}
          appearance="panel"
        />
      ) : null}
      </ConfirmationLayer>
      ) : null}
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  panel: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    backgroundColor: colors.surface,
    padding: spacing.none,
    gap: spacing.x4,
  },
  panelContent: {
    padding: spacing.none,
    borderWidth: spacing.none,
  },
  error: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    backgroundColor: colors.surface,
    borderWidth: borderWidths.focus,
    borderColor: colors.error,
    borderRadius: borderRadius.control,
    padding: spacing.x3,
  },
}));
