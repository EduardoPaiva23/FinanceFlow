import { formatarMesReferencia } from '../utils/financas'

interface SeletorMesProps {
  mes: string
  onMesAnterior: () => void
  onProximoMes: () => void
}

export default function SeletorMes({ mes, onMesAnterior, onProximoMes }: SeletorMesProps) {
  return (
    <div className="flex items-center justify-center gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <button
        type="button"
        onClick={onMesAnterior}
        title="Mês anterior"
        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      >
        ◀
      </button>
      <p className="min-w-[10rem] text-center text-base font-semibold capitalize text-slate-800">
        {formatarMesReferencia(mes)}
      </p>
      <button
        type="button"
        onClick={onProximoMes}
        title="Próximo mês"
        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      >
        ▶
      </button>
    </div>
  )
}
