import bcrypt from 'bcryptjs'
import { AppError } from '../lib/AppError.js'
import { prisma } from '../lib/prisma.js'

export interface UsuarioDTO {
  id: string
  email: string
  nome: string | null
}

function toUsuarioDTO(usuario: { id: string; email: string; nome: string | null }): UsuarioDTO {
  return { id: usuario.id, email: usuario.email, nome: usuario.nome }
}

export async function registrar(dados: { email: string; senha: string; nome?: string }): Promise<UsuarioDTO> {
  const existente = await prisma.usuario.findUnique({ where: { email: dados.email } })
  if (existente) throw new AppError(409, 'E-mail já cadastrado')

  const senhaHash = await bcrypt.hash(dados.senha, 10)
  const usuario = await prisma.usuario.create({
    data: { email: dados.email, senhaHash, nome: dados.nome },
  })
  return toUsuarioDTO(usuario)
}

export async function autenticar(email: string, senha: string): Promise<UsuarioDTO> {
  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario) throw new AppError(401, 'E-mail ou senha inválidos')

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash)
  if (!senhaValida) throw new AppError(401, 'E-mail ou senha inválidos')

  return toUsuarioDTO(usuario)
}

export async function buscarPorId(id: string): Promise<UsuarioDTO | null> {
  const usuario = await prisma.usuario.findUnique({ where: { id } })
  return usuario ? toUsuarioDTO(usuario) : null
}
