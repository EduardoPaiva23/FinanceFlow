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
  /** Preenchidos quando o lançamento é uma parcela. */
  parcelamentoId: string | null
  parcelaNumero: number | null
  parcelaTotal: number | null
  origem: 'manual' | 'pdf' | 'ofx'
}

/** A quais parcelas uma edição/exclusão se aplica. */
export type EscopoParcelas = 'esta' | 'proximas' | 'todas'

export interface LancamentoParceladoInput extends LancamentoInput {
  totalParcelas: number
  parcelaInicial: number
  /** 'total': `valor` é o total da compra; 'parcela': `valor` é o de cada parcela. */
  modoValor: 'total' | 'parcela'
  confirmarDuplicado?: boolean
}

export type EstadoItemImportado = 'novo' | 'ja_cadastrado' | 'possivel_duplicidade'

/** Lançamento identificado no arquivo importado, já comparado com os cadastrados. */
export interface ItemImportado {
  idTemp: string
  dataOriginal: string
  data: string
  descricaoOriginal: string
  descricao: string
  valor: number
  tipo: TipoLancamento
  fitid: string | null
  parcela: { numero: number; total: number } | null
  ocorrencia: number
  estado: EstadoItemImportado
  existente: { id: string; descricao: string; valor: number; data: string } | null
  categoriaIdSugerida: string | null
}

export interface AnaliseImportacao {
  arquivo: string
  origem: 'pdf' | 'ofx'
  itens: ItemImportado[]
}

export type ItemConfirmar = Omit<ItemImportado, 'estado' | 'existente' | 'categoriaIdSugerida'> & {
  categoriaId: string
}

export type ResultadoItemImportado =
  | { idTemp: string; status: 'adicionado'; parcelasFuturasCriadas: number }
  | { idTemp: string; status: 'ja_cadastrado' }
  | { idTemp: string; status: 'erro'; mensagem: string }

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
