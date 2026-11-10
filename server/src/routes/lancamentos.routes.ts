import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import {
  atualizarLancamentoSchema,
  criarLancamentoParceladoSchema,
  criarLancamentoSchema,
  escopoQuerySchema,
  lancamentoParamsSchema,
  listarLancamentosQuerySchema,
  resumoQuerySchema,
} from '../schemas/lancamento.schema.js'
import * as lancamentosService from '../services/lancamentos.service.js'
import type {
  EscopoParcelas,
  LancamentoInput,
  LancamentoParceladoInput,
} from '../services/lancamentos.service.js'

const router = Router()

// /resumo e /por-categoria precisam vir antes de /:id, senão o Express
// tentaria interpretar "resumo"/"por-categoria" como um id de lançamento.
router.get('/resumo', validate({ query: resumoQuerySchema }), async (req, res) => {
  const { mes } = res.locals.query as { mes: string }
  const resumo = await lancamentosService.calcularResumoMes(mes, req.session.usuarioId!)
  res.json(resumo)
})

router.get('/por-categoria', validate({ query: resumoQuerySchema }), async (req, res) => {
  const { mes } = res.locals.query as { mes: string }
  const totais = await lancamentosService.agruparPorCategoria(mes, req.session.usuarioId!)
  res.json(totais)
})

router.get('/', validate({ query: listarLancamentosQuerySchema }), async (req, res) => {
  const params = res.locals.query as {
    mes: string
    busca?: string
    tipo?: 'receita' | 'despesa'
    ordem: 'asc' | 'desc'
  }
  const lancamentos = await lancamentosService.listar({ ...params, usuarioId: req.session.usuarioId! })
  res.json(lancamentos)
})

router.post('/', validate({ body: criarLancamentoSchema }), async (req, res) => {
  const dados = res.locals.body as LancamentoInput
  const lancamento = await lancamentosService.criar(dados, req.session.usuarioId!)
  res.status(201).json(lancamento)
})

router.post('/parcelado', validate({ body: criarLancamentoParceladoSchema }), async (req, res) => {
  const dados = res.locals.body as LancamentoParceladoInput
  const lancamentos = await lancamentosService.criarParcelado(dados, req.session.usuarioId!)
  res.status(201).json({ lancamentos })
})

router.get('/:id/parcelas', validate({ params: lancamentoParamsSchema }), async (req, res) => {
  const { id } = res.locals.params as { id: string }
  res.json(await lancamentosService.contarParcelas(id, req.session.usuarioId!))
})

// ?escopo=esta|proximas|todas — aplica a alteração/exclusão às demais parcelas.
router.put(
  '/:id',
  validate({ params: lancamentoParamsSchema, body: atualizarLancamentoSchema, query: escopoQuerySchema }),
  async (req, res) => {
    const { id } = res.locals.params as { id: string }
    const { escopo } = res.locals.query as { escopo: EscopoParcelas }
    const dados = res.locals.body as LancamentoInput
    const lancamento = await lancamentosService.atualizar(id, dados, req.session.usuarioId!, escopo)
    res.json(lancamento)
  },
)

router.delete(
  '/:id',
  validate({ params: lancamentoParamsSchema, query: escopoQuerySchema }),
  async (req, res) => {
    const { id } = res.locals.params as { id: string }
    const { escopo } = res.locals.query as { escopo: EscopoParcelas }
    const excluidos = await lancamentosService.excluir(id, req.session.usuarioId!, escopo)
    res.json({ excluidos })
  },
)

export default router
