import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import type { Usuario } from '../types'

interface AuthContextValue {
  usuario: Usuario | null
  carregando: boolean
  login: (email: string, senha: string) => Promise<void>
  registrar: (email: string, senha: string, nome?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    authApi
      .buscarUsuarioAtual()
      .then((u) => {
        if (ativo) setUsuario(u)
      })
      .catch(() => {
        // usuário não autenticado — comportamento normal ao abrir o app
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  async function login(email: string, senha: string) {
    setUsuario(await authApi.login({ email, senha }))
  }

  async function registrar(email: string, senha: string, nome?: string) {
    setUsuario(await authApi.registrar({ email, senha, nome }))
  }

  async function logout() {
    await authApi.logout()
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, registrar, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
