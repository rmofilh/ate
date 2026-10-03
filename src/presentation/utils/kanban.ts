import type { IconName } from '@/presentation/components/AppIcon';

export const kanbanStages = ['A_FAZER', 'FAZENDO', 'FEITO'] as const;
export type KanbanStage = typeof kanbanStages[number];
export const stagePresentation: Record<KanbanStage, {
  title: string; testID: string; icon: IconName;
  color: 'todo' | 'doing' | 'done'; surface: 'todoSurface' | 'doingSurface' | 'doneSurface';
}> = {
  A_FAZER: { title: 'A Fazer', testID: 'coluna-a-fazer', icon: 'todo', color: 'todo', surface: 'todoSurface' },
  FAZENDO: { title: 'Fazendo', testID: 'coluna-fazendo', icon: 'doing', color: 'doing', surface: 'doingSurface' },
  FEITO: { title: 'Feito', testID: 'coluna-feito', icon: 'done', color: 'done', surface: 'doneSurface' },
};
