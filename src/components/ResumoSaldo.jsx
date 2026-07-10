import { formatarMoeda } from '../utils/financas'

export default function ResumoSaldo({ saldo }) {
  const positivo = saldo >= 0

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">Saldo atual</p>
      <p
        className={`mt-1 text-3xl font-bold tabular-nums ${
          positivo ? 'text-emerald-600' : 'text-red-600'
        }`}
      >
        {formatarMoeda(saldo)}
      </p>
    </div>
  )
}
