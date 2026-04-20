import { formatDistanceToNow } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";

const BRT_TIMEZONE = "America/Sao_Paulo";

/**
 * Formata data para exibição em PT-BR no fuso de Brasília
 */
export function formatGameDate(timestamp: Timestamp): string {
  return formatInTimeZone(
    timestamp.toDate(),
    BRT_TIMEZONE,
    "dd/MM/yyyy 'às' HH:mm",
    { locale: ptBR }
  );
}

/**
 * Formata data curta (para card de jogo) no fuso de Brasília
 */
export function formatGameDateShort(timestamp: Timestamp): string {
  return formatInTimeZone(
    timestamp.toDate(),
    BRT_TIMEZONE,
    "dd/MM HH:mm",
    { locale: ptBR }
  );
}

/**
 * Retorna tempo restante até travamento em texto legível
 */
export function formatTimeUntilLock(
  gameTimestamp: Timestamp,
  lockMinutesBefore: number = 5
): string {
  const gameDate = gameTimestamp.toDate();
  const lockDate = new Date(gameDate.getTime() - lockMinutesBefore * 60 * 1000);
  const now = new Date();

  if (lockDate <= now) return "Travado";

  return formatDistanceToNow(lockDate, { locale: ptBR, addSuffix: true });
}

/**
 * Verifica se o jogo deve estar travado (server-side logic mirror)
 */
export function isGameLocked(
  gameTimestamp: Timestamp,
  lockMinutesBefore: number = 5
): boolean {
  const gameDate = gameTimestamp.toDate();
  const lockDate = new Date(gameDate.getTime() - lockMinutesBefore * 60 * 1000);
  return lockDate <= new Date();
}

/**
 * Converte data/hora BRT para UTC Date
 */
export function brtToUTC(dateStr: string, timeStr: string = "00:00"): Date {
  const localDateStr = `${dateStr}T${timeStr}:00`;
  return fromZonedTime(localDateStr, BRT_TIMEZONE);
}

/**
 * Formata data para exibição no ranking (no fuso de Brasília)
 */
export function formatDate(timestamp: Timestamp): string {
  return formatInTimeZone(timestamp.toDate(), BRT_TIMEZONE, "dd/MM/yyyy", { locale: ptBR });
}

/**
 * Deadline das apostas nominais: 10/06/2026 23:59 BRT
 */
export const NOMINAL_DEADLINE_UTC = brtToUTC("2026-06-10", "23:59");
