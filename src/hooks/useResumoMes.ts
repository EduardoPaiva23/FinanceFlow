import { useEffect, useState } from 'react'
import { buscarResumoMes } from '../api/lancamentos'
import type { ResumoMes } from '../types'

const resumoVazio: ResumoMes = { receitas: 0, despesas: 0, saldo: 0 }

interface UseResumoMesParams {
  mes: string
  versao: number
}

interface UseResumoMesResult {
  resumo: ResumoMes
  carregando: boolean
  erro: string | null
}

/** Hook que busca o resumo (receitas/despesas/saldo) do mês selecionado. */
export function useResumoMes({ mes, versao }: UseResumoMesParams): UseResumoMesResult {
  const [resumo, setResumo] = useState<ResumoMes>(resumoVazio)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const dados = await buscarResumoMes(mes)
        if (ativo) setResumo(dados)
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : String(e))
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [mes, versao])

  return { resumo, carregando, erro }
}
