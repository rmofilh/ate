import type { ICameraGateway } from '../../core/application/gateways/ICameraGateway';

export class FakeCameraGateway implements ICameraGateway {
  constructor(
    public mode: 'granted' | 'denied' | 'cancel' = 'granted',
    public nextPath = '/tmp/foto-fake.jpg',
  ) {}

  async capture(): Promise<string | null> {
    if (this.mode === 'denied') {
      throw new Error('Permissao de camera negada - habilite nas configuracoes do dispositivo');
    }
    if (this.mode === 'cancel') return null;
    return this.nextPath;
  }
}
