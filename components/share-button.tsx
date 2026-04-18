"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { betConverter, gameConverter, userConverter } from "@/lib/firebase/converters";
import { generateShareText, shareOnWhatsApp } from "@/lib/share-text";
import { toast } from "sonner";
import type { Bet, Game, UserDoc } from "@/types";

interface ShareButtonProps {
  userId: string;
}

export function ShareButton({ userId }: ShareButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      // Carrega dados necessários
      const [userSnap, betsSnap, gamesSnap] = await Promise.all([
        getDoc(doc(db, "users", userId).withConverter(userConverter)),
        getDocs(
          query(
            collection(db, "bets").withConverter(betConverter),
            where("userId", "==", userId)
          )
        ),
        getDocs(collection(db, "games").withConverter(gameConverter)),
      ]);

      const user = userSnap.data() as UserDoc;
      const bets: Bet[] = betsSnap.docs.map((d) => d.data());
      const games: Game[] = gamesSnap.docs.map((d) => d.data());

      const text = generateShareText(
        user.displayName,
        user.totalPoints,
        user.rank,
        bets,
        games
      );

      shareOnWhatsApp(text);
    } catch (err) {
      console.error("Erro ao compartilhar:", err);
      toast.error("Erro ao gerar compartilhamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleShare}
      disabled={loading}
      aria-label="Compartilhar no WhatsApp"
      className="gap-1.5 text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
    >
      <Share2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline text-xs">WhatsApp</span>
    </Button>
  );
}
