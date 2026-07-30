import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

/** Hook genérico para manter um estado sincronizado com o LocalStorage. */
export function useLocalStorage<T>(
  chave: string,
  valorInicial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const salvo = window.localStorage.getItem(chave)
      return salvo !== null ? (JSON.parse(salvo) as T) : valorInicial
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
