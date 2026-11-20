import { ErroDeSincronizacao } from '../errors/ErroDeSincronizacao';
import type { IArmazenamentoRemoto } from '../gateways/IArmazenamentoRemoto';
import type { IEstadoLocalSync } from '../gateways/IEstadoLocalSync';
import type { IFilaSync } from '../gateways/IFilaSync';
import type { IServidorRemoto } from '../gateways/IServidorRemoto';
import type {
  Cursor,
  EntradaFila,
  FotoParaBaixar,
  LinhaRemota,
  RegistroParaEnvio,
  TabelaSync,
} from '../sync/tipos';
import { SincronizarUseCase } from '../usecases/SincronizarUseCase';

const USUARIO = 'a1111111-1111-4111-8111-111111111111';
const AGORA = new Date('2026-11-10T12:00:00.000Z');

type StatusFila = 'PENDENTE' | 'FALHA';

class FilaFake implements IFilaSync {
  entradas: (EntradaFila & { status: StatusFila; proximaEm: Date | null; erro: string | null })[] =
    [];
  private seq = 0;

  adicionar(entidade: string, entidadeId: string) {
    this.seq += 1;
    this.entradas.push({
      id: `f${this.seq}`,
      entidade,
      entidadeId,
      tentativas: 0,
      criadoEmLocal: new Date(AGORA.getTime() + this.seq).toISOString(),
      status: 'PENDENTE',
      proximaEm: null,
      erro: null,
    });
  }

  async elegiveis(agora: Date) {
    return this.entradas.filter(
      (e) => e.status === 'PENDENTE' && (!e.proximaEm || e.proximaEm <= agora),
    );
  }
  async concluir(ids: string[]) {
    this.entradas = this.entradas.filter((e) => !ids.includes(e.id));
  }
  async reagendar(ids: string[], proximaEm: Date, erro: string) {
    for (const e of this.entradas.filter((x) => ids.includes(x.id))) {
      e.tentativas += 1;
      e.proximaEm = proximaEm;
      e.erro = erro;
    }
  }
  async falhar(ids: string[], erro: string) {
    for (const e of this.entradas.filter((x) => ids.includes(x.id))) {
      e.status = 'FALHA';
      e.erro = erro;
    }
  }
  async temPendente(entidade: string, entidadeId: string) {
    return this.entradas.some((e) => e.entidade === entidade && e.entidadeId === entidadeId);
  }
  async reenviarFalhas() {
    const falhas = this.entradas.filter((e) => e.status === 'FALHA');
    for (const e of falhas) {
      e.status = 'PENDENTE';
      e.tentativas = 0;
      e.proximaEm = null;
    }
    return falhas.length;
  }
  async resumo() {
    return {
      pendentes: this.entradas.filter((e) => e.status === 'PENDENTE').length,
      falhas: this.entradas.filter((e) => e.status === 'FALHA').length,
    };
  }
}

interface LinhaLocal {
  dados: Record<string, unknown>;
  status: 'PENDENTE' | 'SINCRONIZADO' | 'ERRO';
  aguardandoFoto?: boolean;
  updatedAt?: string;
}

class EstadoFake implements IEstadoLocalSync {
  linhas = new Map<string, LinhaLocal>();
  cursores = new Map<TabelaSync, Cursor>();
  fotos: { id: string; caminhoLocal: string; enviada: string | null; falhas: number }[] = [];
  faltando: FotoParaBaixar[] = [];
  aoLer?: () => void;

  guardar(tabela: TabelaSync, id: string, linha: Partial<LinhaLocal> = {}) {
    this.linhas.set(`${tabela}:${id}`, { dados: { id }, status: 'PENDENTE', ...linha });
  }
  linha(tabela: TabelaSync, id: string) {
    return this.linhas.get(`${tabela}:${id}`);
  }

