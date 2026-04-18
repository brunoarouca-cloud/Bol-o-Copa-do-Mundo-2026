"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminGateProps {
  children: React.ReactNode;
}

/**
 * Protege rotas de admin.
 * Verifica custom claim { admin: true } e redireciona/bloqueia se não autorizado.
 */
export function AdminGate({ children }: AdminGateProps) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p className="text-muted-foreground max-w-md">
          Você não tem permissão para acessar o painel de administração.
          Entre em contato com o administrador do sistema.
        </p>
        <Button onClick={() => router.push("/apostas")}>Voltar ao Bolão</Button>
      </div>
    );
  }

  return <>{children}</>;
}
