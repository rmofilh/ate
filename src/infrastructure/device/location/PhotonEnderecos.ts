import type { SugestaoDeEndereco } from '../../../core/application/gateways/IGeocodingGateway';
import { Coordenada } from '../../../core/domain/value-objects/Coordenada';
import { comLimiteDeTempo } from '../../shared/limiteDeTempo';

/**
 * Photon (komoot): busca de endereços sobre o OpenStreetMap, sem chave e sem cadastro, com
 * autocomplete e geocoding reverso. Mesma linha do mapa (MapLibre + OpenFreeMap): nada de Google.
 * Uso público moderado: o app só consulta com debounce, a partir de 3 letras.
 */
export const URL_PHOTON = 'https://photon.komoot.io';
export const LIMITE_PHOTON_MS = 5_000;
export const MAXIMO_DE_SUGESTOES = 5;
const USER_AGENT = 'ate-app/1.0 (gestao para artesaos)';

const SIGLAS: Record<string, string> = {
  Acre: 'AC', Alagoas: 'AL', 'Amapá': 'AP', Amazonas: 'AM', Bahia: 'BA', 'Ceará': 'CE',
  'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO', 'Maranhão': 'MA',
  'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG', 'Pará': 'PA',
  'Paraíba': 'PB', 'Paraná': 'PR', Pernambuco: 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', Roraima: 'RR',
  'Santa Catarina': 'SC', 'São Paulo': 'SP', Sergipe: 'SE', Tocantins: 'TO',
};

interface PropriedadesPhoton {
  name?: string;
  street?: string;
  housenumber?: string;
  district?: string;
  city?: string;
  state?: string;
  countrycode?: string;
}

interface RespostaPhoton {
  features?: {
    properties?: PropriedadesPhoton;
    geometry?: { coordinates?: [number, number] };
  }[];
}

/** "Avenida Afonso Pena, 1000 – Centro, Belo Horizonte - MG" (nome do lugar na frente, se houver). */
export function rotuloDe(p: PropriedadesPhoton): string | null {
  const rua = p.street ? `${p.street}${p.housenumber ? `, ${p.housenumber}` : ''}` : null;
  const titulo = p.name && p.name !== p.street ? p.name : null;
  const uf = p.state ? (SIGLAS[p.state] ?? p.state) : null;
  const local = [p.district, p.city].filter(Boolean).join(', ');
  const regiao = local ? (uf ? `${local} - ${uf}` : local) : uf;
  const partes = [titulo, rua, regiao].filter((parte): parte is string => Boolean(parte));
  return partes.length > 0 ? partes.join(' – ') : null;
}

type Requisitar = (url: string, init: { headers: Record<string, string> }) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

export class PhotonEnderecos {
  constructor(
    private readonly requisitar: Requisitar = (url, init) => fetch(url, init),
    /** Posição para puxar as sugestões para perto do usuário (sem pedir permissão). */
    private readonly proximidade: () => Promise<Coordenada | null> = async () => null,
    private readonly limiteMs = LIMITE_PHOTON_MS,
  ) {}

  async sugerir(texto: string): Promise<SugestaoDeEndereco[]> {
    const consulta = texto.trim();
    if (consulta.length < 3) return [];
    const parametros = new URLSearchParams({ q: consulta, limit: String(MAXIMO_DE_SUGESTOES * 2) });
    const perto = await this.proximidade().catch(() => null);
    if (perto) {
      parametros.set('lat', String(perto.latitude));
      parametros.set('lon', String(perto.longitude));
    }
    const resposta = await this.pedir(`${URL_PHOTON}/api/?${parametros.toString()}`);
    const vistas = new Set<string>();
    const sugestoes: SugestaoDeEndereco[] = [];
    for (const item of resposta?.features ?? []) {
      const p = item.properties ?? {};
      const coordenadas = item.geometry?.coordinates;
      if (!coordenadas || (p.countrycode && p.countrycode !== 'BR')) continue;
      const [longitude, latitude] = coordenadas;
      const rotulo = rotuloDe(p);
      if (!rotulo || vistas.has(rotulo) || !Coordenada.validar(latitude, longitude)) continue;
      vistas.add(rotulo);
      sugestoes.push({ rotulo, coordenada: new Coordenada(latitude, longitude) });
      if (sugestoes.length === MAXIMO_DE_SUGESTOES) break;
    }
    return sugestoes;
  }

  async enderecoDe(coordenada: Coordenada): Promise<string | null> {
    const parametros = new URLSearchParams({
      lat: String(coordenada.latitude),
      lon: String(coordenada.longitude),
      limit: '1',
    });
    const resposta = await this.pedir(`${URL_PHOTON}/reverse?${parametros.toString()}`);
    const primeira = resposta?.features?.[0]?.properties;
    return primeira ? rotuloDe(primeira) : null;
  }

  /** Falha de rede, tempo esgotado ou resposta inválida viram "nada": nunca lança. */
  private async pedir(url: string): Promise<RespostaPhoton | null> {
    try {
      const resposta = await comLimiteDeTempo(
        this.requisitar(url, { headers: { 'User-Agent': USER_AGENT } }),
        this.limiteMs,
        () => new Error('Tempo esgotado'),
      );
      if (!resposta.ok) return null;
      return (await resposta.json()) as RespostaPhoton;
    } catch {
      return null;
    }
  }
}
