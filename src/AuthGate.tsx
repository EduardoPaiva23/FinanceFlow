import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import Login from './components/Login'
import Registrar from './components/Registrar'
import App from './App'

export default function AuthGate() {
  const { usuario, carregando } = useAuth()
  const [tela, setTela] = useState<'login' | 'registrar'>('login')

  // Sempre volta para a tela de login após um logout, em vez de manter
  // a tela de registro caso o usuário tenha alternado para ela antes.
  useEffect(() => {
    if (!usuario) setTela('login')
  }, [usuario])

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        Carregando...
      </div>
    )
  }

  if (!usuario) {
    return tela === 'login' ? (
      <Login onIrParaRegistrar={() => setTela('registrar')} />
    ) : (
      <Registrar onIrParaLogin={() => setTela('login')} />
    )
  }

  return <App />
}
