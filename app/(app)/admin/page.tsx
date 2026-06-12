"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Settings, Users, Newspaper, Star, Target, FlaskConical } from "lucide-react";

const adminSections = [
  {
    href: "/admin/jogos",
    icon: Target,
    title: "Jogos & Resultados",
    description: "Inserir resultados, editar datas e times do mata-mata",
  },
  {
    href: "/admin/nominais",
    icon: Star,
    title: "Nominais",
    description: "Definir resultados de artilheiro, campeão, vice e terceiro",
  },
  {
    href: "/admin/usuarios",
    icon: Users,
    title: "Usuários",
    description: "Gerenciar participantes e permissões",
  },
  {
    href: "/admin/regras",
    icon: Settings,
    title: "Regras de Pontuação",
    description: "Ajustar pontuação por tipo de acerto",
  },
  {
    href: "/admin/noticias",
    icon: Newspaper,
    title: "Notícias",
    description: "Gerar e gerenciar notícias diárias",
  },
  {
    href: "/admin/config",
    icon: FlaskConical,
    title: "Configurações & Testes",
    description: "Criar jogos de teste para validar todas as funcionalidades",
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-brand-gold" />
        <div>
          <h1 className="text-2xl font-bold">Painel Admin</h1>
          <p className="text-muted-foreground text-sm">Bolão Copa do Mundo 2026</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminSections.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5 text-primary" />
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
