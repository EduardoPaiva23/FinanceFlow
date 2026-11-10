import {
  TOLERANCIA_PARCELA_CENTAVOS,
  chaveGeral,
  chaveParcela,
  lerChaveParcela,
  prefixoParcelamento,
} from '../lib/normalizar.js'
import { detectarParcela, paraCentavos, somarMeses } from '../lib/parcelas.js'
import type { ItemBruto, TipoItem } from './tipos.js'

/** Lançamento já gravado, no formato mínimo necessário para comparar. */
export interface Existente {
  id: string
  descricao: string
  valor: number
  data: string
  fitid: string | null
  chaveImportacao: string | null
  parcelamentoId: string | null
}

export type EstadoItem = 'novo' | 'ja_cadastrado' | 'possivel_duplicidade'

/** Dados de um item que definem sua identidade na comparação. */
export interface ItemComparavel {
  /** Data como consta no arquivo. */
  dataOriginal: string
  /** Data em que o lançamento será gravado. */
  data: string
  /** Descrição como consta no arquivo. */
  descricaoOriginal: string
  /** Descrição sem o trecho da parcela. */
  descricao: string
  valor: number
  fitid?: string | null
  parcela: { numero: number; total: number } | null
}

export interface ItemPreparado extends ItemComparavel {
  idTemp: string
  tipo: TipoItem
}

export interface Avaliacao {
  estado: EstadoItem
  existente?: Existente
}

/** Chave gravada com o lançamento (imutável) e usada para reconhecê-lo depois. */
export function chaveDoItem(item: ItemComparavel): string {
  return item.parcela
    ? chaveParcela(item.descricao, item.parcela.numero, item.parcela.total, item.valor)
    : chaveGeral(item.dataOriginal, item.valor, item.descricaoOriginal)
}

/** Lançamentos manuais à vista não têm chave gravada: ela é calculada dos dados atuais. */
function chaveDoExistente(e: Existente): string {
  return e.chaveImportacao ?? chaveGeral(e.data, e.valor, e.descricao)
}

/** Dois lançamentos com FITIDs diferentes são transações distintas, por mais parecidos que sejam. */
function transacoesDistintas(item: ItemComparavel, e: Existente): boolean {
  return Boolean(item.fitid && e.fitid && item.fitid !== e.fitid)
}

function correspondePorChave(item: ItemComparavel, e: Existente): 'igual' | 'divergente' | null {
  const chave = chaveDoExistente(e)
  if (item.parcela) {
    const lida = lerChaveParcela(chave)
    if (!lida) return null
    if (lida.prefixo !== prefixoParcelamento(item.descricao, item.parcela.total)) return null
    if (lida.numero !== item.parcela.numero) return null
    const diferenca = Math.abs(lida.centavos - paraCentavos(item.valor))
    return diferenca <= TOLERANCIA_PARCELA_CENTAVOS ? 'igual' : 'divergente'
  }
  return chave === chaveDoItem(item) ? 'igual' : null
}

/**
 * Avalia um item contra os lançamentos do usuário.
 * `ocorrencia` é a posição do item entre os idênticos do mesmo arquivo (1, 2, ...):
 * a comparação é por quantidade, para que duas compras iguais e legítimas não sejam
 * tratadas como uma só.
 */
export function avaliarItem(item: ItemComparavel, ocorrencia: number, existentes: Existente[]): Avaliacao {
  if (item.fitid) {
    const mesmoFitid = existentes.find((e) => e.fitid === item.fitid)
    if (mesmoFitid) return { estado: 'ja_cadastrado', existente: mesmoFitid }
  }

  const candidatos = existentes.filter((e) => !transacoesDistintas(item, e))

  const iguais = candidatos.filter((e) => correspondePorChave(item, e) === 'igual')
  if (iguais.length >= ocorrencia) return { estado: 'ja_cadastrado', existente: iguais[ocorrencia - 1] }

  const divergente = candidatos.find((e) => correspondePorChave(item, e) === 'divergente')
  if (divergente) return { estado: 'possivel_duplicidade', existente: divergente }

  const centavos = paraCentavos(item.valor)
  const mesmaDataEValor = candidatos.find(
    (e) => e.data === item.data && paraCentavos(e.valor) === centavos && !iguais.includes(e),
  )
  if (mesmaDataEValor) return { estado: 'possivel_duplicidade', existente: mesmaDataEValor }

  return { estado: 'novo' }
}

/**
 * Converte as linhas lidas do arquivo em itens: detecta parcela e define a data.
 *
 * Faturas costumam repetir a data original da compra em todas as parcelas. Se
 * `data + (X−1) meses` ainda cabe no período do arquivo, a linha traz a data da compra
 * e a parcela X é lançada nessa data deslocada; senão, vale a data da linha.
 */
export function prepararItens(brutos: ItemBruto[], dataReferencia?: string): ItemPreparado[] {
  const maiorData = brutos.reduce((maior, b) => (b.data > maior ? b.data : maior), dataReferencia ?? '')

  return brutos.map((bruto, indice) => {
    const detectada = detectarParcela(bruto.descricao)
    let data = bruto.data
    if (detectada && detectada.numero > 1) {
      const deslocada = somarMeses(bruto.data, detectada.numero - 1)
      if (deslocada <= maiorData) data = deslocada
    }
    return {
      idTemp: String(indice),
      dataOriginal: bruto.data,
      data,
      descricaoOriginal: bruto.descricao,
      descricao: detectada ? detectada.descricaoLimpa : bruto.descricao,
      valor: bruto.valor,
      tipo: bruto.tipo,
      fitid: bruto.fitid ?? null,
      parcela: detectada ? { numero: detectada.numero, total: detectada.total } : null,
    }
  })
}

/** Numera os itens idênticos do arquivo (1ª ocorrência, 2ª, ...). */
export function numerarOcorrencias<T extends ItemComparavel>(itens: T[]): (T & { ocorrencia: number })[] {
  const contagem = new Map<string, number>()
  return itens.map((item) => {
    const chave = chaveDoItem(item)
    const ocorrencia = (contagem.get(chave) ?? 0) + 1
    contagem.set(chave, ocorrencia)
    return { ...item, ocorrencia }
  })
}
