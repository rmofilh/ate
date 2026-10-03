import type { CanalOrigem } from '@/core/domain/enums/CanalOrigem';

export const channelLabels: Record<CanalOrigem, string> = {
  INSTAGRAM: 'Instagram',
  WHATSAPP: 'WhatsApp',
  PRESENCIAL: 'Presencial',
  TELEFONE: 'Telefone',
  OUTROS: 'Outros',
};
