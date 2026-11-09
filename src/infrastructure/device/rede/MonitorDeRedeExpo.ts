import * as Network from 'expo-network';

/** Conexão do aparelho para os gatilhos do sync e o aviso de offline (RF17). */
export interface MonitorDeRede {
  estaOnline(): Promise<boolean>;
  /** Chama `ouvinte` a cada mudança; devolve a função que cancela. */
  observar(ouvinte: (online: boolean) => void): () => void;
}

/**
 * `isInternetReachable` pode vir indefinido no início; só conta como offline quando o aparelho
 * diz que não há conexão ou que a internet não é alcançável.
 */
function online(estado: { isConnected?: boolean; isInternetReachable?: boolean | null }): boolean {
  return estado.isConnected !== false && estado.isInternetReachable !== false;
}

export class MonitorDeRedeExpo implements MonitorDeRede {
  async estaOnline(): Promise<boolean> {
    try {
      return online(await Network.getNetworkStateAsync());
    } catch {
      return true;
    }
  }

  observar(ouvinte: (online: boolean) => void): () => void {
    const assinatura = Network.addNetworkStateListener((estado) => ouvinte(online(estado)));
    return () => assinatura.remove();
  }
}
