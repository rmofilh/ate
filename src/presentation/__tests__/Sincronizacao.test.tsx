import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AppState, Text } from 'react-native';

import { MonitorDeRedeExpo } from '../../infrastructure/device/rede/MonitorDeRedeExpo';
import { makeFakeProviders } from '../../main/factories/makeFakeProviders';
import type { EstadoDoSync, MotorDeSync } from '../../main/sync/MotorDeSync';
import { redeDeTeste } from '../../test-support/mocks/expoNetwork';
import { IndicadorDeSync } from '../components/IndicadorDeSync';
import { StatusDaNuvem } from '../components/StatusDaNuvem';
import { AppProviders, NetworkContext, SyncContext, useAuth, useNetwork } from '../hooks/AppProviders';

const ESTADO: EstadoDoSync = {
  sincronizando: false,
  pendentes: 0,
  falhas: 0,
  semRede: false,
  sessaoExpirada: false,
  ultimaSincronizacao: null,
};

async function nuvem(estado: Partial<EstadoDoSync> | null, online = true) {
  const sincronizarAgora = jest.fn(async () => {});
  const tentarDeNovo = jest.fn(async () => {});
  await render(
    <NetworkContext.Provider value={{ isOnline: online, setOnline: () => {} }}>
      <SyncContext.Provider
        value={{ estado: estado ? { ...ESTADO, ...estado } : null, sincronizarAgora, tentarDeNovo }}
      >
        <StatusDaNuvem />
      </SyncContext.Provider>
    </NetworkContext.Provider>,
  );
  return { sincronizarAgora, tentarDeNovo };
}

describe('StatusDaNuvem (aviso discreto, sem sincronização manual)', () => {
  it.each([
    [{}, true, 'Tudo sincronizado'],
    [{ pendentes: 3 }, true, 'Sincronizando…'],
    [{ sincronizando: true }, true, 'Sincronizando…'],
    [{ pendentes: 2 }, false, 'Sem conexão · salvo no aparelho'],
    [{ falhas: 2 }, true, 'Algo não foi enviado · toque para tentar de novo'],
    [{ sessaoExpirada: true }, true, 'Entre de novo para sincronizar'],
  ])('%j online=%s → "%s"', async (estado, online, texto) => {
    await nuvem(estado, online);
    expect(screen.getByTestId('status-nuvem-texto')).toHaveTextContent(texto);
  });

  it('não existe botão de sincronizar agora', async () => {
    await nuvem({ pendentes: 1 });
    expect(screen.queryByTestId('botao-sincronizar')).toBeNull();
    expect(screen.queryByText(/sincronizar agora/i)).toBeNull();
  });

  it('só o estado de erro é tocável, e tenta de novo', async () => {
    const { tentarDeNovo } = await nuvem({ falhas: 1 });
    await fireEvent.press(screen.getByTestId('status-nuvem'));
    expect(tentarDeNovo).toHaveBeenCalledTimes(1);
  });

  it('tocar no estado normal não faz nada', async () => {
    const { tentarDeNovo, sincronizarAgora } = await nuvem({});
    await fireEvent.press(screen.getByTestId('status-nuvem'));
    expect(tentarDeNovo).not.toHaveBeenCalled();
    expect(sincronizarAgora).not.toHaveBeenCalled();
  });

  it('sem motor (bag fake) e online: não mostra nada', async () => {
    await nuvem(null, true);
    expect(screen.queryByTestId('status-nuvem')).toBeNull();
  });

  it('sem motor (bag fake) e offline: mostra "Sem conexão"', async () => {
    await nuvem(null, false);
    expect(screen.getByTestId('status-nuvem-texto')).toHaveTextContent(/^Sem conexão/);
  });
});

describe('IndicadorDeSync (selo do card só no erro)', () => {
  it('nada para sincronizado e pendente; "Não enviado" para erro', async () => {
    const { rerender } = await render(<IndicadorDeSync status="SINCRONIZADO" testID="s" />);
    expect(screen.queryByTestId('s')).toBeNull();
    await rerender(<IndicadorDeSync status="PENDENTE" testID="s" />);
    expect(screen.queryByTestId('s')).toBeNull();
    await rerender(<IndicadorDeSync status="ERRO" testID="s" />);
    expect(screen.getByTestId('s')).toHaveTextContent('Não enviado');
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
