const BASE = '/api'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })

  if (!resposta.ok) {
    let mensagem = `Erro na requisição (HTTP ${resposta.status})`
    try {
      const corpo = await resposta.json()
      if (corpo?.error) mensagem = corpo.error
    } catch {
      // resposta sem corpo JSON
    }
    throw new ApiError(resposta.status, mensagem)
  }

  if (resposta.status === 204) return undefined as T
  return resposta.json()
}
