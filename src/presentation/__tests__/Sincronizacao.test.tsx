import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AppState, Text } from 'react-native';

import { MonitorDeRedeExpo } from '../../infrastructure/device/rede/MonitorDeRedeExpo';
import { makeFakeProviders } from '../../main/factories/makeFakeProviders';
import type { EstadoDoSync, MotorDeSync } from '../../main/sync/MotorDeSync';
import { redeDeTeste } from '../../test-support/mocks/expoNetwork';
import { IndicadorDeSync } from '../components/IndicadorDeSync';
import { PainelDeSync } from '../components/PainelDeSync';
import { AppProviders, NetworkContext, SyncContext, useAuth, useNetwork } from '../hooks/AppProviders';

const ESTADO: EstadoDoSync = {
  sincronizando: false,
  pendentes: 0,
  falhas: 0,
  semRede: false,
  sessaoExpirada: false,
  ultimaSincronizacao: null,
};

async function painel(estado: Partial<EstadoDoSync>, online = true) {
  const sincronizarAgora = jest.fn(async () => {});
  const tentarDeNovo = jest.fn(async () => {});
  const tela = await render(
    <NetworkContext.Provider value={{ isOnline: online, setOnline: () => {} }}>
      <SyncContext.Provider value={{ estado: { ...ESTADO, ...estado }, sincronizarAgora, tentarDeNovo }}>
        <PainelDeSync />
      </SyncContext.Provider>
    </NetworkContext.Provider>,
  );
  return { tela, sincronizarAgora, tentarDeNovo };
}

describe('PainelDeSync', () => {
  it.each([
    [{}, true, 'Tudo sincronizado.'],
    [{ pendentes: 3 }, true, '3 alterações aguardando envio.'],
    [{ pendentes: 1 }, false, 'Sem conexão. 1 alteração aguardando envio.'],
    [{ sincronizando: true }, true, 'Sincronizando...'],
    [{ falhas: 2 }, true, '2 alterações recusadas pelo servidor.'],
    [{ sessaoExpirada: true }, true, 'Sessão expirada. Saia e entre de novo para sincronizar.'],
  ])('%j online=%s → "%s"', async (estado, online, texto) => {
    await painel(estado, online);
    expect(await screen.findByTestId('painel-sync-texto')).toHaveTextContent(texto);
  });

  it('sincronizar agora e tentar de novo chamam o motor', async () => {
    const { sincronizarAgora, tentarDeNovo } = await painel({ falhas: 1 });
    await fireEvent.press(await screen.findByTestId('botao-sincronizar'));
    await fireEvent.press(screen.getByTestId('botao-tentar-de-novo'));
    expect(sincronizarAgora).toHaveBeenCalled();
    expect(tentarDeNovo).toHaveBeenCalled();
  });

  it('offline: sem botão de reenviar e sincronizar desabilitado', async () => {
    const { sincronizarAgora } = await painel({ falhas: 1 }, false);
    expect(screen.queryByTestId('botao-tentar-de-novo')).toBeNull();
    await fireEvent.press(await screen.findByTestId('botao-sincronizar'));
    expect(sincronizarAgora).not.toHaveBeenCalled();
  });

  it('sem motor (bag fake) não aparece', async () => {
    await render(<PainelDeSync />);
    expect(screen.queryByTestId('painel-sync')).toBeNull();
  });
});

describe('IndicadorDeSync', () => {
  it('nada quando sincronizado; selo para pendente e para erro', async () => {
    const { rerender } = await render(<IndicadorDeSync status="SINCRONIZADO" testID="s" />);
    expect(screen.queryByTestId('s')).toBeNull();
    await rerender(<IndicadorDeSync status="PENDENTE" testID="s" />);
    expect(screen.getByTestId('s')).toHaveTextContent('Aguardando envio');
    await rerender(<IndicadorDeSync status="ERRO" testID="s" />);
    expect(screen.getByTestId('s')).toHaveTextContent('Erro ao enviar');
  });
});

function motorFalso() {
  let ouvinteDeDados: (() => void) | null = null;
  const motor = {
    obterEstado: () => ESTADO,
    observar: jest.fn(() => () => {}),
    aoMudarDados: jest.fn((ouvinte: () => void) => {
      ouvinteDeDados = ouvinte;
      return () => {};
    }),
    atualizarResumo: jest.fn(async () => {}),
    sincronizarAgora: jest.fn(async () => null),
    tentarDeNovo: jest.fn(async () => null),
    agendar: jest.fn(),
    parar: jest.fn(),
  };
  return { motor, dadosMudaram: () => ouvinteDeDados?.() };
}

function Sonda() {
  const { session, restaurando } = useAuth();
  const { isOnline } = useNetwork();
  return (
    <Text testID="sonda">
      {restaurando ? 'restaurando' : session ? 'logado' : 'deslogado'} {isOnline ? 'online' : 'offline'}
    </Text>
  );
}

describe('SyncProvider e NetworkProvider (gatilhos)', () => {
  beforeEach(() => redeDeTeste.reiniciar());

  async function montar() {
    const providers = makeFakeProviders();
    await providers.gateways.auth.login('artesao@email.com', '123456');
    const { motor, dadosMudaram } = motorFalso();
    const bag = {
      ...providers,
      motorDeSync: motor as unknown as MotorDeSync,
      rede: new MonitorDeRedeExpo(),
    };
    const loadData = jest.spyOn(bag, 'loadData');
    await render(
      <AppProviders providers={bag}>
        <Sonda />
      </AppProviders>,
    );
    return { bag, motor, dadosMudaram, loadData };
  }

  it('com sessão restaurada, sincroniza ao abrir', async () => {
    const { motor } = await montar();
    await waitFor(() => expect(screen.getByTestId('sonda')).toHaveTextContent(/^logado/));
    await waitFor(() => expect(motor.sincronizarAgora).toHaveBeenCalledTimes(1));
  });

  it('reconectar dispara um ciclo; cair a rede mostra offline', async () => {
    const { motor } = await montar();
    await waitFor(() => expect(motor.sincronizarAgora).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(redeDeTeste.ouvintes()).toBe(1));

    await act(async () => redeDeTeste.mudar({ isConnected: false, isInternetReachable: false }));
    expect(screen.getByTestId('sonda')).toHaveTextContent(/offline$/);
    expect(motor.sincronizarAgora).toHaveBeenCalledTimes(1);

    await act(async () => redeDeTeste.mudar({ isConnected: true, isInternetReachable: true }));
    expect(screen.getByTestId('sonda')).toHaveTextContent(/ online$/);
    await waitFor(() => expect(motor.sincronizarAgora).toHaveBeenCalledTimes(2));
  });

  it('voltar ao primeiro plano dispara um ciclo', async () => {
    const ouvintes: ((estado: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_tipo, ouvinte) => {
      ouvintes.push(ouvinte as (estado: string) => void);
      return { remove: () => {} } as never;
    });
    const { motor } = await montar();
    await waitFor(() => expect(motor.sincronizarAgora).toHaveBeenCalledTimes(1));

    await act(async () => ouvintes.forEach((ouvinte) => ouvinte('active')));

    expect(motor.sincronizarAgora).toHaveBeenCalledTimes(2);
  });

  it('ciclo que mudou dados recarrega as telas', async () => {
    const { dadosMudaram, loadData } = await montar();
    await waitFor(() => expect(loadData).toHaveBeenCalled());
    const antes = loadData.mock.calls.length;

    await act(async () => dadosMudaram());

    await waitFor(() => expect(loadData.mock.calls.length).toBe(antes + 1));
  });
});
