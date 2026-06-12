"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { userConverter, betConverter, gameConverter } from "@/lib/firebase/converters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  RefreshCw,
  Pencil,
  KeyRound,
  MessageCircle,
  Copy,
  Check,
} from "lucide-react";

const PIX_CODE =
  "00020126430014BR.GOV.BCB.PIX0121brunoarouca@globo.com5204000053039865406100.005802BR5924Bruno Pizzato Giacomazzi6009SAO PAULO62140510O5FTcShUkL63042569";

// Emojis gerados em runtime — sem risco de encoding no arquivo
const E = {
  ball:   String.fromCodePoint(0x26BD),          // ⚽
  wave:   String.fromCodePoint(0x1F44B),          // 👋
  phone:  String.fromCodePoint(0x1F4F2),          // 📲
  trophy: String.fromCodePoint(0x1F3C6),          // 🏆
  warn:   String.fromCodePoint(0x26A0, 0xFE0F),   // ⚠️
  pin:    String.fromCodePoint(0x1F4CC),           // 📌
};

function buildPaymentMessage(userName: string): string {
  return [
    `${E.ball} *BOLÃO COPA DO MUNDO 2026*`,
    ``,
    `Olá, *${userName}*! ${E.wave}`,
    ``,
    `Sua inscrição no Bolão ainda está *pendente de pagamento*.`,
    `Para garantir sua participação, faça o Pix de *R$ 100,00*:`,
    ``,
    `${E.phone} *Pix Copia e Cola:*`,
    PIX_CODE,
    ``,
    `Ou escaneie o QR Code no app: toque em *"Pendente"* na barra superior.`,
    ``,
    `Qualquer dúvida, é só chamar! ${E.trophy}`,
  ].join("\n");
}
import type { UserDoc, Bet, Game } from "@/types";
import { formatDate } from "@/lib/time";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

// ── Edit User Dialog ──────────────────────────────────────────────────────────
interface EditUserDialogProps {
  user: UserDoc | null;
  onClose: () => void;
  onSaved: () => void;
  getToken: () => Promise<string | undefined>;
}

