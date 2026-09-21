import { CoordenadaInvalidaError } from '../errors/DomainErrors';

export class Coordenada {
  readonly latitude: number;
  readonly longitude: number;

  constructor(latitude: number, longitude: number) {
    if (!Coordenada.validar(latitude, longitude)) {
      throw new CoordenadaInvalidaError(
        `Coordenada inválida: latitude ${String(latitude)} longitude ${String(longitude)}`,
      );
    }
    this.latitude = latitude;
    this.longitude = longitude;
  }

  static validar(latitude: number, longitude: number): boolean {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }
}
