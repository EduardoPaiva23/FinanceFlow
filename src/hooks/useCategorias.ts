import { useEffect, useState } from 'react'
import { buscarCategorias } from '../api/categorias'
import type { Categoria } from '../types'

interface UseCategoriasResult {
  categorias: Categoria[]
  carregando: boolean
  erro: string | null
}

/** Hook que consome a API de categorias. */
export function useCategorias(): UseCategoriasResult {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const dados = await buscarCategorias()
        if (ativo) setCategorias(dados)
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
  }, [])

  return { categorias, carregando, erro }
}
