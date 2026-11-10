import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type {
  Categoria,
  EscopoParcelas,
  Lancamento,
  LancamentoInput,
  LancamentoParceladoInput,
} from '../types'
import {
  MAX_PARCELAS,
  MIN_PARCELAS,
  lancamentoSchema,
  type LancamentoFormValues,
  type LancamentoResolver,
} from '../schemas/lancamento.schema'
import { dividirTotal, formatarMesCurto, formatarMoeda, somarMeses } from '../utils/financas'

const hoje = () => new Date().toISOString().slice(0, 10)

function valoresIniciais(lancamento: Lancamento | null): LancamentoFormValues {
  const parcelamento = {
    parcelado: false,
    totalParcelas: '' as const,
    parcelaInicial: 1,
    modoValor: 'total' as const,
  }
  if (lancamento) {
    return {
      descricao: lancamento.descricao,
      valor: lancamento.valor,
      tipo: lancamento.tipo,
      categoriaId: lancamento.categoriaId,
      data: lancamento.data,
      ...parcelamento,
    }
  }
  return { descricao: '', valor: '', tipo: 'receita', categoriaId: '', data: hoje(), ...parcelamento }
}

const ESCOPOS: { valor: EscopoParcelas; rotulo: string }[] = [
  { valor: 'esta', rotulo: 'Somente esta' },
  { valor: 'proximas', rotulo: 'Esta e as próximas' },
  { valor: 'todas', rotulo: 'Todas' },
]

