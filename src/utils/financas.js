// Utilitários de cálculo e formatação financeira.

/**
 * Calcula o saldo total dos lançamentos usando reduce().
 * Receitas somam, despesas subtraem.
 * @param {Array<{tipo: 'receita'|'despesa', valor: number}>} lancamentos
 * @returns {number}
 */
export function calcularSaldo(lancamentos) {
  return lancamentos.reduce((saldo, lancamento) => {
    return lancamento.tipo === 'receita'
      ? saldo + lancamento.valor
      : saldo - lancamento.valor
  }, 0)
}

/**
 * Formata um número como moeda brasileira (BRL).
 * @param {number} valor
 * @returns {string}
 */
export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

/**
 * Formata uma data 'YYYY-MM-DD' para o formato dd/mm/aaaa.
 * @param {string} data
 * @returns {string}
 */
export function formatarData(data) {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}
