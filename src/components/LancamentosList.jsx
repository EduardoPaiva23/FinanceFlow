import LancamentoItem from './LancamentoItem'

export default function LancamentosList({
  lancamentos,
  onEditar,
  onExcluir,
  idEmEdicao,
}) {
  if (lancamentos.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm ring-1 ring-slate-200">
        Nenhum lançamento encontrado.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <ul className="divide-y divide-slate-100">
        {lancamentos.map((lancamento) => (
          <LancamentoItem
            key={lancamento.id}
            lancamento={lancamento}
            onEditar={onEditar}
            onExcluir={onExcluir}
            emEdicao={lancamento.id === idEmEdicao}
          />
        ))}
      </ul>
    </div>
  )
}
