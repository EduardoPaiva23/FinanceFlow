import { z } from 'zod'
import type { Resolver } from 'react-hook-form'

const dataRegex = /^\d{4}-\d{2}-\d{2}$/

export const lancamentoSchema = z.object({
  descricao: z.string().trim().min(1, 'Informe a descrição'),
  valor: z.coerce
    .number({ invalid_type_error: 'Informe um valor válido' })
    .positive('O valor deve ser positivo'),
  tipo: z.enum(['receita', 'despesa']),
  data: z.string().regex(dataRegex, 'Data deve estar no formato YYYY-MM-DD'),
  // "" representa "nada selecionado" no <select> — mensagem amigável em vez de uuid().
  categoriaId: z.string().min(1, 'Selecione uma categoria'),
})

// z.coerce.number() só afeta o runtime; o tipo estático de entrada continua `number`.
// Alargamos `valor` para aceitar também '' para manter o campo visualmente vazio ao
// abrir o formulário de criação (em vez de mostrar "0").
export type LancamentoFormValues = Omit<z.infer<typeof lancamentoSchema>, 'valor'> & {
  valor: number | ''
}

export type LancamentoResolver = Resolver<LancamentoFormValues>
