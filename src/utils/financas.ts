// Utilitários de cálculo e formatação financeira.

import type { CategoriaTotal, Lancamento, ResumoMes } from '../types'

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

/** Calcula o saldo total dos lançamentos. Receitas somam, despesas subtraem. */
export function calcularSaldo(lancamentos: Lancamento[]): number {
  return lancamentos.reduce((saldo, lancamento) => {
    return lancamento.tipo === 'receita'
      ? saldo + lancamento.valor
      : saldo - lancamento.valor
  }, 0)
}

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

/** Filtra os lançamentos cuja data pertence ao mês de referência 'YYYY-MM'. */
export function filtrarPorMes(lancamentos: Lancamento[], mesRef: string): Lancamento[] {
  return lancamentos.filter((lancamento) => lancamento.data.slice(0, 7) === mesRef)
}

/** Soma receitas e despesas de um conjunto de lançamentos (já filtrado por mês) e deriva o saldo do período. */
export function calcularResumoMes(lancamentosDoMes: Lancamento[]): ResumoMes {
  const receitas = lancamentosDoMes
    .filter((l) => l.tipo === 'receita')
    .reduce((total, l) => total + l.valor, 0)

  const despesas = lancamentosDoMes
    .filter((l) => l.tipo === 'despesa')
    .reduce((total, l) => total + l.valor, 0)

  return { receitas, despesas, saldo: receitas - despesas }
}

/** Agrupa as despesas de um conjunto de lançamentos por categoria, somando os valores. */
export function agruparDespesasPorCategoria(lancamentosDoMes: Lancamento[]): CategoriaTotal[] {
  const totais = new Map<string, number>()

  for (const lancamento of lancamentosDoMes) {
    if (lancamento.tipo !== 'despesa') continue
    totais.set(lancamento.categoria, (totais.get(lancamento.categoria) ?? 0) + lancamento.valor)
  }

  return Array.from(totais, ([categoria, total]) => ({ categoria, total }))
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
