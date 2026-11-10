import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import {
  avaliarItem,
  chaveDoItem,
  numerarOcorrencias,
  prepararItens,
  type EstadoItem,
  type Existente,
  type ItemComparavel,
} from '../importacao/classificar.js'
import { lerOfx, pareceOfx } from '../importacao/ofx.js'
import { lerPdf, parecePdf } from '../importacao/pdf.js'
import { ErroLeitura, type CodigoErroLeitura, type ResultadoLeitura, type TipoItem } from '../importacao/tipos.js'
import { AppError } from '../lib/AppError.js'
import {
  TOLERANCIA_PARCELA_CENTAVOS,
  chaveParcela,
  lerChaveParcela,
  normalizarDescricao,
  prefixoParcelamento,
} from '../lib/normalizar.js'
import { descricaoComParcela, paraCentavos, somarMeses } from '../lib/parcelas.js'
import { prisma } from '../lib/prisma.js'

export type OrigemImportacao = 'pdf' | 'ofx'

const ERROS_LEITURA: Record<CodigoErroLeitura, { status: number; mensagem: string }> = {
  FORMATO_INVALIDO: { status: 415, mensagem: 'Formato não suportado. Envie um arquivo PDF ou OFX.' },
  ARQUIVO_CORROMPIDO: { status: 422, mensagem: 'Arquivo inválido ou corrompido.' },
  SEM_LANCAMENTOS: { status: 422, mensagem: 'Nenhum lançamento encontrado no arquivo.' },
  PDF_SENHA_NECESSARIA: { status: 422, mensagem: 'Este PDF é protegido por senha.' },
  PDF_SENHA_INCORRETA: { status: 422, mensagem: 'Senha incorreta.' },
  PDF_SEM_TEXTO: { status: 422, mensagem: 'Não foi possível ler este PDF. Tente o arquivo OFX da fatura.' },
  PDF_NAO_RECONHECIDO: {
    status: 422,
    mensagem: 'Não reconhecemos esta fatura. Tente o arquivo OFX da fatura.',
  },
}

function erroDeLeitura(codigo: CodigoErroLeitura): AppError {
  const { status, mensagem } = ERROS_LEITURA[codigo]
  return new AppError(status, mensagem, { codigo })
}

type Cliente = Prisma.TransactionClient

async function carregarExistentes(db: Cliente, usuarioId: string) {
  const registros = await db.lancamento.findMany({
    where: { usuarioId },
    select: {
      id: true,
      descricao: true,
      valor: true,
      data: true,
      fitid: true,
      chaveImportacao: true,
      parcelamentoId: true,
      categoriaId: true,
    },
    orderBy: { criadoEm: 'asc' },
  })
  return registros.map((r) => ({ ...r, valor: Number(r.valor) }))
}

export interface ItemAnalisadoDTO extends ItemComparavel {
  idTemp: string
  tipo: TipoItem
  ocorrencia: number
  estado: EstadoItem
  existente: { id: string; descricao: string; valor: number; data: string } | null
  categoriaIdSugerida: string | null
}

export interface AnaliseDTO {
  arquivo: string
  origem: OrigemImportacao
  itens: ItemAnalisadoDTO[]
}

function resumoExistente(e: Existente | undefined) {
  return e ? { id: e.id, descricao: e.descricao, valor: e.valor, data: e.data } : null
}

/**
 * Lê o arquivo e classifica cada lançamento contra os do usuário.
 * Não grava nada e não guarda o arquivo nem a senha.
 */
export async function analisar(params: {
  buffer: Buffer
  nomeArquivo: string
  senha?: string
  usuarioId: string
}): Promise<AnaliseDTO> {
  const { buffer, nomeArquivo, senha, usuarioId } = params

  let origem: OrigemImportacao
  let leitura: ResultadoLeitura
  try {
    if (parecePdf(buffer)) {
      origem = 'pdf'
      leitura = await lerPdf(buffer, new Date().toISOString().slice(0, 10), senha)
    } else if (pareceOfx(buffer)) {
      origem = 'ofx'
      leitura = lerOfx(buffer)
    } else {
      throw new ErroLeitura('FORMATO_INVALIDO')
    }
    if (leitura.itens.length === 0) throw new ErroLeitura('SEM_LANCAMENTOS')
  } catch (erro) {
    if (erro instanceof ErroLeitura) throw erroDeLeitura(erro.codigo)
    throw erro
  }

  const existentes = await carregarExistentes(prisma, usuarioId)

  // Sugestão de categoria: a do lançamento mais recente com a mesma descrição.
  const categoriaPorDescricao = new Map<string, string>()
  for (const e of existentes) categoriaPorDescricao.set(normalizarDescricao(e.descricao), e.categoriaId)

  const itens = numerarOcorrencias(prepararItens(leitura.itens, leitura.dataReferencia)).map((item) => {
    const avaliacao = avaliarItem(item, item.ocorrencia, existentes)
    return {
      ...item,
      estado: avaliacao.estado,
      existente: resumoExistente(avaliacao.existente),
      categoriaIdSugerida: categoriaPorDescricao.get(normalizarDescricao(item.descricao)) ?? null,
    }
  })

  return { arquivo: nomeArquivo, origem, itens }
}

