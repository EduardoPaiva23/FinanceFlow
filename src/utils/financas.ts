// Utilitários de formatação financeira.
// Cálculos de resumo/agrupamento por categoria e filtro por mês agora são
// feitos pelo backend (ver server/src/services/lancamentos.service.ts).

const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

/** Formata um número como moeda brasileira (BRL). */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

/** Formata uma data 'YYYY-MM-DD' para o formato dd/mm/aaaa. */
export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

/** Retorna o mês de referência ('YYYY-MM') do dia de hoje. */
export function mesAtual(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Formata um mês de referência 'YYYY-MM' como "Julho de 2026". */
export function formatarMesReferencia(mesRef: string): string {
  const [ano, mes] = mesRef.split('-').map(Number)
  return `${NOMES_MESES[mes - 1]} de ${ano}`
}

/** Formata uma data ou mês ('YYYY-MM-DD' / 'YYYY-MM') como "nov/2026". */
export function formatarMesCurto(data: string): string {
  const [ano, mes] = data.split('-').map(Number)
  return `${NOMES_MESES[mes - 1].slice(0, 3).toLowerCase()}/${ano}`
}

// As duas funções abaixo espelham server/src/lib/parcelas.ts e servem só para a
// prévia na tela; quem grava as parcelas é o backend.

/**
 * Soma `meses` a uma data 'YYYY-MM-DD' mantendo o dia; quando o dia não existe no
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

/** Divide um total em `n` parcelas; a diferença de centavos entra na primeira. */
export function dividirTotal(total: number, n: number): number[] {
  const centavos = Math.round(total * 100)
  const base = Math.floor(centavos / n)
  const resto = centavos - base * n
  return Array.from({ length: n }, (_, i) => (base + (i === 0 ? resto : 0)) / 100)
}

/** Desloca um mês de referência 'YYYY-MM' em `delta` meses (positivo ou negativo). */
export function deslocarMes(mesRef: string, delta: number): string {
  const [ano, mes] = mesRef.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1 + delta, 1))
  return data.toISOString().slice(0, 7)
}
