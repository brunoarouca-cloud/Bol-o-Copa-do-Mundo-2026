"use client";

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
import { registerSchema, type RegisterInput } from "@/lib/zod-schemas";

// Máscara de telefone BR
function phoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterInput) {
    try {
      await registerUser(data.email, data.password, data.displayName, data.phone);
      toast.success("Conta criada! Bem-vindo ao bolão!");
      router.push("/apostas");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        toast.error("Este e-mail já está cadastrado.");
      } else if (code === "auth/weak-password") {
        toast.error("Senha muito fraca. Use pelo menos 6 caracteres.");
      } else {
        toast.error("Erro ao criar conta. Tente novamente.");
      }
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
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Cadastre-se e entre na disputa!</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="displayName">Nome</Label>
              <Input
                id="displayName"
                type="text"
                autoComplete="name"
                placeholder="Seu nome completo"
                {...register("displayName")}
                aria-describedby={errors.displayName ? "name-error" : undefined}
              />
              {errors.displayName && (
                <p id="name-error" className="text-sm text-destructive">
                  {errors.displayName.message}
                </p>
              )}
            </div>

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
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="(99) 99999-9999"
                {...register("phone")}
                onChange={(e) => {
                  const masked = phoneMask(e.target.value);
                  e.target.value = masked;
                  setValue("phone", masked, { shouldValidate: true });
                }}
                aria-describedby={errors.phone ? "phone-error" : undefined}
              />
              {errors.phone && (
                <p id="phone-error" className="text-sm text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                {...register("password")}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repita a senha"
                {...register("confirmPassword")}
                aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
              />
              {errors.confirmPassword && (
                <p id="confirm-error" className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar conta
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
