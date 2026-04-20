"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { userConverter } from "@/lib/firebase/converters";
import type { UserDoc } from "@/types";

export function useRanking() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "users").withConverter(userConverter),
      orderBy("totalPoints", "desc"),
      orderBy("exactHits", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setUsers(snap.docs.map((d) => d.data()).filter((u) => !u.isAdmin && u.hasPaid));
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar ranking:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { users, loading };
}
