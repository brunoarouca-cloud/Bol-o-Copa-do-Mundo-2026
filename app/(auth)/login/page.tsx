"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema, type LoginInput } from "@/lib/zod-schemas";

export default function LoginPage() {
  const router = useRouter();
  const { login, resetPassword } = useAuth();
  const [isResetting, setIsResetting] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    try {
      await login(data.email, data.password);
      router.push("/apostas");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("E-mail ou senha incorretos.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Muitas tentativas. Aguarde um momento.");
      } else {
        toast.error("Erro ao fazer login. Tente novamente.");
      }
    }
  }

  async function handleForgotPassword() {
    const email = getValues("email");
    if (!email) {
      toast.error("Digite seu e-mail primeiro.");
      return;
    }
    setIsResetting(true);
    try {
      await resetPassword(email);
      toast.success("E-mail de recuperação enviado!");
    } catch {
      toast.error("Erro ao enviar e-mail. Verifique o endereço.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-navy to-brand-green p-4">
      <div className="mb-8 flex flex-col items-center text-white">
        <Trophy className="h-16 w-16 text-brand-gold mb-2" />
        <h1 className="text-3xl font-bold">Bolão Copa 2026</h1>
        <p className="text-white/80 text-sm">FIFA World Cup • EUA • Canadá • México</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse sua conta para fazer apostas</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                {...register("email")}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-sm text-muted-foreground"
              onClick={handleForgotPassword}
              disabled={isResetting}
            >
              {isResetting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Esqueci minha senha
            </Button>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
