/**
 * Sanitiza um valor para uso seguro em logs.
 * - Remove caracteres de controle (CR, LF, TAB, NUL, etc.)
 *   que poderiam injetar linhas falsas no log.
 * - Limita tamanho a 200 caracteres por valor (anti-flood).
 * - Coage para string de forma segura.
 */
export function sanitizeForLog(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  let s: string;
  if (typeof value === 'object') {
    try {
      s = JSON.stringify(value);
    } catch {
      s = '[unserializable]';
    }
  } else {
    s = String(value);
  }

  // Remove ASCII control chars (0x00-0x1F and 0x7F), including \n and \r
  s = s.replace(/[\x00-\x1F\x7F]/g, '_');

  // Limit length
  if (s.length > 200) {
    s = s.slice(0, 197) + '...';
  }

  return s;
}

/**
 * Wrapper seguro de console.log que sanitiza todos os argumentos
 * variáveis. O primeiro argumento (template) é considerado seguro
 * (string literal do desenvolvedor).
 */
export function safeLog(template: string, ...vars: unknown[]): void {
  const sanitized = vars.map(sanitizeForLog);
  console.log(template, ...sanitized);
}

export function safeWarn(template: string, ...vars: unknown[]): void {
  const sanitized = vars.map(sanitizeForLog);
  console.warn(template, ...sanitized);
}

export function safeError(template: string, ...vars: unknown[]): void {
  const sanitized = vars.map(sanitizeForLog);
  console.error(template, ...sanitized);
}
