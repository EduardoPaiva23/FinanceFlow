import { describe, expect, it } from 'vitest'
import { acharVencimento, lerLinha, lerLinhasFatura } from '../src/importacao/linhasFatura.js'
import { lerOfx, pareceOfx } from '../src/importacao/ofx.js'
import { lerPdf, parecePdf } from '../src/importacao/pdf.js'
import { ErroLeitura } from '../src/importacao/tipos.js'
import { ofxSgml, ofxXml, pdfComLinhas } from './fixtures.js'

describe('lerOfx', () => {
  it('lê transações de OFX 1.x (SGML)', () => {
    const { itens, dataReferencia } = lerOfx(ofxSgml())
    expect(dataReferencia).toBe('2026-11-25')
    expect(itens).toEqual([
      { data: '2026-11-03', descricao: 'MERCADO SÃO JOÃO', valor: 59.9, tipo: 'despesa', fitid: 'A1' },
      { data: '2026-08-15', descricao: 'LOJA ABC 03/10', valor: 150, tipo: 'despesa', fitid: 'A2' },
      { data: '2026-11-10', descricao: 'ESTORNO LOJA XYZ', valor: 20, tipo: 'receita', fitid: 'A3' },
      { data: '2026-11-12', descricao: 'IOF COMPRA INTERNACIONAL', valor: 3.21, tipo: 'despesa', fitid: 'A5' },
    ])
  })

  it('ignora o pagamento da fatura anterior (CA 1.12)', () => {
    const descricoes = lerOfx(ofxSgml()).itens.map((i) => i.descricao)
    expect(descricoes).not.toContain('PAGAMENTO RECEBIDO')
  })

  it('lê OFX 2.x (XML) com valor em formato brasileiro', () => {
    const { itens } = lerOfx(ofxXml())
    expect(itens).toEqual([
      { data: '2026-11-03', descricao: 'POSTO TOTAL & CIA', valor: 1234.56, tipo: 'despesa', fitid: 'B1' },
    ])
  })

  it('reconhece OFX pelo conteúdo', () => {
    expect(pareceOfx(ofxSgml())).toBe(true)
    expect(pareceOfx(Buffer.from('data;descricao;valor'))).toBe(false)
  })

  it('rejeita arquivo sem o corpo OFX', () => {
    expect(() => lerOfx(Buffer.from('OFXHEADER:100\nlixo'))).toThrow(ErroLeitura)
  })
})

describe('lerLinha (fatura em PDF)', () => {
  const ref = '2026-11-25'

  it('lê data, descrição e valor', () => {
    expect(lerLinha('03/11 MERCADO CENTRAL 59,90', ref)).toEqual({
      data: '2026-11-03',
      descricao: 'MERCADO CENTRAL',
      valor: 59.9,
      tipo: 'despesa',
    })
  })

  it('aceita data por extenso, R$ e milhar', () => {
    expect(lerLinha('15 AGO LOJA ABC 03/10 R$ 1.150,00', ref)).toMatchObject({
      data: '2026-08-15',
      descricao: 'LOJA ABC 03/10',
      valor: 1150,
    })
  })

  it('compra em mês posterior ao da referência é do ano anterior', () => {
    expect(lerLinha('20/12 LOJA DE NATAL 80,00', '2027-01-10')?.data).toBe('2026-12-20')
  })

  it('usa o valor em reais quando há coluna em dólar (CA 1.14)', () => {
    expect(lerLinha('05/11 AMAZON US 10,00 54,30', ref)).toMatchObject({ valor: 54.3 })
  })

  it('crédito vira receita com valor positivo (CA 1.13)', () => {
    expect(lerLinha('10/11 ESTORNO LOJA XYZ -20,00', ref)).toMatchObject({ valor: 20, tipo: 'receita' })
    expect(lerLinha('10/11 LOJA XYZ 20,00 CR', ref)).toMatchObject({ valor: 20, tipo: 'receita' })
  })

  it('encargos são despesa (CA 1.12)', () => {
    expect(lerLinha('12/11 JUROS DE FINANCIAMENTO 12,34', ref)).toMatchObject({ tipo: 'despesa' })
    expect(lerLinha('12/11 ANUIDADE 01/12 30,00', ref)).toMatchObject({ tipo: 'despesa' })
  })

  it.each([
    '25/10 PAGAMENTO RECEBIDO 1.500,00',
    '25/10 SALDO ANTERIOR 1.500,00',
    'Total da fatura 2.345,67',
    'Limite disponível R$ 5.000,00',
    'Página 1 de 3',
  ])('ignora "%s"', (linha) => {
    expect(lerLinha(linha, ref)).toBeNull()
  })

  it('não descarta loja com "total" no nome', () => {
    expect(lerLinha('03/11 POSTO TOTAL 200,00', ref)).not.toBeNull()
  })

  it('acha o vencimento', () => {
    expect(acharVencimento(['Fatura', 'Vencimento: 25/11/2026'])).toBe('2026-11-25')
    expect(acharVencimento(['Data de vencimento 5 DEZ 2026'])).toBe('2026-12-05')
    expect(acharVencimento(['sem data'])).toBeUndefined()
  })

  it('lerLinhasFatura junta tudo', () => {
    const { itens, dataReferencia } = lerLinhasFatura(
      ['Vencimento 25/11/2026', '03/11 MERCADO 59,90', 'Total da fatura 59,90'],
      '2030-01-01',
    )
    expect(dataReferencia).toBe('2026-11-25')
    expect(itens).toHaveLength(1)
  })
})

describe('lerPdf', () => {
  it('extrai os lançamentos de um PDF com texto', async () => {
    const pdf = pdfComLinhas(['Vencimento 25/11/2026', '03/11 MERCADO CENTRAL 59,90', '15/08 LOJA ABC 03/10 150,00'])
    expect(parecePdf(pdf)).toBe(true)
    const { itens, dataReferencia } = await lerPdf(pdf, '2026-11-09')
    expect(dataReferencia).toBe('2026-11-25')
    expect(itens.map((i) => [i.data, i.descricao, i.valor])).toEqual([
      ['2026-11-03', 'MERCADO CENTRAL', 59.9],
      ['2026-08-15', 'LOJA ABC 03/10', 150],
    ])
  })

  it('PDF sem texto orienta usar OFX (CA 1.9)', async () => {
    await expect(lerPdf(pdfComLinhas([]), '2026-11-09')).rejects.toMatchObject({ codigo: 'PDF_SEM_TEXTO' })
  })

  it('PDF que não é fatura não é reconhecido (CA 1.10)', async () => {
    const pdf = pdfComLinhas(['Contrato de prestacao de servicos', 'Clausula primeira do objeto'])
    await expect(lerPdf(pdf, '2026-11-09')).rejects.toMatchObject({ codigo: 'PDF_NAO_RECONHECIDO' })
  })

  it('arquivo corrompido (CA 1.11)', async () => {
    await expect(lerPdf(Buffer.from('%PDF-1.4 lixo'), '2026-11-09')).rejects.toMatchObject({
      codigo: 'ARQUIVO_CORROMPIDO',
    })
  })
})
