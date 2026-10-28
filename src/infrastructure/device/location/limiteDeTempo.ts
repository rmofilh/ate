/** Rejeita com `erroNoLimite()` se `promessa` não terminar em `ms`; o timer é sempre limpo. */
export async function comLimiteDeTempo<T>(
  promessa: Promise<T>,
  ms: number,
  erroNoLimite: () => Error,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(erroNoLimite()), ms);
  });
  try {
    return await Promise.race([promessa, limite]);
  } finally {
    clearTimeout(timer);
  }
}
