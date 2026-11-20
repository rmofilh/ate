import { and, eq, exists, isNotNull, isNull, ne, notExists, or, sql } from 'drizzle-orm';
import { File, Paths } from 'expo-file-system';

import type { IEstadoLocalSync } from '../../core/application/gateways/IEstadoLocalSync';
import type { IIdGenerator } from '../../core/application/gateways/IIdGenerator';
import {
  ENTIDADE_POR_TABELA,
  type Cursor,
  type FotoParaBaixar,
  type FotoParaEnviar,
  type LinhaRemota,
  type RegistroParaEnvio,
  TABELAS_SYNC,
  type TabelaSync,
} from '../../core/application/sync/tipos';
import type { TipoOperacao } from '../../core/domain/enums/TipoOperacao';
import type { DrizzleAppDb } from '../database/sqlite/DrizzleDb';
import type { ExecutorDeTransacao } from '../database/sqlite/ExecutorDeTransacao';
import { clientes, filaSync, fotos, obras, pedidos, syncMeta } from '../database/sqlite/schema';
import {
  caminhoLocalDaFotoRemota,
  deRemoto,
  fotoDaLinha,
  fotoRemotaDaLinha,
  idDaFoto,
  type LinhaLocal,
  paraRemoto,
  TABELAS_LOCAIS,
} from './mapeamentoRemoto';

const NOME_BALCAO = 'Cliente Avulso';

/**
 * As quatro tabelas têm as colunas de sync com os mesmos nomes e tipos; para as operações comuns
 * (status, updated_at, id) basta tratá-las pelo formato de uma delas.
 */
function tabelaLocal(tabela: TabelaSync) {
  return TABELAS_LOCAIS[tabela] as unknown as typeof clientes;
}

function chaveDoCursor(tabela: TabelaSync): string {
  return `pull:${tabela}`;
}

/** Banco local do ponto de vista do sync. Tudo passa pelo executor (ver SQLiteFilaSync). */
export class SQLiteEstadoLocalSync implements IEstadoLocalSync {
  constructor(
    private readonly db: DrizzleAppDb,
    private readonly executor: ExecutorDeTransacao,
    private readonly ids: IIdGenerator,
    private readonly relogio: () => Date = () => new Date(),
  ) {}

  lerParaEnvio(tabela: TabelaSync, id: string): Promise<RegistroParaEnvio | null> {
    return this.executor.executar(async () => {
      const t = tabelaLocal(tabela);
      const [linha] = (await this.db.select().from(t).where(eq(t.id, id))) as LinhaLocal[];
      if (!linha) return null;
      const caminhoFoto = fotoDaLinha(tabela, linha);
      let fotoRemota: string | null = null;
      let aguardandoFoto = false;
      if (caminhoFoto) {
        const [foto] = await this.db
          .select()
          .from(fotos)
          .where(eq(fotos.caminhoLocal, caminhoFoto));
        if (foto?.status === 'ENVIADA' && foto.caminhoRemoto) fotoRemota = foto.caminhoRemoto;
        else if (foto) aguardandoFoto = true;
      }
      return { tabela, id, dados: paraRemoto(tabela, linha, fotoRemota), aguardandoFoto };
    });
  }

  async marcarSincronizado(tabela: TabelaSync, id: string, updatedAt: string): Promise<void> {
    const t = tabelaLocal(tabela);
    await this.executor.executar(() =>
      this.db.update(t).set({ statusSync: 'SINCRONIZADO', updatedAt }).where(eq(t.id, id)),
    );
  }

  async marcarErro(tabela: TabelaSync, id: string): Promise<void> {
    const t = tabelaLocal(tabela);
    await this.executor.executar(() =>
      this.db.update(t).set({ statusSync: 'ERRO' }).where(eq(t.id, id)),
    );
  }

  async reenviarErros(): Promise<void> {
    await this.executor.executar(async () => {
      for (const tabela of TABELAS_SYNC) {
        const t = tabelaLocal(tabela);
        await this.db.update(t).set({ statusSync: 'PENDENTE' }).where(eq(t.statusSync, 'ERRO'));
      }
    });
  }

