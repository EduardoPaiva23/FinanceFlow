import { describe, expect, it } from 'vitest'
import {
  avaliarItem,
  chaveDoItem,
  numerarOcorrencias,
  prepararItens,
  type Existente,
  type ItemComparavel,
} from '../src/importacao/classificar.js'
import { chaveParcela } from '../src/lib/normalizar.js'

function avista(dados: Partial<ItemComparavel> = {}): ItemComparavel {
  const base = { dataOriginal: '2026-11-05', descricaoOriginal: 'MERCADO CENTRAL', valor: 59.9, ...dados }
  return {
    data: base.dataOriginal,
    descricao: base.descricaoOriginal,
    fitid: null,
    parcela: null,
    ...base,
  }
}

function parcela(numero: number, total: number, valor = 150): ItemComparavel {
  return {
    dataOriginal: '2026-08-15',
    data: '2026-11-15',
    descricaoOriginal: `LOJA ABC ${numero}/${total}`,
    descricao: 'LOJA ABC',
    valor,
    fitid: null,
    parcela: { numero, total },
  }
}

let seq = 0
function existente(dados: Partial<Existente>): Existente {
  return {
    id: `e${++seq}`,
    descricao: 'MERCADO CENTRAL',
    valor: 59.9,
    data: '2026-11-05',
    fitid: null,
    chaveImportacao: null,
    parcelamentoId: null,
    ...dados,
  }
}

/** Lançamento gravado a partir da importação de `item`. */
function importado(item: ItemComparavel, dados: Partial<Existente> = {}): Existente {
  return existente({
    descricao: item.descricao,
    valor: item.valor,
    data: item.data,
    fitid: item.fitid ?? null,
    chaveImportacao: chaveDoItem(item),
    ...dados,
  })
}

describe('avaliarItem — à vista', () => {
  it('sem correspondência é novo', () => {
    expect(avaliarItem(avista(), 1, []).estado).toBe('novo')
  })

  it('mesmo FITID é já cadastrado (CA 4.4)', () => {
    const item = avista({ fitid: 'F1' })
    expect(avaliarItem(item, 1, [importado(item)]).estado).toBe('ja_cadastrado')
  })

  it('PDF e depois OFX da mesma fatura (CA 4.8)', () => {
    const doPdf = importado(avista())
    expect(avaliarItem(avista({ fitid: 'F1' }), 1, [doPdf]).estado).toBe('ja_cadastrado')
  })

  it('reconhece o lançamento mesmo depois de editado (CA 4.12)', () => {
    const editado = importado(avista(), { descricao: 'Compras do mês', valor: 60, data: '2026-11-06' })
    expect(avaliarItem(avista(), 1, [editado]).estado).toBe('ja_cadastrado')
  })

  it('compras idênticas são comparadas por quantidade (CA 4.9)', () => {
    const umaCadastrada = [importado(avista())]
    expect(avaliarItem(avista(), 1, umaCadastrada).estado).toBe('ja_cadastrado')
    expect(avaliarItem(avista(), 2, umaCadastrada).estado).toBe('novo')
  })

  it('FITIDs diferentes são transações distintas', () => {
    const cadastrada = importado(avista({ fitid: 'F2' }))
    expect(avaliarItem(avista({ fitid: 'F1' }), 1, [cadastrada]).estado).toBe('novo')
  })

  it('lançamento manual igual é já cadastrado; com outra descrição é possível duplicidade (CA 4.10)', () => {
    expect(avaliarItem(avista(), 1, [existente({ descricao: 'mercado  central' })]).estado).toBe('ja_cadastrado')
    const resultado = avaliarItem(avista(), 1, [existente({ descricao: 'Compras' })])
    expect(resultado.estado).toBe('possivel_duplicidade')
    expect(resultado.existente?.descricao).toBe('Compras')
  })
})

describe('avaliarItem — parcelado', () => {
  const serie = [4, 5, 6, 7, 8, 9, 10].map((n) =>
    existente({
      descricao: `LOJA ABC (${n}/10)`,
      valor: 150,
      data: '2026-12-15',
      chaveImportacao: chaveParcela('LOJA ABC', n, 10, 150),
      parcelamentoId: 'p1',
    }),
  )

  it('parcela já prevista não é recriada, sem comparar a data (CA 4.2, 4.3)', () => {
    expect(avaliarItem(parcela(4, 10), 1, serie).estado).toBe('ja_cadastrado')
  })

  it('aceita diferença de centavos por arredondamento', () => {
    expect(avaliarItem(parcela(4, 10, 150.03), 1, serie).estado).toBe('ja_cadastrado')
  })

  it('valor divergente é possível duplicidade (CA 4.11)', () => {
    expect(avaliarItem(parcela(4, 10, 180), 1, serie).estado).toBe('possivel_duplicidade')
  })

  it('parcela anterior à série existente é nova (CA 4.14)', () => {
    expect(avaliarItem(parcela(2, 10), 1, serie).estado).toBe('novo')
  })

  it('outro total de parcelas é outra compra', () => {
    expect(avaliarItem(parcela(4, 12), 1, serie).estado).toBe('novo')
  })
})

describe('prepararItens', () => {
  it('detecta a parcela e limpa a descrição', () => {
    const [item] = prepararItens([{ data: '2026-11-15', descricao: 'LOJA ABC 03/10', valor: 150, tipo: 'despesa' }])
    expect(item.parcela).toEqual({ numero: 3, total: 10 })
    expect(item.descricao).toBe('LOJA ABC')
    expect(item.descricaoOriginal).toBe('LOJA ABC 03/10')
  })

  it('desloca a data original da compra para o mês da parcela', () => {
    const itens = prepararItens([
      { data: '2026-08-15', descricao: 'LOJA ABC 03/10', valor: 150, tipo: 'despesa' },
      { data: '2026-10-20', descricao: 'MERCADO', valor: 80, tipo: 'despesa' },
    ])
    expect(itens[0].data).toBe('2026-10-15')
    expect(itens[0].dataOriginal).toBe('2026-08-15')
  })

  it('mantém a data quando ela já é a da parcela', () => {
    const itens = prepararItens([
      { data: '2026-10-15', descricao: 'LOJA ABC 03/10', valor: 150, tipo: 'despesa' },
      { data: '2026-10-20', descricao: 'MERCADO', valor: 80, tipo: 'despesa' },
    ])
    expect(itens[0].data).toBe('2026-10-15')
  })

  it('usa a data de referência da fatura como limite', () => {
    const [item] = prepararItens(
      [{ data: '2026-08-15', descricao: 'LOJA ABC 03/10', valor: 150, tipo: 'despesa' }],
      '2026-10-25',
    )
    expect(item.data).toBe('2026-10-15')
  })
})

describe('numerarOcorrencias', () => {
  it('numera os itens idênticos do arquivo', () => {
    const itens = numerarOcorrencias([avista(), avista(), avista({ valor: 10 })])
    expect(itens.map((i) => i.ocorrencia)).toEqual([1, 2, 1])
  })
})
