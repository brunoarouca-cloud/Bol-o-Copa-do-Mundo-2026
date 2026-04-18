"use client";

import { useState } from "react";
import { useRanking } from "@/hooks/use-ranking";
import { useAuth } from "@/hooks/use-auth";
import { RankingTable } from "@/components/ranking-table";
import { Loader2 } from "lucide-react";

export default function ClassificacaoPage() {
  const { user } = useAuth();
  const { users, loading } = useRanking();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Classificação</h1>
        <p className="text-muted-foreground text-sm">
          Ranking em tempo real · Desempate por placares exatos
        </p>
      </div>

      <RankingTable users={users} currentUserId={user?.uid} />
    </div>
  );
}
