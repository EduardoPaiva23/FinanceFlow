import { apiFetch } from './client'
import type { CategoriaTotal, Lancamento, LancamentoInput, ResumoMes, TipoLancamento } from '../types'

interface ListarLancamentosParams {
  mes: string
  busca?: string
  tipo?: TipoLancamento | 'todos'
  ordem?: 'asc' | 'desc'
}

export async function listarLancamentos({
  mes,
  busca,
  tipo,
  ordem,
}: ListarLancamentosParams): Promise<Lancamento[]> {
  const query = new URLSearchParams({ mes })
  if (busca) query.set('busca', busca)
  if (tipo && tipo !== 'todos') query.set('tipo', tipo)
  if (ordem) query.set('ordem', ordem)

  return apiFetch<Lancamento[]>(`/lancamentos?${query.toString()}`)
}

export async function criarLancamento(dados: LancamentoInput): Promise<Lancamento> {
  return apiFetch<Lancamento>('/lancamentos', {
    method: 'POST',
    body: JSON.stringify(dados),
  })
}

export async function atualizarLancamento(id: string, dados: LancamentoInput): Promise<Lancamento> {
  return apiFetch<Lancamento>(`/lancamentos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  })
}

export async function excluirLancamento(id: string): Promise<void> {
  return apiFetch<void>(`/lancamentos/${id}`, { method: 'DELETE' })
}

export async function buscarResumoMes(mes: string): Promise<ResumoMes> {
  return apiFetch<ResumoMes>(`/lancamentos/resumo?mes=${mes}`)
}

export async function buscarPorCategoria(mes: string): Promise<CategoriaTotal[]> {
  return apiFetch<CategoriaTotal[]>(`/lancamentos/por-categoria?mes=${mes}`)
}