export interface ItemConfirmar extends ItemComparavel {
  idTemp: string
  tipo: TipoItem
  ocorrencia: number
  categoriaId: string
}

export type ResultadoItem =
  | { idTemp: string; status: 'adicionado'; parcelasFuturasCriadas: number }
  | { idTemp: string; status: 'ja_cadastrado' }
  | { idTemp: string; status: 'erro'; mensagem: string }

async function gravarItem(
  tx: Cliente,
  item: ItemConfirmar,
  origem: OrigemImportacao,
  usuarioId: string,
): Promise<ResultadoItem> {
  // Serializa as importações do mesmo usuário: duas abas confirmando o mesmo arquivo
  // não gravam o lançamento duas vezes (a segunda já enxerga o primeiro).
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${usuarioId}))`

  const existentes = await carregarExistentes(tx, usuarioId)
  if (avaliarItem(item, item.ocorrencia, existentes).estado === 'ja_cadastrado') {
    return { idTemp: item.idTemp, status: 'ja_cadastrado' }
  }

  const comum = { tipo: item.tipo, categoriaId: item.categoriaId, usuarioId, origem }

  if (!item.parcela) {
    await tx.lancamento.create({
      data: {
        ...comum,
        descricao: item.descricaoOriginal,
        valor: item.valor,
        data: item.dataOriginal,
        fitid: item.fitid ?? null,
        chaveImportacao: chaveDoItem(item),
      },
    })
    return { idTemp: item.idTemp, status: 'adicionado', parcelasFuturasCriadas: 0 }
  }

  const { numero, total } = item.parcela
  const prefixo = prefixoParcelamento(item.descricao, total)
  const centavos = paraCentavos(item.valor)

  // Parcelas da mesma compra que já existem: não são recriadas, e a série é reaproveitada.
  const daSerie = existentes.filter((e) => {
    const lida = e.chaveImportacao ? lerChaveParcela(e.chaveImportacao) : null
    return (
      lida !== null &&
      lida.prefixo === prefixo &&
      Math.abs(lida.centavos - centavos) <= TOLERANCIA_PARCELA_CENTAVOS
    )
  })
  const numerosExistentes = new Set(daSerie.map((e) => lerChaveParcela(e.chaveImportacao!)!.numero))
  const parcelamentoId = daSerie.find((e) => e.parcelamentoId)?.parcelamentoId ?? randomUUID()

  let futuras = 0
  for (let n = numero; n <= total; n++) {
    if (n !== numero && numerosExistentes.has(n)) continue
    await tx.lancamento.create({
      data: {
        ...comum,
        descricao: descricaoComParcela(item.descricao, n, total),
        valor: item.valor,
        data: somarMeses(item.data, n - numero),
        fitid: n === numero ? (item.fitid ?? null) : null,
        chaveImportacao: chaveParcela(item.descricao, n, total, item.valor),
        parcelamentoId,
        parcelaNumero: n,
        parcelaTotal: total,
      },
    })
    if (n !== numero) futuras++
  }
  return { idTemp: item.idTemp, status: 'adicionado', parcelasFuturasCriadas: futuras }
}

/**
 * Grava os itens escolhidos. Cada item tem a própria transação: a falha de um não
 * desfaz os demais, e a parcela atual com as futuras entram juntas ou não entram.
 */
export async function confirmar(
  itens: ItemConfirmar[],
  origem: OrigemImportacao,
  usuarioId: string,
): Promise<ResultadoItem[]> {
  const resultados: ResultadoItem[] = []
  for (const item of itens) {
    try {
      resultados.push(await prisma.$transaction((tx) => gravarItem(tx, item, origem, usuarioId)))
    } catch (erro) {
      console.error('Falha ao importar lançamento', erro instanceof Error ? erro.message : erro)
      resultados.push({ idTemp: item.idTemp, status: 'erro', mensagem: 'Erro ao adicionar' })
    }
  }
  return resultados
}
