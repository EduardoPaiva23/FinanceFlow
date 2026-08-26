import { useEffect, useState } from 'react'
import type { Categoria, Lancamento, LancamentoInput, TipoLancamento } from '../types'

const hoje = () => new Date().toISOString().slice(0, 10)

interface FormState {
  descricao: string
  valor: string
  tipo: TipoLancamento
  categoriaId: string
  data: string
}

const estadoInicial: FormState = {
  descricao: '',
  valor: '',
  tipo: 'receita',
  categoriaId: '',
  data: hoje(),
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
  const [form, setForm] = useState<FormState>(estadoInicial)
  const [erroValidacao, setErroValidacao] = useState<string | null>(null)
  const editando = Boolean(lancamentoEmEdicao)

  // Ao entrar em modo edição, carrega os dados do lançamento no formulário.
  useEffect(() => {
    if (lancamentoEmEdicao) {
      setForm({
        descricao: lancamentoEmEdicao.descricao,
        valor: String(lancamentoEmEdicao.valor),
        tipo: lancamentoEmEdicao.tipo,
        categoriaId: lancamentoEmEdicao.categoriaId,
        data: lancamentoEmEdicao.data,
      })
    } else {
      setForm({ ...estadoInicial, data: hoje() })
    }
    setErroValidacao(null)
  }, [lancamentoEmEdicao])

  function atualizar<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const valorNumerico = Number(form.valor)
    if (!form.descricao.trim() || !valorNumerico || valorNumerico <= 0) {
      setErroValidacao('Preencha a descrição e um valor válido.')
      return
    }
    if (!form.categoriaId) {
      setErroValidacao('Selecione uma categoria.')
      return
    }
    setErroValidacao(null)

    const dados: LancamentoInput = {
      descricao: form.descricao.trim(),
      valor: valorNumerico,
      tipo: form.tipo,
      categoriaId: form.categoriaId,
      data: form.data,
    }

    if (lancamentoEmEdicao) {
      onEditar(lancamentoEmEdicao.id, dados)
    } else {
      onAdicionar(dados)
      setForm({ ...estadoInicial, data: hoje() })
    }
  }

  const label = 'block text-sm font-medium text-slate-600 mb-1'
  const input =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

  return (
    <form onSubmit={handleSubmit}>
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
            value={form.descricao}
            onChange={(e) => atualizar('descricao', e.target.value)}
          />
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
            value={form.valor}
            onChange={(e) => atualizar('valor', e.target.value)}
          />
        </div>

        <div>
          <label className={label} htmlFor="data">
            Data
          </label>
          <input
            id="data"
            type="date"
            className={input}
            value={form.data}
            onChange={(e) => atualizar('data', e.target.value)}
          />
        </div>

        <div>
          <label className={label} htmlFor="tipo">
            Tipo
          </label>
          <select
            id="tipo"
            className={input}
            value={form.tipo}
            onChange={(e) => atualizar('tipo', e.target.value as TipoLancamento)}
          >
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
        </div>

        <div>
          <label className={label} htmlFor="categoria">
            Categoria
          </label>
          <select
            id="categoria"
            className={input}
            value={form.categoriaId}
            onChange={(e) => atualizar('categoriaId', e.target.value)}
            disabled={carregando || !!erro}
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
          {erro && (
            <p className="mt-1 text-xs text-red-600">
              Não foi possível carregar as categorias.
            </p>
          )}
        </div>
      </div>

      {erroValidacao && <p className="mt-3 text-sm text-red-600">{erroValidacao}</p>}

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
