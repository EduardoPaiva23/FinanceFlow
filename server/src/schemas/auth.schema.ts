import { z } from 'zod'

export const registrarSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  senha: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
  nome: z.string().trim().min(1).optional(),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
})
