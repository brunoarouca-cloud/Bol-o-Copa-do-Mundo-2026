"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Target,
  Star,
  BarChart2,
  Newspaper,
  Settings,
  LogOut,
  Moon,
  Sun,
  BookOpen,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PIX_CODE =
  "00020126430014BR.GOV.BCB.PIX0121brunoarouca@globo.com5204000053039865406100.005802BR5924Bruno Pizzato Giacomazzi6009SAO PAULO62140510O5FTcShUkL63042569";

// ← Substitua pelo seu número com DDI+DDD, só dígitos. Ex: "5511998765432"
const WHATSAPP_NUMBER = "5521996169535";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Dúvida%20sobre%20o%20Bolão%20Copa%202026`;

const navLinks = [
  { href: "/apostas", label: "Apostas", icon: Target },
  { href: "/nominais", label: "Nominais", icon: Star },
  { href: "/classificacao", label: "Classificação", icon: BarChart2 },
  { href: "/noticias", label: "Notícias", icon: Newspaper },
  { href: "/regras", label: "Regras", icon: BookOpen },
];

// ── Indicador de pagamento ─────────────────────────────────────────────────────
function PaymentStatus({ hasPaid }: { hasPaid: boolean | undefined }) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopyPix() {
    try {
      await navigator.clipboard.writeText(PIX_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente.");
    }
  }

  if (hasPaid === true) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-semibold text-green-600 dark:text-green-400 border border-green-500/25">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Pago
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 transition-colors cursor-pointer"
      >
        <AlertCircle className="h-3.5 w-3.5" />
        Pendente
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertCircle className="h-5 w-5" />
              Pagamento Pendente
            </DialogTitle>
          </DialogHeader>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-56 h-56 rounded-lg border bg-white flex items-center justify-center overflow-hidden p-2">
              {imgError ? (
                <div className="flex flex-col items-center gap-2 text-center px-4">
                  <AlertCircle className="h-8 w-8 text-orange-400" />
                  <p className="text-xs text-muted-foreground">
                    QR Code não disponível.<br />Entre em contato com o administrador.
                  </p>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/qrcode-pagamento.png"
                  alt="QR Code para pagamento"
                  className="w-full h-full object-contain"
                  onError={() => setImgError(true)}
                />
              )}
            </div>

            <div className="text-center">
              <p className="text-lg font-bold text-foreground">R$ 100,00</p>
              <p className="text-xs text-muted-foreground">Taxa de inscrição — Bolão Copa 2026</p>
            </div>
          </div>

          {/* Código Pix */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Pix Copia e Cola</p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <p className="flex-1 text-xs font-mono text-foreground break-all leading-relaxed select-all">
                {PIX_CODE}
              </p>
              <button
                onClick={handleCopyPix}
                className={`shrink-0 rounded-md p-1.5 transition-colors ${
                  copied
                    ? "text-green-600 bg-green-500/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title="Copiar código Pix"
                aria-label="Copiar código Pix"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-green-600 dark:text-green-400 text-center">
                ✓ Código copiado! Cole no seu app de pagamento.
              </p>
            )}
          </div>

          {/* Mensagem */}
          <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 px-4 py-3 text-sm text-orange-800 dark:text-orange-300 text-center leading-relaxed">
            Participação pendente de pagamento. Regularize sua situação para continuar apostando.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Navbar ─────────────────────────────────────────────────────────────────────
export function Navbar() {
  const pathname = usePathname();
  const { user, userDoc, isAdmin, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    toast.success("Até logo!");
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3"
        aria-label="Navegação principal"
      >
        {/* Logo */}
        <Link
          href="/apostas"
          className="flex items-center gap-2 font-bold text-primary hover:opacity-80"
        >
          <Trophy className="h-6 w-6 text-brand-gold" />
          <span className="hidden sm:inline">Bolão Copa 2026</span>
        </Link>

        {/* Links desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                pathname === href || pathname.startsWith(href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2">
          {/* Status de pagamento */}
          {user && (
            <PaymentStatus hasPaid={userDoc?.hasPaid} />
          )}

          {/* WhatsApp suporte */}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Fale conosco no WhatsApp"
          >
            <Button variant="ghost" size="icon" className="text-green-500 hover:text-green-600">
              <MessageCircle className="h-4 w-4" />
            </Button>
          </a>

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Admin link */}
          {isAdmin && (
            <Link href="/admin" aria-label="Painel admin">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          )}

          {/* User name */}
          {user && (
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {userDoc?.displayName ?? user.displayName ?? user.email}
            </span>
          )}

          {/* Logout */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      {/* Nav mobile */}
      <nav
        className="flex md:hidden border-t"
        aria-label="Navegação mobile"
      >
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
              pathname === href || pathname.startsWith(href)
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
              pathname.startsWith("/admin") ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
            Admin
          </Link>
        )}
      </nav>
    </header>
  );
}
