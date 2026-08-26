import { z } from 'zod'

const mesRegex = /^\d{4}-\d{2}$/
const dataRegex = /^\d{4}-\d{2}-\d{2}$/

export const criarLancamentoSchema = z.object({
  descricao: z.string().trim().min(1, 'Informe a descrição'),
  valor: z.number().positive('O valor deve ser positivo'),
  tipo: z.enum(['receita', 'despesa']),
  data: z.string().regex(dataRegex, 'Data deve estar no formato YYYY-MM-DD'),
  categoriaId: z.string().uuid('Id de categoria inválido'),
})

export const atualizarLancamentoSchema = criarLancamentoSchema

export const lancamentoParamsSchema = z.object({
  id: z.string().uuid('Id de lançamento inválido'),
})

export const listarLancamentosQuerySchema = z.object({
  mes: z.string().regex(mesRegex, 'Mês deve estar no formato YYYY-MM'),
  busca: z.string().trim().optional(),
  tipo: z.enum(['receita', 'despesa']).optional(),
  ordem: z.enum(['asc', 'desc']).default('desc'),
})

export const resumoQuerySchema = z.object({
  mes: z.string().regex(mesRegex, 'Mês deve estar no formato YYYY-MM'),
})
