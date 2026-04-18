"use client";

import { useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
}

export function useCountdown(targetTimestamp: Timestamp | Date | null): CountdownState {
  const [state, setState] = useState<CountdownState>(() =>
    calculateCountdown(targetTimestamp)
  );

  useEffect(() => {
    if (!targetTimestamp) return;

    const interval = setInterval(() => {
      setState(calculateCountdown(targetTimestamp));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp]);

  return state;
}

function calculateCountdown(target: Timestamp | Date | null): CountdownState {
  if (!target) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, formatted: "" };
  }

  const targetDate = target instanceof Timestamp ? target.toDate() : target;
  const diff = targetDate.getTime() - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, formatted: "Expirado" };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let formatted = "";
  if (days > 0) formatted = `${days}d ${hours}h ${minutes}m`;
  else if (hours > 0) formatted = `${hours}h ${minutes}m ${seconds}s`;
  else if (minutes > 0) formatted = `${minutes}m ${seconds}s`;
  else formatted = `${seconds}s`;

  return { days, hours, minutes, seconds, isExpired: false, formatted };
}

/**
 * Countdown específico para o travamento de um jogo
 * Considera lockMinutesBefore antes do horário do jogo
 */
export function useGameLockCountdown(
  gameDate: Timestamp | null,
  lockMinutesBefore: number = 5
): CountdownState {
  const lockDate =
    gameDate
      ? new Date(gameDate.toDate().getTime() - lockMinutesBefore * 60 * 1000)
      : null;

  return useCountdown(lockDate);
}