  async lerParaEnvio(tabela: TabelaSync, id: string): Promise<RegistroParaEnvio | null> {
    this.aoLer?.();
    const linha = this.linha(tabela, id);
    return linha
      ? { tabela, id, dados: linha.dados, aguardandoFoto: linha.aguardandoFoto ?? false }
      : null;
  }
  async marcarSincronizado(tabela: TabelaSync, id: string, updatedAt: string) {
    const linha = this.linha(tabela, id);
    if (linha) Object.assign(linha, { status: 'SINCRONIZADO', updatedAt });
  }
  async marcarErro(tabela: TabelaSync, id: string) {
    const linha = this.linha(tabela, id);
    if (linha) linha.status = 'ERRO';
  }
  async reenviarErros() {
    for (const linha of this.linhas.values()) if (linha.status === 'ERRO') linha.status = 'PENDENTE';
  }
  reenfileiradas = 0;
  async reenfileirarOrfas() {
    return this.reenfileiradas;
  }
  async cursor(tabela: TabelaSync) {
    return this.cursores.get(tabela) ?? null;
  }
  async aplicarLote(tabela: TabelaSync, linhas: LinhaRemota[]) {
    let aplicadas = 0;
    for (const remota of linhas) {
      const local = this.linha(tabela, remota.id);
      if (local && local.status !== 'SINCRONIZADO') continue;
      this.linhas.set(`${tabela}:${remota.id}`, {
        dados: remota.dados,
        status: 'SINCRONIZADO',
        updatedAt: remota.updatedAt,
      });
      aplicadas += 1;
    }
    const ultima = linhas[linhas.length - 1];
    this.cursores.set(tabela, { updatedAt: ultima.updatedAt, id: ultima.id });
    return aplicadas;
  }
  async fotosParaEnviar() {
    return this.fotos.filter((f) => !f.enviada).map(({ id, caminhoLocal }) => ({ id, caminhoLocal }));
  }
  async marcarFotoEnviada(id: string, caminhoRemoto: string) {
    const foto = this.fotos.find((f) => f.id === id);
    if (foto) foto.enviada = caminhoRemoto;
  }
  async marcarFalhaDaFoto(id: string) {
    const foto = this.fotos.find((f) => f.id === id);
    if (foto) foto.falhas += 1;
  }
  async fotosParaBaixar() {
    return this.faltando;
  }
}

class ServidorFake implements IServidorRemoto {
  tabelas = new Map<TabelaSync, Map<string, { dados: Record<string, unknown>; updatedAt: string }>>();
  falhas = new Map<string, ErroDeSincronizacao>();
  falhaNoPull: ErroDeSincronizacao | null = null;
  enviados: string[] = [];
  private relogio = 0;
  aoEnviar?: (id: string) => void;

  private tabela(tabela: TabelaSync) {
    if (!this.tabelas.has(tabela)) this.tabelas.set(tabela, new Map());
    return this.tabelas.get(tabela)!;
  }
  gravar(tabela: TabelaSync, id: string, dados: Record<string, unknown> = { id }) {
    this.relogio += 1;
    const updatedAt = `2026-11-10T12:00:00.${String(this.relogio).padStart(6, '0')}+00:00`;
    this.tabela(tabela).set(id, { dados, updatedAt });
    return updatedAt;
  }
  async enviar(tabela: TabelaSync, dados: Record<string, unknown>) {
    const id = String(dados.id);
    const falha = this.falhas.get(id);
    if (falha) throw falha;
    this.aoEnviar?.(id);
    this.enviados.push(`${tabela}:${id}`);
    return { updatedAt: this.gravar(tabela, id, dados) };
  }
  async buscarAlteracoes(tabela: TabelaSync, cursor: Cursor | null, limite: number) {
    if (this.falhaNoPull) throw this.falhaNoPull;
    return [...this.tabela(tabela).entries()]
      .map(([id, { dados, updatedAt }]) => ({ id, updatedAt, dados }))
      .filter(
        (l) =>
          !cursor ||
          l.updatedAt > cursor.updatedAt ||
          (l.updatedAt === cursor.updatedAt && l.id > cursor.id),
      )
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id))
      .slice(0, limite);
  }
}

class ArmazenamentoFake implements IArmazenamentoRemoto {
  objetos = new Set<string>();
  baixados: string[] = [];
  falha: ErroDeSincronizacao | null = null;
  async enviar(_caminhoLocal: string, caminhoRemoto: string) {
    if (this.falha) throw this.falha;
    this.objetos.add(caminhoRemoto);
  }
  async baixar(caminhoRemoto: string, caminhoLocal: string) {
    if (this.falha) throw this.falha;
    this.baixados.push(`${caminhoRemoto}->${caminhoLocal}`);
  }
}

