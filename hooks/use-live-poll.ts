"use client";

import { useEffect, useRef, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { gameConverter } from "@/lib/firebase/converters";

/**
 * Hook que detecta jogos ao vivo no Firestore e aciona o sync de placar
 * via /api/cron/live-scores a cada 45 segundos enquanto houver jogos "live".
 *
 * Funciona como fallback quando o Vercel Cron não está disponível (Hobby plan).
 * No Vercel Pro, o cron já roda a cada minuto — este hook é redundante mas inofensivo.
 *
 * @returns {{ hasLiveGames: boolean }} — true enquanto houver ao menos um jogo ao vivo
 */
export function useLivePoll(): { hasLiveGames: boolean } {
  const [hasLiveGames, setHasLiveGames] = useState(false);
  const hasLiveGamesRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function triggerSync() {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch("/api/cron/live-scores", {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.warn("[live-poll] sync falhou:", err);
    }
  }

  function startPolling() {
    if (intervalRef.current) return; // já rodando
    triggerSync(); // chamada imediata
    intervalRef.current = setInterval(triggerSync, 45_000);
  }

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    const q = query(
      collection(db, "games").withConverter(gameConverter),
      where("status", "==", "live")
    );

    const unsub = onSnapshot(q, (snap) => {
      const hasLive = !snap.empty;
      setHasLiveGames(hasLive);
      if (hasLive && !hasLiveGamesRef.current) {
        hasLiveGamesRef.current = true;
        startPolling();
      } else if (!hasLive && hasLiveGamesRef.current) {
        hasLiveGamesRef.current = false;
        stopPolling();
      }
    });

    return () => {
      unsub();
      stopPolling();
    };
  }, []);

  return { hasLiveGames };
}
