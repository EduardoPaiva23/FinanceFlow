import { useEffect, useState } from 'react'

/**
 * Hook genérico para manter um estado sincronizado com o LocalStorage.
 * @param {string} chave chave usada no LocalStorage
 * @param {*} valorInicial valor usado quando não há nada salvo
 */
export function useLocalStorage(chave, valorInicial) {
  const [valor, setValor] = useState(() => {
    try {
      const salvo = window.localStorage.getItem(chave)
      return salvo !== null ? JSON.parse(salvo) : valorInicial
    } catch {
      return valorInicial
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(chave, JSON.stringify(valor))
    } catch {
      // Ignora erros de escrita (ex.: modo privado / quota excedida).
    }
  }, [chave, valor])

  return [valor, setValor]
}
