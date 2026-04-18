"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { betConverter } from "@/lib/firebase/converters";
import type { Bet } from "@/types";
import { toast } from "sonner";

export function useBets(userId: string | null) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setBets([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "bets").withConverter(betConverter),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setBets(snap.docs.map((d) => d.data()));
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar apostas:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  const getBetForGame = useCallback(
    (gameId: string): Bet | undefined => bets.find((b) => b.gameId === gameId),
    [bets]
  );

  const saveBet = useCallback(
    async (
      userId: string,
      gameId: string,
      homeScore: number,
      awayScore: number
    ): Promise<void> => {
      const betId = `${userId}_${gameId}`;
      const betRef = doc(db, "bets", betId).withConverter(betConverter);

      const existing = bets.find((b) => b.id === betId);
      const now = Timestamp.now();

      const bet: Bet = {
        id: betId,
        userId,
        gameId,
        homeScore,
        awayScore,
        points: existing?.points ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      await setDoc(betRef, bet, { merge: true });
    },
    [bets]
  );

  return { bets, loading, getBetForGame, saveBet };
}

export function useBetSave(userId: string | null, gameId: string) {
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (homeScore: number, awayScore: number) => {
      if (!userId) return;
      setSaving(true);
      try {
        const betId = `${userId}_${gameId}`;
        const betRef = doc(db, "bets", betId);
        const now = Timestamp.now();

        await setDoc(
          betRef,
          {
            id: betId,
            userId,
            gameId,
            homeScore,
            awayScore,
            updatedAt: now,
          },
          { merge: true }
        );

        toast.success("Aposta salva!");
      } catch (err) {
        console.error("Erro ao salvar aposta:", err);
        toast.error("Erro ao salvar. Tente novamente.");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [userId, gameId]
  );

  return { save, saving };
}
