// Arquivos sintéticos para os testes — nenhum dado real de fatura.

function transacao(tipo: string, data: string, valor: string, fitid: string, memo: string): string {
  return `<STMTTRN>
<TRNTYPE>${tipo}
<DTPOSTED>${data}120000[-3:BRT]
<TRNAMT>${valor}
<FITID>${fitid}
<MEMO>${memo}
</STMTTRN>`
}

/** OFX 1.x (SGML, sem fechamento de tags de campo), gravado em Windows-1252. */
export function ofxSgml(transacoes?: string[]): Buffer {
  const corpo = (
    transacoes ?? [
      transacao('DEBIT', '20261103', '-59.90', 'A1', 'MERCADO SÃO JOÃO'),
      transacao('DEBIT', '20260815', '-150.00', 'A2', 'LOJA ABC 03/10'),
      transacao('CREDIT', '20261110', '20.00', 'A3', 'ESTORNO LOJA XYZ'),
      transacao('CREDIT', '20261025', '1500.00', 'A4', 'PAGAMENTO RECEBIDO'),
      transacao('DEBIT', '20261112', '-3.21', 'A5', 'IOF COMPRA INTERNACIONAL'),
    ]
  ).join('\n')

  const texto = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<CREDITCARDMSGSRSV1>
<CCSTMTTRNRS>
<CCSTMTRS>
<CURDEF>BRL
<BANKTRANLIST>
<DTSTART>20261026000000[-3:BRT]
<DTEND>20261125000000[-3:BRT]
${corpo}
</BANKTRANLIST>
</CCSTMTRS>
</CCSTMTTRNRS>
</CREDITCARDMSGSRSV1>
</OFX>
`
  return Buffer.from(texto, 'latin1')
}

export { transacao as transacaoOfx }

/** OFX 2.x (XML), UTF-8, com valor no formato brasileiro. */
export function ofxXml(): Buffer {
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="211"?>
<OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261103</DTPOSTED><TRNAMT>-1.234,56</TRNAMT><FITID>B1</FITID><NAME>POSTO TOTAL &amp; CIA</NAME></STMTTRN>
</BANKTRANLIST></CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>`,
    'utf8',
  )
}

/** PDF mínimo de uma página, com uma linha de texto (Helvetica) por item. */
export function pdfComLinhas(linhas: string[]): Buffer {
  const escapar = (s: string) => s.replace(/([\\()])/g, '\\$1')
  const conteudo = linhas
    .map((linha, i) => `BT /F1 10 Tf 40 ${780 - i * 16} Td (${escapar(linha)}) Tj ET`)
    .join('\n')

  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(conteudo, 'latin1')} >>\nstream\n${conteudo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ]

  let pdf = '%PDF-1.4\n'
  const posicoes: number[] = []
  objetos.forEach((objeto, i) => {
    posicoes.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${i + 1} 0 obj\n${objeto}\nendobj\n`
  })
  const inicioXref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`
  for (const posicao of posicoes) pdf += `${String(posicao).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}
