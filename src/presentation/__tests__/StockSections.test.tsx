import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import TelaEstoque from '../../app/(tabs)/estoque';
import TelaNovaObra from '../../app/obra/nova';
import { Obra } from '../../core/domain/entities/Obra';
import { seedFixtures } from '../../infrastructure/seed/fixtures';
import { gerarIdTeste } from '../../test-support/ids';
import { DataContext } from '../hooks/AppProviders';

describe('seções visuais do estoque', () => {
  it('coloca séries antes das únicas mantendo a ordem de cada grupo e a coleção original', async () => {
    const seed = seedFixtures();
    const unica = seed.obras.find((obra) => obra.tipo === 'UNICA')!;
    const serie = seed.obras.find((obra) => obra.tipo === 'SERIE')!;
    const secondUnica = Obra.criar({ id: gerarIdTeste(), usuarioId: seed.usuarioId, nome: 'Segunda peça única', tipo: 'UNICA' });
    const secondSerie = Obra.criar({ id: gerarIdTeste(), usuarioId: seed.usuarioId, nome: 'Segunda série', tipo: 'SERIE', quantidade: 3 });
    const source = [unica, serie, secondUnica, secondSerie];
    await render(<DataContext.Provider value={{ ...seed, obras: source, reload: async () => {} }}><TelaEstoque /></DataContext.Provider>);
    expect(screen.getAllByTestId(/^obra-/).map((card) => card.props.testID))
      .toEqual([serie, secondSerie, unica, secondUnica].map((obra) => `obra-${obra.id}`));
    expect(screen.getByTestId('secao-estoque-serie')).toHaveTextContent(/Obras em série/);
    expect(screen.getByTestId('secao-estoque-unica')).toHaveTextContent(/Peças únicas/);
    expect(source).toEqual([unica, serie, secondUnica, secondSerie]);
    expect(serie.quantidade).toBe(4);
    expect(unica.statusObra).toBe('RESERVADA');
  });

  it('uma categoria vazia não cria uma seção sem conteúdo', async () => {
    const seed = seedFixtures();
    await render(<DataContext.Provider value={{ ...seed, obras: seed.obras.filter((obra) => obra.tipo === 'UNICA'), reload: async () => {} }}>
      <TelaEstoque />
    </DataContext.Provider>);
    expect(screen.queryByTestId('secao-estoque-serie')).toBeNull();
    expect(screen.getByTestId('secao-estoque-unica')).toBeTruthy();
  });
});

describe('tipo da obra pelo seletor', () => {
  it('não oferece digitação de enum e única continua sendo salva com quantidade 1', async () => {
    const save = jest.fn(async () => {});
    await render(<TelaNovaObra onSalvar={save} />);
    expect(screen.getByTestId('campo-tipo-obra').props.onChangeText).toBeUndefined();
    expect(screen.queryByText('Código do tipo: UNICA ou SERIE')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('campo-nome-obra'), 'Nova peça');
    await fireEvent.press(screen.getByTestId('tipo-serie'));
    await fireEvent.changeText(screen.getByTestId('campo-qtd-obra'), '7');
    await fireEvent.press(screen.getByTestId('tipo-unica'));
    expect(screen.queryByTestId('campo-qtd-obra')).toBeNull();
    expect(screen.getByTestId('tipo-unica').props.accessibilityState.selected).toBe(true);
    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));
    expect(save).toHaveBeenCalledWith({ nome: 'Nova peça', tipo: 'UNICA', quantidade: 1 });
  });

  it('trocar de tipo não perde a quantidade preenchida para série', async () => {
    const save = jest.fn(async () => {});
    await render(<TelaNovaObra onSalvar={save} />);
    await fireEvent.changeText(screen.getByTestId('campo-nome-obra'), 'Série de teste');
    await fireEvent.press(screen.getByTestId('tipo-serie'));
    await fireEvent.changeText(screen.getByTestId('campo-qtd-obra'), '5');
    await fireEvent.press(screen.getByTestId('tipo-unica'));
    await fireEvent.press(screen.getByTestId('tipo-serie'));
    expect(screen.getByTestId('campo-qtd-obra').props.value).toBe('5');
    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));
    expect(save).toHaveBeenCalledWith({ nome: 'Série de teste', tipo: 'SERIE', quantidade: 5 });
  });
});
