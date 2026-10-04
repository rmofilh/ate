import type { Cliente } from '@/core/domain/entities/Cliente';

/** Presentation follows the existing counter-client convention, including normal homonyms. */
export function isAvulsoClient(cliente: Pick<Cliente, 'nome' | 'contato'>): boolean {
  return cliente.nome === 'Cliente Avulso' && cliente.contato === '';
}

export function normalizeSelectionSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s().+\/-]/g, '');
}
