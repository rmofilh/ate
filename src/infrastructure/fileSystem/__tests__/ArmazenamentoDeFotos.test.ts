import { createHash } from 'crypto';
import { File as FileExpo } from 'expo-file-system';

import { bancoDeTeste } from '../../../test-support/bancoDeTeste';
import { idsTeste } from '../../../test-support/ids';
import { falhasFs, File as FileDuble, fsDeTeste } from '../../../test-support/mocks/expoFileSystem';
import {
  falhasManipulador,
  limparManipulador,
  manipulacoes,
} from '../../../test-support/mocks/expoImageManipulator';
import type { DrizzleAppDb } from '../../database/sqlite/DrizzleDb';
import { fotos } from '../../database/sqlite/schema';
import { ArmazenamentoDeFotos } from '../ArmazenamentoDeFotos';

const AGORA = new Date('2026-11-03T12:00:00.000Z');
const TEMP = 'file:///cache/Camera/original.jpg';

function arquivosEmFotos(): string[] {
  return fsDeTeste.uris().filter((uri) => uri.startsWith('file:///docs/fotos/'));
}

describe('ArmazenamentoDeFotos.armazenar', () => {
  let db: DrizzleAppDb;
  let armazenamento: ArmazenamentoDeFotos;

  beforeEach(() => {
    fsDeTeste.limpar();
    limparManipulador();
    fsDeTeste.escrever(TEMP, 'foto-original-grande');
    db = bancoDeTeste();
    armazenamento = new ArmazenamentoDeFotos(db, idsTeste, () => AGORA);
  });

  it('usa o dublê do expo-file-system registrado no jest.setup', () => {
    expect(FileExpo).toBe(FileDuble);
  });

  it('reduz o maior lado de uma foto deitada para 1600 px e comprime em JPEG 0,7', async () => {
    await armazenamento.armazenar({ uri: TEMP, largura: 4000, altura: 3000 });

    expect(manipulacoes).toHaveLength(1);
    expect(manipulacoes[0].origem).toBe(TEMP);
    expect(manipulacoes[0].resize).toEqual([{ width: 1600 }]);
    expect(manipulacoes[0].salvo).toEqual({ compress: 0.7, format: 'jpeg' });
  });

  it('reduz pela altura quando a foto está em pé', async () => {
    await armazenamento.armazenar({ uri: TEMP, largura: 3000, altura: 4000 });
    expect(manipulacoes[0].resize).toEqual([{ height: 1600 }]);
  });

  it('não amplia foto que já cabe em 1600 px, mas comprime', async () => {
    await armazenamento.armazenar({ uri: TEMP, largura: 1200, altura: 900 });
    expect(manipulacoes[0].resize).toEqual([]);
    expect(manipulacoes[0].salvo).toEqual({ compress: 0.7, format: 'jpeg' });
  });

  it('move para fotos/<uuid>.jpg nos documentos, devolve o caminho relativo e apaga os temporários', async () => {
    const caminho = await armazenamento.armazenar({ uri: TEMP, largura: 4000, altura: 3000 });

    expect(caminho).toMatch(/^fotos\/[0-9a-f-]{36}\.jpg$/);
    expect(arquivosEmFotos()).toEqual([`file:///docs/${caminho}`]);
    expect(fsDeTeste.existe(TEMP)).toBe(false);
    expect(fsDeTeste.uris().filter((uri) => uri.startsWith('file:///cache/'))).toEqual([]);
  });

  it('grava a linha em fotos com SHA-256 do arquivo final e PENDENTE_UPLOAD', async () => {
    const caminho = await armazenamento.armazenar({ uri: TEMP, largura: 4000, altura: 3000 });

    const esperado = createHash('sha256')
      .update(Buffer.from(fsDeTeste.ler(`file:///docs/${caminho}`)))
      .digest('hex');
    const linhas = await db.select().from(fotos);
    expect(linhas).toEqual([
      {
        id: expect.any(String),
        caminhoLocal: caminho,
        hash: esperado,
        status: 'PENDENTE_UPLOAD',
        caminhoRemoto: null,
        tentativas: 0,
        erro: null,
        criadoEmLocal: AGORA.toISOString(),
      },
    ]);
    expect(caminho).toBe(`fotos/${linhas[0].id}.jpg`);
  });

  it('informa o tamanho final ao diagnóstico', async () => {
    const diagnostico = jest.fn();
    armazenamento = new ArmazenamentoDeFotos(db, idsTeste, () => AGORA, diagnostico);

    const caminho = await armazenamento.armazenar({ uri: TEMP, largura: 4000, altura: 3000 });

    expect(diagnostico).toHaveBeenCalledWith(expect.stringContaining(caminho));
    expect(diagnostico).toHaveBeenCalledWith(expect.stringMatching(/KB/));
  });

  it('falha ao mover propaga o erro sem linha nem arquivo em fotos/', async () => {
    falhasFs.move = new Error('disco cheio');

    await expect(
      armazenamento.armazenar({ uri: TEMP, largura: 4000, altura: 3000 }),
    ).rejects.toThrow('disco cheio');

    expect(await db.select().from(fotos)).toEqual([]);
    expect(arquivosEmFotos()).toEqual([]);
  });

  it('falha ao gravar a linha apaga o arquivo já movido', async () => {
    jest.spyOn(db, 'insert').mockImplementationOnce(() => {
      throw new Error('banco travado');
    });

    await expect(
      armazenamento.armazenar({ uri: TEMP, largura: 4000, altura: 3000 }),
    ).rejects.toThrow('banco travado');

    expect(arquivosEmFotos()).toEqual([]);
  });

  it('imagem corrompida propaga o erro do manipulador sem criar nada', async () => {
    falhasManipulador.render = new Error('imagem corrompida');

    await expect(
      armazenamento.armazenar({ uri: TEMP, largura: 4000, altura: 3000 }),
    ).rejects.toThrow('imagem corrompida');

    expect(await db.select().from(fotos)).toEqual([]);
    expect(arquivosEmFotos()).toEqual([]);
  });
});