  reenfileirarOrfas(): Promise<number> {
    return this.executor.executar(async () => {
      let total = 0;
      for (const tabela of TABELAS_SYNC) {
        const t = tabelaLocal(tabela);
        const entidade = ENTIDADE_POR_TABELA[tabela];
        const orfas = await this.db
          .select({ id: t.id })
          .from(t)
          .where(
            and(
              eq(t.statusSync, 'PENDENTE'),
              notExists(
                this.db
                  .select({ id: filaSync.id })
                  .from(filaSync)
                  .where(and(eq(filaSync.entidade, entidade), eq(filaSync.entidadeId, t.id))),
              ),
            ),
          );
        for (const orfa of orfas) {
          await this.enfileirar('EDITAR', entidade, orfa.id, 'reenvio-autocorrecao');
          total += 1;
        }
      }
      return total;
    });
  }

  cursor(tabela: TabelaSync): Promise<Cursor | null> {
    return this.executor.executar(async () => {
      const [linha] = await this.db
        .select()
        .from(syncMeta)
        .where(eq(syncMeta.chave, chaveDoCursor(tabela)));
      return linha ? (JSON.parse(linha.valor) as Cursor) : null;
    });
  }

  aplicarLote(tabela: TabelaSync, linhas: LinhaRemota[]): Promise<number> {
    if (linhas.length === 0) return Promise.resolve(0);
    return this.executor.executar(async () => {
      const t = tabelaLocal(tabela);
      let aplicadas = 0;
      for (const remota of linhas) {
        const [local] = await this.db
          .select({ statusSync: t.statusSync })
          .from(t)
          .where(eq(t.id, remota.id));
        // Alteração local ainda não enviada: o push vem antes; depois dele, o servidor vence.
        if (local && local.statusSync !== 'SINCRONIZADO') continue;

        const valores = deRemoto(tabela, remota.dados, remota.updatedAt);
        const balcaoSubstituido =
          tabela === 'clientes' ? await this.aposentarBalcaoDuplicado(valores) : null;
        await this.registrarFotoRemota(fotoRemotaDaLinha(tabela, remota.dados));

        const { id: _id, ...resto } = valores;
        await this.db
          .insert(t)
          .values(valores as never)
          .onConflictDoUpdate({ target: t.id, set: resto as never });
        if (balcaoSubstituido) await this.reapontarPedidos(balcaoSubstituido, remota.id);
        aplicadas += 1;
      }
      const ultima = linhas[linhas.length - 1];
      const cursor = JSON.stringify({ updatedAt: ultima.updatedAt, id: ultima.id });
      await this.db
        .insert(syncMeta)
        .values({ chave: chaveDoCursor(tabela), valor: cursor })
        .onConflictDoUpdate({ target: syncMeta.chave, set: { valor: cursor } });
      return aplicadas;
    });
  }

  fotosParaEnviar(): Promise<FotoParaEnviar[]> {
    return this.executor.executar(() =>
      this.db
        .select({ id: fotos.id, caminhoLocal: fotos.caminhoLocal })
        .from(fotos)
        .where(
          and(
            eq(fotos.status, 'PENDENTE_UPLOAD'),
            or(
              exists(
                this.db
                  .select({ id: pedidos.id })
                  .from(pedidos)
                  .where(eq(pedidos.fotoConclusaoPath, fotos.caminhoLocal)),
              ),
              exists(
                this.db.select({ id: obras.id }).from(obras).where(eq(obras.fotoPath, fotos.caminhoLocal)),
              ),
            ),
          ),
        )
        .orderBy(fotos.criadoEmLocal),
    );
  }

  async marcarFotoEnviada(id: string, caminhoRemoto: string): Promise<void> {
    await this.executor.executar(() =>
      this.db
        .update(fotos)
        .set({ status: 'ENVIADA', caminhoRemoto, erro: null })
        .where(eq(fotos.id, id)),
    );
  }

