import { randomUUID } from 'node:crypto'
import { Prisma, type OrigemLancamento, type TipoLancamento } from '@prisma/client'
import { AppError } from '../lib/AppError.js'
import {
  TOLERANCIA_PARCELA_CENTAVOS,
  chaveParcela,
  lerChaveParcela,
  prefixoParcelamento,
} from '../lib/normalizar.js'
import {
  descricaoComParcela,
  dividirTotal,
  paraCentavos,
  removerTrechoParcela,
  somarMeses,
} from '../lib/parcelas.js'
import { prisma } from '../lib/prisma.js'

type LancamentoComCategoria = Prisma.LancamentoGetPayload<{ include: { categoria: true } }>

export interface LancamentoDTO {
  id: string
  descricao: string
  valor: number
  tipo: TipoLancamento
  data: string
  categoriaId: string
  categoria: { id: string; nome: string }
  parcelamentoId: string | null
  parcelaNumero: number | null
  parcelaTotal: number | null
  origem: OrigemLancamento
}

export type EscopoParcelas = 'esta' | 'proximas' | 'todas'

export interface LancamentoParceladoInput extends LancamentoInput {
  totalParcelas: number
  parcelaInicial: number
  /** 'total': `valor` é o total da compra; 'parcela': `valor` é o de cada parcela. */
  modoValor: 'total' | 'parcela'
  confirmarDuplicado: boolean
}

export interface LancamentoInput {
  descricao: string
  valor: number
  tipo: TipoLancamento
  data: string
  categoriaId: string
}

function toLancamentoDTO(lancamento: LancamentoComCategoria): LancamentoDTO {
  return {
    id: lancamento.id,
    descricao: lancamento.descricao,
    valor: Number(lancamento.valor),
    tipo: lancamento.tipo,
    data: lancamento.data,
    categoriaId: lancamento.categoriaId,
    categoria: { id: lancamento.categoria.id, nome: lancamento.categoria.nome },
    parcelamentoId: lancamento.parcelamentoId,
    parcelaNumero: lancamento.parcelaNumero,
    parcelaTotal: lancamento.parcelaTotal,
    origem: lancamento.origem,
  }
}

interface ListarParams {
  mes: string
  busca?: string
  tipo?: TipoLancamento
  ordem: 'asc' | 'desc'
  usuarioId: string
}

export async function listar({ mes, busca, tipo, ordem, usuarioId }: ListarParams): Promise<LancamentoDTO[]> {
  const lancamentos = await prisma.lancamento.findMany({
    where: {
      usuarioId,
      data: { startsWith: mes },
      ...(tipo ? { tipo } : {}),
      ...(busca ? { descricao: { contains: busca, mode: 'insensitive' } } : {}),
    },
    include: { categoria: true },
    orderBy: { data: ordem },
  })
  return lancamentos.map(toLancamentoDTO)
}

export async function criar(dados: LancamentoInput, usuarioId: string): Promise<LancamentoDTO> {
  const lancamento = await prisma.lancamento.create({
    data: { ...dados, usuarioId },
    include: { categoria: true },
  })
  return toLancamentoDTO(lancamento)
}

/**
 * Cria um lançamento parcelado: uma parcela por mês, de `parcelaInicial` até
 * `totalParcelas`, todas ligadas pelo mesmo parcelamentoId. Tudo ou nada.
 */
export async function criarParcelado(
  dados: LancamentoParceladoInput,
  usuarioId: string,
): Promise<LancamentoDTO[]> {
  const { totalParcelas, parcelaInicial, modoValor, confirmarDuplicado, ...base } = dados
  if (parcelaInicial > totalParcelas) {
    throw new AppError(400, 'A parcela inicial não pode ser maior que o número de parcelas')
  }

  const descricaoLimpa = removerTrechoParcela(base.descricao) || base.descricao
  const valores =
    modoValor === 'total'
      ? dividirTotal(base.valor, totalParcelas)
      : Array.from({ length: totalParcelas }, () => base.valor)

  if (!confirmarDuplicado) {
    const prefixo = prefixoParcelamento(descricaoLimpa, totalParcelas)
    const parecidos = await prisma.lancamento.findMany({
      where: { usuarioId, chaveImportacao: { startsWith: prefixo } },
      select: { chaveImportacao: true },
    })
    const centavos = paraCentavos(valores[valores.length - 1])
    const existeParecido = parecidos.some((p) => {
      const lida = lerChaveParcela(p.chaveImportacao!)
      return lida !== null && Math.abs(lida.centavos - centavos) <= TOLERANCIA_PARCELA_CENTAVOS
    })
    if (existeParecido) {
      throw new AppError(409, 'Já existe um parcelamento parecido', { codigo: 'PARCELAMENTO_PARECIDO' })
    }
  }

  const parcelamentoId = randomUUID()
  const criados = await prisma.$transaction(async (tx) => {
    const resultado: LancamentoComCategoria[] = []
    for (let numero = parcelaInicial; numero <= totalParcelas; numero++) {
      const valor = valores[numero - 1]
      resultado.push(
        await tx.lancamento.create({
          data: {
            descricao: descricaoComParcela(descricaoLimpa, numero, totalParcelas),
            valor,
            tipo: base.tipo,
            data: somarMeses(base.data, numero - parcelaInicial),
            categoriaId: base.categoriaId,
            usuarioId,
            parcelamentoId,
            parcelaNumero: numero,
            parcelaTotal: totalParcelas,
            chaveImportacao: chaveParcela(descricaoLimpa, numero, totalParcelas, valor),
          },
          include: { categoria: true },
        }),
      )
    }
    return resultado
  })
  return criados.map(toLancamentoDTO)
}

