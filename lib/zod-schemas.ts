import { z } from "zod";

// Telefone BR: (99) 99999-9999 ou (99) 9999-9999
const phoneRegex = /^\(\d{2}\) \d{4,5}-\d{4}$/;

export const registerSchema = z.object({
  displayName: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(60, "Nome deve ter no máximo 60 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z
    .string()
    .regex(phoneRegex, "Telefone inválido. Use o formato (99) 99999-9999"),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(100, "Senha muito longa"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const betSchema = z.object({
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
});

export const nominalBetSchema = z.object({
  prediction: z.string().min(1, "Selecione uma seleção"),
});

export const resultSchema = z.object({
  gameId: z.string().min(1),
  homeScore: z.number().int().min(0).max(30),
  awayScore: z.number().int().min(0).max(30),
  /** Se true, define status = "live" em vez de "finished" */
  isLive: z.boolean().optional(),
});

export const scoringSettingsSchema = z.object({
  exactScore: z.number().int().min(0).max(100),
  correctWinnerOneScore: z.number().int().min(0).max(100),
  correctWinner: z.number().int().min(0).max(100),
  oneTeamScore: z.number().int().min(0).max(100),
  correctDraw: z.number().int().min(0).max(100),
  nominalBet: z.number().int().min(0).max(200),
  lockMinutesBefore: z.number().int().min(1).max(60),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BetInput = z.infer<typeof betSchema>;
export type ResultInput = z.infer<typeof resultSchema>;
export type ScoringSettingsInput = z.infer<typeof scoringSettingsSchema>;
