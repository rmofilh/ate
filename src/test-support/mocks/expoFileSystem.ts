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
