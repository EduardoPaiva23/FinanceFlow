import { useState } from 'react'
import { contarParcelas } from '../api/lancamentos'
import { formatarMoeda, formatarData } from '../utils/financas'
import type { EscopoParcelas, Lancamento } from '../types'

interface LancamentoItemProps {
  lancamento: Lancamento
  onEditar: (lancamento: Lancamento) => void
  onExcluir: (id: string, escopo: EscopoParcelas) => void
  emEdicao: boolean
}

export default function LancamentoItem({
  lancamento,
  onEditar,
  onExcluir,
  emEdicao,
}: LancamentoItemProps) {
  const receita = lancamento.tipo === 'receita'
  const parcela = lancamento.parcelamentoId !== null
  const [confirmando, setConfirmando] = useState(false)
  // Quantos lançamentos cada escopo exclui; carregado ao abrir a confirmação de uma parcela.
  const [contagem, setContagem] = useState<{ proximas: number; todas: number } | null>(null)

  async function pedirConfirmacao() {
    setConfirmando(true)
    if (!parcela) return
    setContagem(null)
    try {
      setContagem(await contarParcelas(lancamento.id))
    } catch {
      // Sem a contagem, as opções continuam disponíveis, só sem o número.
    }
  }

  const botaoPerigo =
    'rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-red-700'
  const botaoNeutro =
    'rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50'

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 ${
        emEdicao ? 'bg-emerald-50' : 'hover:bg-slate-50'
      }`}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium text-slate-800">
          {/* O selo já mostra X/N: o sufixo "(X/N)" da descrição seria repetição. */}
          <span className="truncate">
            {parcela ? lancamento.descricao.replace(/\s*\(\d+\/\d+\)$/, '') : lancamento.descricao}
          </span>
          {parcela && (
            <span
              className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
              title={`Parcela ${lancamento.parcelaNumero} de ${lancamento.parcelaTotal}`}
            >
              {lancamento.parcelaNumero}/{lancamento.parcelaTotal}
            </span>
          )}
        </p>
        <p className="text-xs text-slate-500">
          {formatarData(lancamento.data)} · {lancamento.categoria.nome}
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

        {!confirmando && (
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
              onClick={() => void pedirConfirmacao()}
              title="Excluir"
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            >
              🗑️
            </button>
          </>
        )}

        {confirmando && !parcela && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Excluir?</span>
            <button type="button" onClick={() => onExcluir(lancamento.id, 'esta')} className={botaoPerigo}>
              Sim
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className={botaoNeutro}>
              Não
            </button>
          </div>
        )}
      </div>

      {confirmando && parcela && (
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <span className="text-xs text-slate-500">Excluir parcelas:</span>
          <button type="button" onClick={() => onExcluir(lancamento.id, 'esta')} className={botaoPerigo}>
            Somente esta (1)
          </button>
          <button type="button" onClick={() => onExcluir(lancamento.id, 'proximas')} className={botaoPerigo}>
            Esta e as próximas{contagem ? ` (${contagem.proximas})` : ''}
          </button>
          <button type="button" onClick={() => onExcluir(lancamento.id, 'todas')} className={botaoPerigo}>
            Todas{contagem ? ` (${contagem.todas})` : ''}
          </button>
          <button type="button" onClick={() => setConfirmando(false)} className={botaoNeutro}>
            Cancelar
          </button>
        </div>
      )}
    </li>
  )
}
