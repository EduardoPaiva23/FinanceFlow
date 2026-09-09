import { Prisma, type TipoLancamento } from '@prisma/client'
import { AppError } from '../lib/AppError.js'
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

async function garantirPropriedade(id: string, usuarioId: string): Promise<void> {
  const existente = await prisma.lancamento.findFirst({ where: { id, usuarioId }, select: { id: true } })
  if (!existente) throw new AppError(404, 'Lançamento não encontrado')
}

export async function atualizar(id: string, dados: LancamentoInput, usuarioId: string): Promise<LancamentoDTO> {
  await garantirPropriedade(id, usuarioId)
  const lancamento = await prisma.lancamento.update({
    where: { id },
    data: dados,
    include: { categoria: true },
  })
  return toLancamentoDTO(lancamento)
}

export async function excluir(id: string, usuarioId: string): Promise<void> {
  await garantirPropriedade(id, usuarioId)
  await prisma.lancamento.delete({ where: { id } })
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
