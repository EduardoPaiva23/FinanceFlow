// Regras puras de parcelamento: datas, arredondamento e detecção de "X/N" na descrição.

export const MIN_PARCELAS = 2
export const MAX_PARCELAS = 48

/**
 * Soma `meses` a uma data 'YYYY-MM-DD' mantendo o dia. Quando o dia não existe no
 * mês de destino (ex.: 31 em fevereiro), usa o último dia do mês.
 */
export function somarMeses(data: string, meses: number): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  const indice = ano * 12 + (mes - 1) + meses
  const anoDestino = Math.floor(indice / 12)
  const mesDestino = (indice % 12) + 1
  const ultimoDia = new Date(Date.UTC(anoDestino, mesDestino, 0)).getUTCDate()
  const diaDestino = Math.min(dia, ultimoDia)
  return `${anoDestino}-${String(mesDestino).padStart(2, '0')}-${String(diaDestino).padStart(2, '0')}`
}

export function paraCentavos(valor: number): number {
  return Math.round(valor * 100)
}

/**
 * Divide um total em `n` parcelas (em reais). Cada parcela é arredondada para baixo
 * em centavos e a diferença entra na primeira, de modo que a soma seja o total.
 */
export function dividirTotal(total: number, n: number): number[] {
  const totalCentavos = paraCentavos(total)
  const base = Math.floor(totalCentavos / n)
  const resto = totalCentavos - base * n
  return Array.from({ length: n }, (_, i) => (base + (i === 0 ? resto : 0)) / 100)
}

export function parcelaValida(numero: number, total: number): boolean {
  return (
    Number.isInteger(numero) &&
    Number.isInteger(total) &&
    total >= MIN_PARCELAS &&
    total <= MAX_PARCELAS &&
    numero >= 1 &&
    numero <= total
  )
}

// "Parcela 3 de 10", "PARC 03/10", "3/10". Os lookarounds evitam casar datas (12/11/2026).
const PADROES_PARCELA = [
  /\(?\bparc(?:ela)?\.?\s*(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})\b\)?/gi,
  /\(?(?<![\d/])(\d{1,2})\s*\/\s*(\d{1,2})(?![\d/])\)?/g,
]

export interface ParcelaDetectada {
  numero: number
  total: number
  /** Descrição sem o trecho da parcela. */
  descricaoLimpa: string
}

/** Remove da descrição qualquer trecho com cara de parcela ("03/10", "(3/10)", "Parcela 3 de 10"). */
export function removerTrechoParcela(descricao: string): string {
  let limpa = descricao
  for (const padrao of PADROES_PARCELA) {
    limpa = limpa.replace(new RegExp(padrao.source, padrao.flags), ' ')
  }
  return limpa.replace(/\s+/g, ' ').replace(/[\s\-–]+$/, '').trim()
}

/**
 * Identifica a indicação de parcela na descrição. Indicações inválidas
 * (X > N, N = 1, N acima do limite) retornam null — o lançamento é tratado como à vista.
 */
export function detectarParcela(descricao: string): ParcelaDetectada | null {
  for (const padrao of PADROES_PARCELA) {
    const ocorrencias = [...descricao.matchAll(new RegExp(padrao.source, padrao.flags))]
    // A indicação de parcela costuma vir no fim da descrição.
    for (const m of ocorrencias.reverse()) {
      const numero = Number(m[1])
      const total = Number(m[2])
      if (!parcelaValida(numero, total)) continue
      const limpa = (descricao.slice(0, m.index) + ' ' + descricao.slice(m.index! + m[0].length))
        .replace(/\s+/g, ' ')
        .replace(/[\s\-–]+$/, '')
        .trim()
      return { numero, total, descricaoLimpa: limpa || descricao.trim() }
    }
  }
  return null
}

export function descricaoComParcela(descricaoLimpa: string, numero: number, total: number): string {
  return `${descricaoLimpa} (${numero}/${total})`
}
