// API fake: busca a lista de categorias de um JSON servido estaticamente.
// Demonstra fetch + async/await + tratamento de erro.

export async function buscarCategorias(): Promise<string[]> {
  // Pequeno atraso artificial para simular uma requisição de rede real
  // e permitir observar o estado de carregamento na interface.
  await new Promise((resolve) => setTimeout(resolve, 600))

  const resposta = await fetch('/categorias.json')

  if (!resposta.ok) {
    throw new Error(`Falha ao buscar categorias (HTTP ${resposta.status})`)
  }

  return resposta.json()
}
