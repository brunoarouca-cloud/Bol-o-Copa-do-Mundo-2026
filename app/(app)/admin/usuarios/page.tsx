"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { userConverter } from "@/lib/firebase/converters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import type { UserDoc } from "@/types";
import { formatDate } from "@/lib/time";

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  async function handleDelete(user: UserDoc) {
    const confirm1 = window.confirm(
      `Excluir "${user.displayName}"? Esta ação é irreversível.`
    );
    if (!confirm1) return;

    const confirm2 = window.confirm(
      `CONFIRMAR: excluir definitivamente "${user.displayName}" (${user.email}) e todas as apostas?`
    );
    if (!confirm2) return;

    setDeletingId(user.uid);
    try {
      // Deleta documento do usuário (apostas devem ser deletadas via Cloud Function)
      await deleteDoc(doc(db, "users", user.uid));
      toast.success(`${user.displayName} removido. Apostas serão deletadas em segundo plano.`);
    } catch (err) {
      toast.error("Erro ao excluir usuário.");
    } finally {
      setDeletingId(null);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          {users.length} participante(s) cadastrado(s)
        </p>
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
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="py-3 pl-4 text-left font-medium text-muted-foreground">
                  Participante
                </th>
                <th className="hidden py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  E-mail
                </th>
                <th className="py-3 text-right font-medium text-muted-foreground pr-2">
                  Pontos
                </th>
                <th className="hidden py-3 text-left font-medium text-muted-foreground lg:table-cell">
                  Cadastro
                </th>
                <th className="py-3 pr-4" />
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="border-t hover:bg-muted/30">
                  <td className="py-3 pl-4">
                    <div className="font-medium">{user.displayName}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">{user.email}</div>
                    {user.isAdmin && (
                      <Badge className="mt-0.5 text-xs" variant="default">
                        Admin
                      </Badge>
                    )}
                  </td>
                  <td className="hidden py-3 text-muted-foreground sm:table-cell">
                    {user.email}
                  </td>
                  <td className="py-3 pr-2 text-right font-bold">{user.totalPoints}</td>
                  <td className="hidden py-3 text-muted-foreground lg:table-cell">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="py-3 pr-4">
                    {!user.isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.uid}
                        aria-label={`Excluir ${user.displayName}`}
                        className="text-destructive hover:text-destructive"
                      >
                        {deletingId === user.uid ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
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
    </div>
  );
}
