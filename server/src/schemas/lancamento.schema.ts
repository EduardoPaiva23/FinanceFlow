import { z } from 'zod'
import { MAX_PARCELAS, MIN_PARCELAS } from '../lib/parcelas.js'

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

const MSG_PARCELAS = `Informe entre ${MIN_PARCELAS} e ${MAX_PARCELAS} parcelas`

export const criarLancamentoParceladoSchema = criarLancamentoSchema.extend({
  totalParcelas: z.number().int(MSG_PARCELAS).min(MIN_PARCELAS, MSG_PARCELAS).max(MAX_PARCELAS, MSG_PARCELAS),
  parcelaInicial: z.number().int().min(1).default(1),
  modoValor: z.enum(['total', 'parcela']).default('total'),
  confirmarDuplicado: z.boolean().default(false),
})

export const escopoQuerySchema = z.object({
  escopo: z.enum(['esta', 'proximas', 'todas']).default('esta'),
})

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
