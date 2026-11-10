import { apiFetch } from './client'
import type {
  CategoriaTotal,
  EscopoParcelas,
  Lancamento,
  LancamentoInput,
  LancamentoParceladoInput,
  ResumoMes,
  TipoLancamento,
} from '../types'

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

export async function criarLancamentoParcelado(dados: LancamentoParceladoInput): Promise<Lancamento[]> {
  const { lancamentos } = await apiFetch<{ lancamentos: Lancamento[] }>('/lancamentos/parcelado', {
    method: 'POST',
    body: JSON.stringify(dados),
  })
  return lancamentos
}

export async function atualizarLancamento(
  id: string,
  dados: LancamentoInput,
  escopo: EscopoParcelas = 'esta',
): Promise<Lancamento> {
  return apiFetch<Lancamento>(`/lancamentos/${id}?escopo=${escopo}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  })
}

export async function excluirLancamento(id: string, escopo: EscopoParcelas = 'esta'): Promise<number> {
  const { excluidos } = await apiFetch<{ excluidos: number }>(`/lancamentos/${id}?escopo=${escopo}`, {
    method: 'DELETE',
  })
  return excluidos
}

/** Quantos lançamentos cada escopo atinge (incluindo a própria parcela). */
export async function contarParcelas(id: string): Promise<{ proximas: number; todas: number }> {
  return apiFetch<{ proximas: number; todas: number }>(`/lancamentos/${id}/parcelas`)
}

export async function buscarResumoMes(mes: string): Promise<ResumoMes> {
  return apiFetch<ResumoMes>(`/lancamentos/resumo?mes=${mes}`)
}

export async function buscarPorCategoria(mes: string): Promise<CategoriaTotal[]> {
  return apiFetch<CategoriaTotal[]>(`/lancamentos/por-categoria?mes=${mes}`)
}
