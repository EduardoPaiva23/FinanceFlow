import { useEffect, useState } from 'react'
import { buscarCategorias } from '../api/categorias'

/**
 * Hook que consome a API fake de categorias.
 * @returns {{ categorias: string[], carregando: boolean, erro: string|null }}
 */
export function useCategorias() {
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setCarregando(true)
      setErro(null)
      try {
        const dados = await buscarCategorias()
        if (ativo) setCategorias(dados)
      } catch (e) {
        if (ativo) setErro(e.message)
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
