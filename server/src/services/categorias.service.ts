import { prisma } from '../lib/prisma.js'

export function listarCategorias() {
  return prisma.categoria.findMany({ orderBy: { nome: 'asc' } })
}

export function criarCategoria(nome: string) {
  return prisma.categoria.create({ data: { nome } })
}

export function atualizarCategoria(id: string, nome: string) {
  return prisma.categoria.update({ where: { id }, data: { nome } })
}

export function excluirCategoria(id: string) {
  return prisma.categoria.delete({ where: { id } })
}
