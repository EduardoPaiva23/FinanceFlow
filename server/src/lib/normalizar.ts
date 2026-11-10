import { paraCentavos, removerTrechoParcela } from './parcelas.js'

/** Tolerância (em centavos) ao comparar o valor de uma parcela — cobre arredondamento. */
export const TOLERANCIA_PARCELA_CENTAVOS = 5

/**
 * Descrição usada nas comparações: sem o trecho da parcela, sem acentos, em maiúsculas,
 * só letras/números e com espaços únicos.
 */
export function normalizarDescricao(descricao: string): string {
  return removerTrechoParcela(descricao)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

/** Chave de um lançamento à vista: data + valor + descrição normalizada. */
export function chaveGeral(data: string, valor: number, descricao: string): string {
  return `geral|${data}|${paraCentavos(valor)}|${normalizarDescricao(descricao)}`
}

/** Prefixo comum a todas as parcelas de uma compra com N parcelas. */
export function prefixoParcelamento(descricao: string, total: number): string {
  return `parc|${normalizarDescricao(descricao)}|${total}|`
}

/** Chave de uma parcela: descrição normalizada + total + número + valor original. */
export function chaveParcela(descricao: string, numero: number, total: number, valor: number): string {
  return `${prefixoParcelamento(descricao, total)}${numero}|${paraCentavos(valor)}`
}

export interface ChaveParcelaLida {
  prefixo: string
  numero: number
  centavos: number
}

export function lerChaveParcela(chave: string): ChaveParcelaLida | null {
  if (!chave.startsWith('parc|')) return null
  const partes = chave.split('|')
  if (partes.length !== 5) return null
  return {
    prefixo: `${partes.slice(0, 3).join('|')}|`,
    numero: Number(partes[3]),
    centavos: Number(partes[4]),
  }
}
