import { z } from 'zod'

export const criarCategoriaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da categoria'),
})

export const atualizarCategoriaSchema = criarCategoriaSchema

export const categoriaParamsSchema = z.object({
  id: z.string().uuid('Id de categoria inválido'),
})
