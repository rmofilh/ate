import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import TelaNovaObra from '../../app/obra/nova';
import { makeFakeProviders } from '../../main/factories/makeFakeProviders';
import { AppProviders } from '../hooks/AppProviders';

function uriDaImagem(testID: string): string {
  return [screen.getByTestId(testID).props.source].flat()[0].uri;
}

async function preencherObraUnica() {
  await fireEvent.changeText(screen.getByTestId('campo-nome-obra'), 'Garça');
}

describe('foto de catálogo na Nova Obra', () => {
  it('sem foto salva com fotoPath null', async () => {
    const onSalvar = jest.fn(async () => {});
    await render(<TelaNovaObra onSalvar={onSalvar} onCapturarFoto={jest.fn()} />);
    await preencherObraUnica();

    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));

    expect(onSalvar).toHaveBeenCalledWith({ nome: 'Garça', tipo: 'UNICA', quantidade: 1, fotoPath: null });
  });

  it('foto tirada aparece na miniatura e vai junto ao salvar', async () => {
    const onSalvar = jest.fn(async () => {});
    await render(
      <TelaNovaObra onSalvar={onSalvar} onCapturarFoto={async () => 'fotos/garca.jpg'} />,
    );
    await preencherObraUnica();

    await fireEvent.press(screen.getByTestId('botao-foto-catalogo'));

    await waitFor(() =>
      expect(uriDaImagem('miniatura-foto-catalogo')).toBe('file:///docs/fotos/garca.jpg'),
    );
    expect(screen.getByTestId('botao-foto-catalogo')).toHaveTextContent('Tirar outra foto');
    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ fotoPath: 'fotos/garca.jpg' }));
  });

  it('cancelar a câmera não muda nada', async () => {
    const onSalvar = jest.fn(async () => {});
    await render(<TelaNovaObra onSalvar={onSalvar} onCapturarFoto={async () => null} />);
    await preencherObraUnica();

    await fireEvent.press(screen.getByTestId('botao-foto-catalogo'));
    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));

    expect(screen.queryByTestId('miniatura-foto-catalogo')).toBeNull();
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ fotoPath: null }));
  });

  it('remover a foto volta a salvar sem foto', async () => {
    const onSalvar = jest.fn(async () => {});
    await render(<TelaNovaObra onSalvar={onSalvar} onCapturarFoto={async () => 'fotos/garca.jpg'} />);
    await preencherObraUnica();
    await fireEvent.press(screen.getByTestId('botao-foto-catalogo'));
    await screen.findByTestId('miniatura-foto-catalogo');

    await fireEvent.press(screen.getByTestId('botao-remover-foto-catalogo'));
    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));

    expect(screen.queryByTestId('miniatura-foto-catalogo')).toBeNull();
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ fotoPath: null }));
  });

  it('permissão negada mostra a instrução e a obra ainda pode ser salva sem foto', async () => {
    const onSalvar = jest.fn(async () => {});
    await render(
      <TelaNovaObra
        onSalvar={onSalvar}
        onCapturarFoto={async () => {
          throw new Error('Permissão de câmera negada. Habilite a câmera nas configurações do aparelho para tirar a foto.');
        }}
      />,
    );
    await preencherObraUnica();

    await fireEvent.press(screen.getByTestId('botao-foto-catalogo'));
    await waitFor(() => expect(screen.getByTestId('erro-obra')).toHaveTextContent(/configurações/));

    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ fotoPath: null }));
  });

  it('integração: usa a câmera da bag e grava o caminho na obra', async () => {
    const providers = makeFakeProviders();
    await render(
      <AppProviders providers={providers}>
        <TelaNovaObra onConcluido={jest.fn()} />
      </AppProviders>,
    );
    await preencherObraUnica();

    await fireEvent.press(screen.getByTestId('botao-foto-catalogo'));
    await screen.findByTestId('miniatura-foto-catalogo');
    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));

    await waitFor(async () => {
      const obras = await providers.repositories.obras.findByUsuario(providers.usuarioId);
      expect(obras.find((obra) => obra.nome === 'Garça')?.fotoPath).toBe('/tmp/foto-fake.jpg');
    });
  });
});