function setup(tamanhoLote = 500) {
  const fila = new FilaFake();
  const estado = new EstadoFake();
  const servidor = new ServidorFake();
  const armazenamento = new ArmazenamentoFake();
  const sync = new SincronizarUseCase({
    fila,
    estado,
    servidor,
    armazenamento,
    relogio: () => AGORA,
    aleatorio: () => 0.5,
    tamanhoLote,
  });
  const rodar = () => sync.execute({ usuarioId: USUARIO });
  return { fila, estado, servidor, armazenamento, sync, rodar };
}

const semRede = () => new ErroDeSincronizacao('SEM_REDE', 'sem conexão');

describe('SincronizarUseCase: push', () => {
  it('envia a fila, esvazia e marca SINCRONIZADO com o updated_at do servidor', async () => {
    const { fila, estado, servidor, rodar } = setup();
    estado.guardar('clientes', 'c1');
    fila.adicionar('Cliente', 'c1');

    const resultado = await rodar();

    expect(resultado.enviados).toBe(1);
    expect(fila.entradas).toEqual([]);
    expect(estado.linha('clientes', 'c1')).toMatchObject({
      status: 'SINCRONIZADO',
      updatedAt: servidor.tabelas.get('clientes')!.get('c1')!.updatedAt,
    });
  });

  it('várias operações da mesma linha viram um envio só', async () => {
    const { fila, estado, servidor, rodar } = setup();
    estado.guardar('pedidos', 'p1');
    fila.adicionar('Pedido', 'p1');
    fila.adicionar('Pedido', 'p1');
    fila.adicionar('Pedido', 'p1');

    await rodar();

    expect(servidor.enviados).toEqual(['pedidos:p1']);
  });

  it('pai antes de filho', async () => {
    const { fila, estado, servidor, rodar } = setup();
    estado.guardar('pedidos', 'p1');
    estado.guardar('clientes', 'c1');
    fila.adicionar('Pedido', 'p1');
    fila.adicionar('Cliente', 'c1');

    await rodar();

    expect(servidor.enviados).toEqual(['clientes:c1', 'pedidos:p1']);
  });

  it('rede cai no meio: o que subiu fica SINCRONIZADO, o resto permanece na fila sem gastar tentativa', async () => {
    const { fila, estado, servidor, rodar } = setup();
    estado.guardar('clientes', 'c1');
    estado.guardar('clientes', 'c2');
    fila.adicionar('Cliente', 'c1');
    fila.adicionar('Cliente', 'c2');
    servidor.falhas.set('c2', semRede());

    const resultado = await rodar();

    expect(resultado.semRede).toBe(true);
    expect(estado.linha('clientes', 'c1')?.status).toBe('SINCRONIZADO');
    expect(estado.linha('clientes', 'c2')?.status).toBe('PENDENTE');
    expect(fila.entradas).toMatchObject([{ entidadeId: 'c2', tentativas: 0, proximaEm: null }]);
  });

  it('recusa do servidor vira FALHA visível e não bloqueia os outros', async () => {
    const { fila, estado, servidor, rodar } = setup();
    estado.guardar('clientes', 'c1');
    estado.guardar('clientes', 'c2');
    fila.adicionar('Cliente', 'c1');
    fila.adicionar('Cliente', 'c2');
    servidor.falhas.set('c1', new ErroDeSincronizacao('PERMANENTE', 'violates check'));

    const resultado = await rodar();

    expect(resultado.falhas).toBe(1);
    expect(estado.linha('clientes', 'c1')?.status).toBe('ERRO');
    expect(estado.linha('clientes', 'c2')?.status).toBe('SINCRONIZADO');
    expect(fila.entradas).toMatchObject([
      { entidadeId: 'c1', status: 'FALHA', erro: 'violates check' },
    ]);
  });

  it('erro transitório reagenda com backoff e deixa a entrada fora do próximo ciclo imediato', async () => {
    const { fila, estado, servidor, rodar } = setup();
    estado.guardar('clientes', 'c1');
    fila.adicionar('Cliente', 'c1');
    servidor.falhas.set('c1', new ErroDeSincronizacao('TRANSITORIO', '503'));

    await rodar();

    expect(fila.entradas[0]).toMatchObject({ status: 'PENDENTE', tentativas: 1 });
    expect(fila.entradas[0].proximaEm).toEqual(new Date(AGORA.getTime() + 2_000));
    servidor.falhas.clear();
    await rodar();
    expect(servidor.enviados).toEqual([]);
  });

  it('sessão expirada interrompe o ciclo e avisa', async () => {
    const { fila, estado, servidor, rodar } = setup();
    estado.guardar('clientes', 'c1');
    fila.adicionar('Cliente', 'c1');
    servidor.falhas.set('c1', new ErroDeSincronizacao('SESSAO', 'JWT expired'));

    const resultado = await rodar();

    expect(resultado.sessaoExpirada).toBe(true);
    expect(fila.entradas).toHaveLength(1);
  });

  it('edição durante o envio: a linha continua PENDENTE e a entrada nova fica na fila', async () => {
    const { fila, estado, servidor, rodar } = setup();
    estado.guardar('pedidos', 'p1');
    fila.adicionar('Pedido', 'p1');
    servidor.aoEnviar = () => fila.adicionar('Pedido', 'p1');

    await rodar();

    expect(estado.linha('pedidos', 'p1')?.status).toBe('PENDENTE');
    expect(fila.entradas).toHaveLength(1);
  });

  it('linha que não existe mais localmente só sai da fila', async () => {
    const { fila, servidor, rodar } = setup();
    fila.adicionar('Cliente', 'sumiu');
    await rodar();
    expect(fila.entradas).toEqual([]);
    expect(servidor.enviados).toEqual([]);
  });

  it('tentar de novo devolve as falhas para a fila e reenvia', async () => {
    const { fila, estado, servidor, sync } = setup();
    estado.guardar('clientes', 'c1');
    fila.adicionar('Cliente', 'c1');
    servidor.falhas.set('c1', new ErroDeSincronizacao('PERMANENTE', 'x'));
    await sync.execute({ usuarioId: USUARIO });
    expect(await sync.resumo()).toEqual({ pendentes: 0, falhas: 1 });

    servidor.falhas.clear();
    await sync.reenviarFalhas({ usuarioId: USUARIO });

    expect(estado.linha('clientes', 'c1')?.status).toBe('SINCRONIZADO');
    expect(await sync.resumo()).toEqual({ pendentes: 0, falhas: 0 });
  });
});

