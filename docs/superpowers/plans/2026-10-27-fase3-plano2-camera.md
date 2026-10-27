# Plano 2 — Câmera real e pipeline de imagens (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A foto de conclusão do pedido (RF05, UC05/UC06, RNF11) e a foto opcional de catálogo da obra (RF09, UC12) passam a ser tiradas com a câmera de verdade, comprimidas, guardadas no filesystem com caminho relativo e registradas na tabela `fotos`, prontas para o upload do Plano 4.

**Architecture:** O contrato `ICameraGateway.capture(): Promise<string | null>` não muda. A UI da câmera é um modal React (`CameraModal`), montado uma única vez por um `CameraHost` no `AppProviders`. O `CameraHost` registra no `ExpoCameraGateway` (infra) uma função que abre o modal e devolve uma Promise. O gateway entrega a foto aceita ao `ArmazenamentoDeFotos` (infra), que comprime, move para `<documentos>/fotos/<uuid>.jpg`, calcula o SHA-256, grava a linha em `fotos` e devolve o caminho relativo. As telas continuam chamando `services.gateways.camera.capture()`.

**Tech Stack:** Expo SDK 57, `expo-camera` (`CameraView`, `useCameraPermissions`), `expo-image-manipulator` (API `ImageManipulator.manipulate(...).renderAsync()` + `saveAsync`), `expo-file-system` (API `File`/`Directory`/`Paths`), `expo-crypto` (`digest` SHA-256), `expo-image`, Drizzle + expo-sqlite (Plano 1), Jest + RNTL.

**Spec:** `docs/superpowers/plans/2026-10-27-fase3-roteiro.md`, seção "Plano 2 — Câmera real e pipeline de imagens". Contexto do que já existe: `docs/ate-fase3.md` (seção Plano 1).

## Decisões deste plano

| # | Decisão | Origem |
|---|---|---|
| D2 | **Sem galeria.** Foto de conclusão e foto de catálogo só pela câmera. Nada de `expo-image-picker` | Usuário, 27/10 ("gera confusão demais para poucos ganhos") |
| P2-1 | A ponte UI → gateway (`AbridorDaCamera`, `ResultadoDaCamera`) é **tipo de infraestrutura**, não porta nova em `core/application`. `main/factories/ProviderBag.ts` reexporta esses tipos para a camada de apresentação, seguindo o caminho de import que já existe (presentation → main) | Princípio 2 do roteiro (porta nova em `core` exige aprovação; aqui não é preciso) |
| P2-2 | A foto de catálogo entra **só na criação da obra** (`obra/nova`). O app não tem tela de edição de obra, e trocar a foto de uma obra existente exigiria método novo no domínio. Fica fora deste plano | Código atual (`src/app/obra/`) |
| P2-3 | Permissão negada vira erro com instrução (como o `FakeCameraGateway` faz hoje); cancelar vira `null` | Contrato atual + roteiro |
| P2-4 | `takePictureAsync({ quality: 1 })` e compressão única no `ArmazenamentoDeFotos` (1600 px, JPEG 0,7), para não comprimir duas vezes com perda | Roteiro (parâmetros) |
| P2-5 | A limpeza de órfãs também apaga arquivos soltos em `fotos/` sem linha no banco e com mais de 24 h (app morto entre mover o arquivo e gravar a linha) | Extensão da regra do roteiro |

## Global Constraints

- Expo SDK 57. Pacotes **sempre** com `npx expo install` (AGENTS.md): `expo-camera` (~57.0.6), `expo-image-manipulator` (~57.0.21), `expo-file-system` (~57.0.7; hoje só transitivo, passa a dependência direta). `expo-crypto` e `expo-image` já estão no projeto.
- Tudo roda no **Expo Go** (os três módulos fazem parte dele). No Expo Go o texto do pedido de permissão é o do próprio Expo Go; o texto do `app.json` vale no APK (Plano 6).
- Contrato `ICameraGateway.capture(): Promise<string | null>` **inalterado**. Nenhuma interface de `core/` muda e nenhuma porta nova entra em `core/`.
- Caminho salvo no banco é **relativo**: `fotos/<uuid>.jpg`, resolvido contra `Paths.document` no momento de exibir.
- Compressão: maior lado no máximo **1600 px**, JPEG com `compress: 0.7`. Hash: **SHA-256** em hexadecimal.
- Linha nova em `fotos`: `status = 'PENDENTE_UPLOAD'`, `tentativas = 0`, `criado_em_local` ISO-8601. **Sem mudança de schema** (a tabela já existe desde o Plano 1), então nenhuma migration nova.
- Órfã: `fotos.status = 'PENDENTE_UPLOAD'`, sem pedido (`foto_conclusao_path`) nem obra (`foto_path`) que a use, inclusive tombstones, e com mais de **24 h**.
- Câmera montada só enquanto o modal está visível (bateria). Botão de captura habilitado só depois de `onCameraReady` e desabilitado durante a captura.
- Textos de UI em português com acentos.
- Baseline por commit: `npm test`, `npm run typecheck`, `npm run lint` com **0 erros e no máximo 11 warnings** (não aumentar), `npm run db:check`.
- Execução como no Plano 1: direto na `main`, uma tarefa por vez, um commit por tarefa (confirmar com o usuário antes de começar).
- `makeFakeProviders` e os `Fake*Gateway` continuam como dublês de teste. Os testes de tela existentes (Kanban, concluir pedido) continuam verdes com o `FakeCameraGateway`.

## Review Focus

1. **Toque duplo** em "Concluir com foto" ou "Adicionar foto de catálogo": a câmera não pode abrir duas vezes nem deixar uma Promise órfã. Esperado: a segunda chamada falha com "A câmera já está aberta." → teste na Tarefa 4.
2. **Botão voltar do Android** com o modal aberto, ou o `CameraHost` desmontado no meio da captura (logout): a Promise do `capture()` sempre termina, como cancelamento. → testes na Tarefa 5 (`requestClose` e desmontagem).
3. **Volta das configurações do aparelho** com a permissão concedida: o modal deve reler a permissão e mostrar a câmera sem precisar fechar e abrir de novo. → teste na Tarefa 5 (evento `AppState` `active`).
4. **Foto que não existe mais no disco** (reinstalação, arquivo apagado) ou caminho legado absoluto (`/tmp/coruja.jpg` das fixtures): a miniatura cai no ícone e o resolvedor não transforma caminho absoluto. → testes na Tarefa 3.
5. **Falha no meio do armazenamento** (disco cheio, banco travado, imagem corrompida): erro visível ao usuário, sem linha em `fotos` e sem arquivo solto em `fotos/`. → testes na Tarefa 1.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `src/test-support/mocks/expoFileSystem.ts` | Dublê em memória de `File`/`Directory`/`Paths` | 1 |
| `src/test-support/mocks/expoImageManipulator.ts` | Dublê do `ImageManipulator` que registra as chamadas | 1 |
| `src/test-support/mocks/expoCamera.tsx` | Dublê de `CameraView`/`useCameraPermissions` controlável pelos testes | 5 |
| `jest.setup.js` | Registra os dublês acima e estende o mock de `expo-crypto` com `digest` | 1, 5 |
| `src/infrastructure/fileSystem/ArmazenamentoDeFotos.ts` | Comprimir, mover, hash, linha em `fotos`; limpeza de órfãs | 1, 2 |
| `src/presentation/utils/fotos.ts` | `resolverUriDaFoto(caminho)` | 3 |
| `src/presentation/components/ArtworkThumbnail.tsx` | Miniatura passa a resolver o caminho relativo | 3 |
| `src/presentation/components/PedidoCard.tsx` | Miniatura da foto de conclusão em pedidos Feitos | 3 |
| `src/infrastructure/device/camera/ExpoCameraGateway.ts` | `ICameraGateway` real + tipos da ponte | 4 |
| `src/main/factories/ProviderBag.ts` | Reexporta os tipos da ponte; campos `ponteDaCamera` e `aoIniciar` | 4, 6 |
| `src/presentation/components/camera/CameraModal.tsx` | Permissão em três estados, captura, revisão | 5 |
| `src/presentation/components/camera/CameraHost.tsx` | Liga o modal ao gateway | 5 |
| `src/main/factories/makeSqliteProviders.ts` | Usa `ExpoCameraGateway` e roda a limpeza na abertura | 6 |
| `src/presentation/hooks/AppProviders.tsx` | Monta o `CameraHost` e chama `aoIniciar` | 6 |
| `src/app/obra/nova.tsx` | Foto de catálogo opcional | 7 |
| `app.json` | Plugin `expo-camera` com texto em português | 1 |
| `docs/ate-fase3.md` | Seção "Plano 2" | 8 |

---

### Task 1: `ArmazenamentoDeFotos.armazenar` (dependências, dublês e pipeline de imagem)

**Files:**
- Modify: `package.json`, `package-lock.json`, `app.json`, `jest.setup.js`
- Create: `src/test-support/mocks/expoFileSystem.ts`, `src/test-support/mocks/expoImageManipulator.ts`
- Create: `src/infrastructure/fileSystem/ArmazenamentoDeFotos.ts`
- Test: `src/infrastructure/fileSystem/__tests__/ArmazenamentoDeFotos.test.ts`

**Interfaces:**
- Consumes: `DrizzleAppDb` (`src/infrastructure/database/sqlite/DrizzleDb.ts`), tabela `fotos` (`schema.ts`), `IIdGenerator`, `bancoDeTeste()` e `idsTeste` (`src/test-support/`).
- Produces:
  - `interface FotoCapturada { uri: string; largura: number; altura: number }`
  - `class ArmazenamentoDeFotos { constructor(db: DrizzleAppDb, ids: IIdGenerator, relogio?: () => Date, diagnostico?: (mensagem: string) => void); armazenar(foto: FotoCapturada): Promise<string> }` — devolve `fotos/<uuid>.jpg`.
  - Constantes exportadas: `PASTA_FOTOS = 'fotos'`, `LADO_MAXIMO_PX = 1600`, `QUALIDADE_JPEG = 0.7`.
  - Dublês: `fsDeTeste` (`escrever`, `ler`, `existe`, `uris`, `limpar`), `falhasFs` (`move`), `Paths.document.uri === 'file:///docs/'`; `manipulacoes`, `falhasManipulador`, `limparManipulador()`.

- [ ] **Step 1: Instalar dependências e configurar o plugin**

```bash
npx expo install expo-camera expo-image-manipulator expo-file-system
```

O `npx expo install` pode acrescentar `"expo-camera"` como texto simples em `plugins`. Deixar **uma única** entrada do `expo-camera`, nesta forma, no `app.json`:

```json
[
  "expo-camera",
  {
    "cameraPermission": "Permita que o ate use a câmera para fotografar pedidos concluídos e obras do catálogo.",
    "recordAudioAndroid": false
  }
]
```

(`recordAudioAndroid: false` porque o app não grava vídeo; assim o APK não pede microfone.)

Conferir: `git diff package.json app.json` mostra as três dependências novas e uma única entrada do plugin.

- [ ] **Step 2: Criar o dublê do `expo-file-system`**

