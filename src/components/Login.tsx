import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'
import { loginSchema, type LoginFormValues } from '../schemas/auth.schema'

interface LoginProps {
  onIrParaRegistrar: () => void
}

export default function Login({ onIrParaRegistrar }: LoginProps) {
  const { login } = useAuth()
  const [erroApi, setErroApi] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '' },
  })

  const label = 'block text-sm font-medium text-slate-600 mb-1'
  const input =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

  const aoSubmeter = handleSubmit(async (dados) => {
    setErroApi(null)
    try {
      await login(dados.email, dados.senha)
    } catch (e) {
      setErroApi(e instanceof ApiError ? e.message : 'Não foi possível entrar.')
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={aoSubmeter}
        noValidate
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
              {...register('email')}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
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
              {...register('senha')}
            />
            {errors.senha && <p className="mt-1 text-xs text-red-600">{errors.senha.message}</p>}
          </div>
        </div>

        {erroApi && (
          <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 ring-1 ring-red-200">
            {erroApi}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60"
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
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
