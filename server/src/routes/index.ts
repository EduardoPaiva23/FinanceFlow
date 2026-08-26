import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import authRoutes from './auth.routes.js'
import categoriasRoutes from './categorias.routes.js'
import lancamentosRoutes from './lancamentos.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/categorias', requireAuth, categoriasRoutes)
router.use('/lancamentos', requireAuth, lancamentosRoutes)

export default router
