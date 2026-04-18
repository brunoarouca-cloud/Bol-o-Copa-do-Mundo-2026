"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { ScoringSettings } from "@/types";

const DEFAULT_SETTINGS: Partial<ScoringSettings> = {
  exactScore: 20,
  correctWinnerOneScore: 15,
  correctWinner: 10,
  oneTeamScore: 5,
  correctDraw: 13,
  nominalBet: 50,
  lockMinutesBefore: 5,
};

export default function RegrasPage() {
  const [settings, setSettings] = useState<Partial<ScoringSettings>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, "settings", "scoring");
    getDoc(ref).then((snap) => {
      if (snap.exists()) setSettings(snap.data() as ScoringSettings);
      setLoading(false);
    });
  }, []);

  const s = settings;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Regras do Bolão</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Entenda como funciona a pontuação e as apostas.
        </p>
      </div>

      {/* Pontuação por jogo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            ⚽ Pontuação por jogo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
            <div>
              <p className="font-semibold">Placar exato</p>
              <p className="text-muted-foreground text-xs">
                Acertou o placar completo (ex: 2×1 = 2×1)
              </p>
            </div>
            <div className="text-right font-bold text-primary text-lg">
              +{s.exactScore}pts
            </div>

            <div>
              <p className="font-semibold">Vencedor + um dos gols</p>
              <p className="text-muted-foreground text-xs">
                Acertou quem venceu e um dos placares (ex: apostou 2×1, resultado 2×0)
              </p>
            </div>
            <div className="text-right font-bold text-primary text-lg">
              +{s.correctWinnerOneScore}pts
            </div>

            <div>
              <p className="font-semibold">Apenas o vencedor</p>
              <p className="text-muted-foreground text-xs">
                Acertou quem venceu, mas nenhum dos gols
              </p>
            </div>
            <div className="text-right font-bold text-primary text-lg">
              +{s.correctWinner}pts
            </div>

            <div>
              <p className="font-semibold">Empate certo</p>
              <p className="text-muted-foreground text-xs">
                Apostou em empate e o jogo empatou (mas errou o placar exato)
              </p>
            </div>
            <div className="text-right font-bold text-primary text-lg">
              +{s.correctDraw}pts
            </div>

            <div>
              <p className="font-semibold">Um gol certo</p>
              <p className="text-muted-foreground text-xs">
                Acertou apenas um dos placares (ex: apostou 2×1, resultado 2×3)
              </p>
            </div>
            <div className="text-right font-bold text-primary text-lg">
              +{s.oneTeamScore}pts
            </div>

            <div>
              <p className="font-semibold">Errou tudo</p>
              <p className="text-muted-foreground text-xs">
                Nenhum critério acima foi atendido
              </p>
            </div>
            <div className="text-right font-bold text-muted-foreground text-lg">
              0pts
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apostas nominais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            🏆 Apostas Nominais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Além dos palpites de cada jogo, você faz <strong>4 apostas especiais</strong> antes
            do início da Copa:
          </p>
          <ul className="space-y-1 list-disc list-inside text-muted-foreground">
            <li>🏆 Campeão do Mundo</li>
            <li>🥈 Vice-campeão</li>
            <li>🥉 Terceiro lugar</li>
            <li>⚽ Artilheiro da Copa</li>
          </ul>
          <p>
            Cada aposta nominal correta vale{" "}
            <span className="font-bold text-primary">+{s.nominalBet} pontos</span>.
          </p>
          <p className="text-muted-foreground text-xs">
            O prazo para as apostas nominais é até <strong>12/06/2026 às 23:59 (BRT)</strong>,
            antes do início da Copa. Após este horário as apostas ficam travadas.
          </p>
        </CardContent>
      </Card>

      {/* Travamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            🔒 Travamento de apostas
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            As apostas de cada jogo travam automaticamente{" "}
            <strong>{s.lockMinutesBefore} minutos antes</strong> do horário de início da partida.
            Após o travamento não é possível alterar o palpite.
          </p>
          <p className="text-muted-foreground text-xs">
            O contador de travamento aparece em cada card de jogo na página de Apostas.
          </p>
        </CardContent>
      </Card>

      {/* Desempate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            🎯 Critério de desempate
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Em caso de empate na classificação final, o critério de desempate é:</p>
          <ol className="space-y-1 list-decimal list-inside text-muted-foreground">
            <li>Maior número de <strong>placares exatos</strong></li>
            <li>Maior número de apostas nominais corretas</li>
            <li>Ordem de cadastro no sistema</li>
          </ol>
        </CardContent>
      </Card>

      {/* Dúvidas */}
      <p className="text-center text-xs text-muted-foreground pb-4">
        Dúvidas? Use o botão do WhatsApp no menu superior para falar com o organizador.
      </p>
    </div>
  );
}
