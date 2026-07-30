import { useMemo, useState } from 'react'
import CardEstatistica from './components/CardEstatistica'
import LancamentoForm from './components/LancamentoForm'
import FiltrosBarra from './components/FiltrosBarra'
import LancamentosList from './components/LancamentosList'
import SeletorMes from './components/SeletorMes'
import GraficoDespesasPorCategoria from './components/GraficoDespesasPorCategoria'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useCategorias } from './hooks/useCategorias'
import {
  agruparDespesasPorCategoria,
  calcularResumoMes,
  deslocarMes,
  filtrarPorMes,
  mesAtual,
} from './utils/financas'
import type { Lancamento, TipoLancamento } from './types'

export default function App() {
  const [lancamentos, setLancamentos] = useLocalStorage<Lancamento[]>('financeflow:lancamentos', [])
  const { categorias, carregando, erro } = useCategorias()

  const [mesSelecionado, setMesSelecionado] = useState(mesAtual())
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoLancamento>('todos')
  const [ordem, setOrdem] = useState<'desc' | 'asc'>('desc')
  const [emEdicao, setEmEdicao] = useState<Lancamento | null>(null)

  function adicionarLancamento(novo: Lancamento) {
    setLancamentos((atual) => [novo, ...atual])
  }

  function editarLancamento(atualizado: Lancamento) {
    setLancamentos((atual) =>
      atual.map((l) => (l.id === atualizado.id ? atualizado : l)),
    )
    setEmEdicao(null)
  }

  function excluirLancamento(id: string) {
    setLancamentos((atual) => atual.filter((l) => l.id !== id))
    setEmEdicao((atual) => (atual?.id === id ? null : atual))
  }

  // Lançamentos restritos ao mês selecionado no seletor de mês.
  const lancamentosDoMes = useMemo(
    () => filtrarPorMes(lancamentos, mesSelecionado),
    [lancamentos, mesSelecionado],
  )

  const resumoMes = useMemo(() => calcularResumoMes(lancamentosDoMes), [lancamentosDoMes])

  const dadosCategorias = useMemo(
    () => agruparDespesasPorCategoria(lancamentosDoMes),
    [lancamentosDoMes],
  )

  // Pesquisa → filtro por tipo → ordenação por data, dentro do mês selecionado.
  const lancamentosVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return lancamentosDoMes
      .filter((l) => l.descricao.toLowerCase().includes(termo))
      .filter((l) => filtroTipo === 'todos' || l.tipo === filtroTipo)
      .sort((a, b) =>
        ordem === 'desc'
          ? b.data.localeCompare(a.data)
          : a.data.localeCompare(b.data),
      )
  }, [lancamentosDoMes, busca, filtroTipo, ordem])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            💸 FinanceFlow
          </h1>
          <p className="text-sm text-slate-500">
            Monitoramento financeiro mensal — receitas, despesas e saldo do mês.
          </p>
        </header>

        <div className="space-y-6">
          <SeletorMes
            mes={mesSelecionado}
            onMesAnterior={() => setMesSelecionado((m) => deslocarMes(m, -1))}
            onProximoMes={() => setMesSelecionado((m) => deslocarMes(m, 1))}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CardEstatistica
              label="Saldo do mês"
              valor={resumoMes.saldo}
              variante={resumoMes.saldo >= 0 ? 'positivo' : 'negativo'}
            />
            <CardEstatistica label="Receitas do mês" valor={resumoMes.receitas} variante="positivo" />
            <CardEstatistica label="Despesas do mês" valor={resumoMes.despesas} variante="negativo" />
          </div>

          <LancamentoForm
            categorias={categorias}
            carregando={carregando}
            erro={erro}
            onAdicionar={adicionarLancamento}
            onEditar={editarLancamento}
            lancamentoEmEdicao={emEdicao}
            onCancelarEdicao={() => setEmEdicao(null)}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="space-y-4 lg:col-span-2">
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
                onEditar={setEmEdicao}
                onExcluir={excluirLancamento}
                idEmEdicao={emEdicao?.id ?? null}
              />
            </section>

            <GraficoDespesasPorCategoria dados={dadosCategorias} />
          </div>
        </div>
      </div>
    </div>
  )
}
