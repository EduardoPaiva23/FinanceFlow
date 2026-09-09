import { apiFetch } from './client'
import type { Usuario } from '../types'

export function registrar(dados: { email: string; senha: string; nome?: string }): Promise<Usuario> {
  return apiFetch<Usuario>('/auth/registrar', { method: 'POST', body: JSON.stringify(dados) })
}

export function login(dados: { email: string; senha: string }): Promise<Usuario> {
  return apiFetch<Usuario>('/auth/login', { method: 'POST', body: JSON.stringify(dados) })
}

export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' })
}

export function buscarUsuarioAtual(): Promise<Usuario> {
  return apiFetch<Usuario>('/auth/me')
}