async function buscarDoUsuario(id: string, usuarioId: string) {
  const existente = await prisma.lancamento.findFirst({ where: { id, usuarioId } })
  if (!existente) throw new AppError(404, 'Lançamento não encontrado')
  return existente
}

/** Filtro das demais parcelas do mesmo parcelamento atingidas pelo escopo. */
function filtroOutrasParcelas(
  alvo: { id: string; parcelamentoId: string | null; parcelaNumero: number | null },
  usuarioId: string,
  escopo: EscopoParcelas,
): Prisma.LancamentoWhereInput | null {
  if (escopo === 'esta' || !alvo.parcelamentoId) return null
  return {
    usuarioId,
    parcelamentoId: alvo.parcelamentoId,
    id: { not: alvo.id },
    ...(escopo === 'proximas' ? { parcelaNumero: { gt: alvo.parcelaNumero ?? 0 } } : {}),
  }
}

export async function atualizar(
  id: string,
  dados: LancamentoInput,
  usuarioId: string,
  escopo: EscopoParcelas = 'esta',
): Promise<LancamentoDTO> {
  const alvo = await buscarDoUsuario(id, usuarioId)
  const filtroOutras = filtroOutrasParcelas(alvo, usuarioId, escopo)

  const lancamento = await prisma.$transaction(async (tx) => {
    if (filtroOutras) {
      // Descrição, valor, tipo e categoria se propagam; a data é só da própria parcela.
      const descricaoLimpa = removerTrechoParcela(dados.descricao) || dados.descricao
      const outras = await tx.lancamento.findMany({
        where: filtroOutras,
        select: { id: true, parcelaNumero: true, parcelaTotal: true },
      })
      for (const outra of outras) {
        await tx.lancamento.update({
          where: { id: outra.id },
          data: {
            descricao:
              outra.parcelaNumero && outra.parcelaTotal
                ? descricaoComParcela(descricaoLimpa, outra.parcelaNumero, outra.parcelaTotal)
                : dados.descricao,
            valor: dados.valor,
            tipo: dados.tipo,
            categoriaId: dados.categoriaId,
          },
        })
      }
    }
    return tx.lancamento.update({ where: { id }, data: dados, include: { categoria: true } })
  })
  return toLancamentoDTO(lancamento)
}

/** Exclui o lançamento e, conforme o escopo, as demais parcelas. Retorna quantos foram excluídos. */
export async function excluir(id: string, usuarioId: string, escopo: EscopoParcelas = 'esta'): Promise<number> {
  const alvo = await buscarDoUsuario(id, usuarioId)
  const filtroOutras = filtroOutrasParcelas(alvo, usuarioId, escopo)
  const { count } = await prisma.lancamento.deleteMany({
    where: filtroOutras ? { OR: [{ id, usuarioId }, filtroOutras] } : { id, usuarioId },
  })
  return count
}

/** Quantos lançamentos cada escopo de edição/exclusão atinge (incluindo o próprio). */
export async function contarParcelas(
  id: string,
  usuarioId: string,
): Promise<{ proximas: number; todas: number }> {
  const alvo = await buscarDoUsuario(id, usuarioId)
  if (!alvo.parcelamentoId) return { proximas: 1, todas: 1 }
  const where = { usuarioId, parcelamentoId: alvo.parcelamentoId }
  const [todas, seguintes] = await Promise.all([
    prisma.lancamento.count({ where }),
    prisma.lancamento.count({ where: { ...where, parcelaNumero: { gt: alvo.parcelaNumero ?? 0 } } }),
  ])
  return { proximas: seguintes + 1, todas }
}

export interface ResumoMes {
  receitas: number
  despesas: number
  saldo: number
}

export async function calcularResumoMes(mes: string, usuarioId: string): Promise<ResumoMes> {
  const grupos = await prisma.lancamento.groupBy({
    by: ['tipo'],
    where: { usuarioId, data: { startsWith: mes } },
    _sum: { valor: true },
  })

  const receitas = Number(grupos.find((g) => g.tipo === 'receita')?._sum.valor ?? 0)
  const despesas = Number(grupos.find((g) => g.tipo === 'despesa')?._sum.valor ?? 0)

  return { receitas, despesas, saldo: receitas - despesas }
}

export interface CategoriaTotal {
  categoriaId: string
  categoria: string
  total: number
}

export async function agruparPorCategoria(mes: string, usuarioId: string): Promise<CategoriaTotal[]> {
  const grupos = await prisma.lancamento.groupBy({
    by: ['categoriaId'],
    where: { tipo: 'despesa', usuarioId, data: { startsWith: mes } },
    _sum: { valor: true },
  })

  if (grupos.length === 0) return []

  const categorias = await prisma.categoria.findMany({
    where: { id: { in: grupos.map((g) => g.categoriaId) } },
  })
  const nomesPorId = new Map(categorias.map((c) => [c.id, c.nome]))

  return grupos
    .map((g) => ({
      categoriaId: g.categoriaId,
      categoria: nomesPorId.get(g.categoriaId) ?? 'Desconhecida',
      total: Number(g._sum.valor ?? 0),
    }))
    .sort((a, b) => b.total - a.total)
}
