import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import {
  atualizarCategoriaSchema,
  categoriaParamsSchema,
  criarCategoriaSchema,
} from '../schemas/categoria.schema.js'
import * as categoriasService from '../services/categorias.service.js'

const router = Router()

router.get('/', async (_req, res) => {
  const categorias = await categoriasService.listarCategorias()
  res.json(categorias)
})

router.post('/', validate({ body: criarCategoriaSchema }), async (_req, res) => {
  const { nome } = res.locals.body as { nome: string }
  const categoria = await categoriasService.criarCategoria(nome)
  res.status(201).json(categoria)
})

router.put(
  '/:id',
  validate({ params: categoriaParamsSchema, body: atualizarCategoriaSchema }),
  async (_req, res) => {
    const { id } = res.locals.params as { id: string }
    const { nome } = res.locals.body as { nome: string }
    const categoria = await categoriasService.atualizarCategoria(id, nome)
    res.json(categoria)
  },
)

router.delete('/:id', validate({ params: categoriaParamsSchema }), async (_req, res) => {
  const { id } = res.locals.params as { id: string }
  await categoriasService.excluirCategoria(id)
  res.status(204).send()
})

export default router
