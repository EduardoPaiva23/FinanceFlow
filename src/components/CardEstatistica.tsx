import { formatarMoeda } from '../utils/financas'

type Variante = 'positivo' | 'negativo' | 'neutro'

interface CardEstatisticaProps {
  label: string
  valor: number
  variante?: Variante
}

const CORES: Record<Variante, string> = {
  positivo: 'text-emerald-600',
  negativo: 'text-red-600',
  neutro: 'text-slate-800',
}

export default function CardEstatistica({ label, valor, variante = 'neutro' }: CardEstatisticaProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${CORES[variante]}`}>
        {formatarMoeda(valor)}
      </p>
    </div>
  )
}
