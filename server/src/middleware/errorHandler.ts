import type { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { AppError } from '../lib/AppError.js'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Já existe um registro com esses dados' })
      return
    }
    if (err.code === 'P2003') {
      res.status(409).json({ error: 'Registro em uso, não é possível concluir a operação' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Registro não encontrado' })
      return
    }
  }

  console.error(err)
  res.status(500).json({ error: 'Erro interno' })
}
