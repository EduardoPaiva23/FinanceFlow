import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { ZodError } from 'zod'
import { AppError } from '../lib/AppError.js'

interface ValidateSchemas {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

// Express 5 expõe req.query como getter sem setter (lançaria erro na reatribuição),
// então os dados validados/coercidos ficam em res.locals em vez de sobrescrever req.*.
export function validate(schemas: ValidateSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        res.locals.body = schemas.body.parse(req.body)
      }
      if (schemas.query) {
        res.locals.query = schemas.query.parse(req.query)
      }
      if (schemas.params) {
        res.locals.params = schemas.params.parse(req.params)
      }
      next()
    } catch (erro) {
      if (erro instanceof ZodError) {
        next(new AppError(400, 'Dados inválidos', erro.flatten()))
        return
      }
      next(erro)
    }
  }
}