describe('SincronizarUseCase: fotos (storage-first)', () => {
  it('sobe a foto para <usuario>/<foto>.jpg antes dos registros', async () => {
    const { estado, armazenamento, rodar } = setup();
    estado.fotos.push({ id: 'ft1', caminhoLocal: 'fotos/ft1.jpg', enviada: null, falhas: 0 });

    const resultado = await rodar();

    expect(resultado.fotosEnviadas).toBe(1);
    expect(armazenamento.objetos).toEqual(new Set([`${USUARIO}/ft1.jpg`]));
    expect(estado.fotos[0].enviada).toBe(`${USUARIO}/ft1.jpg`);
  });

  it('registro com foto ainda não enviada espera e não segura os outros', async () => {
    const { fila, estado, servidor, rodar } = setup();
    estado.guardar('pedidos', 'p1', { aguardandoFoto: true });
    estado.guardar('clientes', 'c1');
    fila.adicionar('Pedido', 'p1');
    fila.adicionar('Cliente', 'c1');

    await rodar();

    expect(servidor.enviados).toEqual(['clientes:c1']);
    expect(fila.entradas.map((e) => e.entidadeId)).toEqual(['p1']);
  });

  it('falha de uma foto (não de rede) é registrada e o ciclo segue', async () => {
    const { estado, armazenamento, fila, servidor, rodar } = setup();
    estado.fotos.push({ id: 'ft1', caminhoLocal: 'fotos/ft1.jpg', enviada: null, falhas: 0 });
    armazenamento.falha = new ErroDeSincronizacao('PERMANENTE', 'arquivo grande demais');
    estado.guardar('clientes', 'c1');
    fila.adicionar('Cliente', 'c1');

    await rodar();

    expect(estado.fotos[0].falhas).toBe(1);
    expect(servidor.enviados).toEqual(['clientes:c1']);
  });

  it('sem rede no upload da foto, nada mais é tentado', async () => {
    const { estado, armazenamento, fila, servidor, rodar } = setup();
    estado.fotos.push({ id: 'ft1', caminhoLocal: 'fotos/ft1.jpg', enviada: null, falhas: 0 });
    armazenamento.falha = semRede();
    estado.guardar('clientes', 'c1');
    fila.adicionar('Cliente', 'c1');

    expect((await rodar()).semRede).toBe(true);
    expect(servidor.enviados).toEqual([]);
  });

  it('baixa as fotos que o servidor tem e o aparelho não', async () => {
    const { estado, armazenamento, rodar } = setup();
    estado.faltando = [{ caminhoRemoto: `${USUARIO}/ft9.jpg`, caminhoLocal: 'fotos/ft9.jpg' }];

    expect((await rodar()).fotosBaixadas).toBe(1);
    expect(armazenamento.baixados).toEqual([`${USUARIO}/ft9.jpg->fotos/ft9.jpg`]);
  });
});

