/** Dublê do expo-network (SDK 58): estado controlado por `redeDeTeste`. */
type Estado = { isConnected?: boolean; isInternetReachable?: boolean };
type Ouvinte = (estado: Estado) => void;

let atual: Estado = { isConnected: true, isInternetReachable: true };
const ouvintes = new Set<Ouvinte>();

export async function getNetworkStateAsync(): Promise<Estado> {
  return atual;
}

export function addNetworkStateListener(ouvinte: Ouvinte): { remove(): void } {
  ouvintes.add(ouvinte);
  return { remove: () => ouvintes.delete(ouvinte) };
}

export const redeDeTeste = {
  mudar(estado: Estado): void {
    atual = estado;
    for (const ouvinte of ouvintes) ouvinte(estado);
  },
  ouvintes: (): number => ouvintes.size,
  reiniciar(): void {
    atual = { isConnected: true, isInternetReachable: true };
    ouvintes.clear();
  },
};
