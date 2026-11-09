import type { TabelaSync } from '../../core/application/sync/tipos';
import { PASTA_FOTOS } from '../fileSystem/ArmazenamentoDeFotos';
import { clientes, eventos, obras, pedidos } from '../database/sqlite/schema';

/**
 * Tradução entre a linha local (SQLite, camelCase do Drizzle) e a remota (Postgres, snake_case).
 * Ficam de fora do envio: status_sync (só local) e updated_at (sempre o relógio do servidor).
 * Fotos: no aparelho o caminho é `fotos/<id>.jpg`; no servidor, `<usuario_id>/<id>.jpg` no bucket.
 */

export type LinhaLocalCliente = typeof clientes.$inferSelect;
export type LinhaLocalObra = typeof obras.$inferSelect;
export type LinhaLocalPedido = typeof pedidos.$inferSelect;
export type LinhaLocalEvento = typeof eventos.$inferSelect;
export type LinhaLocal = LinhaLocalCliente | LinhaLocalObra | LinhaLocalPedido | LinhaLocalEvento;

type Remota = Record<string, unknown>;

export const TABELAS_LOCAIS = { clientes, obras, pedidos, eventos } as const;

/** Caminho da foto usado pela linha (pedido: conclusão; obra: catálogo). */
export function fotoDaLinha(tabela: TabelaSync, linha: LinhaLocal): string | null {
  if (tabela === 'pedidos') return (linha as LinhaLocalPedido).fotoConclusaoPath;
  if (tabela === 'obras') return (linha as LinhaLocalObra).fotoPath;
  return null;
}

export function paraRemoto(
  tabela: TabelaSync,
  linha: LinhaLocal,
  fotoRemota: string | null,
): Remota {
  const base = {
    id: linha.id,
    usuario_id: linha.usuarioId,
    criado_em_local: linha.criadoEmLocal,
    deleted_at: linha.deletedAt,
  };
  switch (tabela) {
    case 'clientes': {
      const l = linha as LinhaLocalCliente;
      return { ...base, nome: l.nome, contato: l.contato };
    }
    case 'obras': {
      const l = linha as LinhaLocalObra;
      return {
        ...base,
        nome: l.nome,
        tipo: l.tipo,
        quantidade: l.quantidade,
        status_obra: l.statusObra,
        foto_path: fotoRemota,
      };
    }
    case 'pedidos': {
      const l = linha as LinhaLocalPedido;
      return {
        ...base,
        cliente_id: l.clienteId,
        obra_id: l.obraId,
        descricao: l.descricao,
        canal_origem: l.canalOrigem,
        data_entrega: l.dataEntrega,
        status: l.status,
        foto_conclusao_path: fotoRemota,
        venda_direta: l.vendaDireta,
        quantidade_obra: l.quantidadeObra,
      };
    }
    case 'eventos': {
      const l = linha as LinhaLocalEvento;
      return {
        ...base,
        nome: l.nome,
        data: l.data,
        endereco: l.endereco,
        latitude: l.latitude,
        longitude: l.longitude,
        observacoes: l.observacoes,
      };
    }
  }
}

/** `<usuario>/<id>.jpg` → `fotos/<id>.jpg` (o id da foto é o nome do arquivo nos dois lados). */
export function caminhoLocalDaFotoRemota(caminhoRemoto: string): string {
  return `${PASTA_FOTOS}/${caminhoRemoto.split('/').pop() ?? caminhoRemoto}`;
}

/** Id da foto a partir do caminho (local ou remoto): o nome do arquivo sem `.jpg`. */
export function idDaFoto(caminho: string): string {
  return (caminho.split('/').pop() ?? caminho).replace(/\.jpg$/, '');
}

function iso(valor: unknown): string {
  return new Date(String(valor)).toISOString();
}

function isoOuNulo(valor: unknown): string | null {
  return valor === null || valor === undefined ? null : iso(valor);
}

function textoOuNulo(valor: unknown): string | null {
  return valor === null || valor === undefined ? null : String(valor);
}

/** Linha remota → valores locais, já SINCRONIZADO e com o updated_at do servidor. */
export function deRemoto(tabela: TabelaSync, r: Remota, updatedAt: string) {
  const base = {
    id: String(r.id),
    usuarioId: String(r.usuario_id),
    statusSync: 'SINCRONIZADO',
    criadoEmLocal: iso(r.criado_em_local),
    deletedAt: isoOuNulo(r.deleted_at),
    updatedAt,
  };
  const foto = (valor: unknown) => {
    const remoto = textoOuNulo(valor);
    return remoto ? caminhoLocalDaFotoRemota(remoto) : null;
  };
  switch (tabela) {
    case 'clientes':
      return { ...base, nome: String(r.nome), contato: String(r.contato) };
    case 'obras':
      return {
        ...base,
        nome: String(r.nome),
        tipo: String(r.tipo),
        quantidade: Number(r.quantidade),
        statusObra: String(r.status_obra),
        fotoPath: foto(r.foto_path),
      };
    case 'pedidos':
      return {
        ...base,
        clienteId: String(r.cliente_id),
        obraId: textoOuNulo(r.obra_id),
        descricao: String(r.descricao),
        canalOrigem: String(r.canal_origem),
        dataEntrega: iso(r.data_entrega),
        status: String(r.status),
        fotoConclusaoPath: foto(r.foto_conclusao_path),
        vendaDireta: Boolean(r.venda_direta),
        quantidadeObra: Number(r.quantidade_obra),
      };
    case 'eventos':
      return {
        ...base,
        nome: String(r.nome),
        data: iso(r.data),
        endereco: String(r.endereco),
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        observacoes: String(r.observacoes ?? ''),
      };
  }
}

/** Caminho remoto da foto que a linha remota usa (para registrar a foto a baixar). */
export function fotoRemotaDaLinha(tabela: TabelaSync, r: Remota): string | null {
  if (tabela === 'pedidos') return textoOuNulo(r.foto_conclusao_path);
  if (tabela === 'obras') return textoOuNulo(r.foto_path);
  return null;
}