describe('SincronizarUseCase: pull', () => {
  it('banco vazio (reinstalação) se repovoa a partir do servidor, em lotes', async () => {
    const { estado, servidor, rodar } = setup(2);
    for (const id of ['c1', 'c2', 'c3', 'c4', 'c5']) servidor.gravar('clientes', id);
    servidor.gravar('eventos', 'e1');

    const resultado = await rodar();

    expect(resultado.recebidos).toBe(6);
    expect(estado.linha('clientes', 'c5')?.status).toBe('SINCRONIZADO');
    expect(estado.cursores.get('clientes')?.id).toBe('c5');
  });

  it('cursor composto não perde linhas com o mesmo updated_at na fronteira do lote', async () => {
    const { estado, servidor, rodar } = setup(2);
    const mesmoInstante = { dados: { x: 1 }, updatedAt: '2026-11-10T12:00:00.000001+00:00' };
    const tabela = new Map([
      ['c1', mesmoInstante],
      ['c2', mesmoInstante],
      ['c3', mesmoInstante],
    ]);
    servidor.tabelas.set('clientes', tabela);

    await rodar();

    expect(['c1', 'c2', 'c3'].every((id) => estado.linha('clientes', id))).toBe(true);
  });

  it('linha local PENDENTE não é sobrescrita pelo pull', async () => {
    const { estado, servidor, rodar } = setup();
    estado.guardar('clientes', 'c1', { dados: { id: 'c1', nome: 'local' } });
    estado.aoLer = () => undefined;
    servidor.gravar('clientes', 'c1', { id: 'c1', nome: 'servidor' });
    // Sem entrada na fila: só o pull roda.

    await rodar();

    expect(estado.linha('clientes', 'c1')?.dados).toEqual({ id: 'c1', nome: 'local' });
  });

  it('erro inesperado no pull fica registrado no resultado', async () => {
    const { servidor, rodar } = setup();
    servidor.falhaNoPull = new ErroDeSincronizacao('PERMANENTE', 'failed to parse');
    expect((await rodar()).erroNoPull).toBe('failed to parse');
  });

  it('falha no pull não perde nada: o próximo ciclo continua do cursor', async () => {
    const { estado, servidor, rodar } = setup();
    servidor.gravar('clientes', 'c1');
    servidor.falhaNoPull = semRede();

    expect((await rodar()).semRede).toBe(true);
    expect(estado.cursores.size).toBe(0);

    servidor.falhaNoPull = null;
    expect((await rodar()).recebidos).toBe(1);
  });
});

describe('SincronizarUseCase: single-flight', () => {
  it('gatilho durante o ciclo não abre outro; o atual roda de novo e entrega o resultado final', async () => {
    const { fila, estado, servidor, sync } = setup();
    estado.guardar('clientes', 'c1');
    fila.adicionar('Cliente', 'c1');
    let liberar!: () => void;
    const bloqueio = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    let chamadas = 0;
    const original = servidor.buscarAlteracoes.bind(servidor);
    servidor.buscarAlteracoes = async (...args) => {
      chamadas += 1;
      if (chamadas === 1) await bloqueio;
      return original(...args);
    };

    const primeira = sync.execute({ usuarioId: USUARIO });
    expect(sync.sincronizando).toBe(true);
    estado.guardar('clientes', 'c2');
    fila.adicionar('Cliente', 'c2');
    const segunda = sync.execute({ usuarioId: USUARIO });
    expect(segunda).toBe(primeira);

    liberar();
    await primeira;

    expect(servidor.enviados).toEqual(['clientes:c1', 'clientes:c2']);
    expect(sync.sincronizando).toBe(false);
  });
});
