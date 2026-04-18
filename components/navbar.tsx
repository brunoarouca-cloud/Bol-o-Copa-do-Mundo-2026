"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
