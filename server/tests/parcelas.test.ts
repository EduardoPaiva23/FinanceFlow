import { describe, expect, it } from 'vitest'
import { chaveGeral, chaveParcela, lerChaveParcela, normalizarDescricao } from '../src/lib/normalizar.js'
import { detectarParcela, dividirTotal, removerTrechoParcela, somarMeses } from '../src/lib/parcelas.js'

describe('somarMeses', () => {
  it('mantém o dia nos meses seguintes', () => {
    expect(somarMeses('2026-11-15', 1)).toBe('2026-12-15')
  })

  it('trata a virada de ano', () => {
    expect(somarMeses('2026-12-10', 1)).toBe('2027-01-10')
    expect(somarMeses('2026-11-10', 14)).toBe('2028-01-10')
  })

  it('usa o último dia quando o dia não existe no mês', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28')
    expect(somarMeses('2028-01-31', 1)).toBe('2028-02-29')
    expect(somarMeses('2026-03-31', 1)).toBe('2026-04-30')
  })

  it('não acumula o desvio: parte sempre da data base', () => {
    expect(somarMeses('2026-01-31', 2)).toBe('2026-03-31')
  })
})

describe('dividirTotal', () => {
  it('coloca a diferença de centavos na primeira parcela', () => {
    expect(dividirTotal(100, 3)).toEqual([33.34, 33.33, 33.33])
  })

  it('a soma das parcelas é igual ao total', () => {
    const parcelas = dividirTotal(1999.99, 7)
    const soma = parcelas.reduce((s, p) => s + Math.round(p * 100), 0)
    expect(soma).toBe(199999)
  })

  it('divisão exata não gera diferença', () => {
    expect(dividirTotal(300, 3)).toEqual([100, 100, 100])
  })
})

describe('detectarParcela', () => {
  it.each([
    ['LOJA ABC 03/10', 3, 10, 'LOJA ABC'],
    ['LOJA ABC 3/10', 3, 10, 'LOJA ABC'],
    ['LOJA ABC PARC 03/10', 3, 10, 'LOJA ABC'],
    ['Loja ABC Parcela 3 de 10', 3, 10, 'Loja ABC'],
    ['LOJA ABC (3/10)', 3, 10, 'LOJA ABC'],
    ['MAGAZINE - 10/10', 10, 10, 'MAGAZINE'],
  ])('reconhece "%s"', (descricao, numero, total, limpa) => {
    expect(detectarParcela(descricao)).toEqual({ numero, total, descricaoLimpa: limpa })
  })

  it.each([
    ['LOJA ABC 05/03', 'parcela maior que o total'],
    ['LOJA ABC 01/01', 'uma única parcela'],
    ['LOJA ABC 03/60', 'total acima do limite'],
    ['LOJA ABC 12/11/2026', 'data, não parcela'],
    ['MERCADO CENTRAL', 'sem indicação'],
  ])('trata "%s" como à vista (%s)', (descricao) => {
    expect(detectarParcela(descricao)).toBeNull()
  })
})

describe('normalização e chaves', () => {
  it('ignora caixa, acentos, espaços e o trecho da parcela', () => {
    expect(normalizarDescricao('  Pão  de   Açúcar 03/10 ')).toBe('PAO DE ACUCAR')
    expect(normalizarDescricao('PAO DE ACUCAR (4/10)')).toBe('PAO DE ACUCAR')
  })

  it('removerTrechoParcela preserva o resto da descrição', () => {
    expect(removerTrechoParcela('LOJA ABC (3/10)')).toBe('LOJA ABC')
  })

  it('chave geral combina data, valor e descrição', () => {
    expect(chaveGeral('2026-11-05', 59.9, 'Mercado São João')).toBe('geral|2026-11-05|5990|MERCADO SAO JOAO')
  })

  it('chave de parcela é lida de volta', () => {
    const chave = chaveParcela('Loja ABC 03/10', 4, 10, 150)
    expect(lerChaveParcela(chave)).toEqual({ prefixo: 'parc|LOJA ABC|10|', numero: 4, centavos: 15000 })
    expect(lerChaveParcela('geral|2026-11-05|5990|X')).toBeNull()
  })
})
