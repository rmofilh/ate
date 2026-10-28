/** Dublê do expo-location (SDK 57) controlado pelos testes por `localizacaoDeTeste`. */
export const PermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  UNDETERMINED: 'undetermined',
} as const;

export const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
} as const;

interface Permissao {
  granted: boolean;
  canAskAgain: boolean;
  status: (typeof PermissionStatus)[keyof typeof PermissionStatus];
  expires: 'never';
}

export const permissoesDeLocalizacao: Record<string, Permissao> = {
  concedida: { granted: true, canAskAgain: true, status: 'granted', expires: 'never' },
  negada: { granted: false, canAskAgain: true, status: 'denied', expires: 'never' },
  negadaParaSempre: { granted: false, canAskAgain: false, status: 'denied', expires: 'never' },
};

interface Posicao {
  coords: { latitude: number; longitude: number; accuracy: number | null };
  timestamp: number;
}

const POSICAO_PADRAO: Posicao = {
  coords: { latitude: -23.5617, longitude: -46.6559, accuracy: 12 },
  timestamp: 0,
};

export const localizacaoDeTeste = {
  servicosLigados: true,
  respostaAoPedir: permissoesDeLocalizacao.concedida,
  proximaPosicao: POSICAO_PADRAO,
  hasServicesEnabledAsync: jest.fn(async (): Promise<boolean> => localizacaoDeTeste.servicosLigados),
  requestForegroundPermissionsAsync: jest.fn(
    async (): Promise<Permissao> => localizacaoDeTeste.respostaAoPedir,
  ),
  getCurrentPositionAsync: jest.fn(
    async (_opcoes?: unknown): Promise<Posicao> => localizacaoDeTeste.proximaPosicao,
  ),
  reiniciar(): void {
    localizacaoDeTeste.servicosLigados = true;
    localizacaoDeTeste.respostaAoPedir = permissoesDeLocalizacao.concedida;
    localizacaoDeTeste.proximaPosicao = POSICAO_PADRAO;
    localizacaoDeTeste.hasServicesEnabledAsync.mockReset();
    localizacaoDeTeste.hasServicesEnabledAsync.mockImplementation(
      async (): Promise<boolean> => localizacaoDeTeste.servicosLigados,
    );
    localizacaoDeTeste.requestForegroundPermissionsAsync.mockReset();
    localizacaoDeTeste.requestForegroundPermissionsAsync.mockImplementation(
      async (): Promise<Permissao> => localizacaoDeTeste.respostaAoPedir,
    );
    localizacaoDeTeste.getCurrentPositionAsync.mockReset();
    localizacaoDeTeste.getCurrentPositionAsync.mockImplementation(
      async (): Promise<Posicao> => localizacaoDeTeste.proximaPosicao,
    );
  },
};

export const hasServicesEnabledAsync = () => localizacaoDeTeste.hasServicesEnabledAsync();
export const requestForegroundPermissionsAsync = () =>
  localizacaoDeTeste.requestForegroundPermissionsAsync();
export const getCurrentPositionAsync = (opcoes?: unknown) =>
  localizacaoDeTeste.getCurrentPositionAsync(opcoes);
