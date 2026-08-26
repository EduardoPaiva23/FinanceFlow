import { useEffect, useState } from 'react'
import { listarLancamentos } from '../api/lancamentos'
import type { Lancamento, TipoLancamento } from '../types'

interface UseLancamentosParams {
  mes: string
  busca: string
  tipo: TipoLancamento | 'todos'
  ordem: 'asc' | 'desc'
  versao: number
}

interface UseLancamentosResult {
  lancamentos: Lancamento[]
  carregando: boolean
  erro: string | null
}

/** Hook que busca os lançamentos do mês selecionado, já filtrados/ordenados pelo backend. */
export function useLancamentos({ mes, busca, tipo, ordem, versao }: UseLancamentosParams): UseLancamentosResult {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const dados = await listarLancamentos({ mes, busca, tipo, ordem })
        if (ativo) setLancamentos(dados)
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
  }, [mes, busca, tipo, ordem, versao])

  return { lancamentos, carregando, erro }
}
