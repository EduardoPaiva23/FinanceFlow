export type TipoLancamento = 'receita' | 'despesa'

export interface Lancamento {
  id: string
  descricao: string
  valor: number
  tipo: TipoLancamento
  categoria: string
  data: string
}

export interface ResumoMes {
  receitas: number
  despesas: number
  saldo: number
}

export interface CategoriaTotal {
  categoria: string
  total: number
}