`src/test-support/mocks/expoFileSystem.ts`:

```ts
/** Dublê em memória do expo-file-system (API File/Directory/Paths do SDK 57) para os testes. */
interface Entrada {
  bytes: Uint8Array;
  modificationTime: number;
}

const arquivos = new Map<string, Entrada>();
const pastas = new Set<string>();

export const falhasFs: { move: Error | null } = { move: null };

type Parte = string | { uri: string };

function juntar(partes: Parte[]): string {
  return partes
    .map((parte) => (typeof parte === 'string' ? parte : parte.uri))
    .reduce(
      (acumulado, parte) =>
        acumulado ? `${acumulado.replace(/\/+$/, '')}/${parte.replace(/^\/+/, '')}` : parte,
      '',
    );
}

function paraBytes(conteudo: string): Uint8Array {
  return Uint8Array.from(conteudo, (caractere) => caractere.charCodeAt(0));
}

export class File {
  uri: string;

  constructor(...partes: Parte[]) {
    this.uri = juntar(partes);
  }

  get exists(): boolean {
    return arquivos.has(this.uri);
  }

  async bytes(): Promise<Uint8Array> {
    const entrada = arquivos.get(this.uri);
    if (!entrada) throw new Error(`Arquivo inexistente: ${this.uri}`);
    return entrada.bytes;
  }

  async move(destino: File | Directory): Promise<void> {
    if (falhasFs.move) throw falhasFs.move;
    const entrada = arquivos.get(this.uri);
    if (!entrada) throw new Error(`Arquivo inexistente: ${this.uri}`);
    const alvo =
      destino instanceof Directory ? juntar([destino, this.uri.split('/').pop() ?? '']) : destino.uri;
    arquivos.delete(this.uri);
    arquivos.set(alvo, entrada);
    this.uri = alvo;
  }

  delete(): void {
    if (!arquivos.delete(this.uri)) throw new Error(`Arquivo inexistente: ${this.uri}`);
  }

  info(): { exists: boolean; uri?: string; size?: number; modificationTime?: number } {
    const entrada = arquivos.get(this.uri);
    if (!entrada) return { exists: false };
    return {
      exists: true,
      uri: this.uri,
      size: entrada.bytes.length,
      modificationTime: entrada.modificationTime,
    };
  }
}

export class Directory {
  uri: string;

  constructor(...partes: Parte[]) {
    this.uri = juntar(partes);
  }

  get exists(): boolean {
    return pastas.has(this.uri);
  }

  create(_opcoes?: { intermediates?: boolean; idempotent?: boolean }): void {
    pastas.add(this.uri);
  }

  list(): File[] {
    const prefixo = `${this.uri.replace(/\/+$/, '')}/`;
    return [...arquivos.keys()]
      .filter((uri) => uri.startsWith(prefixo) && !uri.slice(prefixo.length).includes('/'))
      .map((uri) => new File(uri));
  }
}

export const Paths = {
  document: new Directory('file:///docs/'),
  cache: new Directory('file:///cache/'),
};

export const fsDeTeste = {
  escrever(uri: string, conteudo = 'jpeg', modificationTime = Date.now()): void {
    arquivos.set(uri, { bytes: paraBytes(conteudo), modificationTime });
    pastas.add(uri.slice(0, uri.lastIndexOf('/')));
  },
  ler(uri: string): Uint8Array {
    const entrada = arquivos.get(uri);
    if (!entrada) throw new Error(`Arquivo inexistente: ${uri}`);
    return entrada.bytes;
  },
  existe: (uri: string): boolean => arquivos.has(uri),
  uris: (): string[] => [...arquivos.keys()].sort(),
  limpar(): void {
    arquivos.clear();
    pastas.clear();
    falhasFs.move = null;
  },
};
```

- [ ] **Step 3: Criar o dublê do `expo-image-manipulator`**

`src/test-support/mocks/expoImageManipulator.ts`:

```ts
import { fsDeTeste } from './expoFileSystem';

/** Dublê do expo-image-manipulator (API ImageManipulator.manipulate do SDK 57). */
export const SaveFormat = { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' } as const;

interface Manipulacao {
  origem: string;
  resize: { width?: number | null; height?: number | null }[];
  salvo?: { compress?: number; format?: string };
}

export const manipulacoes: Manipulacao[] = [];
export const falhasManipulador: { render: Error | null } = { render: null };
let contador = 0;

export const ImageManipulator = {
  manipulate(origem: string) {
    const registro: Manipulacao = { origem, resize: [] };
    manipulacoes.push(registro);
    const contexto = {
      resize(tamanho: { width?: number | null; height?: number | null }) {
        registro.resize.push(tamanho);
        return contexto;
      },
      async renderAsync() {
        if (falhasManipulador.render) throw falhasManipulador.render;
        return {
          width: 0,
          height: 0,
          async saveAsync(opcoes: { compress?: number; format?: string }) {
            registro.salvo = opcoes;
            contador += 1;
            const uri = `file:///cache/ImageManipulator/manipulada-${contador}.jpg`;
            fsDeTeste.escrever(uri, `jpeg-comprimido-${contador}`);
            return { uri, width: 0, height: 0 };
          },
          release() {},
        };
      },
      release() {},
    };
    return contexto;
  },
};

export function limparManipulador(): void {
  manipulacoes.length = 0;
  falhasManipulador.render = null;
}
```

- [ ] **Step 4: Registrar os dublês e estender o mock de `expo-crypto` em `jest.setup.js`**

Substituir o conteúdo de `jest.setup.js` por:

```js
jest.mock('expo-crypto', () => {
  const { createHash } = jest.requireActual('crypto');
  let sequencia = 0;
  return {
    getRandomBytes: jest.fn((tamanho) => {
      sequencia += 1;
      const bytes = new Uint8Array(tamanho);
      bytes[12] = (sequencia >>> 24) & 255;
      bytes[13] = (sequencia >>> 16) & 255;
      bytes[14] = (sequencia >>> 8) & 255;
      bytes[15] = sequencia & 255;
      return bytes;
    }),
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digest: jest.fn(async (_algoritmo, dados) => {
      const resumo = createHash('sha256').update(Buffer.from(dados)).digest();
      return resumo.buffer.slice(resumo.byteOffset, resumo.byteOffset + resumo.byteLength);
    }),
  };
});

jest.mock('expo-file-system', () => jest.requireActual('./src/test-support/mocks/expoFileSystem'));
jest.mock('expo-image-manipulator', () =>
  jest.requireActual('./src/test-support/mocks/expoImageManipulator'),
);
```

- [ ] **Step 5: Escrever o teste que falha**

`src/infrastructure/fileSystem/__tests__/ArmazenamentoDeFotos.test.ts`:

```ts
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
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx jest src/infrastructure/fileSystem`
Expected: FAIL com `Cannot find module '../ArmazenamentoDeFotos'`.

- [ ] **Step 7: Implementar**

`src/infrastructure/fileSystem/ArmazenamentoDeFotos.ts`:

```ts
import { CryptoDigestAlgorithm, digest } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { IIdGenerator } from '../../core/application/gateways/IIdGenerator';
import type { DrizzleAppDb } from '../database/sqlite/DrizzleDb';
import { fotos } from '../database/sqlite/schema';

export const PASTA_FOTOS = 'fotos';
export const LADO_MAXIMO_PX = 1600;
export const QUALIDADE_JPEG = 0.7;

/** Foto aceita na câmera, ainda no arquivo temporário. */
export interface FotoCapturada {
  uri: string;
  largura: number;
  altura: number;
}

/**
 * Comprime a foto aceita, guarda em <documentos>/fotos/<uuid>.jpg e registra em `fotos`.
 * Devolve o caminho RELATIVO (fotos/<uuid>.jpg): o absoluto muda entre builds e reinstalações.
 */
export class ArmazenamentoDeFotos {
  constructor(
    private readonly db: DrizzleAppDb,
    private readonly ids: IIdGenerator,
    private readonly relogio: () => Date = () => new Date(),
    private readonly diagnostico: (mensagem: string) => void = () => {},
  ) {}

  async armazenar(foto: FotoCapturada): Promise<string> {
    const id = this.ids.gerar();
    const caminhoRelativo = `${PASTA_FOTOS}/${id}.jpg`;
    const uriComprimida = await comprimir(foto);
    new Directory(Paths.document, PASTA_FOTOS).create({ intermediates: true, idempotent: true });
    const destino = new File(Paths.document, caminhoRelativo);
    try {
      await new File(uriComprimida).move(destino);
      const hash = await sha256(destino);
      await this.db.insert(fotos).values({
        id,
        caminhoLocal: caminhoRelativo,
        hash,
        status: 'PENDENTE_UPLOAD',
        tentativas: 0,
        criadoEmLocal: this.relogio().toISOString(),
      });
    } catch (erro) {
      apagarSeExistir(destino);
      apagarSeExistir(new File(uriComprimida));
      throw erro;
    }
    apagarSeExistir(new File(foto.uri));
    const tamanhoKb = Math.round((destino.info().size ?? 0) / 1024);
    this.diagnostico(`[fotos] ${caminhoRelativo} salva com ${tamanhoKb} KB`);
    return caminhoRelativo;
  }
}

async function comprimir(foto: FotoCapturada): Promise<string> {
  const contexto = ImageManipulator.manipulate(foto.uri);
  if (Math.max(foto.largura, foto.altura) > LADO_MAXIMO_PX) {
    contexto.resize(
      foto.largura >= foto.altura ? { width: LADO_MAXIMO_PX } : { height: LADO_MAXIMO_PX },
    );
  }
  try {
    const imagem = await contexto.renderAsync();
    try {
      const salva = await imagem.saveAsync({ compress: QUALIDADE_JPEG, format: SaveFormat.JPEG });
      return salva.uri;
    } finally {
      imagem.release();
    }
  } finally {
    contexto.release();
  }
}

