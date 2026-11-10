import { z } from 'zod'
import type { Resolver } from 'react-hook-form'

const dataRegex = /^\d{4}-\d{2}-\d{2}$/

export const MIN_PARCELAS = 2
export const MAX_PARCELAS = 48
const MSG_PARCELAS = `Informe entre ${MIN_PARCELAS} e ${MAX_PARCELAS} parcelas`

// Campos numéricos opcionais: '' (ou NaN, vindo de valueAsNumber) significa "não preenchido".
const inteiroOpcional = z.preprocess(
  (v) => (v === '' || v === null || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
  z.coerce.number().optional(),
)

export const lancamentoSchema = z
  .object({
    descricao: z.string().trim().min(1, 'Informe a descrição'),
    valor: z.coerce
      .number({ invalid_type_error: 'Informe um valor válido' })
      .positive('O valor deve ser positivo'),
    tipo: z.enum(['receita', 'despesa']),
    data: z.string().regex(dataRegex, 'Data deve estar no formato YYYY-MM-DD'),
    // "" representa "nada selecionado" no <select> — mensagem amigável em vez de uuid().
    categoriaId: z.string().min(1, 'Selecione uma categoria'),

    // Parcelamento (só na criação).
    parcelado: z.boolean(),
    totalParcelas: inteiroOpcional,
    parcelaInicial: inteiroOpcional,
    modoValor: z.enum(['total', 'parcela']),
  })
  .superRefine((dados, ctx) => {
    if (!dados.parcelado) return
    const total = dados.totalParcelas
    if (total === undefined || !Number.isInteger(total) || total < MIN_PARCELAS || total > MAX_PARCELAS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['totalParcelas'], message: MSG_PARCELAS })
      return
    }
    const inicial = dados.parcelaInicial ?? 1
    if (!Number.isInteger(inicial) || inicial < 1 || inicial > total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['parcelaInicial'],
        message: `Informe uma parcela entre 1 e ${total}`,
      })
    }
  })

// z.coerce.number() só afeta o runtime; o tipo estático de entrada continua `number`.
// Alargamos os campos numéricos para aceitar também '' e manter o campo visualmente
// vazio ao abrir o formulário de criação (em vez de mostrar "0").
export type LancamentoFormValues = Omit<
  z.infer<typeof lancamentoSchema>,
  'valor' | 'totalParcelas' | 'parcelaInicial'
> & {
  valor: number | ''
  totalParcelas: number | ''
  parcelaInicial: number | ''
}

export type LancamentoResolver = Resolver<LancamentoFormValues>
