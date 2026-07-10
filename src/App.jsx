import { useMemo, useState } from 'react'
import ResumoSaldo from './components/ResumoSaldo'
import LancamentoForm from './components/LancamentoForm'
import FiltrosBarra from './components/FiltrosBarra'
import LancamentosList from './components/LancamentosList'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useCategorias } from './hooks/useCategorias'
import { calcularSaldo } from './utils/financas'

export default function App() {
  const [lancamentos, setLancamentos] = useLocalStorage('financeflow:lancamentos', [])
  const { categorias, carregando, erro } = useCategorias()

  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos') // todos | receita | despesa
  const [ordem, setOrdem] = useState('desc') // desc | asc (por data)
  const [emEdicao, setEmEdicao] = useState(null) // lançamento sendo editado, ou null

  function adicionarLancamento(novo) {
    setLancamentos((atual) => [novo, ...atual])
  }

  function editarLancamento(atualizado) {
    setLancamentos((atual) =>
      atual.map((l) => (l.id === atualizado.id ? atualizado : l)),
    )
    setEmEdicao(null)
  }

  function excluirLancamento(id) {
    setLancamentos((atual) => atual.filter((l) => l.id !== id))
    setEmEdicao((atual) => (atual?.id === id ? null : atual))
  }

  // Saldo é calculado sobre TODOS os lançamentos (não sofre com os filtros de visualização).
  const saldo = useMemo(() => calcularSaldo(lancamentos), [lancamentos])

  // Pesquisa → filtro por tipo → ordenação por data.
  const lancamentosVisiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return lancamentos
      .filter((l) => l.descricao.toLowerCase().includes(termo))
      .filter((l) => filtroTipo === 'todos' || l.tipo === filtroTipo)
      .sort((a, b) =>
        ordem === 'desc'
          ? b.data.localeCompare(a.data)
          : a.data.localeCompare(b.data),
      )
  }, [lancamentos, busca, filtroTipo, ordem])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            💸 FinanceFlow
          </h1>
          <p className="text-sm text-slate-500">
            Gerenciamento financeiro simples — receitas, despesas e saldo.
          </p>
        </header>

        <div className="space-y-6">
          <ResumoSaldo saldo={saldo} />

          <LancamentoForm
            categorias={categorias}
            carregando={carregando}
            erro={erro}
            onAdicionar={adicionarLancamento}
            onEditar={editarLancamento}
            lancamentoEmEdicao={emEdicao}
            onCancelarEdicao={() => setEmEdicao(null)}
          />

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
              onEditar={setEmEdicao}
              onExcluir={excluirLancamento}
              idEmEdicao={emEdicao?.id ?? null}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
