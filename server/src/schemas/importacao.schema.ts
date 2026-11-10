import { z } from 'zod'
import { parcelaValida } from '../lib/parcelas.js'

const dataRegex = /^\d{4}-\d{2}-\d{2}$/

const itemConfirmarSchema = z.object({
  idTemp: z.string().min(1),
  dataOriginal: z.string().regex(dataRegex),
  data: z.string().regex(dataRegex),
  descricaoOriginal: z.string().trim().min(1),
  descricao: z.string().trim().min(1),
  valor: z.number().positive(),
  tipo: z.enum(['receita', 'despesa']),
  fitid: z.string().nullish(),
  parcela: z
    .object({ numero: z.number().int(), total: z.number().int() })
    .refine((p) => parcelaValida(p.numero, p.total), 'Parcela inválida')
    .nullable(),
  ocorrencia: z.number().int().min(1),
  categoriaId: z.string().uuid('Selecione uma categoria'),
})

export const confirmarImportacaoSchema = z.object({
  origem: z.enum(['pdf', 'ofx']),
  itens: z.array(itemConfirmarSchema).min(1).max(2000),
})

export const analisarImportacaoSchema = z.object({
  senha: z.string().max(200).optional(),
})
