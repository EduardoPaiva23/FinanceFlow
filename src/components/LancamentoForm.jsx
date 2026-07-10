import { useEffect, useState } from 'react'

const hoje = () => new Date().toISOString().slice(0, 10)

const estadoInicial = {
  descricao: '',
  valor: '',
  tipo: 'receita',
  categoria: '',
  data: hoje(),
}

export default function LancamentoForm({
  categorias,
  carregando,
  erro,
  onAdicionar,
  onEditar,
  lancamentoEmEdicao,
  onCancelarEdicao,
}) {
  const [form, setForm] = useState(estadoInicial)
  const editando = Boolean(lancamentoEmEdicao)

  // Ao entrar em modo edição, carrega os dados do lançamento no formulário.
  useEffect(() => {
    if (lancamentoEmEdicao) {
      setForm({
        descricao: lancamentoEmEdicao.descricao,
        valor: String(lancamentoEmEdicao.valor),
        tipo: lancamentoEmEdicao.tipo,
        categoria: lancamentoEmEdicao.categoria,
        data: lancamentoEmEdicao.data,
      })
    } else {
      setForm({ ...estadoInicial, data: hoje() })
    }
  }, [lancamentoEmEdicao])

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  function handleSubmit(e) {
    e.preventDefault()

    const valorNumerico = Number(form.valor)
    if (!form.descricao.trim() || !valorNumerico || valorNumerico <= 0) {
      return
    }

    const dados = {
      descricao: form.descricao.trim(),
      valor: valorNumerico,
      tipo: form.tipo,
      categoria: form.categoria || 'Outros',
      data: form.data,
    }

    if (editando) {
      onEditar({ ...lancamentoEmEdicao, ...dados })
    } else {
      onAdicionar({ id: crypto.randomUUID(), ...dados })
      setForm({ ...estadoInicial, data: hoje() })
    }
  }

  const label = 'block text-sm font-medium text-slate-600 mb-1'
  const input =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl bg-white p-6 shadow-sm ring-1 ${
        editando ? 'ring-2 ring-emerald-400' : 'ring-slate-200'
      }`}
    >
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
            onChange={(e) => atualizar('tipo', e.target.value)}
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
            value={form.categoria}
            onChange={(e) => atualizar('categoria', e.target.value)}
            disabled={carregando || !!erro}
          >
            <option value="">
              {carregando ? 'Carregando categorias...' : 'Selecione...'}
            </option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
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

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500/40"
        >
          {editando ? 'Salvar alterações' : 'Adicionar lançamento'}
        </button>
        {editando && (
          <button
            type="button"
            onClick={onCancelarEdicao}
            className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
