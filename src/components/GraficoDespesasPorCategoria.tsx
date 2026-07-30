import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatarMoeda } from '../utils/financas'
import type { CategoriaTotal } from '../types'

// Paleta categórica fixa: cada categoria sempre recebe a mesma cor,
// independentemente de quais outras categorias aparecem no mês.
const CORES_POR_CATEGORIA: Record<string, string> = {
  Salário: '#2a78d6',
  Alimentação: '#eb6834',
  Transporte: '#1baf7a',
  Moradia: '#eda100',
  Lazer: '#e87ba4',
  Saúde: '#008300',
  Educação: '#4a3aa7',
  Investimentos: '#e34948',
  Outros: '#898781',
}

const COR_PADRAO = '#898781'

function corDaCategoria(categoria: string): string {
  return CORES_POR_CATEGORIA[categoria] ?? COR_PADRAO
}

interface TooltipPayloadItem {
  name: string
  value: number
}

function TooltipPersonalizado({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200">
      <p className="font-medium text-slate-800">{item.name}</p>
      <p className="tabular-nums text-slate-500">{formatarMoeda(item.value)}</p>
    </div>
  )
}

function LegendaPersonalizada({ payload }: { payload?: { value: string; color: string }[] }) {
  if (!payload?.length) return null

  return (
    <ul className="mt-3 space-y-1.5">
      {payload.map((entrada) => (
        <li key={entrada.value} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: entrada.color }}
          />
          <span className="text-slate-600">{entrada.value}</span>
        </li>
      ))}
    </ul>
  )
}

interface GraficoDespesasPorCategoriaProps {
  dados: CategoriaTotal[]
}

export default function GraficoDespesasPorCategoria({ dados }: GraficoDespesasPorCategoriaProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-800">Despesas por categoria</h2>

      {dados.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-400">Sem despesas neste mês.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={dados}
                dataKey="total"
                nameKey="categoria"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {dados.map((item) => (
                  <Cell key={item.categoria} fill={corDaCategoria(item.categoria)} />
                ))}
              </Pie>
              <Tooltip content={<TooltipPersonalizado />} />
            </PieChart>
          </ResponsiveContainer>
          <LegendaPersonalizada
            payload={dados.map((item) => ({
              value: item.categoria,
              color: corDaCategoria(item.categoria),
            }))}
          />
        </>
      )}
    </div>
  )
}
