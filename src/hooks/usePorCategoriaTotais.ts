import { useEffect, useState } from 'react'
import { buscarPorCategoria } from '../api/lancamentos'
import type { CategoriaTotal } from '../types'

interface UsePorCategoriaTotaisParams {
  mes: string
  versao: number
}

interface UsePorCategoriaTotaisResult {
  dados: CategoriaTotal[]
  carregando: boolean
  erro: string | null
}

/** Hook que busca os totais de despesas por categoria do mês selecionado (para o gráfico). */
export function usePorCategoriaTotais({ mes, versao }: UsePorCategoriaTotaisParams): UsePorCategoriaTotaisResult {
  const [dados, setDados] = useState<CategoriaTotal[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const resultado = await buscarPorCategoria(mes)
        if (ativo) setDados(resultado)
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

  return { dados, carregando, erro }
}
