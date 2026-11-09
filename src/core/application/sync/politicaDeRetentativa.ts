export const ESPERA_BASE_MS = 2_000;
export const ESPERA_MAXIMA_MS = 15 * 60 * 1000;

/**
 * Backoff exponencial com jitter: min(2^n × 2 s, 15 min) × [0,5; 1,5). O relógio do aparelho
 * só agenda a próxima tentativa; nunca decide conflito (RNF04).
 */
export function proximaTentativa(
  tentativas: number,
  agora: Date,
  aleatorio: () => number = Math.random,
): Date {
  const base = Math.min(2 ** Math.max(tentativas, 0) * ESPERA_BASE_MS, ESPERA_MAXIMA_MS);
  const espera = Math.round(base * (0.5 + aleatorio()));
  return new Date(agora.getTime() + espera);
}
