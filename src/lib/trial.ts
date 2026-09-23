import { differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface TrialEndInfo {
  daysLeft: number;        // dias de calendário até o fim (0 = termina hoje)
  dateLabel: string;       // ex: "terça-feira, 29/09"
  shortDate: string;       // ex: "29/09"
  headline: string;        // ex: "vai até terça-feira, 29/09" | "termina amanhã, 29/09" | "termina hoje, às 20:51"
  countdown: string;       // ex: "faltam 7 dias" | "falta 1 dia" | "último dia"
  isUrgent: boolean;       // daysLeft <= 2
}

// trialEndsAt é timestamptz (instante real), então aqui `new Date(trialEndsAt)` é correto.
export function describeTrialEnd(
  trialEndsAt: string | null | undefined,
  now: Date = new Date()
): TrialEndInfo | null {
  if (!trialEndsAt) return null;

  const end = new Date(trialEndsAt);
  if (isNaN(end.getTime())) return null;

  const daysLeft = Math.max(0, differenceInCalendarDays(end, now));
  const dateLabel = format(end, "EEEE, dd/MM", { locale: ptBR });
  const shortDate = format(end, "dd/MM");

  let headline: string;
  if (daysLeft === 0) {
    headline = `termina hoje, às ${format(end, "HH:mm")}`;
  } else if (daysLeft === 1) {
    headline = `termina amanhã, ${shortDate}`;
  } else {
    headline = `vai até ${dateLabel}`;
  }

  let countdown: string;
  if (daysLeft === 0) {
    countdown = "último dia";
  } else if (daysLeft === 1) {
    countdown = "falta 1 dia";
  } else {
    countdown = `faltam ${daysLeft} dias`;
  }

  return {
    daysLeft,
    dateLabel,
    shortDate,
    headline,
    countdown,
    isUrgent: daysLeft <= 2,
  };
}
