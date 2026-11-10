import { lerLinhasFatura } from './linhasFatura.js'
import { ErroLeitura, type ResultadoLeitura } from './tipos.js'

export function parecePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 1024).toString('latin1').includes('%PDF-')
}

interface ItemTexto {
  str: string
  transform: number[]
}

/** Agrupa os fragmentos de texto de uma página em linhas, pela posição vertical. */
function montarLinhas(itens: ItemTexto[]): string[] {
  const fragmentos = itens
    .filter((i) => i.str.trim() !== '')
    .map((i) => ({ texto: i.str, x: i.transform[4], y: i.transform[5] }))
    .sort((a, b) => b.y - a.y || a.x - b.x)

  const linhas: { y: number; partes: { texto: string; x: number }[] }[] = []
  for (const f of fragmentos) {
    const atual = linhas[linhas.length - 1]
    // Fragmentos a menos de 3pt de distância vertical pertencem à mesma linha.
    if (atual && Math.abs(atual.y - f.y) < 3) atual.partes.push(f)
    else linhas.push({ y: f.y, partes: [f] })
  }

  return linhas.map((l) =>
    l.partes
      .sort((a, b) => a.x - b.x)
      .map((p) => p.texto)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

export async function extrairLinhasPdf(buffer: Buffer, senha?: string): Promise<string[]> {
  // Build "legacy": é a indicada para Node (sem DOM/canvas).
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

  const tarefa = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    password: senha,
    useSystemFonts: true,
    verbosity: 0,
  })

  let documento
  try {
    documento = await tarefa.promise
  } catch (erro) {
    await tarefa.destroy().catch(() => undefined)
    const nome = (erro as { name?: string })?.name
    if (nome === 'PasswordException') {
      const codigo = (erro as { code?: number }).code
      throw new ErroLeitura(
        codigo === pdfjs.PasswordResponses.INCORRECT_PASSWORD ? 'PDF_SENHA_INCORRETA' : 'PDF_SENHA_NECESSARIA',
      )
    }
    throw new ErroLeitura('ARQUIVO_CORROMPIDO')
  }

  try {
    const linhas: string[] = []
    for (let n = 1; n <= documento.numPages; n++) {
      const pagina = await documento.getPage(n)
      const conteudo = await pagina.getTextContent()
      linhas.push(...montarLinhas(conteudo.items as ItemTexto[]))
    }
    return linhas
  } catch {
    throw new ErroLeitura('ARQUIVO_CORROMPIDO')
  } finally {
    await tarefa.destroy().catch(() => undefined)
  }
}

export async function lerPdf(buffer: Buffer, hoje: string, senha?: string): Promise<ResultadoLeitura> {
  const linhas = await extrairLinhasPdf(buffer, senha)

  // PDF escaneado: páginas existem, mas quase não há texto extraível.
  const caracteres = linhas.reduce((total, l) => total + l.length, 0)
  if (caracteres < 20) throw new ErroLeitura('PDF_SEM_TEXTO')

  const resultado = lerLinhasFatura(linhas, hoje)
  if (resultado.itens.length === 0) throw new ErroLeitura('PDF_NAO_RECONHECIDO')
  return resultado
}
