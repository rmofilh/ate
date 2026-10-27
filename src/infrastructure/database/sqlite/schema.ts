import { sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const STATUS_SYNC = `'PENDENTE','SINCRONIZADO','ERRO'`;

/** Colunas comuns das tabelas sincronizáveis. updated_at é só de infra (timestamp do servidor, Plano 4). */
const colunasSync = {
  statusSync: text('status_sync').notNull(),
  criadoEmLocal: text('criado_em_local').notNull(),
  deletedAt: text('deleted_at'),
  updatedAt: text('updated_at'),
};

export const clientes = sqliteTable('clientes', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull(),
  nome: text('nome').notNull(),
  contato: text('contato').notNull(),
  ...colunasSync,
}, (t) => [
  index('idx_clientes_usuario').on(t.usuarioId),
  uniqueIndex('idx_cliente_balcao_unico').on(t.usuarioId)
    .where(sql`deleted_at IS NULL AND nome = 'Cliente Avulso' AND contato = ''`),
  check('ck_clientes_status_sync', sql.raw(`status_sync IN (${STATUS_SYNC})`)),
]);

export const obras = sqliteTable('obras', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull(),
  nome: text('nome').notNull(),
  tipo: text('tipo').notNull(),
  quantidade: integer('quantidade').notNull(),
  statusObra: text('status_obra').notNull(),
  fotoPath: text('foto_path'), // caminho relativo; metadados em `fotos`
  ...colunasSync,
}, (t) => [
  index('idx_obras_usuario').on(t.usuarioId),
  check('ck_obras_tipo', sql`tipo IN ('UNICA','SERIE')`),
  check('ck_obras_status', sql`status_obra IN ('DISPONIVEL','RESERVADA','ENTREGUE','ARQUIVADA')`),
  check('ck_obras_quantidade', sql`quantidade >= 0`),
  check('ck_obras_status_sync', sql.raw(`status_sync IN (${STATUS_SYNC})`)),
]);

export const pedidos = sqliteTable('pedidos', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull(),
  clienteId: text('cliente_id').notNull().references(() => clientes.id),
  obraId: text('obra_id').references(() => obras.id),
  descricao: text('descricao').notNull(),
  canalOrigem: text('canal_origem').notNull(),
  dataEntrega: text('data_entrega').notNull(),
  status: text('status').notNull(),
  fotoConclusaoPath: text('foto_conclusao_path'), // caminho relativo; metadados em `fotos`
  vendaDireta: integer('venda_direta', { mode: 'boolean' }).notNull(),
  quantidadeObra: integer('quantidade_obra').notNull(),
  ...colunasSync,
}, (t) => [
  index('idx_pedidos_usuario_status').on(t.usuarioId, t.status),
  index('idx_pedidos_cliente').on(t.clienteId),
  index('idx_pedidos_obra').on(t.obraId),
  check('ck_pedidos_status', sql`status IN ('A_FAZER','FAZENDO','FEITO')`),
  check('ck_pedidos_canal', sql`canal_origem IN ('INSTAGRAM','WHATSAPP','PRESENCIAL','TELEFONE','OUTROS')`),
  check('ck_pedidos_qtd', sql`quantidade_obra >= 0`),
  check('ck_pedidos_status_sync', sql.raw(`status_sync IN (${STATUS_SYNC})`)),
]);

export const eventos = sqliteTable('eventos', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id').notNull(),
  nome: text('nome').notNull(),
  data: text('data').notNull(),
  endereco: text('endereco').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  observacoes: text('observacoes').notNull().default(''),
  ...colunasSync,
}, (t) => [
  index('idx_eventos_usuario').on(t.usuarioId),
  check('ck_eventos_lat', sql`latitude BETWEEN -90 AND 90`),
  check('ck_eventos_lng', sql`longitude BETWEEN -180 AND 180`),
  check('ck_eventos_status_sync', sql.raw(`status_sync IN (${STATUS_SYNC})`)),
]);

/** Outbox local (não existe no Supabase). Campos de retentativa já previstos para o Plano 4. */
export const filaSync = sqliteTable('fila_sync', {
  id: text('id').primaryKey(),
  tipoOperacao: text('tipo_operacao').notNull(),
  entidade: text('entidade').notNull(),
  entidadeId: text('entidade_id').notNull(),
  payload: text('payload').notNull(),
  status: text('status').notNull().default('PENDENTE'),
  tentativas: integer('tentativas').notNull().default(0),
  proximaTentativaEm: text('proxima_tentativa_em'),
  erro: text('erro'),
  criadoEmLocal: text('criado_em_local').notNull(),
}, (t) => [
  index('idx_fila_sync_status').on(t.status, t.criadoEmLocal),
  check('ck_fila_tipo', sql`tipo_operacao IN ('CRIAR','EDITAR','DELETAR')`),
  check('ck_fila_status', sql`status IN ('PENDENTE','ENVIANDO','FALHA')`),
]);

/**
 * Metadados das fotos (o arquivo fica no filesystem, nunca BLOB). Linha criada pelo Plano 2
 * ao aceitar a foto; upload e caminho remoto pelo Plano 4. caminho_local é relativo ao
 * diretório de documentos do app (o caminho absoluto muda entre builds/reinstalações).
 */
export const fotos = sqliteTable('fotos', {
  id: text('id').primaryKey(),
  caminhoLocal: text('caminho_local').notNull().unique(),
  hash: text('hash').notNull(),
  status: text('status').notNull().default('PENDENTE_UPLOAD'),
  caminhoRemoto: text('caminho_remoto'),
  tentativas: integer('tentativas').notNull().default(0),
  erro: text('erro'),
  criadoEmLocal: text('criado_em_local').notNull(),
}, () => [
  check('ck_fotos_status', sql`status IN ('PENDENTE_UPLOAD','ENVIADA','FALHA')`),
]);

/** Chave/valor de controle do sync (ex.: cursor do pull por tabela, Plano 4). */
export const syncMeta = sqliteTable('sync_meta', {
  chave: text('chave').primaryKey(),
  valor: text('valor').notNull(),
});

export const schema = { clientes, obras, pedidos, eventos, filaSync, fotos, syncMeta };
