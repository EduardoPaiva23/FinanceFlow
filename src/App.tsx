import { useState } from 'react'
import CardEstatistica from './components/CardEstatistica'
import LancamentoForm from './components/LancamentoForm'
import FiltrosBarra from './components/FiltrosBarra'
import LancamentosList from './components/LancamentosList'
import SeletorMes from './components/SeletorMes'
import GraficoDespesasPorCategoria from './components/GraficoDespesasPorCategoria'
import DetalhesMes from './components/DetalhesMes'
import Modal from './components/Modal'
import {
  criarLancamento as criarLancamentoApi,
  atualizarLancamento as atualizarLancamentoApi,
  excluirLancamento as excluirLancamentoApi,
} from './api/lancamentos'
import { useAuth } from './context/AuthContext'
import { useCategorias } from './hooks/useCategorias'
import { useLancamentos } from './hooks/useLancamentos'
import { useResumoMes } from './hooks/useResumoMes'
import { usePorCategoriaTotais } from './hooks/usePorCategoriaTotais'
import { deslocarMes, mesAtual } from './utils/financas'
import type { Lancamento, LancamentoInput, TipoLancamento } from './types'

export default function App() {
  const { usuario, logout } = useAuth()
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual())
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoLancamento>('todos')
  const [ordem, setOrdem] = useState<'desc' | 'asc'>('desc')
  const [emEdicao, setEmEdicao] = useState<Lancamento | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [erroAcao, setErroAcao] = useState<string | null>(null)

  // Incrementado após qualquer criação/edição/exclusão bem-sucedida, para
  // forçar o refetch coordenado de lançamentos, resumo e totais por categoria.
  const [versao, setVersao] = useState(0)

  const { categorias, carregando: carregandoCategorias, erro: erroCategorias } = useCategorias()

  const { lancamentos: lancamentosVisiveis } = useLancamentos({
    mes: mesSelecionado,
    busca,
    tipo: filtroTipo,
    ordem,
    versao,
  })

  const { resumo: resumoMes } = useResumoMes({ mes: mesSelecionado, versao })
  const { dados: dadosCategorias } = usePorCategoriaTotais({ mes: mesSelecionado, versao })

  // Lista não filtrada do mês, usada só para as estatísticas de DetalhesMes
  // (independente da busca/tipo aplicados na lista visível).
  const { lancamentos: lancamentosDoMes } = useLancamentos({
    mes: mesSelecionado,
    busca: '',
    tipo: 'todos',
    ordem: 'desc',
    versao,
  })

  function abrirModalNovo() {
    setEmEdicao(null)
    setModalAberto(true)
  }

  function abrirModalEdicao(lancamento: Lancamento) {
    setEmEdicao(lancamento)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEmEdicao(null)
  }

  async function adicionarLancamento(dados: LancamentoInput) {
    try {
      setErroAcao(null)
      await criarLancamentoApi(dados)
      setVersao((v) => v + 1)
      setModalAberto(false)
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : String(e))
    }
  }

  async function editarLancamento(id: string, dados: LancamentoInput) {
    try {
      setErroAcao(null)
      await atualizarLancamentoApi(id, dados)
      setEmEdicao(null)
      setVersao((v) => v + 1)
      setModalAberto(false)
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : String(e))
    }
  }

  async function excluirLancamento(id: string) {
    try {
      setErroAcao(null)
      await excluirLancamentoApi(id)
      setEmEdicao((atual) => (atual?.id === id ? null : atual))
      setVersao((v) => v + 1)
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              💸 FinanceFlow
            </h1>
            <p className="text-sm text-slate-500">
              Monitoramento financeiro mensal — receitas, despesas e saldo do mês.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {usuario?.nome ?? usuario?.email}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SeletorMes
              mes={mesSelecionado}
              onMesAnterior={() => setMesSelecionado((m) => deslocarMes(m, -1))}
              onProximoMes={() => setMesSelecionado((m) => deslocarMes(m, 1))}
            />
            <button
              type="button"
              onClick={abrirModalNovo}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500/40"
            >
              + Novo lançamento
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CardEstatistica
              label="Saldo do mês"
              valor={resumoMes.saldo}
              variante={resumoMes.saldo >= 0 ? 'positivo' : 'negativo'}
            />
            <CardEstatistica label="Receitas do mês" valor={resumoMes.receitas} variante="positivo" />
            <CardEstatistica label="Despesas do mês" valor={resumoMes.despesas} variante="negativo" />
          </div>

          {!modalAberto && erroAcao && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 ring-1 ring-red-200">
              {erroAcao}
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <GraficoDespesasPorCategoria dados={dadosCategorias} />
            </div>
            <DetalhesMes
              resumo={resumoMes}
              dadosCategorias={dadosCategorias}
              lancamentosDoMes={lancamentosDoMes}
            />
          </div>

          <section className="space-y-4">
            <FiltrosBarra
              busca={busca}
              onBuscaChange={setBusca}
              filtroTipo={filtroTipo}
              onFiltroTipoChange={setFiltroTipo}
              ordem={ordem}
              onToggleOrdem={() =>
                setOrdem((o) => (o === 'desc' ? 'asc' : 'desc'))
              }
            />
            <LancamentosList
              lancamentos={lancamentosVisiveis}
              onEditar={abrirModalEdicao}
              onExcluir={excluirLancamento}
              idEmEdicao={emEdicao?.id ?? null}
            />
          </section>
        </div>
      </div>

      <Modal aberto={modalAberto} onFechar={fecharModal}>
        <LancamentoForm
          categorias={categorias}
          carregando={carregandoCategorias}
          erro={erroCategorias}
          onAdicionar={adicionarLancamento}
          onEditar={editarLancamento}
          lancamentoEmEdicao={emEdicao}
          onCancelarEdicao={fecharModal}
        />
        {modalAberto && erroAcao && (
          <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 ring-1 ring-red-200">
            {erroAcao}
          </p>
        )}
      </Modal>
    </div>
  )
}
