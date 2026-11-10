import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { analisarArquivo, confirmarItens } from '../api/importacoes'
import { ApiError } from '../api/client'
import { MAX_PARCELAS, MIN_PARCELAS } from '../schemas/lancamento.schema'
import { formatarData, formatarMesCurto, formatarMoeda, somarMeses } from '../utils/financas'
import type { AnaliseImportacao, Categoria, ItemConfirmar, ItemImportado } from '../types'

const TAMANHO_MAXIMO = 10 * 1024 * 1024
const EXTENSOES = ['.pdf', '.ofx']

type Fase = 'selecao' | 'lendo' | 'senha' | 'revisao'
type StatusLinha = 'pendente' | 'gravando' | 'adicionado' | 'ja_cadastrado' | 'erro'

interface Linha {
  item: ItemImportado
  categoriaId: string
  parcelado: boolean
  numero: number | ''
  total: number | ''
  status: StatusLinha
  /** Mensagem de validação da linha (categoria ou parcela). */
  aviso: string | null
  futurasCriadas: number
}

function criarLinha(item: ItemImportado): Linha {
  return {
    item,
    categoriaId: item.categoriaIdSugerida ?? '',
    parcelado: item.parcela !== null,
    numero: item.parcela?.numero ?? '',
    total: item.parcela?.total ?? '',
    status: item.estado === 'ja_cadastrado' ? 'ja_cadastrado' : 'pendente',
    aviso: null,
    futurasCriadas: 0,
  }
}

function parcelaDaLinha(linha: Linha): { numero: number; total: number } | null | 'invalida' {
  if (!linha.parcelado) return null
  const numero = Number(linha.numero)
  const total = Number(linha.total)
  const valida =
    Number.isInteger(numero) &&
    Number.isInteger(total) &&
    total >= MIN_PARCELAS &&
    total <= MAX_PARCELAS &&
    numero >= 1 &&
    numero <= total
  return valida ? { numero, total } : 'invalida'
}

/** Linha ainda não gravada e que o usuário pode adicionar. */
function podeAdicionar(linha: Linha): boolean {
  return linha.status === 'pendente' || linha.status === 'erro'
}

/** "Adicionar todos" cobre só os novos: possível duplicidade exige decisão linha a linha. */
function entraNoLote(linha: Linha): boolean {
  return podeAdicionar(linha) && linha.item.estado === 'novo'
}

function paraConfirmar(linha: Linha, parcela: { numero: number; total: number } | null): ItemConfirmar {
  const { item } = linha
  return {
    idTemp: item.idTemp,
    dataOriginal: item.dataOriginal,
    data: item.data,
    descricaoOriginal: item.descricaoOriginal,
    descricao: item.descricao,
    valor: item.valor,
    tipo: item.tipo,
    fitid: item.fitid,
    ocorrencia: item.ocorrencia,
    parcela,
    categoriaId: linha.categoriaId,
  }
}

interface ImportarFaturaModalProps {
  aberto: boolean
  categorias: Categoria[]
  /** `alterou` indica se algum lançamento foi gravado (para atualizar a tela). */
  onFechar: (alterou: boolean) => void
}

