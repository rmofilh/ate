import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import TelaNovoPedido from '../../app/pedido/novo';
import { Cliente } from '../../core/domain/entities/Cliente';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { gerarIdTeste } from '../../test-support/ids';
import { NavigationContext } from '../hooks/AppProviders';

async function fillOrder() {
  await fireEvent.changeText(screen.getByTestId('campo-descricao'), 'Criação de teste');
  await fireEvent.changeText(screen.getByTestId('campo-data-entrega'), '2026-12-15');
}

describe('seleção de clientes no novo pedido', () => {
  it('começa sem cliente e exige uma escolha consciente antes de salvar', async () => {
    const seed = seedFixtures();
    const save = jest.fn(async () => {});
    await render(<TelaNovoPedido clientes={seed.clientes} obras={seed.obras} onSalvar={save} />);
    expect(screen.getByTestId('cliente-sem-selecao')).toBeTruthy();
    expect(screen.queryByTestId('cliente-selecionado')).toBeNull();
    await fillOrder();
    await fireEvent.press(screen.getByTestId('botao-salvar-pedido'));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByTestId('erro-pedido')).toHaveTextContent(/escolha o cliente/i);
  });

  it('busca por nome sem acentos e por telefone, sem espalhar uma lista grande no formulário', async () => {
    const seed = seedFixtures();
    const clients = Array.from({ length: 120 }, (_, index) => Cliente.criar({ id: gerarIdTeste(), usuarioId: seed.usuarioId,
      nome: `Pessoa ${index}`, contato: `Contato ${index}` }));
    const target = Cliente.criar({ id: gerarIdTeste(), usuarioId: seed.usuarioId, nome: 'João Ávila', contato: '+55 (11) 98765-4321' });
    await render(<TelaNovoPedido clientes={[...clients, target]} obras={[]} />);
    expect(screen.queryByTestId(`escolher-cliente-${target.id}`)).toBeNull();
    await fireEvent.press(screen.getByTestId('selecionar-cliente-existente'));
    expect(screen.getByTestId('escolher-cliente-lista')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('escolher-cliente-busca'), 'JOAO AVILA');
    expect(screen.getByText('1 resultado')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`escolher-cliente-${target.id}`));
    expect(within(screen.getByTestId('cliente-selecionado')).getByText('João Ávila')).toBeTruthy();
    expect(screen.getByTestId('detalhe-cliente-selecionado')).toHaveTextContent(target.contato);
    expect(screen.queryByTestId('escolher-cliente-modal')).toBeNull();
    await fireEvent.press(screen.getByTestId('selecionar-cliente-existente'));
    await fireEvent.changeText(screen.getByTestId('escolher-cliente-busca'), '11987654321');
    expect(screen.getByTestId(`escolher-cliente-${target.id}`)).toBeTruthy();
    expect(screen.getByText('1 resultado')).toBeTruthy();
  });

  it('distingue o avulso de um cliente normal homônimo e usa seu ID real', async () => {
    const seed = seedFixtures();
    const avulso = seed.clientes.find((cliente) => cliente.contato === '')!;
    const normal = Cliente.criar({ id: gerarIdTeste(), usuarioId: seed.usuarioId, nome: 'Cliente Avulso', contato: '11999998888' });
    const save = jest.fn(async () => {});
    await render(<TelaNovoPedido clientes={[...seed.clientes, normal]} obras={[]} onSalvar={save} />);
    await fireEvent.press(screen.getByTestId('selecionar-cliente-existente'));
    await fireEvent.press(screen.getByTestId(`escolher-cliente-${avulso.id}`));
    expect(screen.getByTestId('detalhe-cliente-selecionado')).toHaveTextContent(/sem cadastro individual/);
    await fillOrder();
    await fireEvent.press(screen.getByTestId('botao-salvar-pedido'));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ clienteId: avulso.id }));

    await fireEvent.press(screen.getByTestId('selecionar-cliente-existente'));
    await fireEvent.changeText(screen.getByTestId('escolher-cliente-busca'), 'avulso');
    expect(within(screen.getByTestId(`escolher-cliente-${avulso.id}`)).getByText('AVULSO')).toBeTruthy();
    expect(within(screen.getByTestId(`escolher-cliente-${normal.id}`)).getByText(normal.contato)).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`escolher-cliente-${normal.id}`));
    expect(screen.getByTestId('detalhe-cliente-selecionado')).toHaveTextContent(normal.contato);
  });

  it('cancelar a busca ou voltar pelo sistema preserva cliente e demais campos', async () => {
    const seed = seedFixtures();
    await render(<TelaNovoPedido clientes={seed.clientes} obras={[]} />);
    await fillOrder();
    await fireEvent.press(screen.getByTestId('selecionar-cliente-existente'));
    await fireEvent.press(screen.getByTestId(`escolher-cliente-${seed.clientes[0].id}`));
    await fireEvent.press(screen.getByTestId('selecionar-cliente-existente'));
    await fireEvent.changeText(screen.getByTestId('escolher-cliente-busca'), 'inexistente');
    expect(screen.getByText('Nenhum resultado para esta busca.')).toBeTruthy();
    await fireEvent(screen.getByTestId('escolher-cliente-modal'), 'requestClose');
    expect(within(screen.getByTestId('cliente-selecionado')).getByText(seed.clientes[0].nome)).toBeTruthy();
    expect(screen.getByTestId('campo-descricao').props.value).toBe('Criação de teste');
    expect(screen.getByTestId('campo-data-entrega').props.value).toBe('2026-12-15');
    await fireEvent.press(screen.getByTestId('selecionar-cliente-existente'));
    await fireEvent.press(screen.getByTestId('escolher-cliente-fechar'));
    expect(screen.queryByTestId('escolher-cliente-modal')).toBeNull();
  });

  it('oferece cadastrar após uma busca vazia, usando a navegação existente', async () => {
    const create = jest.fn();
    await render(<NavigationContext.Provider value={{ novoCliente: create, novoPedido: () => {}, novaObra: () => {},
      novoEvento: () => {}, editarCliente: () => {}, editarPedido: () => {}, editarEvento: () => {}, voltar: () => {} }}>
      <TelaNovoPedido clientes={[]} obras={[]} />
    </NavigationContext.Provider>);
    await fireEvent.press(screen.getByTestId('selecionar-cliente-existente'));
    expect(screen.getByText('Nenhum cliente cadastrado.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('novo-cliente'));
    expect(create).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('escolher-cliente-modal')).toBeNull();
  });

  it('mantém o avulso fixado durante a busca sem duplicá-lo no seletor ou no formulário', async () => {
    const seed = seedFixtures();
    const avulso = seed.clientes.find((cliente) => cliente.contato === '')!;
    await render(<TelaNovoPedido clientes={seed.clientes} obras={[]} />);
    expect(screen.getByRole('button', { name: 'Selecionar Cliente' })).toBeTruthy();
    expect(screen.queryByTestId(`escolher-cliente-${avulso.id}`)).toBeNull();
    expect(screen.queryByTestId('novo-cliente')).toBeNull();
    await fireEvent.press(screen.getByTestId('selecionar-cliente-existente'));
    expect(within(screen.getByTestId('escolher-cliente-fixados')).getByTestId(`escolher-cliente-${avulso.id}`)).toBeTruthy();
    expect(screen.getAllByTestId(`escolher-cliente-${avulso.id}`)).toHaveLength(1);
    await fireEvent.changeText(screen.getByTestId('escolher-cliente-busca'), 'cliente não encontrado');
    expect(screen.getByTestId(`escolher-cliente-${avulso.id}`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`escolher-cliente-${avulso.id}`));
    expect(screen.getAllByText('Cliente Avulso')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Selecionar Cliente' })).toHaveLength(1);
    expect(screen.queryByTestId(`escolher-cliente-${avulso.id}`)).toBeNull();
  });
});
