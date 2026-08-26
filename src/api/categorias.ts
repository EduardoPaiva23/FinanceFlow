import { apiFetch } from './client'
import type { Categoria } from '../types'

export async function buscarCategorias(): Promise<Categoria[]> {
  return apiFetch<Categoria[]>('/categorias')
}

export async function criarCategoria(nome: string): Promise<Categoria> {
  return apiFetch<Categoria>('/categorias', {
    method: 'POST',
    body: JSON.stringify({ nome }),
  })
}

export async function atualizarCategoria(id: string, nome: string): Promise<Categoria> {
  return apiFetch<Categoria>(`/categorias/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ nome }),
  })
}

export async function excluirCategoria(id: string): Promise<void> {
  return apiFetch<void>(`/categorias/${id}`, { method: 'DELETE' })
}