async function sha256(arquivo: File): Promise<string> {
  const resumo = await digest(CryptoDigestAlgorithm.SHA256, await arquivo.bytes());
  return Array.from(new Uint8Array(resumo), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function apagarSeExistir(arquivo: File): void {
  try {
    if (arquivo.exists) arquivo.delete();
  } catch {
    // Limpeza de melhor esforço: o erro original é o que importa.
  }
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx jest src/infrastructure/fileSystem`
Expected: PASS (9 testes).

Se o `npx tsc --noEmit` reclamar do tipo do argumento de `digest` (`BufferSource`), usar `await arquivo.bytes()` diretamente, que já é `Uint8Array<ArrayBuffer>` na API do SDK 57; não usar cast para `any`.

- [ ] **Step 9: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint && npm run db:check
git add package.json package-lock.json app.json jest.setup.js src/test-support/mocks src/infrastructure/fileSystem
git commit -m "feat(infra): armazenamento de fotos comprimidas com hash e registro em fotos"
```

---

### Task 2: Limpeza de fotos órfãs

**Files:**
- Modify: `src/infrastructure/fileSystem/ArmazenamentoDeFotos.ts`
- Test: `src/infrastructure/fileSystem/__tests__/LimpezaDeFotosOrfas.test.ts`

**Interfaces:**
- Consumes: `ArmazenamentoDeFotos` (Tarefa 1); tabelas `fotos`, `pedidos`, `obras`, `clientes`; `fsDeTeste`.
- Produces: `ArmazenamentoDeFotos.limparOrfas(): Promise<number>` (quantidade de itens removidos: linhas órfãs + arquivos soltos); constante `IDADE_MINIMA_ORFA_MS = 24 * 60 * 60 * 1000`.

- [ ] **Step 1: Escrever o teste que falha**

`src/infrastructure/fileSystem/__tests__/LimpezaDeFotosOrfas.test.ts`:

```ts
import { bancoDeTeste } from '../../../test-support/bancoDeTeste';
import { idsTeste } from '../../../test-support/ids';
import { fsDeTeste } from '../../../test-support/mocks/expoFileSystem';
import type { DrizzleAppDb } from '../../database/sqlite/DrizzleDb';
import { clientes, fotos, obras, pedidos } from '../../database/sqlite/schema';
import { ArmazenamentoDeFotos } from '../ArmazenamentoDeFotos';

const AGORA = new Date('2026-11-05T12:00:00.000Z');
const ANTIGA = '2026-11-03T12:00:00.000Z'; // 48 h antes
const RECENTE = '2026-11-05T06:00:00.000Z'; // 6 h antes
const MS_ANTIGA = new Date(ANTIGA).getTime();
const MS_RECENTE = new Date(RECENTE).getTime();
const USUARIO = 'a1111111-1111-4111-8111-111111111111';

describe('ArmazenamentoDeFotos.limparOrfas', () => {
  let db: DrizzleAppDb;
  let armazenamento: ArmazenamentoDeFotos;

  beforeEach(() => {
    fsDeTeste.limpar();
    db = bancoDeTeste();
    armazenamento = new ArmazenamentoDeFotos(db, idsTeste, () => AGORA);
  });

  async function foto(
    caminho: string,
    criadoEmLocal: string,
    status: 'PENDENTE_UPLOAD' | 'ENVIADA' = 'PENDENTE_UPLOAD',
  ) {
    await db.insert(fotos).values({
      id: caminho,
      caminhoLocal: caminho,
      hash: 'h',
      status,
      criadoEmLocal,
    });
    fsDeTeste.escrever(`file:///docs/${caminho}`, 'jpeg', new Date(criadoEmLocal).getTime());
  }

  async function cliente(): Promise<string> {
    await db.insert(clientes).values({
      id: 'c1',
      usuarioId: USUARIO,
      nome: 'Ana',
      contato: '1',
      statusSync: 'PENDENTE',
      criadoEmLocal: ANTIGA,
    });
    return 'c1';
  }

  async function caminhosRegistrados(): Promise<string[]> {
    return (await db.select().from(fotos)).map((l) => l.caminhoLocal).sort();
  }

  it('remove linha e arquivo da órfã PENDENTE_UPLOAD com mais de 24 h', async () => {
    await foto('fotos/orfa.jpg', ANTIGA);

    await expect(armazenamento.limparOrfas()).resolves.toBe(1);

    expect(await caminhosRegistrados()).toEqual([]);
    expect(fsDeTeste.existe('file:///docs/fotos/orfa.jpg')).toBe(false);
  });

  it('mantém órfã recente (menos de 24 h)', async () => {
    await foto('fotos/recente.jpg', RECENTE);

    await expect(armazenamento.limparOrfas()).resolves.toBe(0);

    expect(await caminhosRegistrados()).toEqual(['fotos/recente.jpg']);
    expect(fsDeTeste.existe('file:///docs/fotos/recente.jpg')).toBe(true);
  });

  it('mantém foto usada por pedido, mesmo removido (tombstone), e por obra', async () => {
    await foto('fotos/pedido.jpg', ANTIGA);
    await foto('fotos/obra.jpg', ANTIGA);
    const clienteId = await cliente();
    await db.insert(pedidos).values({
      id: 'p1',
      usuarioId: USUARIO,
      clienteId,
      descricao: 'Vaso',
      canalOrigem: 'WHATSAPP',
      dataEntrega: ANTIGA,
      status: 'FEITO',
      fotoConclusaoPath: 'fotos/pedido.jpg',
      vendaDireta: false,
      quantidadeObra: 0,
      statusSync: 'PENDENTE',
      criadoEmLocal: ANTIGA,
      deletedAt: RECENTE,
    });
    await db.insert(obras).values({
      id: 'o1',
      usuarioId: USUARIO,
      nome: 'Coruja',
      tipo: 'UNICA',
      quantidade: 1,
      statusObra: 'DISPONIVEL',
      fotoPath: 'fotos/obra.jpg',
      statusSync: 'PENDENTE',
      criadoEmLocal: ANTIGA,
    });

    await expect(armazenamento.limparOrfas()).resolves.toBe(0);

    expect(await caminhosRegistrados()).toEqual(['fotos/obra.jpg', 'fotos/pedido.jpg']);
  });

  it('não mexe em foto já ENVIADA', async () => {
    await foto('fotos/enviada.jpg', ANTIGA, 'ENVIADA');

    await expect(armazenamento.limparOrfas()).resolves.toBe(0);

    expect(await caminhosRegistrados()).toEqual(['fotos/enviada.jpg']);
  });

  it('remove a linha órfã mesmo se o arquivo já não existe', async () => {
    await foto('fotos/sem-arquivo.jpg', ANTIGA);
    fsDeTeste.limpar();

    await expect(armazenamento.limparOrfas()).resolves.toBe(1);

    expect(await caminhosRegistrados()).toEqual([]);
  });

  it('apaga arquivo solto antigo em fotos/ sem linha no banco e mantém o recente', async () => {
    await foto('fotos/registrada.jpg', ANTIGA, 'ENVIADA');
    fsDeTeste.escrever('file:///docs/fotos/solta-antiga.jpg', 'x', MS_ANTIGA);
    fsDeTeste.escrever('file:///docs/fotos/solta-recente.jpg', 'x', MS_RECENTE);

    await expect(armazenamento.limparOrfas()).resolves.toBe(1);

    expect(fsDeTeste.uris()).toEqual([
      'file:///docs/fotos/registrada.jpg',
      'file:///docs/fotos/solta-recente.jpg',
    ]);
  });

  it('sem pasta fotos/ não falha', async () => {
    await expect(armazenamento.limparOrfas()).resolves.toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest LimpezaDeFotosOrfas`
Expected: FAIL com `armazenamento.limparOrfas is not a function`.

- [ ] **Step 3: Implementar**

Em `ArmazenamentoDeFotos.ts`:

1. Trocar o import do schema e acrescentar o do Drizzle:

```ts
import { and, eq, lt, notExists } from 'drizzle-orm';
```

```ts
import { fotos, obras, pedidos } from '../database/sqlite/schema';
```

2. Acrescentar a constante junto das outras:

```ts
export const IDADE_MINIMA_ORFA_MS = 24 * 60 * 60 * 1000;
```

3. Acrescentar o método na classe, depois de `armazenar`:

```ts
  /**
   * Remove fotos PENDENTE_UPLOAD que nenhum pedido ou obra usa (tombstones contam como uso)
   * e com mais de 24 h, e arquivos soltos em fotos/ sem linha no banco com mais de 24 h.
   * Roda na abertura do app. Devolve quantos itens removeu.
   */
  async limparOrfas(): Promise<number> {
    const agora = this.relogio();
    const limite = agora.getTime() - IDADE_MINIMA_ORFA_MS;
    const orfas = await this.db
      .select({ id: fotos.id, caminhoLocal: fotos.caminhoLocal })
      .from(fotos)
      .where(
        and(
          eq(fotos.status, 'PENDENTE_UPLOAD'),
          lt(fotos.criadoEmLocal, new Date(limite).toISOString()),
          notExists(
            this.db
              .select({ id: pedidos.id })
              .from(pedidos)
              .where(eq(pedidos.fotoConclusaoPath, fotos.caminhoLocal)),
          ),
          notExists(
            this.db.select({ id: obras.id }).from(obras).where(eq(obras.fotoPath, fotos.caminhoLocal)),
          ),
        ),
      );
    for (const orfa of orfas) {
      apagarSeExistir(new File(Paths.document, orfa.caminhoLocal));
      await this.db.delete(fotos).where(eq(fotos.id, orfa.id));
    }

    const pasta = new Directory(Paths.document, PASTA_FOTOS);
    if (!pasta.exists) return orfas.length;
    const registrados = new Set(
      (await this.db.select({ caminhoLocal: fotos.caminhoLocal }).from(fotos)).map(
        (linha) => linha.caminhoLocal,
      ),
    );
    let soltos = 0;
    for (const item of pasta.list()) {
      if (!(item instanceof File)) continue;
      const caminho = `${PASTA_FOTOS}/${item.uri.split('/').pop() ?? ''}`;
      const modificado = item.info().modificationTime ?? agora.getTime();
      if (!registrados.has(caminho) && modificado < limite) {
        apagarSeExistir(item);
        soltos += 1;
      }
    }
    return orfas.length + soltos;
  }
```

(`modificationTime` do `File.info()` é em milissegundos no SDK 57.)

- [ ] **Step 4: Rodar e ver passar**

Run: `npx jest src/infrastructure/fileSystem`
Expected: PASS (16 testes nos dois arquivos).

- [ ] **Step 5: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint && npm run db:check
git add src/infrastructure/fileSystem
git commit -m "feat(infra): limpeza de fotos órfãs"
```

---

### Task 3: `resolverUriDaFoto` e miniaturas

**Files:**
- Create: `src/presentation/utils/fotos.ts`
- Modify: `src/presentation/components/ArtworkThumbnail.tsx`, `src/presentation/components/PedidoCard.tsx`
- Test: `src/presentation/__tests__/FotoMiniatura.test.tsx`

**Interfaces:**
- Consumes: `Paths`/`File` (dublê da Tarefa 1 nos testes), `Pedido.reidratar`.
- Produces: `resolverUriDaFoto(caminho: string | null | undefined): string | null`; `ArtworkThumbnail({ photoPath, testID? })`; no `PedidoCard`, a miniatura `foto-conclusao-<pedidoId>` em pedidos `FEITO` com foto.

- [ ] **Step 1: Escrever o teste que falha**

`src/presentation/__tests__/FotoMiniatura.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { Pedido, type PedidoProps } from '../../core/domain/entities/Pedido';
import { ArtworkThumbnail } from '../components/ArtworkThumbnail';
import { PedidoCard } from '../components/PedidoCard';
import { resolverUriDaFoto } from '../utils/fotos';

/** No Jest o expo-image entrega `source` como lista. */
function uriDaImagem(testID: string): string {
  return [screen.getByTestId(testID).props.source].flat()[0].uri;
}

function pedido(override: Partial<PedidoProps>): Pedido {
  return Pedido.reidratar({
    id: 'b2222222-2222-4222-8222-222222222222',
    usuarioId: 'a1111111-1111-4111-8111-111111111111',
    clienteId: 'c3333333-3333-4333-8333-333333333333',
    obraId: null,
    descricao: 'Vaso azul',
    canalOrigem: 'WHATSAPP',
    dataEntrega: new Date('2026-11-10T12:00:00.000Z'),
    status: 'FEITO',
    fotoConclusaoPath: 'fotos/vaso.jpg',
    vendaDireta: false,
    quantidadeObra: 0,
    statusSync: 'PENDENTE',
    criadoEmLocal: new Date('2026-11-01T12:00:00.000Z'),
    deletedAt: null,
    ...override,
  });
}

const acoes = { onIniciar: jest.fn(), onConcluir: jest.fn(), onCancelar: jest.fn(), loading: false };

describe('resolverUriDaFoto', () => {
  it('resolve caminho relativo contra o diretório de documentos', () => {
    expect(resolverUriDaFoto('fotos/abc.jpg')).toBe('file:///docs/fotos/abc.jpg');
  });

  it('mantém caminho absoluto e URI como estão (fixtures e legado)', () => {
    expect(resolverUriDaFoto('/tmp/coruja.jpg')).toBe('/tmp/coruja.jpg');
    expect(resolverUriDaFoto('file:///cache/x.jpg')).toBe('file:///cache/x.jpg');
  });

  it('devolve null sem caminho', () => {
    expect(resolverUriDaFoto(null)).toBeNull();
    expect(resolverUriDaFoto(undefined)).toBeNull();
    expect(resolverUriDaFoto('')).toBeNull();
  });
});

describe('miniaturas', () => {
  it('ArtworkThumbnail exibe o caminho relativo resolvido', async () => {
    await render(<ArtworkThumbnail photoPath="fotos/obra.jpg" testID="miniatura" />);
    expect(uriDaImagem('miniatura')).toBe('file:///docs/fotos/obra.jpg');
  });

  it('ArtworkThumbnail sem foto mostra só o ícone', async () => {
    await render(<ArtworkThumbnail photoPath={null} testID="miniatura" />);
    expect(screen.queryByTestId('miniatura')).toBeNull();
  });

  it('PedidoCard Feito mostra a foto de conclusão', async () => {
    const feito = pedido({});
    await render(<PedidoCard pedido={feito} {...acoes} />);
    expect(uriDaImagem(`foto-conclusao-${feito.id}`)).toBe('file:///docs/fotos/vaso.jpg');
  });

  it('PedidoCard de venda direta (Feito sem foto) não mostra miniatura', async () => {
    const venda = pedido({ fotoConclusaoPath: null, vendaDireta: true });
    await render(<PedidoCard pedido={venda} {...acoes} />);
    expect(screen.queryByTestId(`foto-conclusao-${venda.id}`)).toBeNull();
  });

  it('PedidoCard Fazendo não mostra miniatura', async () => {
    const fazendo = pedido({ status: 'FAZENDO', fotoConclusaoPath: null });
    await render(<PedidoCard pedido={fazendo} {...acoes} />);
    expect(screen.queryByTestId(`foto-conclusao-${fazendo.id}`)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest FotoMiniatura`
Expected: FAIL com `Cannot find module '../utils/fotos'`.

- [ ] **Step 3: Implementar o resolvedor**

`src/presentation/utils/fotos.ts`:

```ts
import { File, Paths } from 'expo-file-system';

/**
 * Converte o caminho salvo no banco em URI exibível. Relativo (fotos/x.jpg) é resolvido contra
 * o diretório de documentos do app; absoluto ou URI (fixtures, dados antigos) fica como está.
 */
export function resolverUriDaFoto(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  if (caminho.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(caminho)) return caminho;
  return new File(Paths.document, caminho).uri;
}
```

- [ ] **Step 4: Resolver o caminho na `ArtworkThumbnail`**

Substituir o componente em `src/presentation/components/ArtworkThumbnail.tsx` (os estilos não mudam):

```tsx
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { View } from 'react-native';

import { borderRadius, iconSizes, spacing } from '@/constants/theme';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { resolverUriDaFoto } from '@/presentation/utils/fotos';
import { AppIcon } from './AppIcon';

export function ArtworkThumbnail({ photoPath, testID }: { photoPath: string | null; testID?: string }) {
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = resolverUriDaFoto(photoPath);
  return <View style={styles.frame} accessible={false}>
    <AppIcon name="stock" color={colors.textSecondary} size={iconSizes.feature} />
    {uri && uri !== failedUri ? <Image key={uri} testID={testID} source={{ uri }} style={styles.image} contentFit="cover"
      accessible={false} onError={() => setFailedUri(uri)} /> : null}
  </View>;
}
```

- [ ] **Step 5: Mostrar a foto de conclusão no `PedidoCard`**

Em `src/presentation/components/PedidoCard.tsx`:

1. Acrescentar o import junto dos outros componentes locais:

```tsx
import { ArtworkThumbnail } from './ArtworkThumbnail';
```

2. Logo depois do `</View>` que fecha `styles.tags` e antes do botão `A_FAZER`, inserir:

```tsx
    {pedido.status === 'FEITO' && pedido.fotoConclusaoPath ? (
      <View accessibilityLabel="Foto de conclusão" style={styles.photo}>
        <ArtworkThumbnail photoPath={pedido.fotoConclusaoPath} testID={`foto-conclusao-${pedido.id}`} />
      </View>
    ) : null}
```

3. Em `useStyles`, acrescentar a chave:

```ts
  photo: { alignSelf: 'flex-start' },
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx jest FotoMiniatura TelaKanban KanbanPresentation CompletedDisclosure TelaEstoque`
Expected: PASS (as suítes existentes continuam verdes: as fixtures usam caminho absoluto, que passa direto).

- [ ] **Step 7: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/presentation
git commit -m "feat(presentation): miniaturas resolvem caminho relativo e mostram a foto de conclusão"
```

---

### Task 4: `ExpoCameraGateway` e os tipos da ponte

**Files:**
- Create: `src/infrastructure/device/camera/ExpoCameraGateway.ts`
- Modify: `src/main/factories/ProviderBag.ts` (só reexporta tipos)
- Test: `src/infrastructure/device/camera/__tests__/ExpoCameraGateway.test.ts`

**Interfaces:**
- Consumes: `ICameraGateway`; `FotoCapturada` (Tarefa 1).
- Produces:
  - `type ResultadoDaCamera = ({ tipo: 'foto' } & FotoCapturada) | { tipo: 'cancelado' } | { tipo: 'negado' }`
  - `type AbridorDaCamera = () => Promise<ResultadoDaCamera>`
  - `interface DestinoDasFotos { armazenar(foto: FotoCapturada): Promise<string> }`
  - `class ExpoCameraGateway implements ICameraGateway { constructor(destino: DestinoDasFotos); registrarAbridor(abridor: AbridorDaCamera): () => void; capture(): Promise<string | null> }`
  - Mensagens: `MENSAGEM_PERMISSAO_NEGADA`, `MENSAGEM_CAMERA_INDISPONIVEL`, `MENSAGEM_CAMERA_OCUPADA`.
  - Em `ProviderBag.ts`: `export type { AbridorDaCamera, ResultadoDaCamera }` e `interface PonteDaCamera { registrarAbridor(abridor: AbridorDaCamera): () => void }`.

- [ ] **Step 1: Escrever o teste que falha**

`src/infrastructure/device/camera/__tests__/ExpoCameraGateway.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest ExpoCameraGateway`
Expected: FAIL com `Cannot find module '../ExpoCameraGateway'`.

- [ ] **Step 3: Implementar o gateway**

`src/infrastructure/device/camera/ExpoCameraGateway.ts`:

```ts
import type { ICameraGateway } from '../../../core/application/gateways/ICameraGateway';
import type { FotoCapturada } from '../../fileSystem/ArmazenamentoDeFotos';

/** O que a UI da câmera devolve ao fechar. */
export type ResultadoDaCamera =
  | ({ tipo: 'foto' } & FotoCapturada)
  | { tipo: 'cancelado' }
  | { tipo: 'negado' };

/** Função registrada pela UI (CameraHost) que abre o modal e resolve ao fechar. */
export type AbridorDaCamera = () => Promise<ResultadoDaCamera>;

export interface DestinoDasFotos {
  armazenar(foto: FotoCapturada): Promise<string>;
}

export const MENSAGEM_PERMISSAO_NEGADA =
  'Permissão de câmera negada. Habilite a câmera nas configurações do aparelho para tirar a foto.';
export const MENSAGEM_CAMERA_INDISPONIVEL = 'Câmera indisponível no momento. Tente novamente.';
export const MENSAGEM_CAMERA_OCUPADA = 'A câmera já está aberta.';

/**
 * ICameraGateway real. A UI registra como abrir o modal da câmera; a foto aceita é entregue
 * ao destino (ArmazenamentoDeFotos), que devolve o caminho relativo.
 */
export class ExpoCameraGateway implements ICameraGateway {
  private abridor: AbridorDaCamera | null = null;
  private aberta = false;

  constructor(private readonly destino: DestinoDasFotos) {}

  registrarAbridor(abridor: AbridorDaCamera): () => void {
    this.abridor = abridor;
    return () => {
      if (this.abridor === abridor) this.abridor = null;
    };
  }

  async capture(): Promise<string | null> {
    if (!this.abridor) throw new Error(MENSAGEM_CAMERA_INDISPONIVEL);
    if (this.aberta) throw new Error(MENSAGEM_CAMERA_OCUPADA);
    this.aberta = true;
    try {
      const resultado = await this.abridor();
      if (resultado.tipo === 'cancelado') return null;
      if (resultado.tipo === 'negado') throw new Error(MENSAGEM_PERMISSAO_NEGADA);
      const { uri, largura, altura } = resultado;
      return await this.destino.armazenar({ uri, largura, altura });
    } finally {
      this.aberta = false;
    }
  }
}
```

- [ ] **Step 4: Reexportar os tipos da ponte na `ProviderBag`**

Em `src/main/factories/ProviderBag.ts`, depois dos imports existentes, acrescentar:

```ts
import type {
  AbridorDaCamera,
  ResultadoDaCamera,
} from '../../infrastructure/device/camera/ExpoCameraGateway';

export type { AbridorDaCamera, ResultadoDaCamera };

/** Ponte pela qual a UI (CameraHost) ensina o gateway real a abrir a câmera. */
export interface PonteDaCamera {
  registrarAbridor(abridor: AbridorDaCamera): () => void;
}
```

(O import vai junto do bloco de `import type` do arquivo, em ordem alfabética de caminho, para não criar warning de `import/order`.)

- [ ] **Step 5: Rodar e ver passar**

Run: `npx jest ExpoCameraGateway`
Expected: PASS (7 testes).

- [ ] **Step 6: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/infrastructure/device/camera src/main/factories/ProviderBag.ts
git commit -m "feat(infra): ExpoCameraGateway com ponte para a UI da câmera"
```

---

### Task 5: `CameraModal` e `CameraHost`

**Files:**
- Create: `src/test-support/mocks/expoCamera.tsx`
- Modify: `jest.setup.js`
- Create: `src/presentation/components/camera/CameraModal.tsx`, `src/presentation/components/camera/CameraHost.tsx`
- Test: `src/presentation/__tests__/CameraModal.test.tsx`, `src/presentation/__tests__/CameraHost.test.tsx`

**Interfaces:**
- Consumes: `ResultadoDaCamera`, `PonteDaCamera` (Tarefa 4, via `@/main/factories/ProviderBag`); `ExpoCameraGateway` nos testes do host; `ActionButton`, `useUIStyles`, `createThemedStyles`.
- Produces:
  - `CameraModal({ visivel: boolean; onResultado(resultado: ResultadoDaCamera): void })`
  - `CameraHost({ ponte?: PonteDaCamera })`
  - testIDs: `camera-modal` (o `Modal`), `camera-carregando`, `camera-sem-permissao`, `botao-permitir-camera`, `botao-abrir-configuracoes`, `botao-voltar-camera`, `camera-view` (dublê), `botao-capturar`, `botao-cancelar-camera`, `camera-erro`, `camera-preview`, `botao-refazer-foto`, `botao-usar-foto`.
  - Dublê: `cameraDeTeste` (`permissao`, `respostaAoPedir`, `prontaAoMontar`, `erroAoMontar`, `proximaFoto`, `takePictureAsync`, `pedirPermissao`, `lerPermissao`, `ficarPronta()`, `reiniciar()`), `permissoes`.

- [ ] **Step 1: Criar o dublê do `expo-camera`**

`src/test-support/mocks/expoCamera.tsx`:

```tsx
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { View } from 'react-native';

/** Dublê do expo-camera (SDK 57) controlado pelos testes por `cameraDeTeste`. */
export const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined',
} as const;

interface Permissao {
  granted: boolean;
  canAskAgain: boolean;
  status: (typeof PermissionStatus)[keyof typeof PermissionStatus];
  expires: 'never';
}

export const permissoes: Record<string, Permissao> = {
  concedida: { granted: true, canAskAgain: true, status: 'granted', expires: 'never' },
  indeterminada: { granted: false, canAskAgain: true, status: 'undetermined', expires: 'never' },
  negada: { granted: false, canAskAgain: true, status: 'denied', expires: 'never' },
  negadaParaSempre: { granted: false, canAskAgain: false, status: 'denied', expires: 'never' },
};

interface PropsDaCamera {
  onCameraReady?(): void;
  onMountError?(evento: { message: string }): void;
}

interface FotoDaCamera {
  uri: string;
  width: number;
  height: number;
  format: string;
}

const FOTO_PADRAO: FotoDaCamera = {
  uri: 'file:///cache/Camera/foto.jpg',
  width: 4000,
  height: 3000,
  format: 'jpg',
};
let ultimasProps: PropsDaCamera | null = null;

export const cameraDeTeste = {
  permissao: permissoes.concedida as Permissao | null,
  respostaAoPedir: permissoes.concedida,
  prontaAoMontar: true,
  erroAoMontar: null as string | null,
  proximaFoto: FOTO_PADRAO,
  // Tipo de retorno explícito: evita a autorreferência no inicializador (TS7022).
  takePictureAsync: jest.fn(async (_opcoes?: unknown): Promise<FotoDaCamera> => cameraDeTeste.proximaFoto),
  pedirPermissao: jest.fn(),
  lerPermissao: jest.fn(),
  /** Simula o onCameraReady quando prontaAoMontar = false (envolver em act). */
  ficarPronta(): void {
    ultimasProps?.onCameraReady?.();
  },
  reiniciar(): void {
    cameraDeTeste.permissao = permissoes.concedida;
    cameraDeTeste.respostaAoPedir = permissoes.concedida;
    cameraDeTeste.prontaAoMontar = true;
    cameraDeTeste.erroAoMontar = null;
    cameraDeTeste.proximaFoto = FOTO_PADRAO;
    cameraDeTeste.takePictureAsync.mockReset();
    cameraDeTeste.takePictureAsync.mockImplementation(async (): Promise<FotoDaCamera> => cameraDeTeste.proximaFoto);
    cameraDeTeste.pedirPermissao.mockReset();
    cameraDeTeste.lerPermissao.mockReset();
    ultimasProps = null;
  },
};

export function useCameraPermissions() {
  const [permissao, setPermissao] = useState(cameraDeTeste.permissao);
  const pedir = useCallback(async () => {
    cameraDeTeste.pedirPermissao();
    cameraDeTeste.permissao = cameraDeTeste.respostaAoPedir;
    setPermissao(cameraDeTeste.permissao);
    return cameraDeTeste.permissao;
  }, []);
  const ler = useCallback(async () => {
    cameraDeTeste.lerPermissao();
    setPermissao(cameraDeTeste.permissao);
    return cameraDeTeste.permissao;
  }, []);
  return [permissao, pedir, ler] as const;
}

export const CameraView = forwardRef<{ takePictureAsync: unknown }, PropsDaCamera>(
  function CameraView(props, ref) {
    useImperativeHandle(ref, () => ({ takePictureAsync: cameraDeTeste.takePictureAsync }));
    useEffect(() => {
      ultimasProps = props;
    });
    useEffect(() => {
      if (cameraDeTeste.erroAoMontar) props.onMountError?.({ message: cameraDeTeste.erroAoMontar });
      else if (cameraDeTeste.prontaAoMontar) props.onCameraReady?.();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- só na montagem, como a câmera real
    }, []);
    return <View testID="camera-view" />;
  },
);
```

E em `jest.setup.js`, ao final:

```js
jest.mock('expo-camera', () => jest.requireActual('./src/test-support/mocks/expoCamera'));
```

- [ ] **Step 2: Escrever os testes que falham**

`src/presentation/__tests__/CameraModal.test.tsx`:

```tsx
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AppState, Linking } from 'react-native';

import { cameraDeTeste, permissoes } from '../../test-support/mocks/expoCamera';
import { CameraModal } from '../components/camera/CameraModal';

function montar() {
  const onResultado = jest.fn();
  const resultado = render(<CameraModal visivel onResultado={onResultado} />);
  return { onResultado, resultado };
}

describe('CameraModal', () => {
  let aoMudarAppState: ((estado: string) => void) | null;

  beforeEach(() => {
    cameraDeTeste.reiniciar();
    aoMudarAppState = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_tipo, handler) => {
      aoMudarAppState = handler as (estado: string) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('invisível não monta a câmera', async () => {
    await render(<CameraModal visivel={false} onResultado={jest.fn()} />);
    expect(screen.queryByTestId('camera-view')).toBeNull();
  });

  it('enquanto a permissão carrega, mostra espera e permite cancelar', async () => {
    cameraDeTeste.permissao = null;
    const { onResultado } = montar();
    await screen.findByTestId('camera-carregando');

    await fireEvent.press(screen.getByTestId('botao-cancelar-camera'));
    expect(onResultado).toHaveBeenCalledWith({ tipo: 'cancelado' });
  });

  it('permissão indeterminada: explica e pede; concedida abre a câmera', async () => {
    cameraDeTeste.permissao = permissoes.indeterminada;
    montar();
    await screen.findByTestId('camera-sem-permissao');

    await fireEvent.press(screen.getByTestId('botao-permitir-camera'));

    expect(cameraDeTeste.pedirPermissao).toHaveBeenCalledTimes(1);
    await screen.findByTestId('camera-view');
  });

  it('voltar sem ter decidido a permissão é cancelamento', async () => {
    cameraDeTeste.permissao = permissoes.indeterminada;
    const { onResultado } = montar();
    await fireEvent.press(await screen.findByTestId('botao-voltar-camera'));
    expect(onResultado).toHaveBeenCalledWith({ tipo: 'cancelado' });
  });

  it('voltar com a permissão negada devolve negado', async () => {
    cameraDeTeste.permissao = permissoes.negada;
    const { onResultado } = montar();
    await fireEvent.press(await screen.findByTestId('botao-voltar-camera'));
    expect(onResultado).toHaveBeenCalledWith({ tipo: 'negado' });
  });

  it('negada para sempre: oferece abrir configurações e relê a permissão na volta', async () => {
    cameraDeTeste.permissao = permissoes.negadaParaSempre;
    const abrir = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    montar();
    expect(screen.queryByTestId('botao-permitir-camera')).toBeNull();

    await fireEvent.press(await screen.findByTestId('botao-abrir-configuracoes'));
    expect(abrir).toHaveBeenCalledTimes(1);

    cameraDeTeste.permissao = permissoes.concedida;
    await act(async () => aoMudarAppState?.('active'));

    expect(cameraDeTeste.lerPermissao).toHaveBeenCalled();
    await screen.findByTestId('camera-view');
  });

  it('botão de captura só habilita depois de onCameraReady', async () => {
    cameraDeTeste.prontaAoMontar = false;
    montar();
    const botao = await screen.findByTestId('botao-capturar');
    expect(botao.props.accessibilityState.disabled).toBe(true);

    await act(async () => cameraDeTeste.ficarPronta());

    expect(screen.getByTestId('botao-capturar').props.accessibilityState.disabled).toBe(false);
  });

  it('captura → revisão → refazer → captura → usar devolve a foto com dimensões', async () => {
    const { onResultado } = montar();
    await fireEvent.press(await screen.findByTestId('botao-capturar'));
    await screen.findByTestId('camera-preview');
    expect(cameraDeTeste.takePictureAsync).toHaveBeenCalledWith({ quality: 1 });

    await fireEvent.press(screen.getByTestId('botao-refazer-foto'));
    await screen.findByTestId('camera-view');

    cameraDeTeste.proximaFoto = { uri: 'file:///cache/Camera/segunda.jpg', width: 3000, height: 4000, format: 'jpg' };
    await fireEvent.press(screen.getByTestId('botao-capturar'));
    await fireEvent.press(await screen.findByTestId('botao-usar-foto'));

    expect(onResultado).toHaveBeenCalledTimes(1);
    expect(onResultado).toHaveBeenCalledWith({
      tipo: 'foto',
      uri: 'file:///cache/Camera/segunda.jpg',
      largura: 3000,
      altura: 4000,
    });
  });

  it('falha ao tirar a foto mostra o erro e continua na câmera', async () => {
    cameraDeTeste.takePictureAsync.mockRejectedValueOnce(new Error('sensor ocupado'));
    montar();
    await fireEvent.press(await screen.findByTestId('botao-capturar'));

    await waitFor(() => expect(screen.getByTestId('camera-erro')).toHaveTextContent(/sensor ocupado/));
    expect(screen.getByTestId('camera-view')).toBeTruthy();
  });

  it('erro ao montar a câmera aparece e cancelar continua funcionando', async () => {
    cameraDeTeste.erroAoMontar = 'Câmera em uso por outro app';
    const { onResultado } = montar();

    await waitFor(() => expect(screen.getByTestId('camera-erro')).toHaveTextContent(/outro app/));
    expect(screen.getByTestId('botao-capturar').props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('botao-cancelar-camera'));
    expect(onResultado).toHaveBeenCalledWith({ tipo: 'cancelado' });
  });

  it('botão voltar do Android cancela', async () => {
    const { onResultado } = montar();
    await screen.findByTestId('camera-view');

    // RNTL 14 não tem mais UNSAFE_getByType: o Modal recebe testID e o evento é disparado nele.
    await fireEvent(screen.getByTestId('camera-modal'), 'requestClose');

    expect(onResultado).toHaveBeenCalledWith({ tipo: 'cancelado' });
  });
});
```

`src/presentation/__tests__/CameraHost.test.tsx`:

```tsx
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { ExpoCameraGateway } from '../../infrastructure/device/camera/ExpoCameraGateway';
import { cameraDeTeste } from '../../test-support/mocks/expoCamera';
import { CameraHost } from '../components/camera/CameraHost';

function setup() {
  const destino = { armazenar: jest.fn(async () => 'fotos/aceita.jpg') };
  const gateway = new ExpoCameraGateway(destino);
  return { destino, gateway };
}

describe('CameraHost', () => {
  beforeEach(() => cameraDeTeste.reiniciar());

  it('sem ponte não registra nada e não quebra', async () => {
    await render(<CameraHost />);
    expect(screen.queryByTestId('camera-view')).toBeNull();
  });

  it('capture() abre o modal e "Usar foto" entrega a foto ao armazenamento', async () => {
    const { gateway, destino } = setup();
    await render(<CameraHost ponte={gateway} />);
    expect(screen.queryByTestId('camera-view')).toBeNull();

    let captura!: Promise<string | null>;
    await act(async () => {
      captura = gateway.capture();
    });
    await fireEvent.press(await screen.findByTestId('botao-capturar'));
    await fireEvent.press(await screen.findByTestId('botao-usar-foto'));

    await expect(captura).resolves.toBe('fotos/aceita.jpg');
    expect(destino.armazenar).toHaveBeenCalledWith({
      uri: 'file:///cache/Camera/foto.jpg',
      largura: 4000,
      altura: 3000,
    });
    await waitFor(() => expect(screen.queryByTestId('camera-view')).toBeNull());
  });

  it('cancelar devolve null e fecha o modal', async () => {
    const { gateway } = setup();
    await render(<CameraHost ponte={gateway} />);

    let captura!: Promise<string | null>;
    await act(async () => {
      captura = gateway.capture();
    });
    await fireEvent.press(await screen.findByTestId('botao-cancelar-camera'));

    await expect(captura).resolves.toBeNull();
    await waitFor(() => expect(screen.queryByTestId('camera-view')).toBeNull());
  });

  it('desmontar no meio da captura termina a Promise como cancelamento', async () => {
    const { gateway } = setup();
    const { unmount } = await render(<CameraHost ponte={gateway} />);

    let captura!: Promise<string | null>;
    await act(async () => {
      captura = gateway.capture();
    });
    await screen.findByTestId('camera-view');
    await act(async () => unmount());

    await expect(captura).resolves.toBeNull();
    await expect(gateway.capture()).rejects.toThrow(/indisponível/);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx jest CameraModal CameraHost`
Expected: FAIL com `Cannot find module '../components/camera/CameraModal'`.

- [ ] **Step 4: Implementar o `CameraModal`**

`src/presentation/components/camera/CameraModal.tsx`:

```tsx
import { CameraView, PermissionStatus, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, textStyles } from '@/constants/theme';
import type { ResultadoDaCamera } from '@/main/factories/ProviderBag';
import { ActionButton } from '@/presentation/components/ActionButton';
import { createThemedStyles, useDesignTheme } from '@/presentation/hooks/useDesignTheme';
import { useUIStyles } from '@/presentation/styles/uiStyles';

interface FotoEmRevisao {
  uri: string;
  largura: number;
  altura: number;
}

/** Modal da câmera: permissão em três estados, captura e revisão (Refazer / Usar foto). */
export function CameraModal({
  visivel,
  onResultado,
}: {
  visivel: boolean;
  onResultado(resultado: ResultadoDaCamera): void;
}) {
  return (
    <Modal testID="camera-modal" visible={visivel} animationType="slide"
      onRequestClose={() => onResultado({ tipo: 'cancelado' })}>
      {visivel ? <ConteudoDaCamera onResultado={onResultado} /> : null}
    </Modal>
  );
}

function ConteudoDaCamera({ onResultado }: { onResultado(resultado: ResultadoDaCamera): void }) {
  const uiStyles = useUIStyles();
  const styles = useStyles();
  const { colors } = useDesignTheme();
  const [permissao, pedirPermissao, lerPermissao] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [pronta, setPronta] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [foto, setFoto] = useState<FotoEmRevisao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Ao voltar das configurações do aparelho, relê a permissão.
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void lerPermissao();
    });
    return () => assinatura.remove();
  }, [lerPermissao]);

  async function capturar() {
    if (!camera.current || !pronta || capturando) return;
    setCapturando(true);
    setErro(null);
    try {
      const resultado = await camera.current.takePictureAsync({ quality: 1 });
      if (resultado) setFoto({ uri: resultado.uri, largura: resultado.width, altura: resultado.height });
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível tirar a foto');
    } finally {
      setCapturando(false);
    }
  }

  function refazer() {
    setFoto(null);
    setPronta(false);
  }

  const cancelar = () => onResultado({ tipo: 'cancelado' });

  if (!permissao) {
    return (
      <SafeAreaView style={[uiStyles.screen, styles.centro]}>
        <View testID="camera-carregando" style={styles.centro}>
          <ActivityIndicator color={colors.text} accessibilityLabel="Verificando a permissão da câmera" />
          <ActionButton label="botao-cancelar-camera" title="Cancelar" appearance="secondary" onPress={cancelar} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permissao.granted) {
    return (
      <SafeAreaView style={[uiStyles.screen, styles.centro]}>
        <View testID="camera-sem-permissao" style={styles.centro}>
          <Text accessibilityRole="header" style={uiStyles.title}>Permissão da câmera</Text>
          <Text style={uiStyles.body}>
            {permissao.canAskAgain
              ? 'Para tirar a foto, o ate precisa usar a câmera. A foto fica guardada no aparelho.'
              : 'A câmera está bloqueada para o ate. Abra as configurações do aparelho, permita a câmera e volte aqui.'}
          </Text>
          {permissao.canAskAgain ? (
            <ActionButton label="botao-permitir-camera" title="Permitir câmera" icon="camera"
              appearance="primary" onPress={() => void pedirPermissao()} />
          ) : (
            <ActionButton label="botao-abrir-configuracoes" title="Abrir configurações"
              appearance="primary" onPress={() => void Linking.openSettings()} />
          )}
          <ActionButton label="botao-voltar-camera" title="Voltar" appearance="secondary"
            onPress={() =>
              onResultado(permissao.status === PermissionStatus.DENIED ? { tipo: 'negado' } : { tipo: 'cancelado' })
            } />
        </View>
      </SafeAreaView>
    );
  }

  if (foto) {
    return (
      <SafeAreaView style={styles.tela}>
        <View testID="camera-preview" style={styles.visor}>
          <Image source={{ uri: foto.uri }} style={styles.visor} contentFit="contain" accessibilityLabel="Foto tirada" />
        </View>
        <View style={styles.barra}>
          <ActionButton label="botao-refazer-foto" title="Refazer" appearance="secondary" onPress={refazer} />
          <ActionButton label="botao-usar-foto" title="Usar foto" icon="check" appearance="primary"
            onPress={() => onResultado({ tipo: 'foto', ...foto })} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <CameraView ref={camera} style={styles.visor} facing="back"
        onCameraReady={() => setPronta(true)} onMountError={(evento) => setErro(evento.message)} />
      {erro ? (
        <Text testID="camera-erro" accessibilityLiveRegion="polite" style={styles.erro}>{erro}</Text>
      ) : null}
      <View style={styles.barra}>
        <ActionButton label="botao-cancelar-camera" title="Cancelar" appearance="secondary" onPress={cancelar} />
        <ActionButton label="botao-capturar" title={capturando ? 'Capturando...' : 'Tirar foto'} icon="camera"
          appearance="primary" disabled={!pronta || capturando} busy={capturando} onPress={() => void capturar()} />
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  tela: { flex: 1, backgroundColor: colors.background },
  visor: { flex: 1 },
  centro: { flexGrow: 1, justifyContent: 'center' as const, padding: spacing.x6, gap: spacing.x4 },
  barra: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.x3,
    padding: spacing.x4,
    backgroundColor: colors.surface,
  },
  erro: { ...textStyles.body, color: colors.error, backgroundColor: colors.errorSurface, padding: spacing.x3 },
}));
```

- [ ] **Step 5: Implementar o `CameraHost`**

`src/presentation/components/camera/CameraHost.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';

import type { PonteDaCamera, ResultadoDaCamera } from '@/main/factories/ProviderBag';
import { CameraModal } from './CameraModal';

/**
 * Montado uma vez no AppProviders. Ensina o gateway a abrir o modal da câmera e resolve a
 * Promise do capture() quando o modal fecha. Se desmontar no meio, a captura vira cancelamento.
 */
export function CameraHost({ ponte }: { ponte?: PonteDaCamera }) {
  const resolver = useRef<((resultado: ResultadoDaCamera) => void) | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (!ponte) return;
    const remover = ponte.registrarAbridor(
      () =>
        new Promise<ResultadoDaCamera>((resolve) => {
          resolver.current = resolve;
          setVisivel(true);
        }),
    );
    return () => {
      remover();
      resolver.current?.({ tipo: 'cancelado' });
      resolver.current = null;
    };
  }, [ponte]);

  function concluir(resultado: ResultadoDaCamera) {
    const resolve = resolver.current;
    resolver.current = null;
    setVisivel(false);
    resolve?.(resultado);
  }

  return <CameraModal visivel={visivel} onResultado={concluir} />;
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx jest CameraModal CameraHost`
Expected: PASS (11 + 4 testes).

Se o `tsc` reclamar do tipo do `ref` ou de `takePictureAsync`, conferir em `node_modules/expo-camera/build/CameraView.d.ts`: `takePictureAsync(options?: CameraPictureOptions): Promise<CameraCapturedPicture>` (o overload com `pictureRef: true` devolve `PictureRef`; não usar). Se o lint acusar `react-hooks/set-state-in-effect` no `CameraHost`, mover o `setVisivel(true)` para dentro de um `queueMicrotask(() => setVisivel(true))` no executor da Promise; não desligar a regra.

- [ ] **Step 7: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint
git add jest.setup.js src/test-support/mocks/expoCamera.tsx src/presentation
git commit -m "feat(presentation): modal da câmera com permissão, captura e revisão"
```

---

### Task 6: Composition root e `AppProviders`

**Files:**
- Modify: `src/main/factories/ProviderBag.ts`, `src/main/factories/makeSqliteProviders.ts`, `src/presentation/hooks/AppProviders.tsx`
- Test: `src/main/factories/__tests__/makeSqliteProviders.test.ts` (acrescentar casos), `src/presentation/__tests__/AppProvidersCamera.test.tsx` (novo)

**Interfaces:**
- Consumes: `ArmazenamentoDeFotos` (Tarefas 1 e 2), `ExpoCameraGateway`, `PonteDaCamera` (Tarefa 4), `CameraHost` (Tarefa 5).
- Produces: na `ProviderBag`, `ponteDaCamera?: PonteDaCamera` e `aoIniciar?(): Promise<void>`; `makeSqliteProviders` com `gateways.camera` = `ExpoCameraGateway`, `ponteDaCamera` = o mesmo objeto e `aoIniciar` = limpeza de órfãs; `AppProviders` monta o `CameraHost` e chama `aoIniciar` uma vez por bag.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/main/factories/__tests__/makeSqliteProviders.test.ts`, acrescentar os imports:

```ts
import { ExpoCameraGateway } from '../../../infrastructure/device/camera/ExpoCameraGateway';
import { fotos } from '../../../infrastructure/database/sqlite/schema';
import { fsDeTeste } from '../../../test-support/mocks/expoFileSystem';
```

(juntar `fotos` ao import existente de `schema`) e, dentro do `describe`, os casos:

```ts
  it('usa a câmera real e expõe a mesma instância como ponte para a UI', () => {
    expect(bag.gateways.camera).toBeInstanceOf(ExpoCameraGateway);
    expect(bag.ponteDaCamera).toBe(bag.gateways.camera);
  });

  it('aoIniciar remove fotos órfãs antigas', async () => {
    fsDeTeste.limpar();
    await db.insert(fotos).values({
      id: 'f1',
      caminhoLocal: 'fotos/f1.jpg',
      hash: 'h',
      criadoEmLocal: '2020-01-01T00:00:00.000Z',
    });
    fsDeTeste.escrever('file:///docs/fotos/f1.jpg', 'x', 0);

    await bag.aoIniciar();

    expect(await db.select().from(fotos)).toEqual([]);
    expect(fsDeTeste.existe('file:///docs/fotos/f1.jpg')).toBe(false);
  });
```

`src/presentation/__tests__/AppProvidersCamera.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { ExpoCameraGateway } from '../../infrastructure/device/camera/ExpoCameraGateway';
import { makeFakeProviders } from '../../main/factories/makeFakeProviders';
import { cameraDeTeste } from '../../test-support/mocks/expoCamera';
import { AppProviders } from '../hooks/AppProviders';

describe('AppProviders e câmera', () => {
  beforeEach(() => cameraDeTeste.reiniciar());

  it('chama aoIniciar uma vez na montagem', async () => {
    const aoIniciar = jest.fn(async () => {});
    const providers = { ...makeFakeProviders(), aoIniciar };

    const { rerender } = await render(<AppProviders providers={providers}><Text>app</Text></AppProviders>);
    await rerender(<AppProviders providers={providers}><Text>app</Text></AppProviders>);

    expect(aoIniciar).toHaveBeenCalledTimes(1);
  });

  it('falha no aoIniciar não derruba o app', async () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const providers = { ...makeFakeProviders(), aoIniciar: jest.fn(async () => { throw new Error('disco'); }) };

    await render(<AppProviders providers={providers}><Text>app</Text></AppProviders>);

    expect(await screen.findByText('app')).toBeTruthy();
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });

  it('monta o CameraHost: a ponte da bag abre o modal da câmera', async () => {
    const camera = new ExpoCameraGateway({ armazenar: async () => 'fotos/x.jpg' });
    const providers = { ...makeFakeProviders(), ponteDaCamera: camera };
    await render(<AppProviders providers={providers}><Text>app</Text></AppProviders>);

    await act(async () => {
      void camera.capture();
    });

    expect(await screen.findByTestId('camera-view')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest makeSqliteProviders AppProvidersCamera`
Expected: FAIL (`gateways.camera` ainda é `FakeCameraGateway`; `aoIniciar` não é chamado; `camera-view` não aparece).

- [ ] **Step 3: Acrescentar os campos na `ProviderBag`**

Em `src/main/factories/ProviderBag.ts`, dentro de `interface ProviderBag`, depois de `registrarSessao?`:

```ts
  /** Ponte para a UI abrir a câmera real (ausente na bag fake, que usa FakeCameraGateway). */
  ponteDaCamera?: PonteDaCamera;
  /** Manutenção na abertura do app (ex.: limpar fotos órfãs). Falha não impede o uso. */
  aoIniciar?(): Promise<void>;
```

- [ ] **Step 4: Ligar a câmera real no `makeSqliteProviders`**

Em `src/main/factories/makeSqliteProviders.ts`:

1. Trocar o import do `FakeCameraGateway` por:

```ts
import { ExpoCameraGateway } from '../../infrastructure/device/camera/ExpoCameraGateway';
import { ArmazenamentoDeFotos } from '../../infrastructure/fileSystem/ArmazenamentoDeFotos';
```

2. Trocar `const camera = new FakeCameraGateway();` por:

```ts
  const armazenamentoDeFotos = new ArmazenamentoDeFotos(
    db,
    ids,
    undefined,
    __DEV__ ? (mensagem) => console.log(mensagem) : undefined,
  );
  const camera = new ExpoCameraGateway(armazenamentoDeFotos);
```

3. No objeto `bag`, depois de `useCases,`:

```ts
    ponteDaCamera: camera,
    async aoIniciar(): Promise<void> {
      await armazenamentoDeFotos.limparOrfas();
    },
```

4. Atualizar o comentário da função: "Auth (Plano 3) e GPS (Plano 5) ainda são fakes; câmera e fotos são reais (Plano 2)."

- [ ] **Step 5: Montar o `CameraHost` e chamar `aoIniciar` no `AppProviders`**

Em `src/presentation/hooks/AppProviders.tsx`:

1. Import:

```tsx
import { CameraHost } from '../components/camera/CameraHost';
```

2. Substituir a função `AppProviders` por:

```tsx
export function AppProviders({
  providers,
  children,
}: React.PropsWithChildren<{ providers: ProviderBag }>) {
  // Manutenção na abertura (ex.: fotos órfãs). Falha só é registrada: o app segue utilizável.
  useEffect(() => {
    providers.aoIniciar?.().catch((erro: unknown) => {
      console.warn('Falha na manutenção inicial', erro);
    });
  }, [providers]);

  return (
    <ServicesContext.Provider value={providers}>
      <AuthProvider providers={providers}>
        <DataProvider providers={providers}>
          <NetworkProvider>
            <PedidoDraftProvider>
              {children}
              <CameraHost ponte={providers.ponteDaCamera} />
            </PedidoDraftProvider>
          </NetworkProvider>
        </DataProvider>
      </AuthProvider>
    </ServicesContext.Provider>
  );
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx jest makeSqliteProviders AppProvidersCamera RouterGuards`
Expected: PASS. O `RouterGuards` monta o layout raiz real: agora ele constrói o `ExpoCameraGateway` e roda a limpeza no banco em memória, com os dublês globais.

- [ ] **Step 7: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint && npm run db:check
git add src/main src/presentation/hooks/AppProviders.tsx src/presentation/__tests__/AppProvidersCamera.test.tsx
git commit -m "feat(main): câmera real no runtime e limpeza de fotos órfãs na abertura"
```

---

### Task 7: Foto de catálogo na Nova Obra

**Files:**
- Modify: `src/app/obra/nova.tsx`
- Modify: `src/presentation/__tests__/TelaEstoque.test.tsx:180-184`, `src/presentation/__tests__/StockSections.test.tsx` (as duas asserções `toHaveBeenCalledWith` de `save`)
- Test: `src/presentation/__tests__/FotoCatalogo.test.tsx`

**Interfaces:**
- Consumes: `services.gateways.camera.capture()`; `ArtworkThumbnail({ photoPath, testID })` (Tarefa 3); `CadastrarObraUseCase.execute({ ..., fotoPath })` (já aceita `fotoPath`).
- Produces: `TelaNovaObra({ onSalvar?, onConcluido?, onCapturarFoto?(): Promise<string | null> })`; `NovaObraInput` ganha `fotoPath: string | null`; testIDs `botao-foto-catalogo`, `botao-remover-foto-catalogo`, `miniatura-foto-catalogo`.

- [ ] **Step 1: Escrever o teste que falha**

`src/presentation/__tests__/FotoCatalogo.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import TelaNovaObra from '../../app/obra/nova';
import { makeFakeProviders } from '../../main/factories/makeFakeProviders';
import { AppProviders } from '../hooks/AppProviders';

function uriDaImagem(testID: string): string {
  return [screen.getByTestId(testID).props.source].flat()[0].uri;
}

async function preencherObraUnica() {
  await fireEvent.changeText(screen.getByTestId('campo-nome-obra'), 'Garça');
}

describe('foto de catálogo na Nova Obra', () => {
  it('sem foto salva com fotoPath null', async () => {
    const onSalvar = jest.fn(async () => {});
    await render(<TelaNovaObra onSalvar={onSalvar} onCapturarFoto={jest.fn()} />);
    await preencherObraUnica();

    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));

    expect(onSalvar).toHaveBeenCalledWith({ nome: 'Garça', tipo: 'UNICA', quantidade: 1, fotoPath: null });
  });

  it('foto tirada aparece na miniatura e vai junto ao salvar', async () => {
    const onSalvar = jest.fn(async () => {});
    await render(
      <TelaNovaObra onSalvar={onSalvar} onCapturarFoto={async () => 'fotos/garca.jpg'} />,
    );
    await preencherObraUnica();

    await fireEvent.press(screen.getByTestId('botao-foto-catalogo'));

    await waitFor(() =>
      expect(uriDaImagem('miniatura-foto-catalogo')).toBe('file:///docs/fotos/garca.jpg'),
    );
    expect(screen.getByTestId('botao-foto-catalogo')).toHaveTextContent('Tirar outra foto');
    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ fotoPath: 'fotos/garca.jpg' }));
  });

  it('cancelar a câmera não muda nada', async () => {
    const onSalvar = jest.fn(async () => {});
    await render(<TelaNovaObra onSalvar={onSalvar} onCapturarFoto={async () => null} />);
    await preencherObraUnica();

    await fireEvent.press(screen.getByTestId('botao-foto-catalogo'));
    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));

    expect(screen.queryByTestId('miniatura-foto-catalogo')).toBeNull();
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ fotoPath: null }));
  });

  it('remover a foto volta a salvar sem foto', async () => {
    const onSalvar = jest.fn(async () => {});
    await render(<TelaNovaObra onSalvar={onSalvar} onCapturarFoto={async () => 'fotos/garca.jpg'} />);
    await preencherObraUnica();
    await fireEvent.press(screen.getByTestId('botao-foto-catalogo'));
    await screen.findByTestId('miniatura-foto-catalogo');

    await fireEvent.press(screen.getByTestId('botao-remover-foto-catalogo'));
    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));

    expect(screen.queryByTestId('miniatura-foto-catalogo')).toBeNull();
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ fotoPath: null }));
  });

  it('permissão negada mostra a instrução e a obra ainda pode ser salva sem foto', async () => {
    const onSalvar = jest.fn(async () => {});
    await render(
      <TelaNovaObra
        onSalvar={onSalvar}
        onCapturarFoto={async () => {
          throw new Error('Permissão de câmera negada. Habilite a câmera nas configurações do aparelho para tirar a foto.');
        }}
      />,
    );
    await preencherObraUnica();

    await fireEvent.press(screen.getByTestId('botao-foto-catalogo'));
    await waitFor(() => expect(screen.getByTestId('erro-obra')).toHaveTextContent(/configurações/));

    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));
    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ fotoPath: null }));
  });

  it('integração: usa a câmera da bag e grava o caminho na obra', async () => {
    const providers = makeFakeProviders();
    await render(
      <AppProviders providers={providers}>
        <TelaNovaObra onConcluido={jest.fn()} />
      </AppProviders>,
    );
    await preencherObraUnica();

    await fireEvent.press(screen.getByTestId('botao-foto-catalogo'));
    await screen.findByTestId('miniatura-foto-catalogo');
    await fireEvent.press(screen.getByTestId('botao-salvar-obra'));

    await waitFor(async () => {
      const obras = await providers.repositories.obras.findByUsuario(providers.usuarioId);
      expect(obras.find((obra) => obra.nome === 'Garça')?.fotoPath).toBe('/tmp/foto-fake.jpg');
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx jest FotoCatalogo`
Expected: FAIL com `Unable to find an element with testID: botao-foto-catalogo`.

- [ ] **Step 3: Implementar na tela**

Em `src/app/obra/nova.tsx`:

1. Import:

```tsx
import { ArtworkThumbnail } from '@/presentation/components/ArtworkThumbnail';
```

2. `NovaObraInput` e props:

```tsx
interface NovaObraInput {
  nome: string;
  tipo: TipoObra;
  quantidade: number;
  fotoPath: string | null;
}

export default function TelaNovaObra({
  onSalvar,
  onConcluido,
  onCapturarFoto,
}: {
  onSalvar?(args: NovaObraInput): Promise<void>;
  onConcluido?(): void;
  onCapturarFoto?(): Promise<string | null>;
} = {}) {
```

3. Estados novos, junto dos outros `useState`:

```tsx
  const [fotoPath, setFotoPath] = useState<string | null>(null);
  const [capturando, setCapturando] = useState(false);
```

4. Função nova, antes de `salvar`:

```tsx
  async function adicionarFoto() {
    if (capturando || loading) return;
    setCapturando(true);
    setErro(null);
    try {
      const caminho = onCapturarFoto
        ? await onCapturarFoto()
        : await services?.gateways.camera.capture();
      if (caminho === undefined) throw new Error('Câmera indisponível');
      if (caminho) setFotoPath(caminho);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível tirar a foto');
    } finally {
      setCapturando(false);
    }
  }
```

5. Em `salvar`, o `input` passa a ser:

```tsx
    const input: NovaObraInput = {
      nome: nomeLimpo,
      tipo: tipoNormalizado,
      quantidade,
      fotoPath,
    };
```

e `if (submitting.current) return;` vira `if (submitting.current || capturando) return;`.

6. No JSX, entre o bloco da quantidade (`) : null}`) e o bloco `{erro ? (`:

```tsx
      <View style={uiStyles.field}>
        <Text style={uiStyles.label}>Foto de catálogo (opcional)</Text>
        {fotoPath ? <ArtworkThumbnail photoPath={fotoPath} testID="miniatura-foto-catalogo" /> : null}
        <ActionButton
          label="botao-foto-catalogo"
          title={capturando ? 'Abrindo câmera...' : fotoPath ? 'Tirar outra foto' : 'Adicionar foto de catálogo'}
          icon="camera"
          appearance="secondary"
          disabled={loading || capturando}
          busy={capturando}
          onPress={() => void adicionarFoto()}
        />
        {fotoPath ? (
          <ActionButton
            label="botao-remover-foto-catalogo"
            title="Remover foto"
            appearance="quiet"
            disabled={loading || capturando}
            onPress={() => setFotoPath(null)}
          />
        ) : null}
      </View>
```

7. O botão de salvar fica `disabled={loading || capturando}`.

- [ ] **Step 4: Atualizar as asserções exatas existentes**

- `src/presentation/__tests__/TelaEstoque.test.tsx` (linhas 180-184): acrescentar `fotoPath: null,` ao objeto esperado.
- `src/presentation/__tests__/StockSections.test.tsx`: `{ nome: 'Nova peça', tipo: 'UNICA', quantidade: 1 }` → `{ nome: 'Nova peça', tipo: 'UNICA', quantidade: 1, fotoPath: null }` e `{ nome: 'Série de teste', tipo: 'SERIE', quantidade: 5 }` → `{ nome: 'Série de teste', tipo: 'SERIE', quantidade: 5, fotoPath: null }`.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx jest FotoCatalogo TelaEstoque StockSections RouterGuards`
Expected: PASS.

- [ ] **Step 6: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/app/obra/nova.tsx src/presentation/__tests__
git commit -m "feat(app): foto de catálogo opcional na nova obra"
```

---

### Task 8: Smoke test no aparelho (checkpoint) e registro

**Files:**
- Create/Modify: `docs/ate-fase3.md` (seção "Plano 2")

- [ ] **Step 1: Checkpoint com o usuário — smoke test no Expo Go**

Parar e pedir ao usuário para rodar `npx expo start` e seguir no celular (com `__DEV__`, o terminal do Expo mostra `[fotos] fotos/<uuid>.jpg salva com N KB` a cada foto aceita):

1. Concluir um pedido em Fazendo: o pedido de permissão aparece (texto do Expo Go); conceder; a câmera abre; "Tirar foto" fica habilitado; tirar, **Refazer**, tirar de novo, **Usar foto**. O pedido vai para Feito com a miniatura.
2. O log mostra **centenas de KB**, não MB.
3. Fechar o app pelos recentes e reabrir: a miniatura continua aparecendo.
4. Concluir outro pedido e tocar em **Cancelar** e depois no **voltar do Android**: o pedido não conclui e aparece "Foto obrigatória para concluir o pedido."
5. Revogar a câmera do Expo Go nas configurações do aparelho, tentar concluir: aparece a explicação com **Abrir configurações**; voltar sem permitir mostra a instrução e o pedido não conclui. Permitir nas configurações e voltar ao app: a câmera aparece sem fechar o modal.
6. **Modo avião**: concluir pedido com foto funciona igual.
7. Nova obra com **Adicionar foto de catálogo**: a miniatura aparece no formulário e depois no Estoque. Testar também **Remover foto**.
8. Tocar duas vezes rápido em "Concluir com foto": só uma câmera abre.

Registrar o resultado informado pelo usuário. Se algo falhar, corrigir na tarefa dona do código (com teste que reproduza a falha) antes de seguir.

- [ ] **Step 2: Registrar em `docs/ate-fase3.md`**

Acrescentar ao final do arquivo:

```markdown
## Plano 2 — Câmera real e pipeline de imagens

Concluído em <data>. A foto de conclusão do pedido (RF05, UC05/UC06, RNF11) e a foto opcional de catálogo da obra (RF09, UC12) agora vêm da câmera de verdade, comprimidas e guardadas no aparelho, com uma linha em `fotos` pronta para o upload do Plano 4.

### Arquitetura entregue

- `infrastructure/fileSystem/ArmazenamentoDeFotos.ts`: reduz o maior lado para 1600 px, comprime em JPEG 0,7 (`expo-image-manipulator`, API `manipulate`/`renderAsync`/`saveAsync`), move para `<documentos>/fotos/<uuid>.jpg` (`expo-file-system`, API `File`/`Directory`/`Paths`), calcula o SHA-256 (`expo-crypto`) e grava a linha em `fotos` (`PENDENTE_UPLOAD`). Devolve o caminho relativo. Na abertura do app, remove fotos órfãs com mais de 24 h.
- `infrastructure/device/camera/ExpoCameraGateway.ts`: implementa `ICameraGateway` (contrato inalterado) por meio de uma ponte registrada pela UI. Cancelar → `null`; permissão negada → erro com instrução; segunda captura simultânea → erro.
- `presentation/components/camera/CameraModal.tsx` e `CameraHost.tsx`: permissão em três estados (com "Abrir configurações" quando não dá mais para pedir), câmera montada só com o modal aberto, captura habilitada só após `onCameraReady`, revisão com Refazer e Usar foto.
- `presentation/utils/fotos.ts`: `resolverUriDaFoto` resolve o caminho relativo no momento de exibir. Miniatura da foto de conclusão nos pedidos Feitos.
- Nova obra: botão opcional "Adicionar foto de catálogo" (fecha a divergência RF09 sem UI da fase 2).

### Decisões e divergências

| # | Decisão | Motivo |
|---|---|---|
| 1 | Sem galeria (D2): as duas fotos só pela câmera | Simplicidade; a foto de conclusão precisa ser tirada na hora (RNF11) |
| 2 | Caminho relativo `fotos/<uuid>.jpg` no banco | O caminho absoluto muda entre builds e reinstalações |
| 3 | A ponte UI → gateway é tipo de infraestrutura, não porta nova em `core` | Contratos de `core` inalterados |
| 4 | Foto de catálogo só na criação da obra | Não existe tela de edição de obra; trocar foto exigiria método novo no domínio |
| 5 | Limpeza de órfãs também apaga arquivos soltos em `fotos/` sem linha | App morto entre mover o arquivo e gravar a linha |
| 6 | Texto de permissão próprio só no APK | No Expo Go aparece o texto do Expo Go |

### Testes

Dublês em memória de `expo-file-system`, `expo-image-manipulator` e `expo-camera` registrados no `jest.setup.js`; `expo-crypto.digest` com SHA-256 real do Node. Cobertos: parâmetros de compressão (paisagem, retrato, imagem pequena), caminho e hash gravados, falhas no meio sem linha nem arquivo solto, limpeza de órfãs (idade, referência por pedido/obra/tombstone, `ENVIADA`, arquivo solto), resolvedor de caminho, gateway (cancelar, negar, ocupado, desregistrar), modal (três estados de permissão, configurações e volta, câmera pronta, captura/refazer/usar, erro de montagem, voltar do Android), host (desmontagem no meio), composição e foto de catálogo.

### Smoke test no aparelho (Expo Go, <data>)

<resultado informado pelo usuário, item a item>

### Pendências para os próximos planos

- Upload das fotos `PENDENTE_UPLOAD` antes do registro (storage-first) no Plano 4.
- Texto de permissão em português visível só no APK (Plano 6).
```

Substituir os marcadores `<data>` e `<resultado ...>` pelo que o usuário informar no Step 1.

- [ ] **Step 3: Baseline e commit**

```bash
npm test && npm run typecheck && npm run lint && npm run db:check
git add docs/ate-fase3.md
git commit -m "docs: registra o Plano 2 (câmera e fotos) em ate-fase3"
```

---

## Ordem de execução e checkpoints

- Tarefas 1 → 8, um commit por tarefa, baseline completo ao fim de cada uma.
- Dependências: 2 depende de 1; 3 depende de 1 (dublê do filesystem); 4 depende de 1 (`FotoCapturada`); 5 depende de 4; 6 depende de 1, 2, 4 e 5; 7 depende de 3 e 6 (integração usa o `AppProviders` com o `CameraHost`); 8 por último.
- **Checkpoint com o usuário** no Step 1 da Tarefa 8 (smoke test no aparelho).
