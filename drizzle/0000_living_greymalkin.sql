CREATE TABLE `clientes` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text NOT NULL,
	`nome` text NOT NULL,
	`contato` text NOT NULL,
	`status_sync` text NOT NULL,
	`criado_em_local` text NOT NULL,
	`deleted_at` text,
	`updated_at` text,
	CONSTRAINT "ck_clientes_status_sync" CHECK(status_sync IN ('PENDENTE','SINCRONIZADO','ERRO'))
);
--> statement-breakpoint
CREATE INDEX `idx_clientes_usuario` ON `clientes` (`usuario_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_cliente_balcao_unico` ON `clientes` (`usuario_id`) WHERE deleted_at IS NULL AND nome = 'Cliente Avulso' AND contato = '';--> statement-breakpoint
CREATE TABLE `eventos` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text NOT NULL,
	`nome` text NOT NULL,
	`data` text NOT NULL,
	`endereco` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`observacoes` text DEFAULT '' NOT NULL,
	`status_sync` text NOT NULL,
	`criado_em_local` text NOT NULL,
	`deleted_at` text,
	`updated_at` text,
	CONSTRAINT "ck_eventos_lat" CHECK(latitude BETWEEN -90 AND 90),
	CONSTRAINT "ck_eventos_lng" CHECK(longitude BETWEEN -180 AND 180),
	CONSTRAINT "ck_eventos_status_sync" CHECK(status_sync IN ('PENDENTE','SINCRONIZADO','ERRO'))
);
--> statement-breakpoint
CREATE INDEX `idx_eventos_usuario` ON `eventos` (`usuario_id`);--> statement-breakpoint
CREATE TABLE `fila_sync` (
	`id` text PRIMARY KEY NOT NULL,
	`tipo_operacao` text NOT NULL,
	`entidade` text NOT NULL,
	`entidade_id` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'PENDENTE' NOT NULL,
	`tentativas` integer DEFAULT 0 NOT NULL,
	`proxima_tentativa_em` text,
	`erro` text,
	`criado_em_local` text NOT NULL,
	CONSTRAINT "ck_fila_tipo" CHECK(tipo_operacao IN ('CRIAR','EDITAR','DELETAR')),
	CONSTRAINT "ck_fila_status" CHECK(status IN ('PENDENTE','ENVIANDO','FALHA'))
);
--> statement-breakpoint
CREATE INDEX `idx_fila_sync_status` ON `fila_sync` (`status`,`criado_em_local`);--> statement-breakpoint
CREATE TABLE `fotos` (
	`id` text PRIMARY KEY NOT NULL,
	`caminho_local` text NOT NULL,
	`hash` text NOT NULL,
	`status` text DEFAULT 'PENDENTE_UPLOAD' NOT NULL,
	`caminho_remoto` text,
	`tentativas` integer DEFAULT 0 NOT NULL,
	`erro` text,
	`criado_em_local` text NOT NULL,
	CONSTRAINT "ck_fotos_status" CHECK(status IN ('PENDENTE_UPLOAD','ENVIADA','FALHA'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fotos_caminho_local_unique` ON `fotos` (`caminho_local`);--> statement-breakpoint
CREATE TABLE `obras` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text NOT NULL,
	`nome` text NOT NULL,
	`tipo` text NOT NULL,
	`quantidade` integer NOT NULL,
	`status_obra` text NOT NULL,
	`foto_path` text,
	`status_sync` text NOT NULL,
	`criado_em_local` text NOT NULL,
	`deleted_at` text,
	`updated_at` text,
	CONSTRAINT "ck_obras_tipo" CHECK(tipo IN ('UNICA','SERIE')),
	CONSTRAINT "ck_obras_status" CHECK(status_obra IN ('DISPONIVEL','RESERVADA','ENTREGUE','ARQUIVADA')),
	CONSTRAINT "ck_obras_quantidade" CHECK(quantidade >= 0),
	CONSTRAINT "ck_obras_status_sync" CHECK(status_sync IN ('PENDENTE','SINCRONIZADO','ERRO'))
);
--> statement-breakpoint
CREATE INDEX `idx_obras_usuario` ON `obras` (`usuario_id`);--> statement-breakpoint
CREATE TABLE `pedidos` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text NOT NULL,
	`cliente_id` text NOT NULL,
	`obra_id` text,
	`descricao` text NOT NULL,
	`canal_origem` text NOT NULL,
	`data_entrega` text NOT NULL,
	`status` text NOT NULL,
	`foto_conclusao_path` text,
	`venda_direta` integer NOT NULL,
	`quantidade_obra` integer NOT NULL,
	`status_sync` text NOT NULL,
	`criado_em_local` text NOT NULL,
	`deleted_at` text,
	`updated_at` text,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`obra_id`) REFERENCES `obras`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_pedidos_status" CHECK(status IN ('A_FAZER','FAZENDO','FEITO')),
	CONSTRAINT "ck_pedidos_canal" CHECK(canal_origem IN ('INSTAGRAM','WHATSAPP','PRESENCIAL','TELEFONE','OUTROS')),
	CONSTRAINT "ck_pedidos_qtd" CHECK(quantidade_obra >= 0),
	CONSTRAINT "ck_pedidos_status_sync" CHECK(status_sync IN ('PENDENTE','SINCRONIZADO','ERRO'))
);
--> statement-breakpoint
CREATE INDEX `idx_pedidos_usuario_status` ON `pedidos` (`usuario_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_pedidos_cliente` ON `pedidos` (`cliente_id`);--> statement-breakpoint
CREATE INDEX `idx_pedidos_obra` ON `pedidos` (`obra_id`);--> statement-breakpoint
CREATE TABLE `sync_meta` (
	`chave` text PRIMARY KEY NOT NULL,
	`valor` text NOT NULL
);
