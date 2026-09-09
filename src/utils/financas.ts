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

/** Desloca um mês de referência 'YYYY-MM' em `delta` meses (positivo ou negativo). */
export function deslocarMes(mesRef: string, delta: number): string {
  const [ano, mes] = mesRef.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1 + delta, 1))
  return data.toISOString().slice(0, 7)
}