/** Texto da prévia: "3× de R$ 33,33 — de nov/2026 a jan/2027 — total R$ 100,00". */
function montarPrevia(valores: LancamentoFormValues): string | null {
  const total = Number(valores.totalParcelas)
  const inicial = Number(valores.parcelaInicial) || 1
  const valor = Number(valores.valor)
  if (!valores.parcelado || !Number.isInteger(total) || total < MIN_PARCELAS || total > MAX_PARCELAS) return null
  if (!(valor > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(valores.data) || inicial < 1 || inicial > total) return null

  const parcelas = (
    valores.modoValor === 'total' ? dividirTotal(valor, total) : Array.from({ length: total }, () => valor)
  ).slice(inicial - 1)
  const quantidade = parcelas.length
  const soma = parcelas.reduce((s, p) => s + Math.round(p * 100), 0) / 100
  const ultima = parcelas[parcelas.length - 1]

  const valoresTexto =
    parcelas[0] === ultima
      ? `${quantidade}× de ${formatarMoeda(ultima)}`
      : `1× de ${formatarMoeda(parcelas[0])} + ${quantidade - 1}× de ${formatarMoeda(ultima)}`
  const periodo =
    quantidade === 1
      ? `em ${formatarMesCurto(valores.data)}`
      : `de ${formatarMesCurto(valores.data)} a ${formatarMesCurto(somarMeses(valores.data, quantidade - 1))}`
  const andamento = inicial > 1 ? ` (parcelas ${inicial} a ${total})` : ''

  return `${valoresTexto}${andamento} — ${periodo} — total ${formatarMoeda(soma)}`
}

interface LancamentoFormProps {
  categorias: Categoria[]
  carregando: boolean
  erro: string | null
  onAdicionar: (lancamento: LancamentoInput) => void
  onAdicionarParcelado: (lancamento: LancamentoParceladoInput) => void
  onEditar: (id: string, lancamento: LancamentoInput, escopo: EscopoParcelas) => void
  lancamentoEmEdicao: Lancamento | null
  onCancelarEdicao: () => void
}

export default function LancamentoForm({
  categorias,
  carregando,
  erro,
  onAdicionar,
  onAdicionarParcelado,
  onEditar,
  lancamentoEmEdicao,
  onCancelarEdicao,
}: LancamentoFormProps) {
  const editando = Boolean(lancamentoEmEdicao)
  const editandoParcela = Boolean(lancamentoEmEdicao?.parcelamentoId)
  const [escopo, setEscopo] = useState<EscopoParcelas>('esta')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LancamentoFormValues>({
    resolver: zodResolver(lancamentoSchema) as LancamentoResolver,
    defaultValues: valoresIniciais(lancamentoEmEdicao),
  })

  // Ao entrar em modo edição, carrega os dados do lançamento no formulário.
  useEffect(() => {
    reset(valoresIniciais(lancamentoEmEdicao))
    setEscopo('esta')
  }, [lancamentoEmEdicao, reset])

  const valores = watch()
  const previa = montarPrevia(valores)

  const aoSubmeter = handleSubmit((dados) => {
    const base: LancamentoInput = {
      descricao: dados.descricao,
      valor: Number(dados.valor),
      tipo: dados.tipo,
      data: dados.data,
      categoriaId: dados.categoriaId,
    }

    if (lancamentoEmEdicao) {
      onEditar(lancamentoEmEdicao.id, base, editandoParcela ? escopo : 'esta')
    } else if (dados.parcelado) {
      onAdicionarParcelado({
        ...base,
        totalParcelas: Number(dados.totalParcelas),
        parcelaInicial: Number(dados.parcelaInicial) || 1,
        modoValor: dados.modoValor,
      })
    } else {
      onAdicionar(base)
    }
  })

  const label = 'block text-sm font-medium text-slate-600 mb-1'
  const input =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  const erroCampo = 'mt-1 text-xs text-red-600'

  return (
    <form onSubmit={aoSubmeter} noValidate>
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
            {...register('descricao')}
          />
          {errors.descricao && <p className={erroCampo}>{errors.descricao.message}</p>}
        </div>

        <div>
          <label className={label} htmlFor="valor">
            {valores.parcelado
              ? valores.modoValor === 'total'
                ? 'Valor total (R$)'
                : 'Valor da parcela (R$)'
              : 'Valor (R$)'}
          </label>
          <input
            id="valor"
            type="number"
            min="0"
            step="0.01"
            className={input}
            placeholder="0,00"
            {...register('valor', { valueAsNumber: true })}
          />
          {errors.valor && <p className={erroCampo}>{errors.valor.message}</p>}
        </div>

        <div>
          <label className={label} htmlFor="data">
            {valores.parcelado ? 'Data da primeira parcela' : 'Data'}
          </label>
          <input id="data" type="date" className={input} {...register('data')} />
          {errors.data && <p className={erroCampo}>{errors.data.message}</p>}
        </div>

        <div>
          <label className={label} htmlFor="tipo">
            Tipo
          </label>
          <select id="tipo" className={input} {...register('tipo')}>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
          {errors.tipo && <p className={erroCampo}>{errors.tipo.message}</p>}
        </div>

        <div>
          <label className={label} htmlFor="categoria">
            Categoria
          </label>
          <select
            id="categoria"
            className={input}
            disabled={carregando || !!erro}
            {...register('categoriaId')}
          >
            <option value="">
              {carregando ? 'Carregando categorias...' : 'Selecione...'}
            </option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
          {erro && <p className={erroCampo}>Não foi possível carregar as categorias.</p>}
          {errors.categoriaId && <p className={erroCampo}>{errors.categoriaId.message}</p>}
        </div>

        {/* Parcelamento só existe na criação: editar não reparcela um lançamento. */}
        {!editando && (
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                {...register('parcelado')}
              />
              Parcelado
            </label>
          </div>
        )}

        {!editando && valores.parcelado && (
          <div className="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200 sm:col-span-2 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="totalParcelas">
                Número de parcelas
              </label>
              <input
                id="totalParcelas"
                type="number"
                min={MIN_PARCELAS}
                max={MAX_PARCELAS}
                step="1"
                className={input}
                placeholder="Ex.: 10"
                {...register('totalParcelas', { valueAsNumber: true })}
              />
              {errors.totalParcelas && <p className={erroCampo}>{errors.totalParcelas.message}</p>}
            </div>

            <div>
              <label className={label} htmlFor="parcelaInicial">
                Parcela inicial
              </label>
              <input
                id="parcelaInicial"
                type="number"
                min="1"
                step="1"
                className={input}
                {...register('parcelaInicial', { valueAsNumber: true })}
              />
              {errors.parcelaInicial && <p className={erroCampo}>{errors.parcelaInicial.message}</p>}
            </div>

            <div>
              <label className={label} htmlFor="modoValor">
                O valor informado é
              </label>
              <select id="modoValor" className={input} {...register('modoValor')}>
                <option value="total">Valor total</option>
                <option value="parcela">Valor da parcela</option>
              </select>
            </div>

            {previa && (
              <p className="text-sm text-slate-600 sm:col-span-3" data-testid="previa-parcelas">
                {previa}
              </p>
            )}
          </div>
        )}

        {editandoParcela && lancamentoEmEdicao && (
          <fieldset className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200 sm:col-span-2">
            <legend className="px-1 text-sm font-medium text-slate-600">
              Parcela {lancamentoEmEdicao.parcelaNumero} de {lancamentoEmEdicao.parcelaTotal} — aplicar em
            </legend>
            <div className="flex flex-wrap gap-4">
              {ESCOPOS.map((opcao) => (
                <label key={opcao.valor} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="escopo"
                    className="accent-emerald-600"
                    checked={escopo === opcao.valor}
                    onChange={() => setEscopo(opcao.valor)}
                  />
                  {opcao.rotulo}
                </label>
              ))}
            </div>
            {escopo !== 'esta' && (
              <p className="mt-2 text-xs text-slate-500">
                Descrição, valor, tipo e categoria são aplicados às demais parcelas; a data muda só nesta.
              </p>
            )}
          </fieldset>
        )}
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500/40"
        >
          {editando ? 'Salvar alterações' : valores.parcelado ? 'Adicionar parcelas' : 'Adicionar lançamento'}
        </button>
        <button
          type="button"
          onClick={onCancelarEdicao}
          className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
