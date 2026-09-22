export interface ICameraGateway {
  capture(): Promise<string | null>;
}
