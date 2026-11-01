import type { Evento } from '@/core/domain/entities/Evento';

function diaLocal(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/** Dia de calendário do evento: a data é gravada ao meio-dia UTC (parseCalendarDate). */
function diaDoEvento(evento: Evento): string {
  return evento.data.toISOString().slice(0, 10);
}

/**
 * Projeção só para exibição: o evento de hoje ainda é próximo. Próximos vêm do mais perto para
 * o mais distante; realizados, do mais recente para o mais antigo.
 */
export function separarEventos(
  eventos: readonly Evento[],
  hoje: Date = new Date(),
): { proximos: Evento[]; realizados: Evento[] } {
  const referencia = diaLocal(hoje);
  const comDia = eventos.map((evento) => ({ evento, dia: diaDoEvento(evento) }));
  const proximos = comDia
    .filter(({ dia }) => dia >= referencia)
    .sort((a, b) => a.dia.localeCompare(b.dia));
  const realizados = comDia
    .filter(({ dia }) => dia < referencia)
    .sort((a, b) => b.dia.localeCompare(a.dia));
  return {
    proximos: proximos.map(({ evento }) => evento),
    realizados: realizados.map(({ evento }) => evento),
  };
}