function EditUserDialog({ user, onClose, onSaved, getToken }: EditUserDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Preenche com dados atuais ao abrir
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? "");
      setEmail(user.email ?? "");
      setResetLink(null);
      setCopied(false);
    }
  }, [user]);

  async function handleSave() {
    if (!user) return;

    const nameChanged = displayName.trim() !== (user.displayName ?? "").trim();
    const emailChanged = email.trim().toLowerCase() !== (user.email ?? "").toLowerCase();

    if (!nameChanged && !emailChanged) {
      toast.info("Nenhuma alteração para salvar.");
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const body: Record<string, string> = { userId: user.uid };
      if (nameChanged) body.displayName = displayName.trim();
      if (emailChanged) body.email = email.trim();

      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");

      toast.success(`Dados de ${user.displayName} atualizados!`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateResetLink() {
    if (!user?.email) return;
    setGeneratingLink(true);
    setResetLink(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/password-reset-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");
      setResetLink(data.link);
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setGeneratingLink(false);
    }
  }

  async function handleCopyLink() {
    if (!resetLink) return;
    await navigator.clipboard.writeText(resetLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareWhatsApp() {
    if (!resetLink || !user) return;
    const BALL  = String.fromCodePoint(0x26BD);
    const KEY   = String.fromCodePoint(0x1F511);
    const text = [
      `${BALL} *BOLÃO COPA DO MUNDO 2026*`,
      ``,
      `Olá, *${user.displayName}*!`,
      ``,
      `${KEY} Clique no link abaixo para redefinir sua senha:`,
      ``,
      resetLink,
      ``,
      `O link expira em 1 hora.`,
    ].join("\n");
    const phone = user.phone?.replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Editar usuário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nome</Label>
            <Input
              id="edit-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nome completo"
              disabled={saving}
            />
          </div>

          {/* E-mail */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">E-mail</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Alterar o e-mail também atualiza o login do usuário.
            </p>
          </div>

          {/* Botões principais */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Redefinir senha</span>
            </div>
          </div>

          {/* Gerar link de redefinição */}
          {!resetLink ? (
            <>
              <Button
                variant="outline"
                className="w-full gap-2 text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-700"
                onClick={handleGenerateResetLink}
                disabled={generatingLink || !user?.email}
              >
                {generatingLink ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Gerar link de redefinição
              </Button>
              <p className="text-xs text-center text-muted-foreground -mt-2">
                Gera um link que você envia diretamente ao usuário (WhatsApp, etc.).
              </p>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Link gerado para <strong>{user?.email}</strong>. Válido por 1 hora:
              </p>
              <div className="rounded-md bg-muted/60 border px-3 py-2 text-xs break-all text-muted-foreground select-all">
                {resetLink}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado!" : "Copiar link"}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleShareWhatsApp}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Enviar WhatsApp
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setResetLink(null)}
              >
                Gerar novo link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminUsuariosPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resettingPoints, setResettingPoints] = useState(false);
  const [search, setSearch] = useState("");

  // Bets dialog state
  const [viewingUser, setViewingUser] = useState<UserDoc | null>(null);
  const [userBets, setUserBets] = useState<{ bet: Bet; game: Game }[]>([]);
  const [loadingBets, setLoadingBets] = useState(false);

  // Edit dialog state
  const [editingUser, setEditingUser] = useState<UserDoc | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "users").withConverter(userConverter),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => d.data()));
      setLoading(false);
    });
  }, []);

  async function handleDelete(u: UserDoc) {
    const confirm1 = window.confirm(
      `Excluir "${u.displayName}"? Esta ação é irreversível.\n\nIsso remove a conta do Firebase Auth e todos os dados do usuário.`
    );
    if (!confirm1) return;
    const confirm2 = window.confirm(
      `CONFIRMAR: excluir definitivamente "${u.displayName}" (${u.email})?`
    );
    if (!confirm2) return;

    setDeletingId(u.uid);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: u.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");
      toast.success(`${u.displayName} removido do sistema.`);
    } catch (err) {
      toast.error(`Erro ao excluir: ${(err as Error).message}`);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleTogglePayment(u: UserDoc) {
    setTogglingId(u.uid);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/toggle-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: u.uid, hasPaid: !u.hasPaid }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar.");
      toast.success(
        !u.hasPaid
          ? `${u.displayName} marcado como pago ✓`
          : `${u.displayName} marcado como pendente`
      );
    } catch {
      toast.error("Erro ao atualizar status de pagamento.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleViewBets(u: UserDoc) {
    setViewingUser(u);
    setLoadingBets(true);
    setUserBets([]);
    try {
      const [betsSnap, gamesSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "bets").withConverter(betConverter),
            where("userId", "==", u.uid)
          )
        ),
        getDocs(
          query(
            collection(db, "games").withConverter(gameConverter),
            orderBy("matchNumber", "asc")
          )
        ),
      ]);

      const betsMap = new Map(betsSnap.docs.map((d) => [d.data().gameId, d.data()]));
      const allGames = gamesSnap.docs.map((d) => d.data());

      const combined = allGames
        .filter((g) => betsMap.has(g.id))
        .map((g) => ({ bet: betsMap.get(g.id)!, game: g }));

      setUserBets(combined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao carregar apostas: ${msg}`);
    } finally {
      setLoadingBets(false);
    }
  }

  async function handleResetPoints() {
    const confirmed = window.confirm(
      "Recalcular toda a pontuação do bolão do zero?\n\nIsso irá:\n• Zerar pontos de todas as apostas\n• Zerar totalPoints e exactHits de todos os usuários\n• Recalcular com base nos jogos finalizados/ao vivo\n• Recalcular o ranking\n\nEsta ação não pode ser desfeita."
    );
    if (!confirmed) return;

    setResettingPoints(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/reset-points", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido");
      toast.success(
        `Pontuação recalculada! ${data.gamesProcessed} jogo(s) · ${data.usersRecalculated} usuário(s) atualizados`
      );
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`);
    } finally {
      setResettingPoints(false);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const paidCount = users.filter((u) => !u.isAdmin && u.hasPaid).length;
  const pendingCount = users.filter((u) => !u.isAdmin && !u.hasPaid).length;
  const pendingUsers = users.filter((u) => !u.isAdmin && !u.hasPaid);

  function handleChargeOne(u: UserDoc) {
    const msg = buildPaymentMessage(u.displayName);
    // Usa phone se disponível, senão abre seletor
    const phone = u.phone?.replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  function handleChargeAll() {
    if (pendingUsers.length === 0) {
      toast.info("Não há participantes pendentes.");
      return;
    }
    const BALL   = "⚽";
    const PHONE  = "📲";
    const TROPHY = "🏆";
    const WARN   = "⚠️";
    const names = pendingUsers.map((u, i) => `${i + 1}. ${u.displayName}`).join("\n");
    const text = [
      `${BALL} *BOLÃO COPA DO MUNDO 2026*`,
      ``,
      `${WARN} Atenção pessoal! Os participantes abaixo ainda estão com pagamento *pendente*:`,
      ``,
      names,
      ``,
      `Para regularizar, faça o Pix de *R$ 100,00*:`,
      ``,
      `${PHONE} *Pix Copia e Cola:*`,
      PIX_CODE,
      ``,
      `Ou escaneie o QR Code no app tocando em *"Pendente"* na barra superior. ${TROPHY}`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} participante(s) cadastrado(s) ·{" "}
            <span className="text-green-600 font-medium">{paidCount} pago(s)</span> ·{" "}
            <span className="text-yellow-600 font-medium">{pendingCount} pendente(s)</span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {pendingCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleChargeAll}
              className="gap-2 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
              title="Enviar cobrança para todos os pendentes no WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Cobrar todos ({pendingCount})</span>
              <span className="sm:hidden">Cobrar ({pendingCount})</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetPoints}
            disabled={resettingPoints}
            className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            {resettingPoints ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline ml-2">Recalcular pontuação</span>
          </Button>
        </div>
      </div>

      <Input
        placeholder="Buscar por nome ou e-mail..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="py-3 pl-4 text-left font-medium text-muted-foreground">
                  Participante
                </th>
                <th className="hidden py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  E-mail
                </th>
                <th className="hidden py-3 pr-2 text-right font-medium text-muted-foreground sm:table-cell">
                  Pontos
                </th>
                <th className="py-3 text-center font-medium text-muted-foreground">
                  Pgto
                </th>
                <th className="py-3 pr-3 text-right font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.uid} className="border-t hover:bg-muted/30">
                  <td className="py-2.5 pl-4">
                    <div className="font-medium leading-tight">{u.displayName}</div>
                    <div className="text-xs text-muted-foreground sm:hidden truncate max-w-[140px]">{u.email}</div>
                    <div className="text-xs font-bold sm:hidden">{u.totalPoints} pts</div>
                    {u.isAdmin && (
                      <Badge className="mt-0.5 text-xs" variant="default">
                        Admin
                      </Badge>
                    )}
                  </td>
                  <td className="hidden py-2.5 text-muted-foreground sm:table-cell">
                    {u.email}
                  </td>
                  <td className="hidden py-2.5 pr-2 text-right font-bold sm:table-cell">
                    {u.totalPoints}
                  </td>
                  <td className="py-2.5 text-center">
                    {u.isAdmin ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <button
                        onClick={() => handleTogglePayment(u)}
                        disabled={togglingId === u.uid}
                        title={u.hasPaid ? "Marcar como pendente" : "Marcar como pago"}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors border",
                          u.hasPaid
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                        )}
                      >
                        {togglingId === u.uid ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : u.hasPaid ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        <span className="hidden sm:inline">{u.hasPaid ? "Pago" : "Pendente"}</span>
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex justify-end gap-0.5">
                      {/* Ver apostas */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewBets(u)}
                        title={`Ver apostas de ${u.displayName}`}
                        aria-label={`Ver apostas de ${u.displayName}`}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>

                      {/* Cobrar via WhatsApp (apenas pendentes) */}
                      {!u.isAdmin && !u.hasPaid && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleChargeOne(u)}
                          title={`Cobrar ${u.displayName} via WhatsApp`}
                          aria-label={`Cobrar ${u.displayName} via WhatsApp`}
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Editar dados */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingUser(u)}
                        title={`Editar dados de ${u.displayName}`}
                        aria-label={`Editar dados de ${u.displayName}`}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      {/* Excluir (apenas não-admins) */}
                      {!u.isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(u)}
                          disabled={deletingId === u.uid}
                          aria-label={`Excluir ${u.displayName}`}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          {deletingId === u.uid ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum usuário encontrado.
            </div>
          )}
        </div>
      )}

      {/* Dialog: editar usuário */}
      <EditUserDialog
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={() => {}}
        getToken={async () => auth.currentUser?.getIdToken()}
      />

      {/* Dialog: apostas do usuário */}
      <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <DialogContent className="max-w-xl w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Apostas de {viewingUser?.displayName}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({userBets.length} aposta{userBets.length !== 1 ? "s" : ""})
              </span>
            </DialogTitle>
          </DialogHeader>

          {loadingBets ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : userBets.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma aposta registrada.
            </p>
          ) : (
            <div className="space-y-1.5">
              {userBets.map(({ bet, game }) => {
                const isFinished = game.status === "finished";
                return (
                  <div
                    key={bet.id}
                    className={cn(
                      "flex items-center justify-between rounded-md border p-2.5 text-sm",
                      isFinished ? "bg-muted/30" : ""
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-xs text-muted-foreground shrink-0">
                          #{game.matchNumber}
                        </span>
                        <span className="font-semibold">{game.homeTeam}</span>
                        <span className="text-muted-foreground">×</span>
                        <span className="font-semibold">{game.awayTeam}</span>
                        {!isFinished && (
                          <Badge variant="outline" className="text-xs py-0">
                            {game.status === "locked" ? "Travado" : "Aberto"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          Palpite:{" "}
                          <strong>
                            {bet.homeScore} × {bet.awayScore}
                          </strong>
                        </span>
                        {isFinished && (
                          <span className="text-xs text-muted-foreground">
                            · Resultado:{" "}
                            <strong>
                              {game.homeScore} × {game.awayScore}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-3 shrink-0">
                      {isFinished && bet.points !== null ? (
                        <span
                          className={cn(
                            "font-bold text-sm",
                            bet.points >= 20
                              ? "text-yellow-600"
                              : bet.points > 0
                              ? "text-green-600"
                              : "text-destructive"
                          )}
                        >
                          +{bet.points}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