export default function ImportarFaturaModal({ aberto, categorias, onFechar }: ImportarFaturaModalProps) {
  const [fase, setFase] = useState<Fase>('selecao')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [analise, setAnalise] = useState<AnaliseImportacao | null>(null)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [gravando, setGravando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)
  const [alterou, setAlterou] = useState(false)
  const inputArquivo = useRef<HTMLInputElement>(null)
  // Trava síncrona contra clique duplo: o estado `gravando` só vale no próximo render.
  const emEnvio = useRef(false)

  // Cada abertura começa do zero.
  useEffect(() => {
    if (!aberto) return
    setFase('selecao')
    setArquivo(null)
    setSenha('')
    setErro(null)
    setAnalise(null)
    setLinhas([])
    setGravando(false)
    setResultado(null)
    setConfirmandoSaida(false)
    setAlterou(false)
    emEnvio.current = false
  }, [aberto])

  const pendentes = linhas.filter(podeAdicionar).length

  const tentarFechar = useCallback(() => {
    if (gravando) return
    if (fase === 'revisao' && pendentes > 0 && !confirmandoSaida) {
      setConfirmandoSaida(true)
      return
    }
    onFechar(alterou)
  }, [gravando, fase, pendentes, confirmandoSaida, onFechar, alterou])

  async function ler(arquivoParaLer: File, senhaInformada?: string) {
    setFase('lendo')
    setErro(null)
    try {
      const dados = await analisarArquivo(arquivoParaLer, senhaInformada)
      setAnalise(dados)
      setLinhas(dados.itens.map(criarLinha))
      setFase('revisao')
    } catch (e) {
      if (e instanceof ApiError && e.codigo === 'PDF_SENHA_NECESSARIA') {
        setFase('senha')
        return
      }
      if (e instanceof ApiError && e.codigo === 'PDF_SENHA_INCORRETA') {
        setErro('Senha incorreta.')
        setFase('senha')
        return
      }
      setErro(
        e instanceof ApiError ? e.message : 'Não foi possível processar o arquivo. Tente novamente.',
      )
      setFase('selecao')
    }
  }

  function aoEscolherArquivo(escolhido: File | undefined) {
    if (inputArquivo.current) inputArquivo.current.value = ''
    if (!escolhido) return
    const nome = escolhido.name.toLowerCase()
    if (!EXTENSOES.some((ext) => nome.endsWith(ext))) {
      setErro('Formato não suportado. Envie um arquivo PDF ou OFX.')
      return
    }
    if (escolhido.size > TAMANHO_MAXIMO) {
      setErro('Arquivo muito grande. O limite é 10 MB.')
      return
    }
    setArquivo(escolhido)
    setSenha('')
    void ler(escolhido)
  }

  function alterarLinha(idTemp: string, mudanca: Partial<Linha>) {
    setLinhas((atuais) =>
      atuais.map((l) => (l.item.idTemp === idTemp ? { ...l, ...mudanca, aviso: null } : l)),
    )
  }

  /** Valida e envia as linhas; as inválidas ficam na lista com o aviso. */
  async function adicionar(alvos: Linha[], emLote: boolean) {
    if (!analise || emEnvio.current || alvos.length === 0) return
    emEnvio.current = true
    setConfirmandoSaida(false)

    const avisos = new Map<string, string>()
    const itens: ItemConfirmar[] = []
    for (const linha of alvos) {
      const parcela = parcelaDaLinha(linha)
      if (!linha.categoriaId) avisos.set(linha.item.idTemp, 'Selecione uma categoria')
      else if (parcela === 'invalida') {
        avisos.set(linha.item.idTemp, `Informe a parcela (total entre ${MIN_PARCELAS} e ${MAX_PARCELAS})`)
      } else itens.push(paraConfirmar(linha, parcela))
    }

    const enviados = new Set(itens.map((i) => i.idTemp))
    setResultado(null)
    setLinhas((atuais) =>
      atuais.map((l) => {
        if (enviados.has(l.item.idTemp)) return { ...l, status: 'gravando', aviso: null }
        const aviso = avisos.get(l.item.idTemp)
        return aviso ? { ...l, aviso } : l
      }),
    )

    const semCategoria = [...avisos.values()].filter((a) => a === 'Selecione uma categoria').length
    const pendencia =
      emLote && semCategoria > 0
        ? `${semCategoria} ${semCategoria === 1 ? 'lançamento precisa' : 'lançamentos precisam'} de categoria.`
        : null

    if (itens.length === 0) {
      setResultado(pendencia)
      emEnvio.current = false
      return
    }

    setGravando(true)
    try {
      const resultados = await confirmarItens(analise.origem, itens)
      const porId = new Map(resultados.map((r) => [r.idTemp, r]))
      let adicionados = 0
      let futuras = 0
      for (const r of resultados) {
        if (r.status !== 'adicionado') continue
        adicionados++
        futuras += r.parcelasFuturasCriadas
      }
      setLinhas((atuais) =>
        atuais.map((l) => {
          const r = porId.get(l.item.idTemp)
          if (!r) return l
          if (r.status === 'adicionado') {
            return { ...l, status: 'adicionado', futurasCriadas: r.parcelasFuturasCriadas }
          }
          if (r.status === 'ja_cadastrado') return { ...l, status: 'ja_cadastrado' }
          return { ...l, status: 'erro', aviso: 'Erro ao adicionar' }
        }),
      )
      if (adicionados > 0) setAlterou(true)

      const partes: string[] = []
      if (adicionados > 0) {
        partes.push(`${adicionados} ${adicionados === 1 ? 'lançamento adicionado' : 'lançamentos adicionados'}.`)
      }
      if (futuras > 0) {
        partes.push(`${futuras} ${futuras === 1 ? 'parcela futura criada' : 'parcelas futuras criadas'}.`)
      }
      if (pendencia) partes.push(pendencia)
      setResultado(partes.join(' ') || null)
    } catch {
      // Falha da requisição inteira: nada foi confirmado, as linhas voltam a ficar disponíveis.
      setLinhas((atuais) =>
        atuais.map((l) =>
          enviados.has(l.item.idTemp) ? { ...l, status: 'erro', aviso: 'Erro ao adicionar' } : l,
        ),
      )
    } finally {
      setGravando(false)
      emEnvio.current = false
    }
  }

  function aplicarCategoriaEmLote(categoriaId: string) {
    if (!categoriaId) return
    setLinhas((atuais) =>
      atuais.map((l) => (podeAdicionar(l) && !l.categoriaId ? { ...l, categoriaId, aviso: null } : l)),
    )
  }

  const doLote = linhas.filter(entraNoLote)
  const novos = linhas.filter((l) => l.item.estado !== 'ja_cadastrado').length
  const jaCadastrados = linhas.length - novos
  const semCategoria = linhas.filter((l) => podeAdicionar(l) && !l.categoriaId).length

  const campo =
    'rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
  const botaoPrimario =
    'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50'
  const botaoSecundario =
    'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50'

  return (
    <Modal aberto={aberto} onFechar={tentarFechar} largo={fase === 'revisao'}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-800">Importar fatura</h2>
          {fase === 'revisao' && analise && (
            <p className="truncate text-sm text-slate-500" title={analise.arquivo}>
              {analise.arquivo}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={tentarFechar}
          disabled={gravando}
          aria-label="Fechar"
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        >
          ✕
        </button>
      </div>

      {(fase === 'selecao' || fase === 'lendo') && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Envie a fatura do cartão em <strong>PDF</strong> ou <strong>OFX</strong> (até 10 MB). Você revisa
            os lançamentos antes de adicionar — nada é gravado no envio.
          </p>
          <input
            ref={inputArquivo}
            type="file"
            accept=".pdf,.ofx,application/pdf"
            className="hidden"
            data-testid="input-arquivo"
            onChange={(e) => aoEscolherArquivo(e.target.files?.[0])}
          />
          <button
            type="button"
            className={botaoPrimario}
            disabled={fase === 'lendo'}
            onClick={() => inputArquivo.current?.click()}
          >
            {fase === 'lendo' ? 'Lendo arquivo…' : 'Escolher arquivo'}
          </button>
          {fase === 'lendo' && (
            <p className="text-sm text-slate-500" role="status">
              Identificando os lançamentos de {arquivo?.name}…
            </p>
          )}
          {erro && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 ring-1 ring-red-200" role="alert">
              {erro}
            </p>
          )}
        </div>
      )}

      {fase === 'senha' && arquivo && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (senha) void ler(arquivo, senha)
          }}
        >
          <p className="text-sm text-slate-600">
            <strong>{arquivo.name}</strong> é protegido por senha. Informe a senha para ler a fatura — ela não
            é armazenada.
          </p>
          <input
            type="password"
            autoFocus
            autoComplete="off"
            placeholder="Senha do PDF"
            className={`${campo} w-full`}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          {erro && (
            <p className="text-sm text-red-600" role="alert">
              {erro}
            </p>
          )}
          <div className="flex gap-3">
            <button type="submit" className={botaoPrimario} disabled={!senha}>
              Ler fatura
            </button>
            <button
              type="button"
              className={botaoSecundario}
              onClick={() => {
                setErro(null)
                setFase('selecao')
              }}
            >
              Escolher outro arquivo
            </button>
          </div>
        </form>
      )}

      {fase === 'revisao' && analise && (
        <div>
          {/* Cabeçalho fixo: o resumo e "Adicionar todos" ficam visíveis com a lista rolando. */}
          <div className="space-y-3 border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600" data-testid="resumo-importacao">
                <strong>{linhas.length}</strong> {linhas.length === 1 ? 'lançamento identificado' : 'lançamentos identificados'}
                {' · '}
                <strong>{novos}</strong> {novos === 1 ? 'novo' : 'novos'}
                {' · '}
                <strong>{jaCadastrados}</strong> já {jaCadastrados === 1 ? 'cadastrado' : 'cadastrados'}
              </p>
              <button
                type="button"
                className={botaoPrimario}
                disabled={gravando || doLote.length === 0}
                onClick={() => void adicionar(doLote, true)}
              >
                {gravando ? 'Adicionando…' : `Adicionar todos (${doLote.length})`}
              </button>
            </div>

            {novos === 0 && (
              <p className="rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
                Todos os lançamentos deste arquivo já estão cadastrados.
              </p>
            )}

            {semCategoria > 0 && (
              <label className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                Aplicar às {semCategoria} sem categoria:
                <select
                  className={campo}
                  value=""
                  disabled={gravando}
                  onChange={(e) => aplicarCategoriaEmLote(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {resultado && (
              <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200" role="status">
                {resultado}
              </p>
            )}

            {confirmandoSaida && pendentes > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-amber-200" role="alert">
                <span>
                  {pendentes === 1
                    ? 'Existe 1 lançamento não adicionado.'
                    : `Existem ${pendentes} lançamentos não adicionados.`}{' '}
                  Deseja sair?
                </span>
                <button type="button" className={botaoSecundario} onClick={() => onFechar(alterou)}>
                  Sair
                </button>
                <button type="button" className={botaoSecundario} onClick={() => setConfirmandoSaida(false)}>
                  Continuar revisando
                </button>
              </div>
            )}
          </div>

          <ul className="max-h-[55vh] divide-y divide-slate-100 overflow-y-auto" data-testid="lista-importacao">
            {linhas.map((linha) => (
              <LinhaImportada
                key={linha.item.idTemp}
                linha={linha}
                categorias={categorias}
                bloqueado={gravando}
                classeCampo={campo}
                onAlterar={(mudanca) => alterarLinha(linha.item.idTemp, mudanca)}
                onAdicionar={() => void adicionar([linha], false)}
              />
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}

interface LinhaImportadaProps {
  linha: Linha
  categorias: Categoria[]
  bloqueado: boolean
  classeCampo: string
  onAlterar: (mudanca: Partial<Linha>) => void
  onAdicionar: () => void
}

function LinhaImportada({ linha, categorias, bloqueado, classeCampo, onAlterar, onAdicionar }: LinhaImportadaProps) {
  const { item } = linha
  const receita = item.tipo === 'receita'
  const editavel = podeAdicionar(linha)
  const parcela = parcelaDaLinha(linha)
  const parcelaOk = parcela !== null && parcela !== 'invalida' ? parcela : null
  const data = linha.parcelado ? item.data : item.dataOriginal
  const futuras = parcelaOk ? parcelaOk.total - parcelaOk.numero : 0

  return (
    <li
      className={`grid grid-cols-1 gap-x-4 gap-y-2 py-3 pr-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center ${
        linha.status === 'ja_cadastrado' ? 'opacity-50' : ''
      }`}
      data-estado={linha.status === 'pendente' ? item.estado : linha.status}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium text-slate-800">
          <span className="truncate">{linha.parcelado ? item.descricao : item.descricaoOriginal}</span>
          {parcelaOk && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              Parcela {parcelaOk.numero} de {parcelaOk.total}
            </span>
          )}
          {linha.status === 'ja_cadastrado' && (
            <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Já cadastrado
            </span>
          )}
          {editavel && item.estado === 'possivel_duplicidade' && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              Possível duplicidade
            </span>
          )}
        </p>
        <p className="text-xs text-slate-500">
          {formatarData(data)} · {receita ? 'Receita' : 'Despesa'}
          {parcelaOk && futuras > 0 && editavel && (
            <>
              {' · '}
              {futuras === 1 ? 'Será criada 1 parcela futura' : `Serão criadas ${futuras} parcelas futuras`} (
              {futuras === 1
                ? formatarMesCurto(somarMeses(data, 1))
                : `${formatarMesCurto(somarMeses(data, 1))} a ${formatarMesCurto(somarMeses(data, futuras))}`}
              )
            </>
          )}
          {linha.status === 'adicionado' && linha.futurasCriadas > 0 && (
            <>
              {' · '}
              {linha.futurasCriadas} {linha.futurasCriadas === 1 ? 'parcela futura criada' : 'parcelas futuras criadas'}
            </>
          )}
        </p>
        {editavel && item.estado === 'possivel_duplicidade' && item.existente && (
          <p className="text-xs text-amber-700">
            Já existe: {item.existente.descricao} · {formatarData(item.existente.data)} ·{' '}
            {formatarMoeda(item.existente.valor)}
          </p>
        )}
        {linha.aviso && (
          <p className="text-xs font-medium text-red-600" role="alert">
            {linha.aviso}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {editavel && (
          <>
            <select
              aria-label="Categoria"
              className={`${classeCampo} ${linha.aviso === 'Selecione uma categoria' ? 'border-red-400' : ''}`}
              value={linha.categoriaId}
              disabled={bloqueado}
              onChange={(e) => onAlterar({ categoriaId: e.target.value })}
            >
              <option value="">Categoria…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                className="accent-emerald-600"
                checked={linha.parcelado}
                disabled={bloqueado}
                onChange={(e) => onAlterar({ parcelado: e.target.checked })}
              />
              Parcelado
            </label>
            {linha.parcelado && (
              <span className="flex items-center gap-1 text-xs text-slate-600">
                <input
                  type="number"
                  aria-label="Parcela atual"
                  min="1"
                  className={`${classeCampo} w-14`}
                  value={linha.numero}
                  disabled={bloqueado}
                  onChange={(e) => onAlterar({ numero: e.target.value === '' ? '' : Number(e.target.value) })}
                />
                de
                <input
                  type="number"
                  aria-label="Total de parcelas"
                  min={MIN_PARCELAS}
                  max={MAX_PARCELAS}
                  className={`${classeCampo} w-14`}
                  value={linha.total}
                  disabled={bloqueado}
                  onChange={(e) => onAlterar({ total: e.target.value === '' ? '' : Number(e.target.value) })}
                />
              </span>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <span className={`font-semibold tabular-nums ${receita ? 'text-emerald-600' : 'text-red-600'}`}>
          {receita ? '+' : '-'} {formatarMoeda(item.valor)}
        </span>
        {editavel && (
          <button
            type="button"
            onClick={onAdicionar}
            disabled={bloqueado}
            title={linha.status === 'erro' ? 'Tentar de novo' : 'Adicionar lançamento'}
            aria-label={linha.status === 'erro' ? 'Tentar de novo' : 'Adicionar lançamento'}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {linha.status === 'erro' ? '↻' : '+'}
          </button>
        )}
        {linha.status === 'gravando' && <span className="w-8 text-center text-sm text-slate-400">…</span>}
        {linha.status === 'adicionado' && (
          <span className="flex h-8 w-8 items-center justify-center text-emerald-600" title="Adicionado" aria-label="Adicionado">
            ✓
          </span>
        )}
        {linha.status === 'ja_cadastrado' && <span className="w-8" />}
      </div>
    </li>
  )
}
