import { Router } from 'express'
import multer from 'multer'
import { AppError } from '../lib/AppError.js'
import { validate } from '../middleware/validate.js'
import { analisarImportacaoSchema, confirmarImportacaoSchema } from '../schemas/importacao.schema.js'
import * as importacaoService from '../services/importacao.service.js'
import type { ItemConfirmar, OrigemImportacao } from '../services/importacao.service.js'

export const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024

// O arquivo fica só em memória durante a requisição: nada é gravado em disco.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO_ARQUIVO, files: 1 },
})

const router = Router()

router.post(
  '/analisar',
  upload.single('arquivo'),
  validate({ body: analisarImportacaoSchema }),
  async (req, res) => {
    if (!req.file) throw new AppError(400, 'Envie um arquivo PDF ou OFX.')
    const { senha } = res.locals.body as { senha?: string }
    const analise = await importacaoService.analisar({
      buffer: req.file.buffer,
      nomeArquivo: req.file.originalname,
      senha: senha || undefined,
      usuarioId: req.session.usuarioId!,
    })
    res.json(analise)
  },
)

router.post('/confirmar', validate({ body: confirmarImportacaoSchema }), async (req, res) => {
  const { origem, itens } = res.locals.body as { origem: OrigemImportacao; itens: ItemConfirmar[] }
  const resultados = await importacaoService.confirmar(itens, origem, req.session.usuarioId!)
  res.json({ resultados })
})

export default router
