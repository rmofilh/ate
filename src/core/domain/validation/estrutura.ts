/** Checagens estruturais usadas por reidratar() (dados vindos do banco). */
export function isDataValida(valor: unknown): valor is Date {
  return valor instanceof Date && !Number.isNaN(valor.getTime());
}

export function isDataValidaOuNula(valor: unknown): valor is Date | null {
  return valor === null || isDataValida(valor);
}

export function isInteiroNaoNegativo(valor: unknown): valor is number {
  return Number.isInteger(valor) && (valor as number) >= 0;
}

export function pertenceA<T extends string>(valor: unknown, opcoes: readonly T[]): valor is T {
  return typeof valor === 'string' && (opcoes as readonly string[]).includes(valor);
}

export function copiarData(data: Date): Date {
  return new Date(data.getTime());
}

export function copiarDataOuNula(data: Date | null): Date | null {
  return data ? copiarData(data) : null;
}
