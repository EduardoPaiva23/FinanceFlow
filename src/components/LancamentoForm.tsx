import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Categoria, Lancamento, LancamentoInput } from '../types'
import {
  lancamentoSchema,
  type LancamentoFormValues,
  type LancamentoResolver,
} from '../schemas/lancamento.schema'

const hoje = () => new Date().toISOString().slice(0, 10)

function valoresIniciais(lancamento: Lancamento | null): LancamentoFormValues {
  if (lancamento) {
    return {
      descricao: lancamento.descricao,
      valor: lancamento.valor,
      tipo: lancamento.tipo,
      categoriaId: lancamento.categoriaId,
      data: lancamento.data,
    }
  }
  return { descricao: '', valor: '', tipo: 'receita', categoriaId: '', data: hoje() }
}

interface LancamentoFormProps {
  categorias: Categoria[]
  carregando: boolean
  erro: string | null
  onAdicionar: (lancamento: LancamentoInput) => void
  onEditar: (id: string, lancamento: LancamentoInput) => void
  lancamentoEmEdicao: Lancamento | null
  onCancelarEdicao: () => void
}

export default function LancamentoForm({
  categorias,
  carregando,
  erro,
  onAdicionar,
  onEditar,
  lancamentoEmEdicao,
  onCancelarEdicao,
}: LancamentoFormProps) {
  const editando = Boolean(lancamentoEmEdicao)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LancamentoFormValues>({
    resolver: zodResolver(lancamentoSchema) as LancamentoResolver,
    defaultValues: valoresIniciais(lancamentoEmEdicao),
  })

  // Ao entrar em modo edição, carrega os dados do lançamento no formulário.
  useEffect(() => {
    reset(valoresIniciais(lancamentoEmEdicao))
  }, [lancamentoEmEdicao, reset])

  const aoSubmeter = handleSubmit((dados) => {
    const payload: LancamentoInput = dados as LancamentoInput

    if (lancamentoEmEdicao) {
      onEditar(lancamentoEmEdicao.id, payload)
    } else {
      onAdicionar(payload)
      reset(valoresIniciais(null))
    }
  })

  const label = 'block text-sm font-medium text-slate-600 mb-1'
  const input =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  const erroCampo = 'mt-1 text-xs text-red-600'

  return (
    <form onSubmit={aoSubmeter} noValidate>
      <h2 className="mb-4 text-lg font-semibold text-slate-800">
        {editando ? 'Editar lançamento' : 'Novo lançamento'}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="descricao">
            Descrição
          </label>
          <input
            id="descricao"
            type="text"
            className={input}
            placeholder="Ex.: Salário, Mercado, Aluguel..."
            {...register('descricao')}
          />
          {errors.descricao && <p className={erroCampo}>{errors.descricao.message}</p>}
        </div>

        <div>
          <label className={label} htmlFor="valor">
            Valor (R$)
          </label>
          <input
            id="valor"
            type="number"
            min="0"
            step="0.01"
            className={input}
            placeholder="0,00"
            {...register('valor', { valueAsNumber: true })}
          />
          {errors.valor && <p className={erroCampo}>{errors.valor.message}</p>}
        </div>

        <div>
          <label className={label} htmlFor="data">
            Data
          </label>
          <input id="data" type="date" className={input} {...register('data')} />
          {errors.data && <p className={erroCampo}>{errors.data.message}</p>}
        </div>

        <div>
          <label className={label} htmlFor="tipo">
            Tipo
          </label>
          <select id="tipo" className={input} {...register('tipo')}>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
          {errors.tipo && <p className={erroCampo}>{errors.tipo.message}</p>}
        </div>

        <div>
          <label className={label} htmlFor="categoria">
            Categoria
          </label>
          <select
            id="categoria"
            className={input}
            disabled={carregando || !!erro}
            {...register('categoriaId')}
          >
            <option value="">
              {carregando ? 'Carregando categorias...' : 'Selecione...'}
            </option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
          {erro && <p className={erroCampo}>Não foi possível carregar as categorias.</p>}
          {errors.categoriaId && <p className={erroCampo}>{errors.categoriaId.message}</p>}
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500/40"
        >
          {editando ? 'Salvar alterações' : 'Adicionar lançamento'}
        </button>
        <button
          type="button"
          onClick={onCancelarEdicao}
          className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
