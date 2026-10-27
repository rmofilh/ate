import {
  type AbridorDaCamera,
  ExpoCameraGateway,
  MENSAGEM_CAMERA_INDISPONIVEL,
  MENSAGEM_CAMERA_OCUPADA,
  MENSAGEM_PERMISSAO_NEGADA,
  type ResultadoDaCamera,
} from '../ExpoCameraGateway';

const FOTO: ResultadoDaCamera = { tipo: 'foto', uri: 'file:///cache/c.jpg', largura: 4000, altura: 3000 };

function setup() {
  const destino = { armazenar: jest.fn(async () => 'fotos/nova.jpg') };
  const gateway = new ExpoCameraGateway(destino);
  return { destino, gateway };
}

/** Abridor controlado pelo teste: cada abertura fica pendente até `responder`. */
function abridorManual() {
  const pendentes: ((resultado: ResultadoDaCamera) => void)[] = [];
  const abridor: AbridorDaCamera = () => new Promise((resolve) => pendentes.push(resolve));
  return { abridor, pendentes, responder: (r: ResultadoDaCamera) => pendentes.shift()?.(r) };
}

describe('ExpoCameraGateway', () => {
  it('sem a UI registrada, avisa que a câmera está indisponível', async () => {
    const { gateway } = setup();
    await expect(gateway.capture()).rejects.toThrow(MENSAGEM_CAMERA_INDISPONIVEL);
  });

  it('foto aceita é armazenada e o caminho relativo é devolvido', async () => {
    const { gateway, destino } = setup();
    gateway.registrarAbridor(async () => FOTO);

    await expect(gateway.capture()).resolves.toBe('fotos/nova.jpg');
    expect(destino.armazenar).toHaveBeenCalledWith({
      uri: 'file:///cache/c.jpg',
      largura: 4000,
      altura: 3000,
    });
  });

  it('cancelar devolve null sem armazenar', async () => {
    const { gateway, destino } = setup();
    gateway.registrarAbridor(async () => ({ tipo: 'cancelado' }));

    await expect(gateway.capture()).resolves.toBeNull();
    expect(destino.armazenar).not.toHaveBeenCalled();
  });

  it('permissão negada vira erro com instrução, sem armazenar', async () => {
    const { gateway, destino } = setup();
    gateway.registrarAbridor(async () => ({ tipo: 'negado' }));

    await expect(gateway.capture()).rejects.toThrow(MENSAGEM_PERMISSAO_NEGADA);
    expect(MENSAGEM_PERMISSAO_NEGADA).toMatch(/configurações/);
    expect(destino.armazenar).not.toHaveBeenCalled();
  });

  it('segunda captura com a câmera aberta falha e a primeira termina normalmente', async () => {
    const { gateway } = setup();
    const manual = abridorManual();
    gateway.registrarAbridor(manual.abridor);

    const primeira = gateway.capture();
    await expect(gateway.capture()).rejects.toThrow(MENSAGEM_CAMERA_OCUPADA);
    manual.responder(FOTO);

    await expect(primeira).resolves.toBe('fotos/nova.jpg');
    expect(manual.pendentes).toHaveLength(0);
  });

  it('libera a câmera depois de uma falha ao armazenar', async () => {
    const { gateway, destino } = setup();
    gateway.registrarAbridor(async () => FOTO);
    destino.armazenar.mockRejectedValueOnce(new Error('disco cheio'));

    await expect(gateway.capture()).rejects.toThrow('disco cheio');
    await expect(gateway.capture()).resolves.toBe('fotos/nova.jpg');
  });

  it('remover o registro volta a indisponível, mas um registro antigo não apaga o novo', async () => {
    const { gateway } = setup();
    const removerAntigo = gateway.registrarAbridor(async () => FOTO);
    const removerNovo = gateway.registrarAbridor(async () => ({ tipo: 'cancelado' }));

    removerAntigo();
    await expect(gateway.capture()).resolves.toBeNull();

    removerNovo();
    await expect(gateway.capture()).rejects.toThrow(MENSAGEM_CAMERA_INDISPONIVEL);
  });
});
