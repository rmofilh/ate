import type { IIdGenerator } from '../core/application/gateways/IIdGenerator';

let proximoId = 0;

export function gerarIdTeste(): string {
  proximoId += 1;
  return `11111111-1111-4111-8111-${proximoId.toString(16).padStart(12, '0')}`;
}

export const idsTeste: IIdGenerator = { gerar: gerarIdTeste };
