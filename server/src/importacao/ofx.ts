import { ErroLeitura, linhaIgnorada, type ItemBruto, type ResultadoLeitura } from './tipos.js'

export function pareceOfx(buffer: Buffer): boolean {
  const inicio = buffer.subarray(0, 4096).toString('latin1').toUpperCase()
  return inicio.includes('OFXHEADER') || inicio.includes('<OFX>')
}

/** OFX brasileiro costuma vir em Windows-1252; os mais novos, em UTF-8. */
function decodificar(buffer: Buffer): string {
  // O cabeçalho nem sempre diz a verdade (há bancos que declaram 1252 e gravam UTF-8),
  // então tenta UTF-8 estrito e cai para 1252 se houver byte inválido.
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1252').decode(buffer)
  }
}

function campo(bloco: string, tag: string): string | undefined {
  const m = bloco.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'))
  const valor = m?.[1].trim()
  return valor ? valor : undefined
}

function desescapar(texto: string): string {
  return texto
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function lerData(bruta: string | undefined): string | undefined {
  const m = bruta?.match(/^(\d{4})(\d{2})(\d{2})/)
  if (!m) return undefined
  const [, ano, mes, dia] = m
  if (Number(mes) < 1 || Number(mes) > 12 || Number(dia) < 1 || Number(dia) > 31) return undefined
  return `${ano}-${mes}-${dia}`
}

function lerValor(bruto: string | undefined): number | undefined {
  if (!bruto) return undefined
  // "-1234.56" (padrão) ou "-1.234,56" / "-1234,56" (alguns bancos brasileiros).
  const texto = bruto.includes(',') ? bruto.replace(/\./g, '').replace(',', '.') : bruto
  const valor = Number(texto)
  return Number.isFinite(valor) ? valor : undefined
}

export function lerOfx(buffer: Buffer): ResultadoLeitura {
  const texto = decodificar(buffer)
  if (!/<OFX>/i.test(texto)) throw new ErroLeitura('ARQUIVO_CORROMPIDO')

  const blocos = texto.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|$)/gi) ?? []
  const itens: ItemBruto[] = []

  for (const bloco of blocos) {
    const data = lerData(campo(bloco, 'DTPOSTED'))
    const valor = lerValor(campo(bloco, 'TRNAMT'))
    const descricao = desescapar(campo(bloco, 'MEMO') ?? campo(bloco, 'NAME') ?? '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!data || valor === undefined || valor === 0 || !descricao) continue
    if (linhaIgnorada(descricao)) continue

    itens.push({
      data,
      descricao,
      valor: Math.abs(valor),
      // Em OFX de cartão a compra é débito (negativo); crédito é estorno/cashback.
      tipo: valor > 0 ? 'receita' : 'despesa',
      fitid: campo(bloco, 'FITID'),
    })
  }

  const dataReferencia = lerData(campo(texto, 'DTEND')) ?? lerData(campo(texto, 'DTASOF'))
  return { itens, dataReferencia }
}
