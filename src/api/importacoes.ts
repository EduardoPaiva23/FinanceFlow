import { apiFetch } from './client'
import type { AnaliseImportacao, ItemConfirmar, ResultadoItemImportado } from '../types'

/** Envia o arquivo para leitura. Nada é gravado nesta etapa. */
export async function analisarArquivo(arquivo: File, senha?: string): Promise<AnaliseImportacao> {
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)
  if (senha) corpo.append('senha', senha)
  return apiFetch<AnaliseImportacao>('/importacoes/analisar', { method: 'POST', body: corpo })
}

export async function confirmarItens(
  origem: AnaliseImportacao['origem'],
  itens: ItemConfirmar[],
): Promise<ResultadoItemImportado[]> {
  const { resultados } = await apiFetch<{ resultados: ResultadoItemImportado[] }>('/importacoes/confirmar', {
    method: 'POST',
    body: JSON.stringify({ origem, itens }),
  })
  return resultados
}
