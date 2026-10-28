import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { Coordenada } from '../../core/domain/value-objects/Coordenada';
import { FakeLocationGateway } from '../../infrastructure/device/FakeLocationGateway';
import { mensagemDaPagina, webviewDeTeste } from '../../test-support/mocks/reactNativeWebview';
import { SeletorDeLocal } from '../components/mapa/SeletorDeLocal';

beforeEach(() => webviewDeTeste.reiniciar());

const pinNoMapa = (latitude: number, longitude: number) =>
  fireEvent(screen.getByTestId('mapa'), 'message', mensagemDaPagina({ tipo: 'pin', latitude, longitude }));

async function renderizar(props: Partial<React.ComponentProps<typeof SeletorDeLocal>> = {}) {
  const onConfirmar = jest.fn();
  const onCancelar = jest.fn();
  const lerGps = props.lerGps ?? jest.fn(() => new FakeLocationGateway(new Coordenada(-22.9, -43.2)).getCurrent());
  await render(
    <SeletorDeLocal
      visivel
      pontoInicial={null}
      lerGps={lerGps}
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
      {...props}
    />,
  );
  return { onConfirmar, onCancelar, lerGps };
}

describe('SeletorDeLocal', () => {
  it('abre com o pin no ponto inicial e mostra a coordenada', async () => {
    await renderizar({ pontoInicial: new Coordenada(-23.5614, -46.6558) });

    const html = screen.getByTestId('mapa').props.source.html as string;
    expect(html).toContain('setView([-23.5614,-46.6558],16)');
    expect(html).toContain('colocarPin(-23.5614,-46.6558,false)');
    expect(screen.getByTestId('coordenada-do-pin')).toHaveTextContent(/-23.5614, -46.6558/);
    expect(screen.getByTestId('aviso-sem-internet')).toBeTruthy();
  });

  it('sem ponto inicial abre na região padrão, sem pin, e não deixa confirmar', async () => {
    const { onConfirmar } = await renderizar();

    const html = screen.getByTestId('mapa').props.source.html as string;
    expect(html).toContain('setView([-23.5505,-46.6333],10)');
    expect(html).not.toContain('colocarPin(-');
    expect(screen.getByTestId('coordenada-do-pin')).toHaveTextContent('Nenhum ponto escolhido');
    expect(screen.getByTestId('botao-confirmar-local').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('botao-confirmar-local'));
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('mostra o aviso recebido (ex.: endereço não encontrado)', async () => {
    await renderizar({ aviso: 'Endereço não encontrado. Posicione o pin no mapa.' });

    expect(screen.getByTestId('aviso-seletor')).toHaveTextContent(/não encontrado/);
  });

  it('toque no mapa (mensagem da página) coloca o pin e confirmar devolve a Coordenada', async () => {
    const { onConfirmar } = await renderizar();

    await pinNoMapa(-23.55, -46.64);
    expect(screen.getByTestId('coordenada-do-pin')).toHaveTextContent('Pin: -23.55, -46.64');

    await fireEvent.press(screen.getByTestId('botao-confirmar-local'));

    expect(onConfirmar).toHaveBeenCalledTimes(1);
    const [coordenada] = onConfirmar.mock.calls[0] as [Coordenada];
    expect(coordenada).toBeInstanceOf(Coordenada);
    expect([coordenada.latitude, coordenada.longitude]).toEqual([-23.55, -46.64]);
  });

  it('arrastar o pin (mensagem da página) move a coordenada', async () => {
    const { onConfirmar } = await renderizar({ pontoInicial: new Coordenada(-23.5, -46.6) });

    await pinNoMapa(-23.51, -46.61);
    await fireEvent.press(screen.getByTestId('botao-confirmar-local'));

    const [coordenada] = onConfirmar.mock.calls[0] as [Coordenada];
    expect([coordenada.latitude, coordenada.longitude]).toEqual([-23.51, -46.61]);
  });

  it('"Minha localização" usa o GPS, move o pin e centraliza o mapa', async () => {
    const { lerGps, onConfirmar } = await renderizar({ pontoInicial: new Coordenada(-23.5, -46.6) });

    expect(lerGps).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('botao-minha-localizacao'));

    await waitFor(() =>
      expect(screen.getByTestId('coordenada-do-pin')).toHaveTextContent('Pin: -22.9, -43.2'),
    );
    expect(webviewDeTeste.injectJavaScript).toHaveBeenCalledWith(
      expect.stringContaining('colocarPin(-22.9,-43.2,true)'),
    );
    await fireEvent.press(screen.getByTestId('botao-confirmar-local'));
    const [coordenada] = onConfirmar.mock.calls[0] as [Coordenada];
    expect([coordenada.latitude, coordenada.longitude]).toEqual([-22.9, -43.2]);
  });

  it('GPS negado mostra a instrução e mantém o pin onde estava', async () => {
    await renderizar({
      pontoInicial: new Coordenada(-23.5, -46.6),
      lerGps: () => new FakeLocationGateway(undefined, 'NEGADA').getCurrent(),
    });

    await fireEvent.press(screen.getByTestId('botao-minha-localizacao'));

    await waitFor(() => expect(screen.getByTestId('erro-gps')).toHaveTextContent(/negada/i));
    expect(screen.getByTestId('coordenada-do-pin')).toHaveTextContent('Pin: -23.5, -46.6');
    expect(webviewDeTeste.injectJavaScript).not.toHaveBeenCalled();
    expect(screen.queryByTestId('botao-abrir-configuracoes')).toBeNull();
  });

  it('GPS bloqueado oferece abrir as configurações', async () => {
    const abrir = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await renderizar({ lerGps: () => new FakeLocationGateway(undefined, 'NEGADA_PERMANENTE').getCurrent() });

    await fireEvent.press(screen.getByTestId('botao-minha-localizacao'));
    await fireEvent.press(await screen.findByTestId('botao-abrir-configuracoes'));

    expect(abrir).toHaveBeenCalledTimes(1);
    abrir.mockRestore();
  });

  it('toque duplo em "Minha localização" faz uma única leitura', async () => {
    let responder: (c: Coordenada) => void = () => {};
    const lerGps = jest.fn(() => new Promise<Coordenada>((resolve) => (responder = resolve)));
    await renderizar({ lerGps });

    await fireEvent.press(screen.getByTestId('botao-minha-localizacao'));
    await fireEvent.press(screen.getByTestId('botao-minha-localizacao'));
    await act(async () => responder(new Coordenada(1, 2)));

    expect(lerGps).toHaveBeenCalledTimes(1);
  });

  it('cancelar chama onCancelar sem confirmar', async () => {
    const { onCancelar, onConfirmar } = await renderizar({ pontoInicial: new Coordenada(1, 2) });

    await fireEvent.press(screen.getByTestId('botao-cancelar-local'));

    expect(onCancelar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('fechado não monta o mapa', async () => {
    await renderizar({ visivel: false });

    expect(screen.queryByTestId('mapa')).toBeNull();
  });
});
