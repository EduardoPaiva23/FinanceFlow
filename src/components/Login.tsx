import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'

interface LoginProps {
  onIrParaRegistrar: () => void
}

export default function Login({ onIrParaRegistrar }: LoginProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const label = 'block text-sm font-medium text-slate-600 mb-1'
  const input =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await login(email, senha)
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível entrar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-800">💸 FinanceFlow</h1>
        <p className="mb-4 text-sm text-slate-500">Entre com sua conta para continuar.</p>

        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className={label} htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              className={input}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
        </div>

        {erro && (
          <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 ring-1 ring-red-200">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60"
        >
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Ainda não tem conta?{' '}
          <button
            type="button"
            onClick={onIrParaRegistrar}
            className="font-semibold text-emerald-600 hover:underline"
          >
            Criar conta
          </button>
        </p>
      </form>
    </div>
  )
}
