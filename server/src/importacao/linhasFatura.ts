import { descricaoDeCredito, linhaIgnorada, type ItemBruto, type ResultadoLeitura } from './tipos.js'

// Parser genérico de fatura: não depende do layout de um banco. Considera lançamento
// toda linha no formato  <data> <descrição> <valor em reais>.

const MESES: Record<string, number> = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
}

const DATA_NUMERICA = /^(\d{2})\/(\d{2})(?:\/(\d{4}|\d{2}))?(?!\d)/
const DATA_POR_EXTENSO = /^(\d{1,2})\s+(?:de\s+)?(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-ZÇ]*\.?(?:\s+(?:de\s+)?(\d{4}))?/i
// Último valor monetário da linha (em fatura com coluna em dólar, o real vem por último).
const VALOR_NO_FIM = /(-|\+)?\s*(?:R\$\s*)?(-)?\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*(-|CR|C)?$/i

const VENCIMENTO =
  /vencimento[^\d]{0,20}(\d{2})\/(\d{2})\/(\d{4})|vencimento[^\d]{0,20}(\d{1,2})\s+(?:de\s+)?(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-ZÇ]*\.?\s+(?:de\s+)?(\d{4})/i

function iso(ano: number, mes: number, dia: number): string | undefined {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return undefined
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function acharVencimento(linhas: string[]): string | undefined {
  for (const linha of linhas) {
    const m = linha.match(VENCIMENTO)
    if (!m) continue
    if (m[1]) return iso(Number(m[3]), Number(m[2]), Number(m[1]))
    return iso(Number(m[6]), MESES[m[5].toUpperCase()], Number(m[4]))
  }
  return undefined
}

/**
 * Linhas de fatura raramente trazem o ano. Assume o ano da referência (vencimento ou
 * hoje); se o mês da compra for posterior ao da referência, a compra é do ano anterior.
 */
function inferirAno(mes: number, referencia: string): number {
  const [anoRef, mesRef] = referencia.split('-').map(Number)
  return mes > mesRef ? anoRef - 1 : anoRef
}

export function lerLinha(linha: string, referencia: string): ItemBruto | null {
  const texto = linha.replace(/\s+/g, ' ').trim()

  let dia: number
  let mes: number
  let ano: number | undefined
  let resto: string

  const numerica = texto.match(DATA_NUMERICA)
  const extenso = numerica ? null : texto.match(DATA_POR_EXTENSO)
  if (numerica) {
    dia = Number(numerica[1])
    mes = Number(numerica[2])
    if (numerica[3]) ano = numerica[3].length === 2 ? 2000 + Number(numerica[3]) : Number(numerica[3])
    resto = texto.slice(numerica[0].length)
  } else if (extenso) {
    dia = Number(extenso[1])
    mes = MESES[extenso[2].toUpperCase()]
    if (extenso[3]) ano = Number(extenso[3])
    resto = texto.slice(extenso[0].length)
  } else {
    return null
  }

  const valorMatch = resto.match(VALOR_NO_FIM)
  if (!valorMatch) return null

  const descricao = resto.slice(0, valorMatch.index).replace(/R\$\s*$/, '').trim()
  // Sem ao menos uma letra não é descrição de compra (ex.: linhas só com números).
  if (!/[A-Za-zÀ-ú]/.test(descricao)) return null
  if (linhaIgnorada(descricao)) return null

  const valor = Number(valorMatch[3].replace(/\./g, '').replace(',', '.'))
  if (!valor) return null

  const data = iso(ano ?? inferirAno(mes, referencia), mes, dia)
  if (!data) return null

  const negativo = valorMatch[1] === '-' || valorMatch[2] === '-' || Boolean(valorMatch[4])
  return {
    data,
    descricao,
    valor,
    tipo: negativo || descricaoDeCredito(descricao) ? 'receita' : 'despesa',
  }
}

export function lerLinhasFatura(linhas: string[], hoje: string): ResultadoLeitura {
  const dataReferencia = acharVencimento(linhas)
  const referencia = dataReferencia ?? hoje
  const itens: ItemBruto[] = []
  for (const linha of linhas) {
    const item = lerLinha(linha, referencia)
    if (item) itens.push(item)
  }
  return { itens, dataReferencia }
}