  async marcarFalhaDaFoto(id: string, erro: string): Promise<void> {
    await this.executor.executar(() =>
      this.db
        .update(fotos)
        .set({ tentativas: sql`${fotos.tentativas} + 1`, erro })
        .where(eq(fotos.id, id)),
    );
  }

  fotosParaBaixar(): Promise<FotoParaBaixar[]> {
    return this.executor.executar(async () => {
      const enviadas = await this.db
        .select({ caminhoLocal: fotos.caminhoLocal, caminhoRemoto: fotos.caminhoRemoto })
        .from(fotos)
        .where(and(eq(fotos.status, 'ENVIADA'), isNotNull(fotos.caminhoRemoto)));
      return enviadas
        .filter((foto) => !new File(Paths.document, foto.caminhoLocal).exists)
        .map((foto) => ({ caminhoLocal: foto.caminhoLocal, caminhoRemoto: foto.caminhoRemoto! }));
    });
  }

  /** Foto que o servidor conhece: linha ENVIADA, para o ciclo baixar o arquivo se faltar. */
  private async registrarFotoRemota(caminhoRemoto: string | null): Promise<void> {
    if (!caminhoRemoto) return;
    await this.db
      .insert(fotos)
      .values({
        id: idDaFoto(caminhoRemoto),
        caminhoLocal: caminhoLocalDaFotoRemota(caminhoRemoto),
        hash: '',
        status: 'ENVIADA',
        caminhoRemoto,
        tentativas: 0,
        criadoEmLocal: this.relogio().toISOString(),
      })
      .onConflictDoNothing();
  }

  /**
   * Um único Cliente Avulso vivo por usuário (índice único local). Numa reinstalação o app cria
   * um balcão novo antes do primeiro pull; quando o do servidor chega, ele vence: o local vira
   * tombstone (e o DELETAR vai para a fila). Devolve o id aposentado, para reapontar os pedidos.
   */
  private async aposentarBalcaoDuplicado(valores: {
    id: string;
    usuarioId: string;
    deletedAt: string | null;
    nome?: string;
    contato?: string;
  }): Promise<string | null> {
    if (valores.nome !== NOME_BALCAO || valores.contato !== '' || valores.deletedAt) return null;
    const [outro] = await this.db
      .select({ id: clientes.id })
      .from(clientes)
      .where(
        and(
          eq(clientes.usuarioId, valores.usuarioId),
          eq(clientes.nome, NOME_BALCAO),
          eq(clientes.contato, ''),
          isNull(clientes.deletedAt),
          ne(clientes.id, valores.id),
        ),
      );
    if (!outro) return null;
    await this.db
      .update(clientes)
      .set({ deletedAt: this.relogio().toISOString(), statusSync: 'PENDENTE' })
      .where(eq(clientes.id, outro.id));
    await this.enfileirar('DELETAR', 'Cliente', outro.id);
    return outro.id;
  }

  private async reapontarPedidos(deClienteId: string, paraClienteId: string): Promise<void> {
    const afetados = await this.db
      .select({ id: pedidos.id })
      .from(pedidos)
      .where(eq(pedidos.clienteId, deClienteId));
    if (afetados.length === 0) return;
    await this.db
      .update(pedidos)
      .set({ clienteId: paraClienteId, statusSync: 'PENDENTE' })
      .where(eq(pedidos.clienteId, deClienteId));
    for (const pedido of afetados) await this.enfileirar('EDITAR', 'Pedido', pedido.id);
  }

  private async enfileirar(
    tipo: TipoOperacao,
    entidade: string,
    entidadeId: string,
    motivo = 'balcao-duplicado',
  ) {
    await this.db.insert(filaSync).values({
      id: this.ids.gerar(),
      tipoOperacao: tipo,
      entidade,
      entidadeId,
      payload: JSON.stringify({ motivo }),
      status: 'PENDENTE',
      tentativas: 0,
      criadoEmLocal: this.relogio().toISOString(),
    });
  }
}
