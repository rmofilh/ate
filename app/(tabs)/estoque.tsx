import React, { useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../../src/presentation/components/ActionButton';
import { ConfirmDialog } from '../../src/presentation/components/ConfirmDialog';
import { ObraCard } from '../../src/presentation/components/ObraCard';
import { OfflineBanner } from '../../src/presentation/components/OfflineBanner';
import {
  useData,
  useAppNavigation,
  useNetwork,
  useServices,
} from '../../src/presentation/hooks/AppProviders';

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
    <ScrollView testID="scroll-estoque">
      <OfflineBanner isOnline={isOnline} />
      <Text accessibilityRole="header">Estoque de Obras</Text>
      <ActionButton
        label="nova-obra"
        title="Nova Obra"
        onPress={navigation.novaObra}
      />
      {erro ? <Text testID="erro-estoque">{erro}</Text> : null}
      {obras.length === 0 ? <Text>Nenhuma obra — toque em Nova Obra</Text> : null}
      {obras.map((obra) => (
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
      ))}
      {alvoVenda ? (
        <View testID="dialog-venda" accessibilityLabel="Confirmar venda direta" accessibilityRole="alert">
          <Text>Confirmar venda direta</Text>
          <Text>Quantidade a vender</Text>
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
          />
          <ActionButton
            label="confirmar-venda"
            title={vendaLoading ? 'Salvando venda...' : 'Confirmar venda'}
            onPress={() => void confirmarVenda()}
            disabled={vendaLoading}
          />
        </View>
      ) : null}
      {alvoUnidades ? (
        <View>
          <Text>Quantidade a remover</Text>
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
          />
        </View>
      ) : null}
      {alvoObra ? (
        <ConfirmDialog
          titulo="Remover obra do estoque?"
          onCancel={() => setAlvoObra(null)}
          onConfirm={() => void confirmarRemocaoObra()}
        />
      ) : null}
    </ScrollView>
  );
}
