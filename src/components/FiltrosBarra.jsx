export default function FiltrosBarra({
  busca,
  onBuscaChange,
  filtroTipo,
  onFiltroTipoChange,
  ordem,
  onToggleOrdem,
}) {
  const tipos = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'receita', rotulo: 'Receitas' },
    { valor: 'despesa', rotulo: 'Despesas' },
  ]

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="search"
        placeholder="Pesquisar por descrição..."
        value={busca}
        onChange={(e) => onBuscaChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:max-w-xs"
      />

      <div className="flex items-center gap-2">
        <div className="flex rounded-lg bg-slate-100 p-1">
          {tipos.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => onFiltroTipoChange(t.valor)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                filtroTipo === t.valor
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.rotulo}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleOrdem}
          title="Ordenar por data"
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Data {ordem === 'desc' ? '↓' : '↑'}
        </button>
      </div>
    </div>
  )
}
