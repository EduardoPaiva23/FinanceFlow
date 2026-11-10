export type TipoItem = 'receita' | 'despesa'

/** Lançamento lido do arquivo, antes de qualquer comparação com o banco. */
export interface ItemBruto {
  /** YYYY-MM-DD, como consta no arquivo. */
  data: string
  descricao: string
  /** Sempre positivo. */
  valor: number
  tipo: TipoItem
  fitid?: string
}

export interface ResultadoLeitura {
  itens: ItemBruto[]
  /** Data de fechamento/vencimento da fatura, quando o arquivo informa. */
  dataReferencia?: string
}

export type CodigoErroLeitura =
  | 'FORMATO_INVALIDO'
  | 'ARQUIVO_CORROMPIDO'
  | 'SEM_LANCAMENTOS'
  | 'PDF_SENHA_NECESSARIA'
  | 'PDF_SENHA_INCORRETA'
  | 'PDF_SEM_TEXTO'
  | 'PDF_NAO_RECONHECIDO'

export class ErroLeitura extends Error {
  codigo: CodigoErroLeitura
  constructor(codigo: CodigoErroLeitura) {
    super(codigo)
    this.codigo = codigo
  }
}

// Linhas da fatura que não são compra: não viram lançamento (CA 1.12).
// Os termos são específicos de resumo de fatura para não descartar lojas como "POSTO TOTAL".
const PADRAO_IGNORAR =
  /\b(pagamento (recebido|efetuado|de fatura|da fatura|em|via|minimo|total)|pagto|pgto|saldo (anterior|atual|devedor|total|em|da|do|financiado)|total (da|de|desta|a pagar|geral|nacional|internacional|para|dos|das)|subtotal|limite (de|total|disponivel|unico)|fatura anterior|valor (total|minimo))\b|^(pagamento|total|saldo)\b/i

// Encargos são despesa mesmo contendo palavras como "total".
const PADRAO_ENCARGO = /\b(juros|iof|anuidade|multa|encargos?|tarifa)\b/i

const PADRAO_CREDITO = /\b(estorno|cashback|devolucao|reembolso|credito)\b/i

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function linhaIgnorada(descricao: string): boolean {
  const texto = semAcento(descricao)
  if (PADRAO_ENCARGO.test(texto)) return false
  return PADRAO_IGNORAR.test(texto)
}

export function descricaoDeCredito(descricao: string): boolean {
  return PADRAO_CREDITO.test(semAcento(descricao))
}
