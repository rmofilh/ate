import fs from 'fs';
import path from 'path';

const RAIZ_SRC = path.resolve(__dirname, '../..');
const PROIBIDOS = [
  /^expo$/,
  /^expo-/,
  /^react$/,
  /^react-native/,
  /^drizzle-orm/,
  /^better-sqlite3$/,
  /^@supabase\//,
  /^uuid$/,
];

function arquivos(pasta: string, extensoes: RegExp): string[] {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const caminho = path.join(pasta, item.name);
    if (item.isDirectory()) return item.name === '__tests__' ? [] : arquivos(caminho, extensoes);
    return extensoes.test(item.name) ? [caminho] : [];
  });
}

function importsDe(arquivo: string): string[] {
  const codigo = fs.readFileSync(arquivo, 'utf8');
  const padroes = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  return padroes.flatMap((padrao) => [...codigo.matchAll(padrao)].map((m) => m[1]));
}

const relativo = (arquivo: string) => path.relative(RAIZ_SRC, arquivo);

describe('arquitetura', () => {
  const arquivosDoCore = arquivos(path.join(RAIZ_SRC, 'core'), /\.tsx?$/);

  it('encontra os arquivos do núcleo', () => {
    expect(arquivosDoCore.length).toBeGreaterThan(20);
  });

  it('core/ só importa caminhos relativos, sem SDK nem framework', () => {
    const violacoes = arquivosDoCore.flatMap((arquivo) =>
      importsDe(arquivo)
        .filter((alvo) => !alvo.startsWith('.') || PROIBIDOS.some((p) => p.test(alvo)))
        .map((alvo) => `${relativo(arquivo)} → ${alvo}`),
    );
    expect(violacoes).toEqual([]);
  });

  it('core/ não sai da própria pasta por import relativo', () => {
    const raizCore = path.join(RAIZ_SRC, 'core');
    const violacoes = arquivosDoCore.flatMap((arquivo) =>
      importsDe(arquivo)
        .filter((alvo) => alvo.startsWith('.'))
        .filter((alvo) => !path.resolve(path.dirname(arquivo), alvo).startsWith(raizCore))
        .map((alvo) => `${relativo(arquivo)} → ${alvo}`),
    );
    expect(violacoes).toEqual([]);
  });

  it('o runtime (src/app) não usa makeFakeProviders', () => {
    const violacoes = arquivos(path.join(RAIZ_SRC, 'app'), /\.tsx?$/)
      .filter((arquivo) => fs.readFileSync(arquivo, 'utf8').includes('makeFakeProviders'))
      .map(relativo);
    expect(violacoes).toEqual([]);
  });
});
