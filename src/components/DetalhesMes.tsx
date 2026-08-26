import { formatarMoeda } from '../utils/financas'
import type { CategoriaTotal, Lancamento, ResumoMes } from '../types'

interface DetalhesMesProps {
  resumo: ResumoMes
  dadosCategorias: CategoriaTotal[]
  lancamentosDoMes: Lancamento[]
}

function ItemDetalhe({ label, valor, complemento }: { label: string; valor: string; complemento?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-slate-800">{valor}</p>
      {complemento && <p className="text-xs text-slate-400">{complemento}</p>}
    </div>
  )
}

export default function DetalhesMes({ resumo, dadosCategorias, lancamentosDoMes }: DetalhesMesProps) {
  const maiorCategoria = [...dadosCategorias].sort((a, b) => b.total - a.total)[0] ?? null
  const percentualMaiorCategoria =
    maiorCategoria && resumo.despesas > 0 ? (maiorCategoria.total / resumo.despesas) * 100 : null

  const percentualComprometido = resumo.receitas > 0 ? (resumo.despesas / resumo.receitas) * 100 : null

  const despesasDoMes = lancamentosDoMes.filter((l) => l.tipo === 'despesa')
  const ticketMedio =
    despesasDoMes.length > 0
      ? despesasDoMes.reduce((soma, l) => soma + l.valor, 0) / despesasDoMes.length
      : null

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-800">Detalhes do mês</h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
        <ItemDetalhe
          label="Maior categoria de despesa"
          valor={maiorCategoria ? maiorCategoria.categoria : '—'}
          complemento={
            maiorCategoria
              ? `${formatarMoeda(maiorCategoria.total)}${
                  percentualMaiorCategoria !== null ? ` · ${percentualMaiorCategoria.toFixed(0)}% das despesas` : ''
                }`
              : 'Sem despesas neste mês.'
          }
        />

        <ItemDetalhe
          label="Receita comprometida"
          valor={percentualComprometido !== null ? `${percentualComprometido.toFixed(0)}%` : '—'}
          complemento="Percentual da receita gasto com despesas"
        />

        <ItemDetalhe
          label="Ticket médio de despesa"
          valor={ticketMedio !== null ? formatarMoeda(ticketMedio) : '—'}
          complemento={`${lancamentosDoMes.length} lançamento(s) no mês`}
        />
      </div>
    </div>
  )
}
