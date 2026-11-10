const BASE = '/api'

export class ApiError extends Error {
  status: number
  /** Código de erro de negócio enviado pelo backend (ex.: 'PDF_SENHA_NECESSARIA'). */
  codigo?: string
  constructor(status: number, message: string, codigo?: string) {
    super(message)
    this.status = status
    this.codigo = codigo
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Em upload (FormData) o navegador define o Content-Type com o boundary.
  const ehUpload = options.body instanceof FormData
  const resposta = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...(ehUpload ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
  })

  if (!resposta.ok) {
    let mensagem = `Erro na requisição (HTTP ${resposta.status})`
    let codigo: string | undefined
    try {
      const corpo = await resposta.json()
      if (corpo?.error) mensagem = corpo.error
      if (typeof corpo?.details?.codigo === 'string') codigo = corpo.details.codigo
    } catch {
      // resposta sem corpo JSON
    }
    throw new ApiError(resposta.status, mensagem, codigo)
  }

  if (resposta.status === 204) return undefined as T
  return resposta.json()
}
