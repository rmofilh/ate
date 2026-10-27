/** Acesso ao usuário da sessão antes do login ou depois do logout (erro de composição). */
export class SessaoNaoDisponivelError extends Error {
  constructor() {
    super('Sessão não disponível: faça login novamente');
    this.name = 'SessaoNaoDisponivelError';
    Object.setPrototypeOf(this, SessaoNaoDisponivelError.prototype);
  }
}
