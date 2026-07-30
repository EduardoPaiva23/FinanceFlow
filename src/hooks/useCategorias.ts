import { useEffect, useState } from 'react'
import { buscarCategorias } from '../api/categorias'

interface UseCategoriasResult {
  categorias: string[]
  carregando: boolean
  erro: string | null
}

/** Hook que consome a API fake de categorias. */
export function useCategorias(): UseCategoriasResult {
  const [categorias, setCategorias] = useState<string[]>([])
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
