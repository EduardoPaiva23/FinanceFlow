import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const registrarSchema = z.object({
  // Um input vazio manda '' — normaliza para undefined antes da validação, já que
  // nome é opcional (mesmo comportamento do `nome.trim() || undefined` manual anterior).
  nome: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().min(1).optional(),
  ),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  senha: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
})
export type RegistrarFormValues = z.infer<typeof registrarSchema>
