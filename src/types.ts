export type TipoLancamento = 'receita' | 'despesa'

export interface Usuario {
  id: string
  email: string
  nome: string | null
}

export interface Categoria {
  id: string
  nome: string
}

export interface Lancamento {
  id: string
  descricao: string
  valor: number
  tipo: TipoLancamento
  data: string
  categoriaId: string
  categoria: Categoria
}

/** Formato de escrita (POST/PUT) — sem id, sem objeto categoria aninhado. */
export interface LancamentoInput {
  descricao: string
  valor: number
  tipo: TipoLancamento
  data: string
  categoriaId: string
}

export interface ResumoMes {
  receitas: number
  despesas: number
  saldo: number
}

export interface CategoriaTotal {
  categoriaId: string
  categoria: string
  total: number
}
