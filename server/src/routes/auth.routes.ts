import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { validate } from '../middleware/validate.js'
import { loginSchema, registrarSchema } from '../schemas/auth.schema.js'
import * as usuariosService from '../services/usuarios.service.js'

const router = Router()

router.post('/registrar', validate({ body: registrarSchema }), async (req, res) => {
  const dados = res.locals.body as { email: string; senha: string; nome?: string }
  const usuario = await usuariosService.registrar(dados)
  req.session.usuarioId = usuario.id
  res.status(201).json(usuario)
})

router.post('/login', validate({ body: loginSchema }), async (req, res) => {
  const { email, senha } = res.locals.body as { email: string; senha: string }
  const usuario = await usuariosService.autenticar(email, senha)
  req.session.usuarioId = usuario.id
  res.json(usuario)
})

router.post('/logout', (req, res, next) => {
  req.session.destroy((erro) => {
    if (erro) {
      next(erro)
      return
    }
    res.clearCookie('financeflow.sid')
    res.status(204).send()
  })
})

router.get('/me', requireAuth, async (req, res) => {
  const usuario = await usuariosService.buscarPorId(req.session.usuarioId!)
  res.json(usuario)
})

export default router
