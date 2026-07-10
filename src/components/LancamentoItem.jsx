import { useState } from 'react'
import { formatarMoeda, formatarData } from '../utils/financas'

export default function LancamentoItem({ lancamento, onEditar, onExcluir, emEdicao }) {
  const receita = lancamento.tipo === 'receita'
  const [confirmando, setConfirmando] = useState(false)

  return (
    <li
      className={`flex items-center justify-between gap-4 px-5 py-3 ${
        emEdicao ? 'bg-emerald-50' : 'hover:bg-slate-50'
      }`}
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-800">{lancamento.descricao}</p>
        <p className="text-xs text-slate-500">
          {formatarData(lancamento.data)} · {lancamento.categoria}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span
          className={`font-semibold tabular-nums ${
            receita ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {receita ? '+' : '-'} {formatarMoeda(lancamento.valor)}
        </span>

        {confirmando ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Excluir?</span>
            <button
              type="button"
              onClick={() => onExcluir(lancamento.id)}
              className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Não
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onEditar(lancamento)}
              title="Editar"
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              title="Excluir"
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            >
              🗑️
            </button>
          </>
        )}
      </div>
    </li>
  )
}
