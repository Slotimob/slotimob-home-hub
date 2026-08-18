/**
 * Sanitiza texto antes de inserir em PDFs gerados via jspdf.
 *
 * Mitigação para vulnerabilidade conhecida de PDF Object Injection
 * (jsPDF FreeText color). Remove caracteres que podem ser
 * interpretados como sintaxe PDF estrutural quando o conteúdo é
 * embarcado em objetos do PDF.
 *
 * Esta NÃO é solução completa para conteúdo arbitrário — é defesa
 * em profundidade que limita superfície de ataque assumindo que
 * input vem de campos de formulário do app.
 *
 * NÃO REMOVA este arquivo sem antes verificar se a vulnerabilidade
 * upstream do jspdf foi corrigida. Veja SECURITY.md na raiz.
 */
export function pdfSafeText(
  value: unknown,
  options?: { maxLength?: number; preserveLineBreaks?: boolean }
): string {
  if (value === null || value === undefined) return '';
  let s = String(value);

  const maxLength = options?.maxLength ?? 5000;
  const preserveLineBreaks = options?.preserveLineBreaks ?? true;

  // Caracteres de escape do PDF que podem quebrar parser:
  // \  (backslash), ( e ) (delimitadores de string),
  // < e > (delimitadores hex), null bytes
  // Trocar por equivalente seguro.
  s = s
    .replace(/\\/g, '\u29F5')   // backslash → reverse solidus operator
    .replace(/\(/g, '[')         // parens → colchetes (renderizáveis em WinAnsi)
    .replace(/\)/g, ']')

    .replace(/</g, '‹')          // angle → single guillemets
    .replace(/>/g, '›')
    .replace(/\x00/g, '');       // null byte → remove

  // Caracteres de controle (exceto \n e \t se preservar quebras)
  if (preserveLineBreaks) {
    s = s.replace(/[\x01-\x08\x0B-\x1F\x7F]/g, '');
  } else {
    s = s.replace(/[\x00-\x1F\x7F]/g, ' ');
  }

  // Limitar tamanho (anti-flood + defesa adicional)
  if (s.length > maxLength) {
    s = s.slice(0, maxLength - 3) + '...';
  }

  return s;
}

/**
 * Versão para arrays (linhas de tabela).
 * Aplica pdfSafeText em cada célula.
 */
export function pdfSafeRow(
  row: unknown[],
  options?: { maxLength?: number }
): string[] {
  return row.map(cell => pdfSafeText(cell, options));
}

/**
 * Versão para strings curtas (títulos, labels) com limite menor.
 */
export function pdfSafeLabel(value: unknown): string {
  return pdfSafeText(value, { maxLength: 200, preserveLineBreaks: false });
}
