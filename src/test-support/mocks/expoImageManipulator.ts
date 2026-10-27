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
