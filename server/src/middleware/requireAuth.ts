import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../lib/AppError.js'

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.usuarioId) {
    next(new AppError(401, 'Não autenticado'))
    return
  }
  next()
}
