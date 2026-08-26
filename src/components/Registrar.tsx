import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'

interface RegistrarProps {
  onIrParaLogin: () => void
}

export default function Registrar({ onIrParaLogin }: RegistrarProps) {
  const { registrar } = useAuth()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const label = 'block text-sm font-medium text-slate-600 mb-1'
  const input =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (senha.length < 8) {
      setErro('A senha deve ter ao menos 8 caracteres.')
      return
    }

    setErro(null)
    setEnviando(true)
    try {
      await registrar(email, senha, nome.trim() || undefined)
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível criar a conta.')
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
        <p className="mb-4 text-sm text-slate-500">Crie sua conta para começar a organizar suas finanças.</p>

        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="nome">
              Nome (opcional)
            </label>
            <input
              id="nome"
              type="text"
              autoComplete="name"
              className={input}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

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
              autoComplete="new-password"
              className={input}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-slate-500">Mínimo de 8 caracteres.</p>
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
          {enviando ? 'Criando conta...' : 'Criar conta'}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Já tem conta?{' '}
          <button
            type="button"
            onClick={onIrParaLogin}
            className="font-semibold text-emerald-600 hover:underline"
          >
            Entrar
          </button>
        </p>
      </form>
    </div>
  )
}
